# NUTRYX (local dev)

Quick notes to run the app locally and the test suite.

Environment
- `USDA_API_KEY` — (recommended) set to enable USDA search proxy. Without it the server returns 503 for USDA routes.
- `ANTHROPIC_API_KEY` — (optional) required for AI features via `/api/ai`.
- `PORT` — optional port for the local proxy (default `8787`).

Recommended dev commands
- Start only the dev front-end:

```bash
npm run dev
```

- Start the proxy / server (if you want API proxying):

```bash
# set envs in the same shell
export USDA_API_KEY=your_key_here
export ANTHROPIC_API_KEY=your_key_here
npm start
```

- Convenience: run both proxy and dev server (uses `scripts/dev-all.js`):

```bash
npm run dev:all
```

Tests
- Unit + integration (Vitest):

```bash
npm test
```

Notes
- The repository uses a minimal Node proxy (`server.js`) so API keys are never embedded in the browser.
- Service worker is gated to production — it won't register during development to avoid stale caches.
- If the OpenFoodFacts search appears to return HTML (instead of JSON), ensure the proxy is running — the proxy adds proper `Accept` and `User-Agent` headers.

Using the PWA on iPhone
- Serve the app over HTTPS (required for some PWA features). For local testing you can use `ngrok` to expose a secure tunnel to your dev server:

```bash
# run the dev server (vite)
npm run dev
# in another terminal expose it via ngrok (install ngrok first)
ngrok http 5173
```

- Open the `https://...` ngrok URL in Safari on your iPhone.
- To install (non-App-Store):
	- On iPhone (Safari): tap the Share button → "Add to Home Screen" → Add. The app will launch standalone.
	- On other browsers that support the `beforeinstallprompt` event, the app shows an install banner inside the UI.

- iOS quirks:
	- iOS shows limited PWA support (no push notifications, limited background work). Camera and getUserMedia are supported in modern Safari.
	- Provide proper Apple touch icons and optional splash screens for the best experience (see `index.html` where an inline SVG icon and the web manifest are already provided).

Developer notes for native-like install UX
- We added an install banner and `beforeinstallprompt` handling to the app shell. The banner will appear when the browser fires the install prompt. On iOS a short hint is shown instructing users to use Safari's "Add to Home Screen" flow.

NUTRYX — Personal Nutrition PWA

A small modular PWA migrated from a single-file prototype (`nutryx-pwa.html`) to a Vite + React app.

Quick start

1. Install dependencies

```bash
npm install
```

2. Run the server proxy (required for AI/USDA API keys)

```bash
# set env vars ANTHROPIC_API_KEY and USDA_API_KEY, then:
npm start
```

3. Run dev server

```bash
npm run dev
# open http://localhost:5173 (or the Vite URL shown)
```

Build & preview

```bash
npm run build
npm run preview
```

Environment variables

- `ANTHROPIC_API_KEY` — Anthropic API key (server only)
- `USDA_API_KEY` — USDA API key (server only)

Notes

- The app registers `sw.js` from the public root. Ensure the production build serves `/sw.js`.
- API keys are proxied through `server.js` to avoid client-side secrets.

Files of interest

- `server.js` — local proxy for external APIs (Anthropic, USDA)
- `src/` — React app sources
- `sw.js` — service worker (caching rules)

If you want, I can:
- Harden the service worker for production and integrate it into the build (recommended).
- Add unit tests and CI to run them automatically.

Tests

- Run unit tests locally with Vitest:

```bash
npm run test
```

- Run coverage (CI-style):

```bash
npm run test:ci
```

CI

- The repository includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs tests and builds the app on push/pull-request to `main`.

Persistent storage and backups

- The app now persists primary user data (meals) to IndexedDB using `Dexie` for stronger persistence than `localStorage`. At app startup the data in `localStorage` (if any) is migrated to IndexedDB automatically.
- You can export and import your data programmatically via the `src/lib/db.js` helpers (`exportJSON()` / `importJSON()`), or add a UI to call these for manual backups.
- For cross-device sync or extra safety, consider adding a server-side backup endpoint (e.g., a small serverless function) that accepts encrypted exports.

Supabase cloud sync (optional, free tier)

- Quick setup:
	1. Create a free Supabase project at https://app.supabase.com.
	2. In SQL Editor run this to create the backups table:

```sql
create table nutryx_backups (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null,
	payload jsonb,
	created_at timestamptz default now()
);
```

	3. In Project Settings → API copy `anon` public key and the project URL.
	4. Add the values as environment variables for your build: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or paste them into Settings → Cloud Sync in the app).

- The app includes a Cloud Sync UI (Settings) to sign in via magic link, upload a JSON backup (from `db.exportJSON()`), and restore the latest backup. The client uses the Supabase anonymous key — do not use the `service_role` key in the browser.

Google Sheets serverless backup (Netlify)

- Files added: `netlify/functions/sheets-upload.js` and `netlify/functions/sheets-latest.js`. These functions require a Google service account JSON stored in an environment variable — do NOT commit the JSON to the repo.

- Steps to configure the service account safely:
	1. Download the service-account JSON from Google Cloud (you already have this file).
 2. Base64-encode it and copy the result (mac/linux):

```bash
cat service-account.json | base64 | tr -d '\n' > sa.b64
```

	3. In Netlify site settings → Build & deploy → Environment, add these variables:
		- `GOOGLE_SERVICE_ACCOUNT_BASE64` = (paste contents of `sa.b64`)
		- `SHEETS_SPREADSHEET_ID` = your spreadsheet id (from the Sheets URL)
		- `SHEETS_API_KEY` = a random secret string (used by client as `x-api-key` header)

- For local testing with `netlify dev`, create a local `.env` with these values or use `netlify env:pull` to pull them down.

- Client helper: `src/lib/sheets.js` exposes `sheetsUpload(payload,userId)` and `sheetsFetchLatest(userId)` to call the functions.

- Security note: Keep the service account JSON secret. The functions run server-side and read the base64 JSON from the environment to authenticate to the Sheets API.




Contributing

- Open a PR with changes and include a brief description of what you changed and why. The CI will run tests automatically.

Deploy to Netlify

- This repo includes a `netlify.toml` and a `public/_redirects` file to support single-page-app routing. Netlify will publish the Vite output from the `dist` folder.

- Quick steps:
	1. Commit and push your branch to GitHub.
 2. In Netlify, create a "New site from Git" and connect your repo.
 3. Set the build command to `npm run build` and the publish directory to `dist`.
 4. (Optional) Add environment variables in Netlify site settings for any server-side features (`USDA_API_KEY`, `ANTHROPIC_API_KEY`) if you plan to run serverless functions or an external proxy.

- Notes on the proxy:
	- `server.js` is a local Node proxy intended for development. For production you can either:
		- Host the proxy (server.js) on a separate server (Render, Railway, Heroku) and point the client to that URL, or
		- Port the proxy logic into Netlify Functions (serverless) and configure environment variables in Netlify.



