import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { chargeCredits } from "@/lib/subscription";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const morph = createOpenAICompatible({
  apiKey: process.env.MORPH_API_KEY!,
  name: "morph",
  baseURL: "https://api.morphllm.com/v1",
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; agentRunId: string }> }
) {
  const { projectId, agentRunId } = await params;
  const { messages } = await request.json();

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get agent run to verify ownership and get the correct path
  const { data: agentRun, error: agentRunError } = await supabase
    .from("agent_runs")
    .select("owner_id, project_id, id")
    .eq("id", agentRunId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .single();
  if (agentRunError || !agentRun) {
    return NextResponse.json(
      { error: "Agent run not found or unauthorized" },
      { status: 404 }
    );
  }

  // Check credits
  const { hasEnoughCredits, executeCharge } = await chargeCredits({
    userId: user.id,
    cost: 1,
  });
  if (!hasEnoughCredits) {
    return NextResponse.json(
      { error: "Insufficient credits" },
      { status: 400 }
    );
  }

  // Download original code
  const storagePath = `${agentRun.owner_id}/${agentRun.project_id}/${agentRun.id}/index.html`;
  const { data: originalCodeBlob, error: originalCodeError } =
    await supabase.storage.from("projects").download(storagePath);
  if (originalCodeError || !originalCodeBlob) {
    return NextResponse.json(
      { error: "Failed to download original code" },
      { status: 500 }
    );
  }
  const originalCode = await originalCodeBlob.text();

  try {
    // Step 1: Call Claude Sonnet 4.5 with structured output to extract instructions and code_edit
    const systemPrompt = `You are analyzing a conversation about editing code. Extract the editing instructions and generate the code edit.

The code edit should follow this format:
- Use // ... existing code ... to represent unchanged sections
- Specify each edit in sequence
- Include minimal sufficient context around edits
- Make it clear what the edit should be and where it should be applied
- DO NOT omit spans of pre-existing code without using the // ... existing code ... comment

Return ONLY valid JSON with this exact structure:
{
  "instructions": "Clear description of what edits should be made",
  "code_edit": "The code edit following the format above"
}`;

    // Build messages array for Claude - combine existing messages with original code
    const claudeMessages: Anthropic.MessageParam[] = [
      ...messages.map((msg: { role: string; content: string }) => ({
        role:
          msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: `Here is the original code that needs to be edited:\n\n\`\`\`html\n${originalCode}\n\`\`\`\n\nBased on the conversation above, extract the editing instructions and generate the code edit following the specified format. Return ONLY valid JSON with the structure: {"instructions": "...", "code_edit": "..."}`,
      },
    ];

    // Call Claude Sonnet 4.5
    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      system: systemPrompt,
      messages: claudeMessages,
    });

    // Parse Claude's response
    const responseContent = claudeResponse.content[0];
    if (responseContent.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format from Claude" },
        { status: 500 }
      );
    }

    // Extract JSON from the response (might be wrapped in markdown code blocks)
    let responseText = responseContent.text.trim();
    // Remove markdown code blocks if present
    const jsonMatch =
      responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
      responseText.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    let editData: { instructions: string; code_edit: string };
    try {
      editData = JSON.parse(responseText);
      if (!editData.instructions || !editData.code_edit) {
        return NextResponse.json(
          { error: "Invalid response structure from Claude" },
          { status: 500 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response as JSON" },
        { status: 500 }
      );
    }

    // Step 2: Call Morph API with the extracted instructions and code_edit
    const morphModel = morph("morph-v3-fast");
    const morphResponse = await generateText({
      model: morphModel,
      messages: [
        {
          role: "user",
          content: `Apply this edit to the code:\n\nInstructions: ${editData.instructions}\n\nCode Edit:\n\`\`\`html\n${editData.code_edit}\n\`\`\`\n\nOriginal Code:\n\`\`\`html\n${originalCode}\n\`\`\`\n\nApply the edits and return the complete edited code.`,
        },
      ],
    });

    // Extract HTML from Morph's response (might be wrapped in markdown code blocks)
    let editedCode = morphResponse.text.trim();
    const htmlMatch =
      editedCode.match(/```(?:html)?\s*([\s\S]*?)\s*```/) ||
      editedCode.match(/(<[\s\S]*>)/);
    if (htmlMatch) {
      editedCode = htmlMatch[1];
    }

    // Step 3: Upload the edited code back to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("projects")
      .upload(storagePath, editedCode, {
        contentType: "text/html",
        upsert: true,
      });
    if (uploadError) {
      console.error("Error uploading edited code:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload edited code" },
        { status: 500 }
      );
    }

    // Subtract credits
    await executeCharge();

    return NextResponse.json({
      success: true,
      editedCode,
      originalCode,
    });
  } catch (error) {
    console.error("Error in edit route:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
