# Technical Overview

This document explains how the app is built, what technologies were chosen, and *why* — in plain language, without assuming deep technical background.

---

## The Big Picture

The app has four parts:

```
Your phone (browser)
    │
    ├─ voice recording ──→ Next.js server ──→ Groq API (transcribe + structure)
    │                          │
    ├─ audio / photo files ──→ Next.js server ──→ Cloudinary (file hosting)
    │
    └─ recipe text (+ file URLs) ──→ Firebase Firestore (database + sync)
```

When you record a voice note, your phone sends the audio to the Next.js server. The server calls Groq to transcribe it, then calls Groq again to turn the text into a structured recipe. The original audio file is uploaded to Cloudinary (which returns a URL). The final recipe — text plus the Cloudinary URLs — is saved to Firebase Firestore so it syncs to all your devices.

---

## Frontend: Next.js + React

**What it is:** Next.js is the framework the app is built in. React is what powers the UI (buttons, cards, forms).

**Why Next.js (not a plain React app or native iOS app)?**
- It lets you write both the UI *and* the server-side API (that calls Groq) in one codebase
- Critically: the Groq API key lives on the server side and is never exposed to the browser
- Can be deployed for free on Vercel in one command
- Works as a PWA (installable to your iPhone home screen) with no App Store needed
- You already had a working Next.js project (`broke-app`) to reference patterns from

**Why not a native iPhone app (Swift/Flutter)?**
- Would need to go through the App Store (review process, certificates, paid developer account)
- Much more complex build pipeline
- The PWA approach gives 90% of the native feel (home screen icon, full screen, offline) with none of the overhead

---

## Styling: Tailwind CSS v4

**What it is:** A way to style the UI by writing utility class names directly in the component code (e.g. `rounded-2xl bg-surface shadow-sm`).

**Why Tailwind?**
- Already in your `broke-app` stack, so no new tooling to learn
- Fast to iterate — you change the class, you see the result immediately
- The warm `--primary: #e2603b` (orange-red) and `--background: #fbf6ef` (warm off-white) colour palette is defined in `globals.css` as CSS variables and used everywhere

---

## Animations: Framer Motion

**What it is:** A library that makes things animate smoothly — the modal sliding up from the bottom, cards fading in, pages sliding in Cook Mode.

**Why?** It makes the app feel polished and native. Spring animations in particular (used on the modal sheet) feel physically natural. Also already in your `broke-app`.

---

## Auth + Data: Firebase

Firebase is a set of backend services from Google. This app uses three of them:

### Firebase Authentication
**What it does:** Handles Google sign-in. When you tap "Continue with Google", Firebase manages the entire login process — OAuth tokens, session management, everything.

**Why Google sign-in specifically?** One tap, no password to remember, no email verification. The fastest possible path to "logged in".

### Firestore (database)
**What it does:** Stores all your recipe data — title, ingredients, steps, who taught you, tags, etc. — as documents in a NoSQL database.

**Why Firestore?**
- Real-time sync: when you save a recipe on your phone, it appears on your laptop without refreshing
- Offline-first cache: recipes you've already loaded are readable even with no internet (via IndexedDB in the browser)
- Per-user security rules: `firestore.rules` says "a logged-in user can only see their own recipes" — one file, enforced by Google's servers, not your code

### Firebase Storage
**What it does:** Stores binary files — your original voice note recordings (`.webm` or `.m4a`) and any cover photos you upload.

**Why not store audio in Firestore?** Firestore is for structured text data; it has a 1MB document size limit. Audio files are often 5–30MB. Storage is built for large files.

**Cost:** The free tier (Spark plan) gives you 1GB storage and 10GB/month download. For personal use this is essentially infinite.

---

## AI: Groq

Groq is an AI API provider that hosts open-source models and makes them very fast (they have custom hardware called LPUs).

The app uses Groq for **two separate AI calls**, both triggered by the same `GROQ_API_KEY`:

### Call 1 — Transcription (Whisper)

**Model:** `whisper-large-v3`

**What it does:** Converts the audio recording to text. Whisper is OpenAI's open-source transcription model; Groq hosts it and runs it very fast (~3–5 seconds for a 2-minute recording).

**Why Whisper?** It's the best open-source transcription model available. Critically, it handles **Hinglish** (Hindi + English mixed) well — which is exactly what family recipe recordings sound like. It's also free on Groq's tier.

**The prompt hint:** The app sends a hint to Whisper: *"A cooking recipe explained casually in a mix of Hindi and English."* This nudges the model to handle Hindi cooking terms (jeera, tadka, besan) correctly.

### Call 2 — Recipe Structuring (LLM)

**Model:** `llama-3.3-70b-versatile` (default, changeable via `GROQ_MODEL` env var)

