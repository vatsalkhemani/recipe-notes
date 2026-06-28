"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Check,
} from "lucide-react";
import type { Recipe } from "@/lib/types";

// Minimal Wake Lock typing (not in all TS lib targets yet).
interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
interface WakeLockNavigator {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
}

// A "page" is either the ingredients prep screen (index 0) or a step.
// Mount this conditionally from the parent ({cooking && <CookMode .../>}) so its
// page state starts fresh each time cooking begins.
export function CookMode({
  recipe,
  onClose,
}: {
  recipe: Recipe;
  onClose: () => void;
}) {
  const pages = useMemo(() => recipe.steps.length + 1, [recipe.steps.length]);
  const [page, setPage] = useState(0);

  // Keep the screen awake while cooking.
  useEffect(() => {
    let sentinel: WakeLockSentinelLike | null = null;
    const nav = navigator as WakeLockNavigator;
    nav.wakeLock?.request("screen").then((s) => (sentinel = s)).catch(() => {});
    return () => {
      sentinel?.release().catch(() => {});
    };
  }, []);

  // Keyboard navigation + lock background scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, pages - 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, pages]);

  const onIngredients = page === 0;
  const stepIndex = page - 1;
  const step = onIngredients ? null : recipe.steps[stepIndex];
  const isLast = page === pages - 1;

  return (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-5">
            <span className="text-sm font-medium text-muted">
              {recipe.emoji} {recipe.title}
            </span>
            <button
              onClick={onClose}
              aria-label="Exit cook mode"
              className="rounded-full p-2 text-muted hover:bg-surface-muted"
            >
              <X size={22} />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 px-5 py-3">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                aria-label={`Go to ${i === 0 ? "ingredients" : `step ${i}`}`}
                onClick={() => setPage(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === page ? "w-6 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Page content */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.2 }}
                className="flex w-full max-w-lg flex-col items-center text-center"
              >
                {onIngredients ? (
                  <IngredientsPage recipe={recipe} />
                ) : (
                  step && (
                    <StepPage
                      index={stepIndex}
                      total={recipe.steps.length}
                      text={step.text}
                      durationMin={step.durationMin}
                    />
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom nav */}
          <div className="flex items-center justify-between gap-3 px-5 pb-8 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="flex items-center gap-1 rounded-full px-4 py-3 font-medium text-muted disabled:opacity-30"
            >
              <ChevronLeft size={20} /> Back
            </button>
            {isLast ? (
              <button
                onClick={onClose}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                <Check size={20} /> Done
              </button>
            ) : (
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pages - 1))}
                className="flex items-center gap-1 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                Next <ChevronRight size={20} />
              </button>
            )}
          </div>
        </motion.div>
  );
}

function IngredientsPage({ recipe }: { recipe: Recipe }) {
  return (
    <div className="flex w-full flex-col items-center">
      <span className="text-6xl">{recipe.emoji}</span>
      <h2 className="mt-3 text-2xl font-bold">Get everything ready</h2>
      {recipe.ingredients.length > 0 ? (
        <ul className="mt-6 flex w-full flex-col gap-2 text-left">
          {recipe.ingredients.map((ing, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-border"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="text-lg">{ing}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-muted">No ingredients listed.</p>
      )}
    </div>
  );
}

function StepPage({
  index,
  total,
  text,
  durationMin,
}: {
  index: number;
  total: number;
  text: string;
  durationMin: number | null;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-semibold uppercase tracking-wide text-primary">
        Step {index + 1} of {total}
      </span>
      <p className="mt-5 text-2xl font-medium leading-relaxed sm:text-3xl">
        {text}
      </p>
      {durationMin != null && durationMin > 0 && (
        <StepTimer minutes={durationMin} />
      )}
    </div>
  );
}

function StepTimer({ minutes }: { minutes: number }) {
  const total = minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Note: this component remounts per step (key={page} upstream), so state
  // initializes fresh for each step's duration — no reset effect needed.

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          // Gentle finish cue.
          try {
            navigator.vibrate?.(400);
          } catch {}
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const done = remaining === 0;

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div
        className={`font-mono text-5xl tabular-nums ${
          done ? "text-primary" : ""
        }`}
      >
        {mm}:{ss.toString().padStart(2, "0")}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          disabled={done}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
        >
          {running ? <Pause size={18} /> : <Play size={18} />}
          {running ? "Pause" : done ? "Done" : "Start timer"}
        </button>
        <button
          onClick={() => {
            setRemaining(total);
            setRunning(false);
          }}
          aria-label="Reset timer"
          className="rounded-full p-2.5 text-muted ring-1 ring-border hover:bg-surface-muted"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
