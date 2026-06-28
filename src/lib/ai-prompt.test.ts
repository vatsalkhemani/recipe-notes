import { describe, it, expect } from "vitest";
import { parseStructuredRecipe } from "./ai-prompt";
import { deriveTotalTime } from "./types";

describe("parseStructuredRecipe", () => {
  it("parses a clean JSON object", () => {
    const r = parseStructuredRecipe(
      JSON.stringify({
        title: "Aloo Paratha",
        emoji: "🫓",
        ingredients: ["2 cups atta", "3 potatoes"],
        steps: [{ text: "Boil potatoes", durationMin: 10 }],
        servings: 4,
        tags: ["breakfast", "vegetarian"],
      })
    );
    expect(r.title).toBe("Aloo Paratha");
    expect(r.ingredients).toHaveLength(2);
    expect(r.steps[0].durationMin).toBe(10);
    expect(r.servings).toBe(4);
  });

  it("strips markdown code fences", () => {
    const r = parseStructuredRecipe(
      '```json\n{"title":"Chai","emoji":"☕","ingredients":[],"steps":[],"servings":null,"tags":[]}\n```'
    );
    expect(r.title).toBe("Chai");
    expect(r.emoji).toBe("☕");
  });

  it("extracts the object when wrapped in prose", () => {
    const r = parseStructuredRecipe(
      'Here is your recipe: {"title":"Dal","emoji":"🍲","ingredients":["1 cup dal"],"steps":[{"text":"Cook","durationMin":null}],"servings":2,"tags":["curry"]} Enjoy!'
    );
    expect(r.title).toBe("Dal");
    expect(r.steps[0].durationMin).toBeNull();
  });

  it("applies safe defaults for missing/invalid fields", () => {
    const r = parseStructuredRecipe('{"title":"X"}');
    expect(r.emoji).toBe("🍽️");
    expect(r.ingredients).toEqual([]);
    expect(r.steps).toEqual([]);
    expect(r.tags).toEqual([]);
    expect(r.servings).toBeNull();
  });

  it("drops steps without text", () => {
    const r = parseStructuredRecipe(
      '{"steps":[{"text":"","durationMin":5},{"text":"Fry","durationMin":2}]}'
    );
    expect(r.steps).toHaveLength(1);
    expect(r.steps[0].text).toBe("Fry");
  });

  it("throws on non-JSON so callers can fall back", () => {
    expect(() => parseStructuredRecipe("totally not json")).toThrow();
  });
});

describe("deriveTotalTime", () => {
  it("sums step durations", () => {
    expect(
      deriveTotalTime([
        { text: "a", durationMin: 5 },
        { text: "b", durationMin: 10 },
        { text: "c", durationMin: null },
      ])
    ).toBe(15);
  });

  it("returns null when no durations", () => {
    expect(deriveTotalTime([{ text: "a", durationMin: null }])).toBeNull();
  });
});
