export interface Step {
  text: string;
  durationMin: number | null;
}

export interface Recipe {
  id: string;
  title: string;
  emoji: string;
  learntFrom: string;
  tags: string[];
  servings: number | null;
  ingredients: string[];
  steps: Step[];
  totalTimeMin: number | null;
  audioUrl: string | null;
  audioPath: string | null;
  coverPhotoUrl: string | null;
  coverPhotoPath: string | null;
  transcript: string;
  createdAt: number | null;
  updatedAt: number | null;
}

// The editable shape of a recipe (everything except server-managed id/timestamps).
export type RecipeDraft = Omit<Recipe, "id" | "createdAt" | "updatedAt">;

export function emptyDraft(): RecipeDraft {
  return {
    title: "",
    emoji: "🍽️",
    learntFrom: "",
    tags: [],
    servings: null,
    ingredients: [],
    steps: [],
    totalTimeMin: null,
    audioUrl: null,
    audioPath: null,
    coverPhotoUrl: null,
    coverPhotoPath: null,
    transcript: "",
  };
}

// Sum of per-step durations, or null if none are set.
export function deriveTotalTime(steps: Step[]): number | null {
  const sum = steps.reduce((acc, s) => acc + (s.durationMin ?? 0), 0);
  return sum > 0 ? sum : null;
}
