"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import type { RecipeDraft } from "@/lib/types";
import { deriveTotalTime } from "@/lib/types";
import { uploadCover } from "@/lib/recipes";
import { useAuth } from "./auth-provider";

const EMOJI_CHOICES = [
  "🍽️", "🍲", "🍛", "🍜", "🍝", "🥘", "🍚", "🥗", "🌮", "🥞",
  "🍳", "🧁", "🍰", "🍪", "🥧", "🍞", "🫓", "🥟", "🍢", "☕",
];

interface RecipeEditorProps {
  initial: RecipeDraft;
  onCancel: () => void;
  onSave: (draft: RecipeDraft) => Promise<void>;
  saveLabel?: string;
}

export function RecipeEditor({
  initial,
  onCancel,
  onSave,
  saveLabel = "Save",
}: RecipeEditorProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<RecipeDraft>(initial);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const updateIngredient = (i: number, value: string) =>
    set(
      "ingredients",
      draft.ingredients.map((ing, idx) => (idx === i ? value : ing))
    );

  const updateStep = (i: number, value: Partial<{ text: string; durationMin: number | null }>) =>
    set(
      "steps",
      draft.steps.map((s, idx) => (idx === i ? { ...s, ...value } : s))
    );

  // Swap a step with its neighbour to reorder, and insert a blank step at any position.
  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.steps.length) return;
    const steps = [...draft.steps];
    [steps[i], steps[j]] = [steps[j], steps[i]];
    set("steps", steps);
  };

  const insertStepAfter = (i: number) => {
    const steps = [...draft.steps];
    steps.splice(i + 1, 0, { text: "", durationMin: null });
    set("steps", steps);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !draft.tags.includes(t)) set("tags", [...draft.tags, t]);
    setTagInput("");
  };

  const handleCover = async (file: File) => {
    if (!user) return;
    setUploadingCover(true);
    try {
      const { url, path } = await uploadCover(user.uid, file);
      setDraft((d) => ({ ...d, coverPhotoUrl: url, coverPhotoPath: path }));
    } catch {
      alert("Couldn't upload the photo. Please try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Commit any tag still sitting in the input that wasn't blurred/entered.
      const pendingTag = tagInput.trim().toLowerCase();
      const tags =
        pendingTag && !draft.tags.includes(pendingTag)
          ? [...draft.tags, pendingTag]
          : draft.tags;
      const totalTimeMin = draft.totalTimeMin ?? deriveTotalTime(draft.steps);
      await onSave({
        ...draft,
        tags,
        title: draft.title.trim() || "Untitled recipe",
        ingredients: draft.ingredients.map((i) => i.trim()).filter(Boolean),
        steps: draft.steps.filter((s) => s.text.trim()),
        totalTimeMin,
      });
    } catch {
      alert("Couldn't save the recipe. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Title + emoji */}
      <div className="flex gap-3">
        <EmojiPicker value={draft.emoji} onChange={(e) => set("emoji", e)} />
        <input
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Dish name"
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-lg font-semibold outline-none focus:border-primary"
        />
      </div>

      <Field label="Learnt from">
        <input
          value={draft.learntFrom}
          onChange={(e) => set("learntFrom", e.target.value)}
          placeholder="e.g. Mom, Ravi uncle"
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Servings">
          <input
            type="number"
            inputMode="numeric"
            value={draft.servings ?? ""}
            onChange={(e) =>
              set("servings", e.target.value ? Number(e.target.value) : null)
            }
            placeholder="—"
            className="input"
          />
        </Field>
        <Field label="Total time (min)">
          <input
            type="number"
            inputMode="numeric"
            value={draft.totalTimeMin ?? ""}
            onChange={(e) =>
              set("totalTimeMin", e.target.value ? Number(e.target.value) : null)
            }
            placeholder="auto"
            className="input"
          />
        </Field>
      </div>

      {/* Tags */}
      <Field label="Tags">
        <div className="flex flex-wrap items-center gap-2">
          {draft.tags.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                set("tags", draft.tags.filter((t) => t !== tag))
              }
              className="rounded-full bg-surface-muted px-3 py-1 text-sm"
            >
              {tag} ✕
            </button>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="add tag"
            className="w-24 flex-1 rounded-xl border border-border bg-surface px-3 py-1 text-sm outline-none focus:border-primary"
          />
        </div>
      </Field>

      {/* Ingredients */}
      <Field label="Ingredients">
        <div className="flex flex-col gap-2">
          {draft.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={ing}
                onChange={(e) => updateIngredient(i, e.target.value)}
                className="input flex-1"
              />
              <RowDelete
                onClick={() =>
                  set(
                    "ingredients",
                    draft.ingredients.filter((_, idx) => idx !== i)
                  )
                }
              />
            </div>
          ))}
          <AddRow
            label="Add ingredient"
            onClick={() => set("ingredients", [...draft.ingredients, ""])}
          />
        </div>
      </Field>

      {/* Steps */}
      <Field label="Steps">
        <div className="flex flex-col gap-3">
          {draft.steps.map((step, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex flex-col items-center gap-1">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label="Move step up"
                  disabled={i === 0}
                  onClick={() => moveStep(i, -1)}
                  className="rounded p-0.5 text-muted hover:bg-surface-muted disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Move step down"
                  disabled={i === draft.steps.length - 1}
                  onClick={() => moveStep(i, 1)}
                  className="rounded p-0.5 text-muted hover:bg-surface-muted disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <textarea
                  value={step.text}
                  onChange={(e) => updateStep(i, { text: e.target.value })}
                  rows={2}
                  className="input resize-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={step.durationMin ?? ""}
                    onChange={(e) =>
                      updateStep(i, {
                        durationMin: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="min"
                    className="input w-20"
                  />
                  <span className="text-sm text-muted">minutes</span>
                  <button
                    type="button"
                    onClick={() => insertStepAfter(i)}
                    className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-surface-muted"
                  >
                    <Plus size={14} /> below
                  </button>
                  <RowDelete
                    onClick={() =>
                      set(
                        "steps",
                        draft.steps.filter((_, idx) => idx !== i)
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <AddRow
            label="Add step"
            onClick={() =>
              set("steps", [...draft.steps, { text: "", durationMin: null }])
            }
          />
        </div>
      </Field>

      {/* Cover photo */}
      <Field label="Cover photo (optional)">
        <div className="flex items-center gap-3">
          {draft.coverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.coverPhotoUrl}
              alt=""
              className="h-16 w-16 rounded-xl object-cover"
            />
          )}
          <label className="cursor-pointer rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-muted">
            {uploadingCover ? "Uploading…" : draft.coverPhotoUrl ? "Change" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleCover(e.target.files[0])
              }
            />
          </label>
          {draft.coverPhotoUrl && (
            <button
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  coverPhotoUrl: null,
                  coverPhotoPath: null,
                }))
              }
              className="text-sm text-muted underline"
            >
              Remove
            </button>
          )}
        </div>
      </Field>

      {/* Actions */}
      <div className="sticky bottom-0 -mx-5 mt-2 flex gap-3 border-t border-border bg-background px-5 pb-1 pt-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border py-2.5 font-medium hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saveLabel}
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-2xl"
      >
        {value}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 grid w-56 grid-cols-5 gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
              className="rounded-lg p-1.5 text-xl hover:bg-surface-muted"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-surface-muted"
    >
      <Plus size={16} /> {label}
    </button>
  );
}

function RowDelete({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className={`rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-primary ${className}`}
    >
      <Trash2 size={16} />
    </button>
  );
}