**What it does:** Takes the raw transcript text and outputs a structured JSON recipe:
```json
{
  "title": "Aloo Paratha",
  "emoji": "🫓",
  "ingredients": ["2 cups whole wheat flour", "3 boiled potatoes"],
  "steps": [
    { "text": "Knead the dough", "durationMin": 5 },
    { "text": "Roll and cook on tawa", "durationMin": 8 }
  ],
  "servings": 4,
  "tags": ["breakfast", "vegetarian"]
}
```

**Why Llama 3.3 70B?**
- It's one of the best open-source LLMs available (Meta's model, released 2024)
- 70 billion parameters means it understands context well and can handle Hinglish naturally
- Free on Groq's tier
- `response_format: { type: "json_object" }` forces it to output valid JSON directly — no parsing guesswork

**Why not use Claude (Anthropic)?** A Claude.ai subscription is for using Claude in the chat interface — it doesn't give you API access. The Anthropic API is a separate pay-per-token product. We use Groq + open-source models instead so this app costs nothing to run.

**Why not OpenAI?** We initially planned to use OpenRouter (which can proxy to OpenAI or Claude), but Groq already handles both transcription *and* text generation. One provider, one API key, one fewer moving part.

**The structuring prompt** lives in `src/lib/ai-prompt.ts`. Key rules it enforces:
- Don't invent quantities that weren't mentioned
- Infer step duration only when the speaker actually says a time ("cook for 5 minutes")
- Keep Hindi cooking terms that are well-known (tadka, jeera)
- Translate the rest naturally into English

---

## Recording: MediaRecorder API (browser built-in)

**What it is:** A browser API that lets you record audio using the device microphone — no external library needed.

**The iOS Safari problem:** iOS Safari records in `audio/mp4` format. Chrome and Firefox record in `audio/webm`. The app feature-detects which format is supported and uses whichever works. Groq Whisper accepts both.

**The hook:** `src/lib/use-recorder.ts` wraps MediaRecorder in a React hook with states: `idle → recording → recorded`. It handles mic permission requests, timers, and cleans up blob URLs to prevent memory leaks.

---

## API Security

The Groq API key is **server-only**. It lives in `.env.local` which is never committed to git and never bundled into the browser JavaScript. The two API routes (`/api/transcribe` and `/api/structure`) are Next.js Route Handlers that run on the server — the browser just calls `POST /api/transcribe` and gets back a transcript, never seeing the key.

This is why the architecture has a Next.js server in the middle rather than calling Groq directly from the browser.

---

## PWA (Progressive Web App)

Three files make this installable:

1. **`public/manifest.json`** — tells the browser the app name, icon, theme colour, and that it should open full-screen without browser chrome
2. **`public/sw.js`** — a service worker that caches the app shell so the page loads even offline (Firestore handles data sync separately)
3. **`src/components/sw-register.tsx`** — registers the service worker on first load

On iOS: Safari → Share → Add to Home Screen → gives you a home screen icon that opens full-screen.

---

## Testing

**Framework:** Vitest (same API as Jest but faster, and already in the `broke-app` pattern)

**What's tested:**
- `parseStructuredRecipe` — the JSON parser that handles LLM output. Tests cover: clean JSON, JSON wrapped in markdown fences, JSON buried in prose, missing fields (safe defaults), empty step text, and invalid JSON (should throw).
- `deriveTotalTime` — the helper that sums per-step durations. Tests cover: normal sum, all-null steps.

**Why these specifically?** The AI output parser is the most brittle part of the system — LLMs sometimes add text around the JSON, use markdown code fences, or omit optional fields. Having tests here means you can safely change the prompt or switch models and immediately know if parsing broke.

---

## E2E / Preview Mode

Setting `NEXT_PUBLIC_E2E_MODE=true` switches the entire data layer from Firebase to `localStorage`:
- Auth: fake user ("Home Cook") is injected, no Google login needed
- Firestore: recipes stored as JSON in `localStorage`
- Storage: audio/photos stored as base64 data URLs in `localStorage`

This lets you run and test the full UI without any backend credentials. Used during development and for verifying features in the browser preview.

---

## Dependency Summary

| Package | What it does | Why this one |
|---|---|---|
| `next` | App framework | Full-stack, App Router, PWA-friendly |
| `react` / `react-dom` | UI library | Industry standard |
| `firebase` | Auth + database + storage | Free tier, real-time sync, offline cache |
| `framer-motion` | Animations | Best-in-class for React, spring physics |
| `lucide-react` | Icons | Clean, consistent, tree-shakeable |
| `tailwindcss` | Styling | Fast iteration, consistent design tokens |
| `vitest` | Unit tests | Fast, zero-config, same API as Jest |

No other runtime dependencies. The AI calls are plain `fetch()` to Groq's API — no SDK needed.
