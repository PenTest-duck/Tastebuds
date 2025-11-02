import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseProjectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseProjectId || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // Make request to Metorial API
    const response = await fetch('https://api.metorial.com/magic-mcp-servers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.METORIAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server_id: process.env.METORIAL_SERVER_ID,
        config: {
          supabaseUrl,
          supabaseKey,
          supabaseProjectId,
          userId: user.id,
        },
        name: "tastebuds-mcp-server",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Metorial API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create MCP server', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract streamable HTTP URL and server name from Metorial response
    const streamableHttpUrl = data?.endpoints?.[0]?.urls?.streamable_http;
    const serverName = data?.name || 'blabla';
    
    if (!streamableHttpUrl) {
      return NextResponse.json(
        { error: 'Streamable HTTP URL not found in response' },
        { status: 500 }
      );
    }

    // Create cursorConfig object (just the server config, not wrapped in mcpServers)
    const cursorConfig = {
        url: streamableHttpUrl,
        headers: {
          Authorization: `Bearer: ${process.env.METORIAL_API_KEY}`, // TODO: pls no
        },
    };

    // Generate install link
    // Base64 encode the config and create cursor:// URL with name parameter
    const configJson = JSON.stringify(cursorConfig);
    const configBase64 = Buffer.from(configJson).toString('base64');
    const installLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=tastebuds-mcp-server&config=${encodeURIComponent(configBase64)}`;

    return NextResponse.json({
      ...data,
      cursorConfig,
      installLink,
    });
  } catch (error) {
    console.error('Unexpected error creating MCP server:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

