import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Proxies audio/image files to Cloudinary using an unsigned upload preset.
// Cloudinary free tier: 25GB storage, 25GB/month bandwidth. No credit card needed.
export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return NextResponse.json(
      { error: "Cloudinary is not configured (missing CLOUDINARY_CLOUD_NAME or CLOUDINARY_UPLOAD_PRESET)." },
      { status: 500 }
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("upload_preset", uploadPreset);
  // Use "video" resource type for audio — Cloudinary's "auto" or "video" handles audio files.
  const resourceType = file.type.startsWith("image/") ? "image" : "video";

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: "POST", body: form }
    );

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: "Cloudinary upload failed.", detail }, { status: 502 });
    }

    const data = (await res.json()) as { secure_url?: string; public_id?: string };
    return NextResponse.json({
      url: data.secure_url,
      path: data.public_id, // used for deletion later if needed
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Upload request error.", detail: String(e) },
      { status: 502 }
    );
  }
}
