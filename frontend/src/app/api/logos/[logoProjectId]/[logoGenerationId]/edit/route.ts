import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

const getLogoEditPrompt = (prompt: string) => `
Edit the logo based on the following prompt: "${prompt}".
Transparent background.
Must be vector style so that it can be converted into SVG later on.
`;

// Edit logo
export async function POST(request: Request, { params }: { params: Promise<{ logoProjectId: string; logoGenerationId: string }> }) {
  const { logoProjectId, logoGenerationId } = await params;
  const { prompt } = await request.json();
  
  const supabase = await createClient();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Download logo image from Supabase storage
  const { data: logoImage, error: logoImageError } = await supabase.storage
    .from("logos")
    .download(`${user.id}/${logoProjectId}/${logoGenerationId}/logo.png`);
  if (logoImageError) {
    return NextResponse.json({ error: "Failed to download logo image" }, { status: 500 });
  }
  
  // Edit logo image
  const imageFile = await toFile(logoImage, "logo.png", { type: "image/png" });
  const response = await openai.images.edit({
    model: "gpt-image-1-mini",
    quality: "low",
    image: imageFile,
    prompt: getLogoEditPrompt(prompt),
    background: "transparent",
    n: 1,
    output_format: "png",
    size: "1024x1024",
  })
  const imageEncoded = response.data?.[0]?.b64_json;
  if (!imageEncoded) {
    return NextResponse.json({ error: "Failed to edit logo image" }, { status: 500 });
  }

  // Upload edited logo image to Supabase storage
  const imageBytes = Buffer.from(imageEncoded, "base64");
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(`${user.id}/${logoProjectId}/${logoGenerationId}/logo.png`, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });
  if (uploadError) {
    return NextResponse.json({ error: "Failed to upload edited logo image" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
