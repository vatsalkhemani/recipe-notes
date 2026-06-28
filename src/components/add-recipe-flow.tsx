"use client";

import { useState } from "react";
import { Mic, Square, Pencil, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { ModalSheet } from "./modal-sheet";
import { RecipeEditor } from "./recipe-editor";
import { useAuth } from "./auth-provider";
import { useRecorder } from "@/lib/use-recorder";
import { createRecipe, uploadAudio } from "@/lib/recipes";
import { emptyDraft, type RecipeDraft } from "@/lib/types";
import type { StructuredRecipe } from "@/lib/ai-prompt";

type Stage = "choose" | "record" | "processing" | "edit";

export function AddRecipeFlow({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const recorder = useRecorder();
  const [stage, setStage] = useState<Stage>("choose");
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    recorder.reset();
    setDraft(emptyDraft());
    setError(null);
    setStage("choose");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const startManual = () => {
    setDraft(emptyDraft());
    setStage("edit");
  };

  const process = async () => {
    if (!recorder.recording || !user) return;
    setError(null);
    setStage("processing");
    const { blob, ext } = recorder.recording;

    try {
      // 1. Upload original audio so the saved recipe plays back the real note.
      const uploadPromise = uploadAudio(user.uid, blob, ext);

      // 2. Transcribe.
      const form = new FormData();
      form.append("audio", blob, `recording.${ext}`);
      const tRes = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!tRes.ok) throw new Error((await tRes.json()).error || "Transcription failed");
      const { transcript } = (await tRes.json()) as { transcript: string };

      // 3. Structure.
      const sRes = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!sRes.ok) throw new Error((await sRes.json()).error || "Structuring failed");
      const structured = (await sRes.json()) as StructuredRecipe;

      const { url, path } = await uploadPromise;

      setDraft({
        ...emptyDraft(),
        title: structured.title,
        emoji: structured.emoji,
        ingredients: structured.ingredients,
        steps: structured.steps,
        servings: structured.servings,
        tags: structured.tags,
        transcript,
        audioUrl: url,
        audioPath: path,
      });
      setStage("edit");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong processing the note."
      );
      setStage("record");
    }
  };

  const handleSave = async (d: RecipeDraft) => {
    if (!user) return;
    await createRecipe(user.uid, d);
    handleClose();
  };

  const titleByStage: Record<Stage, string> = {
    choose: "Add a recipe",
    record: "Record a voice note",
    processing: "Working on it…",
    edit: "Review & save",
  };

  return (
    <ModalSheet open={open} onClose={handleClose} title={titleByStage[stage]}>
      {stage === "choose" && (
        <div className="flex flex-col gap-3 py-2">
          <button
            onClick={() => setStage("record")}
            className="flex items-center gap-4 rounded-2xl bg-primary p-4 text-left text-primary-foreground transition hover:bg-primary-hover"
          >
            <Mic size={28} />
            <span>
              <span className="block font-semibold">Record a voice note</span>
              <span className="block text-sm opacity-90">
                AI transcribes it into a recipe
              </span>
            </span>
          </button>
          <button
            onClick={startManual}
            className="flex items-center gap-4 rounded-2xl bg-surface p-4 text-left ring-1 ring-border transition hover:bg-surface-muted"
          >
            <Pencil size={26} className="text-primary" />
            <span>
              <span className="block font-semibold">Type it manually</span>
              <span className="block text-sm text-muted">
                Enter the recipe yourself
              </span>
            </span>
          </button>
        </div>
      )}

      {stage === "record" && (
        <div className="flex flex-col items-center gap-6 py-6">
          {recorder.error && (
            <p className="text-center text-sm text-primary">{recorder.error}</p>
          )}
          {error && <p className="text-center text-sm text-primary">{error}</p>}

          {recorder.state !== "recorded" && (
            <>
              <div className="font-mono text-4xl tabular-nums">
                {formatTime(recorder.seconds)}
              </div>
              {recorder.state === "idle" ? (
                <button
                  onClick={recorder.start}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary-hover active:scale-95"
                  aria-label="Start recording"
                >
                  <Mic size={32} />
                </button>
              ) : (
                <button
                  onClick={recorder.stop}
                  className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                  aria-label="Stop recording"
                >
                  <Square size={28} fill="currentColor" />
                </button>
              )}
              <p className="text-sm text-muted">
                {recorder.state === "idle"
                  ? "Tap to start recording the recipe"
                  : "Recording… tap to stop"}
              </p>
            </>
          )}

          {recorder.state === "recorded" && recorder.recording && (
            <div className="flex w-full flex-col gap-4">
              <audio
                controls
                src={recorder.recording.url}
                className="w-full"
              />
              <div className="flex gap-3">
                <button
                  onClick={recorder.reset}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 font-medium hover:bg-surface-muted"
                >
                  <RotateCcw size={16} /> Re-record
                </button>
                <button
                  onClick={process}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  <Sparkles size={16} /> Make recipe
                </button>
              </div>
              <button
                onClick={startManual}
                className="text-sm text-muted underline"
              >
                Skip AI and type manually
              </button>
            </div>
          )}
        </div>
      )}

      {stage === "processing" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="font-medium">Transcribing and writing your recipe…</p>
          <p className="text-sm text-muted">This usually takes a few seconds.</p>
        </div>
      )}

      {stage === "edit" && (
        <RecipeEditor
          initial={draft}
          saveLabel="Save recipe"
          onCancel={handleClose}
          onSave={handleSave}
        />
      )}
    </ModalSheet>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
