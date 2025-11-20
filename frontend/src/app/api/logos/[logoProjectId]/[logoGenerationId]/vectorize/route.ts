import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Vectorize logo
export async function POST(request: Request, { params }: { params: Promise<{ logoProjectId: string; logoGenerationId: string }> }) {
  const { logoProjectId, logoGenerationId } = await params;

  // Check authentication
  const supabase = await createClient();
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
  const logoImageBuffer = await logoImage.arrayBuffer();
  const logoImageBlob = new Blob([logoImageBuffer], { type: "image/png" });

  // Vectorize image
  const formData = new FormData();
  formData.append("file", new File([logoImageBlob], "logo.png", { type: "image/png" }));
  formData.append("response_format", "b64_json");
  const response = await fetch("https://external.api.recraft.ai/v1/images/vectorize", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RECRAFT_API_KEY}`,
    },
    body: formData,
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to vectorize image" }, { status: 500 });
  }

  const data = await response.json();
  const imageEncoded = data?.image?.b64_json;
  if (!imageEncoded) {
    console.error("Failed to vectorize image", data);
    return NextResponse.json({ error: "Failed to vectorize image" }, { status: 500 });
  }

  // Upload vectorized image to Supabase storage
  const imageBytes = Buffer.from(imageEncoded, "base64");
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(`${user.id}/${logoProjectId}/${logoGenerationId}/logo.svg`, imageBytes, {
      contentType: "image/svg+xml",
      upsert: true,
    });
  if (uploadError) {
    console.error("Failed to upload vectorized image", uploadError);
    return NextResponse.json({ error: "Failed to upload vectorized image" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
