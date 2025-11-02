import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
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

    // Parse request body
    const body = await request.json();
    const { prompt, flavors, models } = body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(flavors) || flavors.length === 0) {
      return NextResponse.json(
        { error: 'At least one flavor is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(models) || models.length === 0) {
      return NextResponse.json(
        { error: 'At least one model is required' },
        { status: 400 }
      );
    }

    // Clean and validate flavors
    const cleanedFlavors = flavors
      .filter((f: string) => f && typeof f === 'string')
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 0);

    if (cleanedFlavors.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid flavor is required' },
        { status: 400 }
      );
    }

    // Validate models
    if (models.length === 0) {
      return NextResponse.json(
        { error: 'At least one model is required' },
        { status: 400 }
      );
    }

    // Create the project
    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        prompt: prompt.trim(),
        flavors: cleanedFlavors,
        models: models,
        owner_id: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating project:', insertError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    // Create agent runs for each cell combination (flavor × model)
    const agentRuns: Array<{
      project_id: string;
      flavor: string;
      model: string;
      order: number;
      owner_id: string;
    }> = [];

    let order = 1;
    for (let flavorIndex = 0; flavorIndex < cleanedFlavors.length; flavorIndex++) {
      for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
        agentRuns.push({
          project_id: project.id,
          flavor: cleanedFlavors[flavorIndex],
          model: models[modelIndex],
          order: order++,
          owner_id: user.id,
        });
      }
    }

    // Insert all agent runs
    const { error: agentRunsError } = await supabase
      .from('agent_runs')
      .insert(agentRuns);

    if (agentRunsError) {
      console.error('Error creating agent runs:', agentRunsError);
      return NextResponse.json(
        { error: 'Failed to create agent runs' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { project },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

