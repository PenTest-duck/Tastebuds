import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { OpenRouter } from "@openrouter/sdk";

const GENERATION_TIMEOUT_MS = 300_000; // 300 seconds

// Initialize OpenRouter provider
const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function extractHTMLFromResponse(content: string): string {
  const startIdx = content.indexOf("<!DOCTYPE");
  if (startIdx !== -1) {
    const endIdx = content.indexOf("</html>", startIdx);
    if (endIdx !== -1) {
      return content.slice(startIdx, endIdx + 7).trim();
    } else {
      // If </html> is not found, return from <!DOCTYPE to end of content
      return content.slice(startIdx).trim();
    }
  }
  return content.trim();
}

async function generateHTMLWithAI(
  prompt: string,
  flavor: string | null,
  model: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentRunId: string,
  ownerId: string,
  projectId: string
): Promise<void> {
  try {
    // Build system prompt with flavor context
    const systemPrompt = `
      You are an expert web designer.
      Create a single HTML file with embedded CSS and JavaScript based on the user's requirements.
      The user wants a ${flavor ? `"${flavor}"` : "default"} style/approach.
      The focus is on the visual design and layout of the page, not on complete functionality. You may mock any interactions and/or functionality as necessary.
      Generate complete, working HTML with <style> and <script> tags. Do not use external dependencies.
      Return ONLY the HTML code, wrapped in a markdown code block.
    `;

    // Call AI using OpenRouter
    const result = await openRouter.chat.send({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });
    const rawContent = result.choices[0].message.content as string;

    // Extract HTML from the response
    const htmlContent = extractHTMLFromResponse(rawContent);

    if (!htmlContent) {
      throw new Error("Failed to extract HTML from AI response");
    }

    // Upload to Supabase storage
    const storagePath = `${ownerId}/${projectId}/${agentRunId}/index.html`;
    const { error: uploadError } = await supabase.storage
      .from("projects")
      .upload(storagePath, htmlContent, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Update agent_run with finished_at timestamp
    const { error: updateError } = await supabase
      .from("agent_runs")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", agentRunId);

    if (updateError) {
      console.error("Failed to update agent_run finished_at:", updateError);
    }
  } catch (error) {
    console.error("Error in generateHTMLWithAI:", error);
    // Set both finished_at and failed_at on error
    try {
      const errorTimestamp = new Date().toISOString();
      await supabase
        .from("agent_runs")
        .update({
          finished_at: errorTimestamp,
          failed_at: errorTimestamp,
        })
        .eq("id", agentRunId);
    } catch (updateErr) {
      console.error("Failed to update agent_run on error:", updateErr);
    }
    throw error;
  }
}

export async function spawnAgentRun(projectId: string, agentRunId: string) {
  try {
    // Get agent run record
    const supabase = await createClient();
    const { data: agentRun, error: agentRunError } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("id", agentRunId)
      .eq("project_id", projectId)
      .single();
    if (agentRunError || !agentRun) {
      console.error("Agent run not found:", agentRunError);
      return NextResponse.json(
        { error: "Agent run not found" },
        { status: 404 }
      );
    }

    // Get project prompt
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("prompt, owner_id")
      .eq("id", projectId)
      .single();
    if (projectError || !project) {
      console.error("Project not found:", projectError);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (!agentRun.model) {
      console.error("Agent run missing model:", agentRun);
      return NextResponse.json(
        { error: "Agent run missing model" },
        { status: 400 }
      );
    }

    // Set up a timeout promise
    const timeoutPromise = new Promise<void>(async (_resolve, reject) => {
      setTimeout(async () => {
        try {
          const errorTimestamp = new Date().toISOString();
          await supabase
            .from("agent_runs")
            .update({
              finished_at: errorTimestamp,
              failed_at: errorTimestamp,
            })
            .eq("id", agentRun.id);
        } catch (timeoutErr) {
          console.error(
            "Failed to mark agent_run as failed on timeout:",
            timeoutErr
          );
        }
        reject(new Error("Agent run timed out after 300 seconds"));
      }, GENERATION_TIMEOUT_MS);
    });

    // Race the actual job against the timeout
    await Promise.race([
      generateHTMLWithAI(
        project.prompt,
        agentRun.flavor,
        agentRun.model,
        supabase,
        agentRun.id,
        agentRun.owner_id,
        projectId
      ),
      timeoutPromise,
    ]);

    return agentRun.id;
  } catch (err) {
    console.error("Error in agent run function:", err);
    throw err;
  }
}
