import { NextResponse } from "next/server";
import {
  STRUCTURE_SYSTEM_PROMPT,
  parseStructuredRecipe,
} from "@/lib/ai-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

// Accepts { transcript } JSON, returns a StructuredRecipe.
export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Structuring is not configured (missing OPENROUTER_API_KEY)." },
      { status: 500 }
    );
  }

  let transcript = "";
  try {
    const body = (await request.json()) as { transcript?: string };
    transcript = (body.transcript ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!transcript) {
    return NextResponse.json({ error: "No transcript provided." }, { status: 400 });
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: "Structuring failed.", detail },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";

    try {
      return NextResponse.json(parseStructuredRecipe(content));
    } catch {
      return NextResponse.json(
        { error: "Could not parse recipe from model output.", raw: content },
        { status: 502 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Structuring request error.", detail: String(e) },
      { status: 502 }
    );
  }
}
