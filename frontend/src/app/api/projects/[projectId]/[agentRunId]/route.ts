import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { OpenRouter } from "@openrouter/sdk";
import { OPENROUTER_MODEL_MAP } from "@/lib/llm-models";

// Initialize OpenRouter provider
const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function extractHTMLFromResponse(content: string): string {
  const startIdx = content.indexOf('<!DOCTYPE');
  if (startIdx !== -1) {
    const endIdx = content.indexOf('</html>', startIdx);
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
    const systemPrompt = flavor
      ? `You are an expert web developer. Create a single HTML file with embedded CSS and JavaScript based on the user's requirements. The user wants a "${flavor}" style/approach. Generate complete, working HTML with <style> and <script> tags. Do not use external dependencies. Return ONLY the HTML code, wrapped in a markdown code block.`
      : `You are an expert web developer. Create a single HTML file with embedded CSS and JavaScript based on the user's requirements. Generate complete, working HTML with <style> and <script> tags. Do not use external dependencies. Return ONLY the HTML code, wrapped in a markdown code block.`;

    // Get OpenRouter model ID
    const openRouterModel = OPENROUTER_MODEL_MAP[model];
    if (!openRouterModel) {
      throw new Error(`Unsupported model: ${model}`);
    }

    // Call AI using OpenRouter
    const result = await openRouter.chat.send({
      model: openRouterModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });
    const rawContent = result.choices[0].message.content as string;

    // Extract HTML from the response
    const htmlContent = extractHTMLFromResponse(rawContent);

    if (!htmlContent) {
      throw new Error('Failed to extract HTML from AI response');
    }

    // Upload to Supabase storage
    const storagePath = `${ownerId}/${projectId}/${agentRunId}/index.html`;
    const { error: uploadError } = await supabase.storage
      .from('projects')
      .upload(storagePath, htmlContent, {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Update agent_run with finished_at timestamp
    const { error: updateError } = await supabase
      .from('agent_runs')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', agentRunId);

    if (updateError) {
      console.error('Failed to update agent_run finished_at:', updateError);
    }
  } catch (error) {
    console.error('Error in generateHTMLWithAI:', error);
    // Set both finished_at and failed_at on error
    try {
      const errorTimestamp = new Date().toISOString();
      await supabase
        .from('agent_runs')
        .update({ 
          finished_at: errorTimestamp,
          failed_at: errorTimestamp
        })
        .eq('id', agentRunId);
    } catch (updateErr) {
      console.error('Failed to update agent_run on error:', updateErr);
    }
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; agentRunId: string }> }
) {
  try {
    const { projectId, agentRunId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get agent run record
    const { data: agentRun, error: agentRunError } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', agentRunId)
      .eq('project_id', projectId)
      .single();

    if (agentRunError || !agentRun) {
      return NextResponse.json(
        { error: 'Agent run not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (agentRun.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get project prompt
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('prompt, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!agentRun.model) {
      return NextResponse.json(
        { error: 'Agent run missing model' },
        { status: 400 }
      );
    }

    generateHTMLWithAI(
      project.prompt,
      agentRun.flavor,
      agentRun.model,
      supabase,
      agentRun.id,
      agentRun.owner_id,
      projectId
    ).catch((error) => {
      console.error('Background task error:', error);
    })

    return NextResponse.json(
      { message: 'Agent run started', agent_run_id: agentRun.id },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in agent run function:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}