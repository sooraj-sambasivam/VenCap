# Technology Stack

**Analysis Date:** 2026-03-11

## Languages

**Primary:**

- TypeScript 5.9.x - All source code in `src/` (strict mode, `noUnusedLocals`, `noUnusedParameters`)

**Secondary:**

- CSS - Theme tokens and Tailwind config in `src/index.css`
- HTML - Single entry point `index.html`

## Runtime

**Environment:**

- Node.js 25.x (developer machine; no `engines` field in `package.json`, no `.nvmrc`)
- Browser target: ES2022 (`tsconfig.app.json` `target: "ES2022"`)

**Package Manager:**

- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**

- React 19.2.0 - UI framework; used with StrictMode in `src/main.tsx`
- React Router DOM 7.13.1 - Client-side routing; `BrowserRouter` in `src/App.tsx`

**State Management:**

- Zustand 5.0.11 - Global game state with `persist` middleware (localStorage key: `vencap-game-state`). Store defined in `src/engine/gameState.ts`

**Styling:**

- Tailwind CSS 4.2.1 - Utility-first CSS; loaded via `@tailwindcss/vite` plugin (no `tailwind.config.js` — v4 uses CSS-native config)
- tw-animate-css 1.4.0 - Animation utilities; imported in `src/index.css`
- tailwind-merge 3.5.0 - Merges conflicting Tailwind classes in `src/lib/utils.ts`
- clsx 2.1.1 - Conditional class construction in `src/lib/utils.ts`

**Component Library:**

- shadcn/ui (CLI: `shadcn` 3.8.5) — 18 primitives installed in `src/components/ui/`:
  `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`,
  `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `table`, `tabs`, `tooltip`
- Radix UI — underlying headless primitives; direct deps: `@radix-ui/react-slot` ^1.2.4 and `radix-ui` ^1.4.3

**Charts:**

- Recharts 3.7.0 - Charting library; components in `src/components/Charts.tsx`; code-split into its own chunk via Rollup `manualChunks`

**Icons:**

- Lucide React 0.575.0 - SVG icon library; used pervasively across pages and components

**Notifications:**

- Sonner 2.0.7 - Toast notifications; `<Toaster>` wired in `src/App.tsx` with `theme="dark"`

**Testing:**

- Vitest 4.0.18 - Test runner; config embedded in `vite.config.ts`, runs in `node` environment
- Test files: co-located in `src/engine/` as `*.test.ts`

**Build/Dev:**

- Vite 7.3.1 - Dev server and bundler; config at `vite.config.ts`
- `@vitejs/plugin-react` 5.1.1 - React Fast Refresh + JSX transform
- TSX 4.21.0 - TypeScript execution for scripts (devDependency)

## Key Dependencies

**Critical:**

- `zustand` ^5.0.11 - Entire game state lives here; removing it would require full rewrite of `src/engine/gameState.ts`
- `react-router-dom` ^7.13.1 - All 9 page routes defined in `src/App.tsx`
- `recharts` ^3.7.0 - Dashboard charts (portfolio value, deployment, LP sentiment, sector pie); ~bulk of 1MB bundle
- `class-variance-authority` ^0.7.1 - Used by shadcn/ui variant definitions across `src/components/ui/`
- `next-themes` ^0.4.6 - Listed as dependency but theme is dark-only via CSS (`src/index.css`); not actively driving theme switching

**Infrastructure:**

- `@types/react` ^19.2.7, `@types/react-dom` ^19.2.3 - TypeScript types
- `@types/node` ^24.10.1 - Node types for `vite.config.ts` path resolution

## Configuration

**Environment:**

- Single env var: `VITE_FRED_API_KEY` - optional FRED API key; read via `import.meta.env.VITE_FRED_API_KEY` in `src/engine/economicData.ts`
- Template documented in `.env.example`
- Without the key, game falls back to built-in 2000–2025 historical data

**Build:**

- `vite.config.ts` - Vite + Tailwind + React plugins; path alias `@/` → `./src`
- Manual chunk splitting: `react-vendor` (React + Router), `radix-vendor` (6 Radix primitives), `charts` (Recharts)
- `tsconfig.json` - References `tsconfig.app.json` (src) and `tsconfig.node.json` (vite config)
- `tsconfig.app.json` - Strict TS, `ES2022` target, `bundler` moduleResolution, `noEmit: true`
- `eslint.config.js` - Flat config with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

## Platform Requirements

**Development:**

- Node.js with npm
- `VITE_FRED_API_KEY` in `.env` is optional; game fully functional without it

**Production:**

- Static site (no server required); output is `dist/` via `vite build`
- PWA-capable: Service worker registered in `src/main.tsx`, `public/manifest.json` present
- Deployment target: any static host (Netlify, Vercel, GitHub Pages, etc.)
- Bundle ~1MB due to Recharts; code-split into 3 vendor chunks

---

_Stack analysis: 2026-03-11_
