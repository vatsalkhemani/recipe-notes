# 🍲 Recipe Notes

A personal, installable web app for recipes you learn from people. Record a voice
note, and AI turns it into a clean recipe — ingredients, steps with durations,
emoji, tags — with the original audio kept for playback. Edit anything, search,
and filter by tag. Built mobile-first as a PWA.

## Features
- **Card grid** of dishes with emoji / cover photo, "learnt from", and total time
- **Voice add flow**: record → AI transcribes (Groq Whisper) → structures into a recipe (LLM via OpenRouter) → review in an editor → save
- **Manual add** and full **edit mode** for every field
- **Voice note playback** on each recipe
- **Search** (title, person, ingredients) + **tag filters**
- **Google sign-in**, private per-account, synced across devices (Firestore + Storage), offline-first cache
- Installable to the home screen (PWA)

## Tech
Next.js (App Router) · React · Tailwind v4 · Firebase (Auth, Firestore, Storage)
· framer-motion · lucide-react · Groq Whisper · OpenRouter.

## Setup

### 1. Install
```bash
npm install
cp .env.local.example .env.local
```

### 2. Firebase
1. Create a project at https://console.firebase.google.com
2. **Authentication** → enable **Google** sign-in.
3. **Firestore Database** → create (production mode).
4. **Storage** → enable.
5. Project settings → add a **Web app**, copy the config into the
   `NEXT_PUBLIC_FIREBASE_*` vars in `.env.local`.
6. Deploy the security rules (in [`firestore.rules`](firestore.rules) and
   [`storage.rules`](storage.rules)) via the console or the Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

### 3. AI keys
- **Groq** (transcription): https://console.groq.com/keys → `GROQ_API_KEY`
- **OpenRouter** (structuring): https://openrouter.ai/keys → `OPENROUTER_API_KEY`
  (optional `OPENROUTER_MODEL`, default `anthropic/claude-3.5-sonnet`)

### 4. Run
```bash
npm run dev      # http://localhost:3000
npm run test     # unit tests
npm run build    # production build
```

## Try it without any backend
Set `NEXT_PUBLIC_E2E_MODE=true` in `.env.local`. The app signs you in as a fake
local user and stores recipes (and audio as data URLs) in `localStorage`, so the
whole UI works without Firebase. The AI "Make recipe" step still needs the Groq +
OpenRouter keys; otherwise use **Type it manually**.

## Notes
- AI keys are server-only and used solely inside the `src/app/api/*` route
  handlers — they are never shipped to the browser.
- iOS Safari records `audio/mp4`; other browsers use `audio/webm`. The recorder
  feature-detects the supported format. Both are accepted by Groq Whisper.
