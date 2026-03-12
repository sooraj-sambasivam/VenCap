# External Integrations

**Analysis Date:** 2026-03-11

## APIs & External Services

**Economic Data:**

- St. Louis Fed FRED API - Fetches live macroeconomic indicators for use in game simulation
  - SDK/Client: Native `fetch` (browser) in `src/engine/economicData.ts`
  - Auth: `VITE_FRED_API_KEY` env var (read via `import.meta.env.VITE_FRED_API_KEY`)
  - Endpoint: `https://api.stlouisfed.org/fred/series/observations`
  - Series used: `FEDFUNDS` (fed funds rate), `DGS10` (10y treasury), `SP500`, `NASDAQCOM`, `UNRATE` (unemployment), `CPIAUCSL` (CPI), `A191RL1Q225SBEA` (GDP growth)
  - Fallback: full 2000–2025 hardcoded historical dataset in `src/engine/economicData.ts` when API key absent
  - Cache: 24-hour TTL in `localStorage` under key `vencap-fred-cache`
  - Integration is optional — the game is fully playable without it

## Data Storage

**Databases:**

- None — no backend database

**Browser Storage:**

- `localStorage` for all persistence:
  - Game state: key `vencap-game-state` (Zustand `persist` middleware in `src/engine/gameState.ts`)
  - FRED data cache: key `vencap-fred-cache` (written in `src/engine/economicData.ts`)
  - Save slots: handled via `src/engine/saveSlots.ts`
  - Leaderboard: handled via `src/engine/leaderboard.ts`

**File Storage:**

- Local filesystem only (static assets in `public/`)

**Caching:**

- Browser `localStorage` only — no server-side cache

## Authentication & Identity

**Auth Provider:**

- None — single-player game with no user accounts or authentication

## Monitoring & Observability

**Error Tracking:**

- None configured

**Error Boundaries:**

- React `ErrorBoundary` component in `src/components/ErrorBoundary.tsx` catches render errors

**Logs:**

- No structured logging; errors silently caught in `src/engine/economicData.ts` FRED fetch handlers (`catch { return null }` pattern)

## CI/CD & Deployment

**Hosting:**

- Not specified; static output (`dist/`) compatible with any static host (Netlify, Vercel, GitHub Pages)

**CI Pipeline:**

- Not detected (no `.github/`, `.gitlab-ci.yml`, or similar CI config found)

**Build command:** `tsc -b && vite build`
**Preview command:** `vite preview`

## PWA

**Service Worker:**

- Registered in `src/main.tsx` from `public/sw.js`
- Enables offline/installable PWA behavior
- Registration failure silently ignored (app works without it)

**Manifest:**

- `public/manifest.json` — app name "VenCap — VC Fund Simulator", standalone display, dark theme color

## Environment Configuration

**Required env vars:**

- None (app runs without any env vars)

**Optional env vars:**

- `VITE_FRED_API_KEY` - Enables live FRED economic data; without it, game uses historical data

**Secrets location:**

- `.env` file (not committed); template at `.env.example`

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

---

_Integration audit: 2026-03-11_
