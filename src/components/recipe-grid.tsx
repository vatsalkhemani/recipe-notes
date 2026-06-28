"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Recipe } from "@/lib/types";
import { RecipeCard } from "./recipe-card";

export function RecipeGrid({
  recipes,
  onSelect,
}: {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
}) {
  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted">
        <span className="text-5xl">🍳</span>
        <p className="font-medium">No recipes yet</p>
        <p className="max-w-xs text-sm">
          Tap the + button to record a voice note and let AI turn it into a
          recipe.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      <AnimatePresence>
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={() => onSelect(recipe)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
