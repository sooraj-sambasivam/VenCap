# Codebase Structure

**Analysis Date:** 2026-03-11

## Directory Layout

```
VenCap/
├── src/
│   ├── main.tsx            # App bootstrap, PWA service worker registration
│   ├── App.tsx             # Root: BrowserRouter, routes, global providers
│   ├── index.css           # Global styles, dark theme oklch variables
│   ├── assets/             # Static assets (images, SVGs)
│   ├── engine/             # Pure TypeScript game engine — no React imports
│   │   ├── types.ts        # All interfaces and union types (no logic)
│   │   ├── gameState.ts    # Zustand store, advanceTime(), all player actions
│   │   ├── dynamicEvents.ts # Event templates and generators
│   │   ├── lpSentiment.ts  # LP sentiment calculations and reports
│   │   ├── mockData.ts     # Procedural startup generation, sectors, co-investors
│   │   ├── vcRealism.ts    # Ownership rules, check sizes, influence levels
│   │   ├── talentMarket.ts # Talent pool generation and hire logic
│   │   ├── scenarios.ts    # 14 scenario configs with win conditions
│   │   ├── benchmarkData.ts # Cambridge Associates benchmark dataset
│   │   ├── economicData.ts # Historical FRED data 2000-2025, live API fetch
│   │   ├── marketEngine.ts # EconomicSnapshot → MarketConditions conversion
│   │   ├── balanceConfig.ts # Tuning constants: fail rates, exit rates
│   │   ├── difficultyScaling.ts # Difficulty modifiers by skill/rebirth level
│   │   ├── achievements.ts  # Achievement definitions and check logic
│   │   ├── leaderboard.ts   # Local leaderboard localStorage helpers
│   │   ├── saveSlots.ts     # Save slot read/write helpers
│   │   └── *.test.ts        # Unit tests co-located with engine files
│   ├── pages/              # Full-page React route components
│   │   ├── Index.tsx        # Fund setup wizard (5-step)
│   │   ├── Dashboard.tsx    # Main game HUD and advance time
│   │   ├── Deals.tsx        # Deal pipeline view
│   │   ├── Portfolio.tsx    # Portfolio company management
│   │   ├── Incubator.tsx    # Incubator batch management
│   │   ├── Lab.tsx          # Lab project creation and spin-out
│   │   ├── News.tsx         # News feed
│   │   ├── Reports.tsx      # LP annual reports and benchmarks
│   │   └── Results.tsx      # End-of-game scorecard
│   ├── components/         # Reusable React components
│   │   ├── NavBar.tsx
│   │   ├── DealCard.tsx
│   │   ├── InvestModal.tsx
│   │   ├── Charts.tsx
│   │   ├── Onboarding.tsx
│   │   ├── TutorialOverlay.tsx
│   │   ├── KeyboardShortcuts.tsx
│   │   ├── SaveLoadDialog.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── PageShell.tsx
│   │   ├── PageTransition.tsx
│   │   └── ui/             # shadcn/ui primitives (18 components)
│   └── lib/
│       └── utils.ts        # cn(), formatCurrency(), uuid(), math helpers
├── e2e/
│   └── full-lifecycle.spec.ts  # Playwright end-to-end test
├── public/
│   └── sw.js               # PWA service worker
├── docs/                   # Developer documentation
├── index.html              # Vite HTML entry point
├── vite.config.ts          # Vite + Vitest config, @/ path alias, manual chunks
├── tsconfig.json           # TypeScript project references
├── tsconfig.app.json       # App-specific TypeScript config (strict mode)
├── components.json         # shadcn/ui configuration
├── eslint.config.js        # ESLint configuration
└── playwright.config.ts    # Playwright E2E configuration
```

## Directory Purposes

**`src/engine/`:**

- Purpose: All game simulation logic — pure TypeScript, zero React imports
- Contains: Type definitions, Zustand store, event generation, LP calculations, startup factories, scenario configs, economic data, balance tuning
- Key files: `types.ts` (data model), `gameState.ts` (store + game loop), `dynamicEvents.ts` (event system)
- Rule: Never import React here. Never directly manipulate DOM.

**`src/pages/`:**

- Purpose: One file per route — composes components, reads store state via selectors, dispatches actions
- Contains: Route-level React components only; no simulation logic
- Key files: `Dashboard.tsx` (main game UI), `Portfolio.tsx` (largest page at ~50KB), `Results.tsx` (end-game)

**`src/components/`:**

- Purpose: Reusable UI components shared across pages
- Contains: Game-specific components (DealCard, InvestModal, Charts) and layout components (NavBar, PageShell)
- Key files: `Charts.tsx` (lazy-loaded Recharts), `DealCard.tsx` (used in Deals page)

