"use client";

import { useCallback, useRef, useState } from "react";

export interface Recording {
  blob: Blob;
  url: string;
  /** File extension matching the blob's mime type (webm / mp4 / wav). */
  ext: string;
}

// Pick a mime type the current browser actually supports. iOS Safari only
// records mp4/aac; Chrome/Firefox prefer webm.
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg", ""];
  return candidates.find(
    (t) => t === "" || MediaRecorder.isTypeSupported(t)
  );
}

function extFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

type RecorderState = "idle" | "recording" | "recorded";

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setRecording({
          blob,
          url: URL.createObjectURL(blob),
          ext: extFor(type),
        });
        setState("recorded");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was denied or is unavailable.");
    }
  }, []);

  const stop = useCallback(() => {
    stopTimer();
    recorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    if (recording) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setSeconds(0);
    setState("idle");
    setError(null);
  }, [recording]);

  return { state, recording, error, seconds, start, stop, reset };
}
