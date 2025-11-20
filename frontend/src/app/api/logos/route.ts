import { createClient } from "@/lib/supabase/server";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const getLogoGenerationPrompt = (prompt: string) => `
Create a logo based on the following prompt: "${prompt}".
Transparent background.
Must be vector style so that it can be converted into SVG later on.
`;

const runLogoGeneration = async (userId: string, logoGenerationId: string, logoProjectId: string, prompt: string) => {
  const supabase = await createClient();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Create logo generation
  const { error: insertGenerationError } = await supabase.from("logo_generations")
    .insert({
      id: logoGenerationId,
      owner_id: userId,
      logo_project_id: logoProjectId,
    });
  if (insertGenerationError) {
    return console.error("Failed to insert logo generation", insertGenerationError);
  }

  // Generate logo image
  const result = await openai.images.generate({
    model: "gpt-image-1-mini",
    quality: "low",
    prompt: getLogoGenerationPrompt(prompt),
    background: "transparent",
    n: 1,
    output_format: "png",
    size: "1024x1024",
  });
  const imageEncoded = result.data?.[0]?.b64_json;
  if (!imageEncoded) {
    await supabase.from("logo_generations")
      .update({ status: "FAILED" })
      .eq("id", logoGenerationId);
    return console.error("No image generated");
  }

  // Upload logo image to Supabase storage
  const imageBytes = Buffer.from(imageEncoded, "base64");
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(`${userId}/${logoProjectId}/${logoGenerationId}/logo.png`, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });
  if (uploadError) {
    await supabase.from("logo_generations")
      .update({ status: "FAILED" })
      .eq("id", logoGenerationId);
    return console.error("Failed to upload image", uploadError);
  }

  // Update logo generation status to SUCCEEDED
  const { error: updateGenerationError } = await supabase.from("logo_generations")
    .update({ status: "SUCCEEDED" })
    .eq("id", logoGenerationId);
  if (updateGenerationError) {
    return console.error("Failed to update logo generation status", updateGenerationError);
  }
}

// Generate logo
export async function POST(request: Request) {
  const { prompt } = await request.json();
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create logo project
  const logoProjectId = crypto.randomUUID();
  const { error: insertProjectError } = await supabase.from("logo_projects")
    .insert({
      id: logoProjectId,
      owner_id: user.id,
      prompt,
    });
  if (insertProjectError) {
    return NextResponse.json({ error: "Failed to insert logo project" }, { status: 500 });
  }

  // Kick off logo generation in background
  const logoGenerationId = crypto.randomUUID();
  waitUntil(Promise.all([
    runLogoGeneration(user.id, logoGenerationId, logoProjectId, prompt),
  ]))

  return NextResponse.json({ 
    logoProjectId,
    logoGenerationIds: [logoGenerationId],
   });
}