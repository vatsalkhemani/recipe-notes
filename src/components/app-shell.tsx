"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, LogOut } from "lucide-react";
import { useAuth } from "./auth-provider";
import { SearchBar } from "./search-bar";
import { RecipeGrid } from "./recipe-grid";
import { RecipeDetail } from "./recipe-detail";
import { AddRecipeFlow } from "./add-recipe-flow";
import {
  subscribeRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "@/lib/recipes";
import type { Recipe } from "@/lib/types";

export function AppShell() {
  const { user, signOut } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeRecipes(user.uid, setRecipes);
  }, [user]);

  // Keep the open detail in sync with live updates / deletions.
  const selectedLive = selected
    ? recipes.find((r) => r.id === selected.id) ?? null
    : null;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesTags = activeTags.every((t) => r.tags.includes(t));
      if (!matchesTags) return false;
      if (!q) return true;
      const haystack = [
        r.title,
        r.learntFrom,
        ...r.tags,
        ...r.ingredients,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [recipes, query, activeTags]);

  const toggleTag = (tag: string) =>
    setActiveTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );

  // Duplicate a recipe as a starting point for a similar one. The voice note and
  // transcript belong to the original recording, so they're dropped on the copy.
  const handleClone = async (recipe: Recipe) => {
    if (!user) return;
    await createRecipe(user.uid, {
      title: `${recipe.title} (copy)`,
      emoji: recipe.emoji,
      learntFrom: recipe.learntFrom,
      tags: [...recipe.tags],
      servings: recipe.servings,
      ingredients: [...recipe.ingredients],
      steps: recipe.steps.map((s) => ({ ...s })),
      totalTimeMin: recipe.totalTimeMin,
      coverPhotoUrl: recipe.coverPhotoUrl,
      coverPhotoPath: recipe.coverPhotoPath,
      audioUrl: null,
      audioPath: null,
      transcript: "",
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight">🍲 Recipe Notes</h1>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">
              {user?.displayName}
            </span>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="rounded-full p-2 text-muted transition hover:bg-surface-muted"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        <div className="mb-4">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            allTags={allTags}
            activeTags={activeTags}
            onToggleTag={toggleTag}
          />
        </div>
        <RecipeGrid recipes={filtered} onSelect={setSelected} />
      </main>

      <button
        onClick={() => setAdding(true)}
        aria-label="Add recipe"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary-hover active:scale-95"
      >
        <Plus size={26} />
      </button>

      {selectedLive && (
        <RecipeDetail
          recipe={selectedLive}
          open={!!selectedLive}
          onClose={() => setSelected(null)}
          onSave={(id, draft) => updateRecipe(user!.uid, id, draft)}
          onDelete={(r) => deleteRecipe(user!.uid, r)}
          onClone={handleClone}
        />
      )}

      <AddRecipeFlow open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
