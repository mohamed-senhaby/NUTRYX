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

Contributing

- Open a PR with changes and include a brief description of what you changed and why. The CI will run tests automatically.


