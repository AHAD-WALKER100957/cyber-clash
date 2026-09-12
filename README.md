# Cyber Clash — Engineers Day 2026

A full working event site: landing page, team login, 4 live rounds (quiz,
crypto, bug hunt, CTF), live leaderboard, and an admin control room —
frontend and backend, ready to deploy on Vercel.

## How it's built

- **Frontend**: the original single-page site (`public/index.html`), untouched
  in look and behaviour, plus a small shim that points `window.storage` at a
  real backend instead of an in-browser-only store.
- **Backend**: one serverless API route, `pages/api/kv.js`, a tiny key/value
  store all teams read and write to (team scores, live round, leaderboard
  reveal flag, etc). It's backed by **Upstash Redis** — a free, serverless
  Redis that works perfectly with Vercel.

Everything (team registration, quiz answers, timers, admin controls,
leaderboard) is real: it writes to and reads from that backend, so every
team's browser and the admin's browser all see the same live state.

## 1. Get a free database (2 minutes)

1. Go to https://console.upstash.com and sign up (free tier is plenty for an event).
2. Create a new **Redis** database (any region close to you).
3. Open the database, go to the **REST API** section, and copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 2. Run it locally (optional)

```bash
npm install
cp .env.example .env.local
# paste your Upstash values into .env.local
npm run dev
```

Visit http://localhost:3000 — the whole site, working, with your real backend.

(If you skip the Upstash setup, the site still runs locally using a temp
JSON file as a fallback — fine for testing on your own machine, but it will
NOT reliably persist on Vercel, so don't skip step 1 for the real event.)

## 3. Deploy to Vercel

**Option A — Vercel dashboard (easiest)**
1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new and import that repo.
3. Before deploying, add the two environment variables from step 1
   (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) in the project's
   Environment Variables section.
4. Click Deploy. Vercel auto-detects Next.js — no config needed.

**Option B — Vercel CLI**
```bash
npm i -g vercel
vercel            # first deploy, follow prompts
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel --prod
```

## Using it on event night

1. Open the site → **Control room** (footer link) → enter the coordinator
   passcode: `ABOTI2026` (change this in `public/index.html`, search for
   `ADMIN_PASSCODE`, before the real event).
2. Use **Round control** to start Round 1 when you're ready — every team's
   dashboard will show a **"Start Quiz →"** button the moment a round goes
   live, and clicking it drops them straight into that round.
3. Teams log in from the landing page with a Team ID + Team name of their
   choice (first login creates the team; returning with the same ID resumes
   their progress).
4. Watch scores land live in the **All teams** table in the control room.
5. Keep the leaderboard hidden until the closing ceremony, then hit
   **reveal** in the control room.

## Editing content

- Crew/credits, timings, and round descriptions: edit the text directly in
  `public/index.html` (search for "Add your names here" for the two
  placeholder crew cards).
- Quiz questions (Round 1), ciphers (Round 2), code snippets (Round 3), and
  flags (Round 4): all defined near the top of the `<script>` block in
  `public/index.html` (`R1_QUESTIONS`, `R2_STAGES`, `R3_SNIPPETS`,
  `R4_FLAGS` — names may vary slightly, search for them).
- Admin passcode: `ADMIN_PASSCODE` constant, same script block.

## Project structure

```
cyber-clash/
├── public/
│   └── index.html        # the entire site: HTML, CSS, and client JS
├── pages/
│   └── api/
│       └── kv.js          # backend: shared key-value store (Upstash Redis)
├── package.json
├── next.config.js
├── .env.example
└── README.md
```
