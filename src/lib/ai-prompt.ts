// System prompt + helpers for turning a raw voice-note transcript into a
// structured recipe. The transcript is often Hinglish (Hindi + English mixed),
// conversational, and may include both the teacher and the learner speaking.

export const STRUCTURE_SYSTEM_PROMPT = `You convert messy spoken cooking instructions into a clean, structured recipe.

The transcript comes from a voice note where someone explains a dish. It may be:
- In English, Hindi, or a mix (Hinglish). Translate Hindi cooking terms naturally but keep well-known dish/ingredient names (e.g. "tadka", "jeera", "besan", "dal").
- Conversational, with filler, asides, and two people talking. Ignore chit-chat that isn't part of the recipe.

Return ONLY a JSON object (no markdown fences, no commentary) with exactly this shape:
{
  "title": string,            // short dish name, Title Case
  "emoji": string,            // a single emoji that best represents the dish
  "ingredients": string[],    // each item as spoken, with quantity if mentioned (e.g. "2 cups rice")
  "steps": [                  // ordered cooking steps
    { "text": string, "durationMin": number | null }  // durationMin = minutes for that step if stated/implied, else null
  ],
  "servings": number | null,  // number of servings if mentioned, else null
  "tags": string[]            // 2-4 lowercase tags like "vegetarian", "dessert", "quick", "snack", "curry"
}

Rules:
- Keep quantities exactly as spoken; do not invent amounts that weren't said.
- Infer durationMin only when a time is stated or strongly implied ("cook till golden, about 5 minutes" -> 5). Otherwise null.
- Steps should be concise imperative sentences.
- If the transcript is empty or not a recipe, return the shape with empty strings/arrays.`;

export interface StructuredRecipe {
  title: string;
  emoji: string;
  ingredients: string[];
  steps: { text: string; durationMin: number | null }[];
  servings: number | null;
  tags: string[];
}

// LLMs sometimes wrap JSON in prose or ```json fences. Extract the first object.
export function parseStructuredRecipe(raw: string): StructuredRecipe {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

  const parsed = JSON.parse(text) as Partial<StructuredRecipe>;

  const steps = Array.isArray(parsed.steps)
    ? parsed.steps.map((s) => ({
        text: String((s as { text?: unknown })?.text ?? "").trim(),
        durationMin:
          typeof (s as { durationMin?: unknown })?.durationMin === "number"
            ? (s as { durationMin: number }).durationMin
            : null,
      }))
    : [];

  return {
    title: typeof parsed.title === "string" ? parsed.title.trim() : "",
    emoji: typeof parsed.emoji === "string" && parsed.emoji ? parsed.emoji : "🍽️",
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map((i) => String(i).trim()).filter(Boolean)
      : [],
    steps: steps.filter((s) => s.text),
    servings: typeof parsed.servings === "number" ? parsed.servings : null,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
      : [],
  };
}