**`src/components/ui/`:**

- Purpose: shadcn/ui primitives — do not edit these files directly
- Contains: badge, button, card, dialog, dropdown-menu, input, label, progress, scroll-area, select, separator, sheet, skeleton, slider, sonner, table, tabs, tooltip
- Generated: Yes (via shadcn CLI)
- Committed: Yes

**`src/lib/`:**

- Purpose: Utility functions used by both engine and UI layers
- Key files: `utils.ts` — the only file; contains `cn()`, all `format*()` functions, math helpers

**`e2e/`:**

- Purpose: Playwright end-to-end tests
- Key files: `full-lifecycle.spec.ts` — tests full game lifecycle

## Key File Locations

**Entry Points:**

- `src/main.tsx`: Application bootstrap, React root mount
- `src/App.tsx`: Router, all routes, global providers
- `index.html`: Vite HTML template

**Configuration:**

- `vite.config.ts`: Build config, `@/` path alias, manual chunks, Vitest settings
- `tsconfig.app.json`: TypeScript strict mode config
- `components.json`: shadcn/ui CLI configuration (style, paths, aliases)
- `src/index.css`: Tailwind CSS v4 import, oklch dark theme CSS variables

**Core Logic:**

- `src/engine/types.ts`: All type definitions — read this first when exploring
- `src/engine/gameState.ts`: The Zustand store and game loop — the most important file in the codebase
- `src/engine/dynamicEvents.ts`: Event system — largest engine file at 38KB
- `src/engine/mockData.ts`: Startup generation — second largest at 50KB

**Testing:**

- `src/engine/*.test.ts`: Unit tests co-located with each engine module
- `e2e/full-lifecycle.spec.ts`: End-to-end Playwright test

## Naming Conventions

**Files:**

- React components: `PascalCase.tsx` (e.g., `DealCard.tsx`, `NavBar.tsx`)
- Engine modules: `camelCase.ts` (e.g., `gameState.ts`, `mockData.ts`)
- Test files: `camelCase.test.ts` (e.g., `gameState.test.ts`)
- shadcn/ui primitives: `kebab-case.tsx` (e.g., `scroll-area.tsx`, `dropdown-menu.tsx`)

**Directories:**

- All lowercase: `engine/`, `pages/`, `components/`, `lib/`, `ui/`

**Exports:**

- Pages: default export only (e.g., `export default function Dashboard()`)
- Components: default export for primary component, named exports for sub-components
- Engine modules: named exports only (e.g., `export function generateStartup(...)`)
- Store: single named export `export const useGameStore`

## Where to Add New Code

**New Game Feature (engine logic):**

- Pure calculation functions: create new file in `src/engine/` (e.g., `src/engine/myFeature.ts`)
- New types: add to `src/engine/types.ts` — keep all types in one file
- New store actions: add to the `create<GameState>()` call in `src/engine/gameState.ts`
- Tests: create `src/engine/myFeature.test.ts` co-located with the engine file

**New Page / Route:**

- Implementation: `src/pages/MyPage.tsx`
- Register route: add `<Route>` in `src/App.tsx` with `lazy()` import
- Add nav link: add entry to `NAV_LINKS` array in `src/components/NavBar.tsx`

**New Reusable Component:**

- Implementation: `src/components/MyComponent.tsx`
- If it uses Recharts: lazy-load it at the page level to avoid bundle bloat

**New shadcn/ui Primitive:**

- Run `npx shadcn@latest add <component>` — outputs to `src/components/ui/`
- Never manually create files in `src/components/ui/`

**New Utility Function:**

- Shared math/format helpers: add to `src/lib/utils.ts`
- Engine-only helpers: add as unexported functions inside the relevant engine module

**New Scenario:**

- Add `ScenarioId` union member to `src/engine/types.ts`
- Add `ScenarioConfig` entry to `SCENARIOS` array in `src/engine/scenarios.ts`
- Scenario selector in `src/pages/Index.tsx` will pick it up automatically

## Special Directories

**`dist/`:**

- Purpose: Vite production build output
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`:**

- Purpose: NPM dependencies
- Generated: Yes
- Committed: No

**`public/`:**

- Purpose: Static files served at root (PWA assets, favicon)
- Contains: `sw.js` service worker
- Committed: Yes

**`.planning/`:**

- Purpose: GSD planning documents and codebase analysis
- Contains: Phase plans, codebase map documents
- Committed: Yes

---

_Structure analysis: 2026-03-11_
