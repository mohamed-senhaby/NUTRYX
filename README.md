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


