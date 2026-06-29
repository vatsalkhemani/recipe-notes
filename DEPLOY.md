# Deploying Recipe Notes

The app is a standard Next.js app and deploys best on **Vercel** (made by the
Next.js team, free Hobby tier, zero config). The code is already on GitHub at
`github.com/vatsalkhemani/recipe-notes`, so deployment is mostly clicking + pasting
env vars.

> **Why you have to do these steps (not me):** deploying connects *your* Vercel
> and Google accounts and publishes the app under your identity. Those logins are
> yours — I can't (and shouldn't) sign in as you. Everything that didn't need your
> account is already done: the code builds clean and is pushed to GitHub.

---

## Step 1 — Create the Vercel project (3 min)

1. Go to [vercel.com](https://vercel.com) → sign up / log in **with GitHub**
2. Click **Add New → Project**
3. Find **recipe-notes** in the list → **Import**
4. Framework preset will auto-detect **Next.js** — leave all build settings as-is
5. **Before clicking Deploy**, expand **Environment Variables** and add all of these
   (copy the values from your local `.env.local`):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | (from .env.local) |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | (from .env.local) |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | (from .env.local) |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | (from .env.local) |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | (from .env.local) |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | (from .env.local) |
   | `CLOUDINARY_CLOUD_NAME` | (from .env.local) |
   | `CLOUDINARY_UPLOAD_PRESET` | (from .env.local) |
   | `GROQ_API_KEY` | (from .env.local) |

6. Click **Deploy**. Wait ~1 minute. You'll get a URL like
   `https://recipe-notes-xxxx.vercel.app`.

---

## Step 2 — Let Google sign-in work on the live URL (1 min, easy to miss)

Firebase only allows Google sign-in from domains you've approved. Your new Vercel
URL isn't approved yet, so login will fail until you add it.

1. [console.firebase.google.com](https://console.firebase.google.com) → your project
2. **Authentication → Settings → Authorized domains**
3. Click **Add domain** → paste your Vercel domain (e.g. `recipe-notes-xxxx.vercel.app`)
4. Save

If you later add a custom domain, add that here too.

---

## Step 3 — Done

Open your Vercel URL, sign in with Google, and add a recipe. On your iPhone:
Safari → Share → **Add to Home Screen** to install it.

---

## Updating the app later

Every `git push` to `main` auto-deploys a new version on Vercel — nothing else to do.

## Notes
- The `.env.local` file is gitignored and never leaves your machine — that's why the
  env vars must be entered in Vercel's dashboard separately.
- Cloudinary unsigned uploads work from any domain by default, so no extra config
  is needed there for production.
- Free-tier limits are generous for personal use: Vercel Hobby, Firebase Spark
  (Auth + Firestore), Cloudinary free (25GB), Groq free.
