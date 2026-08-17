# Free-Fall News

The rebuilt home of Free-Fall News (was freefall.mystrikingly.com) — a student-run news site covering school news, world news, Hong Kong news and more. Made by students, for students.

**Stack:** Next.js 16 (App Router) + TypeScript · Tailwind CSS v4 · Sanity (CMS) · Firebase (Auth + Firestore + App Hosting) · OneSignal (push) · Resend (newsletter email)

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

## Environment variables

See [.env.example](.env.example). Public vars (`NEXT_PUBLIC_*`) are safe in the client bundle; the rest are server-only.

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity dashboard → Project settings |
| `SANITY_TOKEN` | Sanity → API → API tokens. **Must be role “Editor” (write access)** |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | OneSignal dashboard → app |
| `ONESIGNAL_API_KEY` | OneSignal dashboard → Keys & IDs → REST API key |
| `RESEND_API_KEY` | Resend dashboard → API keys |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase console → Project settings → your web app |
| `NEXT_PUBLIC_SMARTNEXUS_PROVIDER_ID` | Must match the provider ID in Firebase Auth → Sign-in method |

`NOTIFY_SECRET` is a shared secret the Sanity webhook sends in the `Authorization: Bearer …` header to `/api/notify`.

## Content (Sanity)

Content lives in Sanity. To run the editorial Studio:

```bash
npx sanity@latest init     # connects this project to the Sanity Studio
npx sanity dev             # opens the Studio for editing
```

Schemas are in [`sanity/schema.ts`](sanity/schema.ts). To publish an article, an editor sets `publishedAt` and (optionally) ticks **Homepage headline** or **Trending**. The site picks up changes automatically (ISR, ~60s).

### Migrating the old site

`scripts/migrate.mjs` imports the ~50 articles, categories and writers from freefall.mystrikingly.com:

```bash
node --env-file=.env.local scripts/migrate.mjs
```

It re-runs safely (updates existing articles by slug). Requires `SANITY_TOKEN` with **write** access.

> ⚠️ The token must be created with role **Editor** — a “Viewer” token is read-only and the script stops with a clear error.

## Features

- **SEO** — server-rendered pages, per-article metadata, `sitemap.xml`, `robots.txt`, JSON-LD `NewsArticle` schema. After deploying, verify the domain in [Google Search Console](https://search.google.com/search-console) and submit `/sitemap.xml`.
- **Search** — Fuse.js live search on the **All News** page (`/all-news`).
- **Headline showcase** — the homepage leads with the newest article flagged *headline* in Sanity.
- **Newsletter with OAuth** — sign up with Google, Microsoft or SmartNexus via Firebase Auth. Subscribers are stored in Firestore (`subscribers/{uid}`, rules in [`firestore.rules`](firestore.rules)) and in a Resend audience. The welcome email is sent by `/api/subscribe`.
- **PWA** — `manifest.webmanifest` (`display: standalone`), apple-touch-icon, iOS meta tags. On iPhone: **Share → Add to Home Screen**.
- **Push notifications** — OneSignal. Tap **🔔 Get notified** in the hero (on iOS, only after installing the PWA — the button shows a hint). Sending a push on publish is done via the webhook below.

### New-article notifications (push + email)

1. In Sanity: **Manage → API → Webhooks → Add webhook**
   - **URL:** `https://<your-domain>/api/notify`
   - **Triggers:** Document create + update, filter: `_type == "article"` and `.publishedAt` changed
   - **HTTP headers:** `Authorization: Bearer <your NOTIFY_SECRET>`
2. Saving a published article then calls `/api/notify`, which sends the OneSignal push and the Resend newsletter email to every subscriber.

## Deployment (Firebase App Hosting)

App Hosting deploys the Next.js SSR app from the GitHub repo.

1. Install/init: `npx firebase-tools init hosting` is **not** used — App Hosting instead connects to the repo:
   - Firebase console → **Build → App Hosting → Get started**
   - Connect the `RyanL1028/freefall` repo, set root `/`, framework auto-detected (Next.js).
2. `apphosting.yaml` already contains the public env vars. Add the **server-only secrets** in the console under **Settings → Environment variables**, marking them secret:
   - `SANITY_TOKEN`, `ONESIGNAL_API_KEY`, `RESEND_API_KEY`, `NOTIFY_SECRET`
   - plus `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
3. Push to `main` → auto-deploys to `https://freefall-news.web.app`.

Also set up Firestore + rules once:
```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules   # uploads firestore.rules
```

**Fallback (classic static hosting):** `next.config.ts` can switch to `output: "export"` and `firebase.json` serves `out/` on classic Hosting, but you lose SSR, ISR, Image Optimization and the API routes.

## Project structure

```
src/app/            pages + API routes (/api/subscribe, /api/notify) + sitemap/robots
src/components/     navbar, footer, hero, headline showcase, cards, search, newsletter, push
src/lib/            sanity, firebase, search, types, resend
public/             manifest, sw.js, OneSignal workers, PWA icons
sanity/schema.ts    Sanity content schemas
scripts/            migrate.mjs, gen-icons.mjs
```
