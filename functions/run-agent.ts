// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface AgentRunRecord {
  id: string;
  project_id: string;
  owner_id: string;
  model: string | null;
  flavor: string | null;
  order: number;
  created_at: string;
  finished_at: string | null;
}

interface ProjectRecord {
  id: string;
  prompt: string;
  owner_id: string;
}

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
  supabase: ReturnType<typeof createClient>,
  agentRunId: string,
  ownerId: string,
  projectId: string
): Promise<void> {
  try {
    // Build system prompt with flavor context
    const systemPrompt = flavor
      ? `You are an expert web developer. Create a single HTML file with embedded CSS and JavaScript based on the user's requirements. The user wants a "${flavor}" style/approach. Generate complete, working HTML with <style> and <script> tags. Do not use external dependencies. Return ONLY the HTML code, wrapped in a markdown code block.`
      : `You are an expert web developer. Create a single HTML file with embedded CSS and JavaScript based on the user's requirements. Generate complete, working HTML with <style> and <script> tags. Do not use external dependencies. Return ONLY the HTML code, wrapped in a markdown code block.`;

    const userPrompt = prompt;

    let rawContent = '';
    
    // Call appropriate AI API based on model
    switch (model) {
      case 'openai':
        rawContent = await callOpenAI(systemPrompt, userPrompt);
        break;
      case 'anthropic':
        rawContent = await callAnthropic(systemPrompt, userPrompt);
        break;
      case 'gemini':
        rawContent = await callGemini(systemPrompt, userPrompt);
        break;
      case 'glm':
        rawContent = await callGLM(systemPrompt, userPrompt);
        break;
      case 'deepseek':
        rawContent = await callDeepSeek(systemPrompt, userPrompt);
        break;
      default:
        throw new Error(`Unsupported model: ${model}`);
    }

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

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nUser Request: ${userPrompt}` },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || '';
}

async function callGLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('GLM_API_KEY');
  if (!apiKey) {
    throw new Error('GLM_API_KEY not set');
  }

  // GLM API endpoint (adjust if needed)
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not set');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      }
    );

    // Parse request body (from database webhook trigger)
    const body = await req.json();
    const record = body.record as AgentRunRecord;
    
    if (!record || !record.id || !record.project_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid agent_run record' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get project prompt
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('prompt, owner_id')
      .eq('id', record.project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to fetch project: ${projectError?.message}`);
    }

    if (!record.model) {
      throw new Error('Agent run missing model');
    }

    // Return 200 early and execute AI agent in background
    // Note: Supabase Edge Functions will continue executing after response is sent
    const promise = generateHTMLWithAI(
      project.prompt,
      record.flavor,
      record.model,
      supabase,
      record.id,
      record.owner_id,
      record.project_id
    ).catch((error) => {
      console.error('Background task error:', error);
    });

    // Return response immediately (function will continue executing in background)
    return new Response(
      JSON.stringify({ message: 'Agent run started', agent_run_id: record.id }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err) {
    console.error('Error in run-agent function:', err);
    return new Response(
      JSON.stringify({
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
