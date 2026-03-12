# Architecture

**Analysis Date:** 2026-03-11

## Pattern Overview

**Overall:** Single-page application with a reactive game engine

**Key Characteristics:**

- Strict separation between engine (pure TypeScript) and UI (React)
- Zustand global store acts as the single source of truth for all game state
- Pages consume store state via selectors and dispatch named actions; they contain no simulation logic
- `advanceTime()` in `src/engine/gameState.ts` is the central game loop — called once per player turn, orchestrating events, economics, portfolio updates, LP calculations, and news generation

## Layers

**Types Layer:**

- Purpose: Single source of truth for all TypeScript interfaces and union types
- Location: `src/engine/types.ts`
- Contains: 30+ interfaces, 20+ union types — no logic, no imports from other engine files
- Depends on: Nothing
- Used by: All other engine files and all UI files

**Engine Layer (Pure Logic):**

- Purpose: All simulation computations, pure functions with no React dependencies
- Location: `src/engine/`
- Contains:
  - `gameState.ts` — Zustand store, `advanceTime()` game loop, all 20+ player actions
  - `dynamicEvents.ts` — Event template definitions, `generateMonthlyEvents()`, `applyEventModifiers()`
  - `lpSentiment.ts` — `calculateLPSentiment()`, `generateLPReport()`, `calculateLPActionEffect()`
  - `mockData.ts` — `generateStartup()` procedural factory, 15 sectors, 35 co-investors, `REGION_MODIFIERS`
  - `vcRealism.ts` — Ownership caps, check sizes, `getInfluenceLevel()`, `calculateBuyoutAcceptance()`
  - `talentMarket.ts` — `generateTalentPool()`, `calculateHireProbability()`, `applyHireEffects()`
  - `scenarios.ts` — 14 `ScenarioConfig` definitions, `getScenario()`, `seedStartingPortfolio()`
  - `benchmarkData.ts` — 40-row Cambridge Associates benchmark dataset, comparison functions
  - `economicData.ts` — Historical FRED data (2000-2025), `getSnapshotForGameMonth()`, `fetchLiveEconomicData()`
  - `marketEngine.ts` — `calculateMarketConditions()` from economic snapshots, `describeChanges()`
  - `balanceConfig.ts` — `BASE_FAIL_RATES`, `BASE_EXIT_RATES`, tuning constants
  - `difficultyScaling.ts` — `getDifficultyModifiers()` keyed to `skillLevel` and `rebirthCount`
  - `achievements.ts` — `checkAchievements()` run after each `advanceTime()` tick
  - `leaderboard.ts` — Local leaderboard read/write helpers
  - `saveSlots.ts` — `saveToSlot()` / `loadFromSlot()` using localStorage
- Depends on: `src/engine/types.ts`, `src/lib/utils.ts`
- Used by: `src/engine/gameState.ts` (orchestrator), UI pages (read-only access to derived data)

**Utilities Layer:**

- Purpose: Shared formatting and math helpers used by both engine and UI
- Location: `src/lib/utils.ts`
- Contains: `cn()`, `formatCurrency()`, `formatMultiple()`, `formatPercent()`, `formatIRR()`, `uuid()`, `randomBetween()`, `clamp()`, `weightedRandom()`, `getGameYear()`
- Depends on: `clsx`, `tailwind-merge`
- Used by: Engine files via `@/lib/utils`, all pages and components

**UI Components Layer:**

- Purpose: Reusable presentation components, no game logic
- Location: `src/components/`
- Contains:
  - `NavBar.tsx` — Sticky navigation, shows fund name/month during play, mobile Sheet drawer
  - `DealCard.tsx` — Startup deal card with metrics, signals, traits display
  - `InvestModal.tsx` — Investment dialog with amount slider and ownership validation
  - `Charts.tsx` — 4 Recharts chart components (`PortfolioValueChart`, `DeploymentPaceChart`, `LPSentimentChart`, `SectorAllocationChart`)
  - `Onboarding.tsx` — 5-step tutorial dialog for first-time players
  - `TutorialOverlay.tsx` — In-game tutorial step overlay
  - `KeyboardShortcuts.tsx` — Global keyboard bindings (d/l/p/i/b/n/r, Cmd+Z, ?)
  - `SaveLoadDialog.tsx` — Save slot management UI
  - `ErrorBoundary.tsx` — React error boundary wrapping all routes
  - `PageShell.tsx` — Thin page wrapper div
  - `PageTransition.tsx` — Animation wrapper for page entry
  - `ui/` — 18 shadcn/ui primitives (badge, button, card, dialog, dropdown-menu, input, label, progress, scroll-area, select, separator, sheet, skeleton, slider, sonner, table, tabs, tooltip)
- Depends on: `@/engine/gameState` (store selectors), `@/lib/utils`, `@/components/ui/`
- Used by: Pages

**Pages Layer:**

- Purpose: Full-page views, compose components, dispatch store actions
- Location: `src/pages/`
- Contains:
  - `Index.tsx` — 5-step fund setup wizard (type → stage/geo → size → scenario → era), calls `initFund()`
  - `Dashboard.tsx` — Command center: metrics cards, market cycle, LP score, alerts, Recharts charts, Advance Time button
  - `Deals.tsx` — Deal pipeline with filter/sort, renders `DealCard`, opens `InvestModal`
  - `Portfolio.tsx` — Expandable company cards with 6 tabs (actions, events, follow-on, secondary, decisions, team, board meetings)
  - `Incubator.tsx` — Incubator batch management, mentoring actions, graduation flow
  - `Lab.tsx` — 4-step lab project creation (sector → problem → team → spin-out)
  - `News.tsx` — Chronological news feed with type/sentiment filters
  - `Reports.tsx` — LP annual reports, fund economics, benchmarks, LP Actions panel
  - `Results.tsx` — End-of-fund scorecard with TVPI/IRR grading, scenario result, leaderboard entry
