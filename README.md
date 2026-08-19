# Free-Fall News

The rebuilt home of Free-Fall News (was freefall.mystrikingly.com) — a student-run news site covering school news, world news, Hong Kong news and more. Made by students, for students.

**Stack:** Next.js 16 (App Router, static export) + TypeScript · Tailwind CSS v4 · Sanity (CMS) · Firebase (Auth + Firestore + static Hosting, free Spark plan) · Cloudflare Worker (notifications) · OneSignal (push) · Resend (newsletter email)

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

Handled by the free **Cloudflare Worker** in [`worker/`](worker/):

1. Deploy the worker and set its secrets (see [Deployment](#deployment)).
2. In Sanity: **Manage → API → Webhooks → Add webhook**
   - **URL:** `https://freefall-notify.<your-subdomain>.workers.dev/notify`
   - **Triggers:** Document create + update, filter: `_type == "article"` and `.publishedAt` changed
   - **HTTP headers:** `Authorization: Bearer <your NOTIFY_SECRET>`
3. Publishing an article then calls the worker, which sends the OneSignal push and the Resend newsletter email to every subscriber.

## Deployment

This site runs on the **free Firebase Spark plan** (no billing account) as a static export, plus a **free Cloudflare Worker** for the notification jobs.

### 1. Build + deploy the site (Firebase classic Hosting)

```bash
npm run build          # static export → out/
npx firebase-tools login
npx firebase-tools deploy --only hosting
```

That serves the site at `https://freefall-news.web.app` (Firebase automatically serves `index.html` for each directory, and `cleanUrls` is on in `firebase.json`).

Deploy Firestore rules once:
```bash
npx firebase-tools deploy --only firestore:rules   # uploads firestore.rules
```

### 2. Deploy the notification Worker (Cloudflare, free)

```bash
cd worker
npm i
npx wrangler login
npx wrangler deploy                 # → https://freefall-notify.<subdomain>.workers.dev
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ONESIGNAL_API_KEY
npx wrangler secret put NOTIFY_SECRET
```

Then put the worker URL in `.env.local` as `NEXT_PUBLIC_NOTIFY_URL` (and in the build env for future deploys) so the newsletter form calls it for the welcome email.

### 3. Publishing flow

New articles go live after a rebuild. Trigger one automatically: in Sanity add a webhook (see above) → point it at a free service that runs `npm run build && firebase deploy`, or just redeploy manually after publishing. `scripts/migrate.mjs` + `scripts/fixmeta.mjs` stay useful for syncing content.

## Project structure

```
src/app/            pages (home, all-news, categories, article, writers, write, terms, privacy) + sitemap/robots
src/components/     navbar, footer, hero, headline showcase, cards, search, newsletter, editor, push
src/lib/            sanity, firebase, search, types, editors, resend
public/             manifest, sw.js, OneSignal workers, PWA icons, provider logos
sanity/schema.ts    Sanity content schemas
worker/             Cloudflare Worker (subscribe/verify/article/notify)
scripts/            migrate.mjs, fixmeta.mjs, rebody.mjs, rebody-md.mjs, gen-icons.mjs
```

## Credits

This site was designed and built with the help of **Claude** (Anthropic's AI assistant) — the site structure, CMS integration, newsletter + verification system, notification worker, and in-app editor were all developed by Claude at the direction of the Free-Fall team.
