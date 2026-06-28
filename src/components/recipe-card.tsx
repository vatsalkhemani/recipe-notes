"use client";

import { motion } from "framer-motion";
import { Clock, User, Mic } from "lucide-react";
import type { Recipe } from "@/lib/types";

export function RecipeCard({
  recipe,
  onClick,
}: {
  recipe: Recipe;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-2xl bg-surface text-left shadow-sm ring-1 ring-border transition hover:shadow-md"
    >
      <div className="relative flex h-28 items-center justify-center bg-surface-muted">
        {recipe.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.coverPhotoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-5xl">{recipe.emoji || "🍽️"}</span>
        )}
        {recipe.audioUrl && (
          <span className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-primary shadow-sm">
            <Mic size={14} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 font-semibold leading-snug">
          {recipe.title || "Untitled recipe"}
        </h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {recipe.learntFrom && (
            <span className="flex items-center gap-1">
              <User size={12} /> {recipe.learntFrom}
            </span>
          )}
          {recipe.totalTimeMin != null && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {recipe.totalTimeMin}m
            </span>
          )}
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}
