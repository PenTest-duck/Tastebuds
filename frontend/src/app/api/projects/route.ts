import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/database.types";
import { waitUntil } from "@vercel/functions";
import { spawnAgentRun } from "@/lib/agentRun";
import { nameProject } from "@/lib/project";
import { chargeCredits, checkProjectsLimit } from "@/lib/subscription";

export const maxDuration = 300; // 5 minutes timeout - let's see if this works?

export async function POST(request: Request) {
  try {
    const { prompt, flavors, models } = await request.json();
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate input
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(flavors) || flavors.length === 0) {
      return NextResponse.json(
        { error: "At least one flavor is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(models) || models.length === 0) {
      return NextResponse.json(
        { error: "At least one model is required" },
        { status: 400 }
      );
    }

    // Clean and validate flavors/models
    const cleanedFlavors = flavors
      .filter((f: string) => f && typeof f === "string")
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 0);
    if (cleanedFlavors.length === 0) {
      return NextResponse.json(
        { error: "At least one valid flavor is required" },
        { status: 400 }
      );
    }
    if (models.length === 0) {
      return NextResponse.json(
        { error: "At least one model is required" },
        { status: 400 }
      );
    }

    // Check credits
    const cost = cleanedFlavors.length * models.length;
    const { hasEnoughCredits, executeCharge } = await chargeCredits({
      userId: user.id,
      cost,
    });
    if (!hasEnoughCredits) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 400 }
      );
    }

    // Check projects limit
    const projectCreationAllowed = await checkProjectsLimit({
      userId: user.id,
    });
    if (!projectCreationAllowed) {
      return NextResponse.json(
        { error: "Projects limit reached" },
        { status: 400 }
      );
    }

    // Create the project
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({
        prompt: prompt.trim(),
        flavors: cleanedFlavors,
        models: models,
        owner_id: user.id,
      })
      .select()
      .single();
    if (insertError) {
      console.error("Error creating project:", insertError);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }
    if (!project) {
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    // Create agent runs for each cell combination (flavor × model)
    const agentRuns: Array<
      Database["public"]["Tables"]["agent_runs"]["Insert"]
    > = [];
    let order = 1;
    for (
      let flavorIndex = 0;
      flavorIndex < cleanedFlavors.length;
      flavorIndex++
    ) {
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

    // Bulk insert all agent runs
    const { data: agentRunsData, error: agentRunsError } = await supabase
      .from("agent_runs")
      .insert(agentRuns)
      .select("id");
    if (agentRunsError) {
      console.error("Error creating agent runs:", agentRunsError);
      return NextResponse.json(
        { error: "Failed to create agent runs" },
        { status: 500 }
      );
    }
    if (!agentRunsData) {
      return NextResponse.json(
        { error: "Failed to create agent runs" },
        { status: 500 }
      );
    }

    // Subtract credits
    await executeCharge();

    // Name project
    waitUntil(nameProject(project.id, prompt));

    // Spawn agent runs
    waitUntil(
      Promise.all(
        agentRunsData.map((agentRun) => spawnAgentRun(project.id, agentRun.id))
      )
    );

    // Return immediately
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