- Depends on: `@/engine/gameState`, `@/components/`, `@/lib/utils`

**App / Routing Layer:**

- Purpose: Root layout, routing, global providers
- Location: `src/App.tsx`, `src/main.tsx`
- Contains: `BrowserRouter`, route definitions, `NavBar`, `ErrorBoundary`, `Suspense`, `TooltipProvider`, `Toaster`, `KeyboardShortcuts`

## Data Flow

**Player Turn (Advance Time):**

1. Player clicks "Advance Time" button in `Dashboard.tsx`
2. Component calls `useGameStore.advanceTime()`
3. `advanceTime()` in `gameState.ts` runs sequentially:
   - Saves undo snapshot (`history` array, max 3)
   - Increments `fund.currentMonth`
   - Updates economic snapshot from `economicData.ts` (every tick for historical eras, every quarter for live)
   - Deducts monthly management fee from `fund.cashAvailable`
   - Iterates `portfolio` — updates MRR, valuation, events via `generateMonthlyEvents()`, checks exits/failures
   - Accrues carry on exits via `calculateCarry()`
   - Refreshes `dealPipeline` with new `generateStartup()` entries
   - Recalculates `lpSentiment` via `calculateLPSentiment()`
   - Generates `news` items (market, ecosystem, portfolio)
   - Generates LP annual report every 12 months
   - Checks `achievements` via `checkAchievements()`
   - Checks scenario win/lose conditions
   - Generates board meetings for companies at 6-month (board_seat) or 12-month (majority) influence intervals
   - Calls `set()` with full next state
4. React re-renders all subscribed components

**Player Investment:**

1. Player opens `InvestModal` from `Deals.tsx`
2. Modal calls `useGameStore.invest(startupId, amount, ownership)`
3. `invest()` validates via `vcRealism.checkCanInvest()`, deducts cash, creates `PortfolioCompany`, removes from pipeline
4. Store updates, components re-render

**State Persistence:**

1. Zustand `persist` middleware serializes state to `localStorage` key `vencap-game-state` on every `set()` call
2. `partialize` excludes `history` (undo stack) from persistence
3. `merge` function backfills missing fields for saves from older versions

## Key Abstractions

**GameState (Zustand Store):**

- Purpose: Single mutable game state tree + all player actions
- Location: `src/engine/gameState.ts` — `export const useGameStore`
- Pattern: `create<GameState>()(persist(...))` — all actions defined inline as methods

**GameSnapshot:**

- Purpose: Immutable point-in-time snapshot for the undo system (max 3 in `history[]`)
- Location: `src/engine/types.ts` — `GameSnapshot` type
- Pattern: Captured via `captureSnapshot(state)` at the start of each `advanceTime()` call

**ScenarioConfig:**

- Purpose: Override fund defaults, set starting conditions, define win conditions
- Examples: `src/engine/scenarios.ts` — 14 named scenarios
- Pattern: Applied as `fundOverrides` during `initFund()`, win conditions checked each `advanceTime()` tick

**PortfolioCompany:**

- Purpose: A `Startup` extended with ownership, valuation, events, and status tracking
- Location: `src/engine/types.ts`
- Pattern: Created in `invest()`, mutated each tick by `advanceTime()`, never replaced — identity is `id`

**MarketConditions:**

- Purpose: Translate an `EconomicSnapshot` into game multipliers (valuations, exit probability, fail rate, LP sentiment)
- Location: `src/engine/marketEngine.ts` — `calculateMarketConditions()`
- Pattern: Recomputed each tick from the current era's economic snapshot

## Entry Points

**Application Bootstrap:**

- Location: `src/main.tsx`
- Triggers: Browser load
- Responsibilities: Registers PWA service worker, renders `<App>` in `StrictMode`

**Fund Setup:**

- Location: `src/pages/Index.tsx`
- Triggers: Player navigates to `/`, which is also the default redirect
- Responsibilities: Collects fund config (5 steps), calls `initFund()`, navigates to `/dashboard`

**Game Loop Trigger:**

- Location: `src/pages/Dashboard.tsx` — "Advance Time" button
- Triggers: Player click
- Responsibilities: Calls `advanceTime()`, shows toast notifications for key events

**End of Game:**

- Location: `src/pages/Results.tsx`
- Triggers: `gamePhase === 'ended'` (set by `advanceTime()` when `fund.currentMonth >= 120`)
- Responsibilities: Displays final scorecard, writes to leaderboard, offers rebirth or reset

## Error Handling

**Strategy:** React error boundary for UI crashes, no throwing in engine functions

**Patterns:**

- `src/components/ErrorBoundary.tsx` wraps all routes in `App.tsx`
- Engine actions use early return (`if (!state.fund || state.gamePhase !== 'playing') return`) rather than throwing
- `invest()` returns `{ success: boolean; reason?: string }` to surface validation errors to UI
- `performLPAction()` returns `{ success: boolean; reason?: string; sentimentGain?: number }`
- `loadFromSlot()` returns `boolean` — false on failure without throwing

## Cross-Cutting Concerns

**Logging:** `console` only — no structured logging framework
**Validation:** Engine actions validate preconditions via guard clauses and return result objects; no Zod/Yup
**Authentication:** None — fully client-side game, no user accounts

---

_Architecture analysis: 2026-03-11_
