"use client";

import { useState } from "react";
import { Clock, User, Pencil, Trash2, Users } from "lucide-react";
import type { Recipe, RecipeDraft } from "@/lib/types";
import { ModalSheet } from "./modal-sheet";
import { RecipeEditor } from "./recipe-editor";

interface RecipeDetailProps {
  recipe: Recipe;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, draft: RecipeDraft) => Promise<void>;
  onDelete: (recipe: Recipe) => Promise<void>;
}

export function RecipeDetail({
  recipe,
  open,
  onClose,
  onSave,
  onDelete,
}: RecipeDetailProps) {
  const [editing, setEditing] = useState(false);

  const draft: RecipeDraft = {
    title: recipe.title,
    emoji: recipe.emoji,
    learntFrom: recipe.learntFrom,
    tags: recipe.tags,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    totalTimeMin: recipe.totalTimeMin,
    audioUrl: recipe.audioUrl,
    audioPath: recipe.audioPath,
    coverPhotoUrl: recipe.coverPhotoUrl,
    coverPhotoPath: recipe.coverPhotoPath,
    transcript: recipe.transcript,
  };

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  return (
    <ModalSheet
      open={open}
      onClose={handleClose}
      title={editing ? "Edit recipe" : `${recipe.emoji} ${recipe.title}`}
      headerAction={
        !editing && (
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit"
            className="rounded-full p-2 text-muted transition hover:bg-surface-muted"
          >
            <Pencil size={18} />
          </button>
        )
      }
    >
      {editing ? (
        <RecipeEditor
          initial={draft}
          saveLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSave={async (d) => {
            await onSave(recipe.id, d);
            setEditing(false);
          }}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {recipe.coverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.coverPhotoUrl}
              alt=""
              className="h-44 w-full rounded-2xl object-cover"
            />
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {recipe.learntFrom && (
              <span className="flex items-center gap-1.5">
                <User size={15} /> {recipe.learntFrom}
              </span>
            )}
            {recipe.servings != null && (
              <span className="flex items-center gap-1.5">
                <Users size={15} /> {recipe.servings} servings
              </span>
            )}
            {recipe.totalTimeMin != null && (
              <span className="flex items-center gap-1.5">
                <Clock size={15} /> {recipe.totalTimeMin} min
              </span>
            )}
          </div>

          {recipe.audioUrl && (
            <div className="rounded-2xl bg-surface-muted p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Voice note
              </p>
              <audio controls src={recipe.audioUrl} className="w-full" />
            </div>
          )}

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {recipe.ingredients.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold">Ingredients</h3>
              <ul className="flex flex-col gap-1.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recipe.steps.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold">Steps</h3>
              <ol className="flex flex-col gap-3">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <p>{step.text}</p>
                      {step.durationMin != null && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <Clock size={12} /> {step.durationMin} min
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {recipe.transcript && (
            <details className="rounded-xl bg-surface-muted p-3 text-sm text-muted">
              <summary className="cursor-pointer font-medium">
                Original transcript
              </summary>
              <p className="mt-2 whitespace-pre-wrap">{recipe.transcript}</p>
            </details>
          )}

          <button
            onClick={() => {
              if (confirm(`Delete "${recipe.title}"?`)) {
                onDelete(recipe).then(handleClose);
              }
            }}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 font-medium text-muted hover:border-primary hover:text-primary"
          >
            <Trash2 size={16} /> Delete recipe
          </button>
        </div>
      )}
    </ModalSheet>
  );
}
