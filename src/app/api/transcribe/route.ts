import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Accepts multipart form-data with an `audio` file, returns { transcript }.
export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Transcription is not configured (missing GROQ_API_KEY)." },
      { status: 500 }
    );
  }

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (file instanceof File) audio = file;
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  if (!audio) {
    return NextResponse.json({ error: "No audio provided." }, { status: 400 });
  }

  const groqForm = new FormData();
  groqForm.append("file", audio, audio.name || "recording.webm");
  groqForm.append("model", "whisper-large-v3");
  // Hint the model toward cooking + Hinglish context for better accuracy.
  groqForm.append(
    "prompt",
    "A cooking recipe explained casually in a mix of Hindi and English."
  );
  groqForm.append("response_format", "json");
  groqForm.append("temperature", "0");

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: "Transcription failed.", detail },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ transcript: (data.text ?? "").trim() });
  } catch (e) {
    return NextResponse.json(
      { error: "Transcription request error.", detail: String(e) },
      { status: 502 }
    );
  }
}
