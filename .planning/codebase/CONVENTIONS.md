# Coding Conventions

**Analysis Date:** 2026-03-11

## Naming Patterns

**Files:**

- React components: PascalCase — `DealCard.tsx`, `InvestModal.tsx`, `ErrorBoundary.tsx`
- Pages: PascalCase — `Dashboard.tsx`, `Portfolio.tsx`, `Results.tsx`
- Engine modules: camelCase — `gameState.ts`, `dynamicEvents.ts`, `vcRealism.ts`
- Test files: co-located, `.test.ts` suffix — `vcRealism.test.ts`, `lpSentiment.test.ts`
- Utility module: `src/lib/utils.ts`

**Functions:**

- Pure engine functions: camelCase verbs — `generateStartup()`, `calculateLPSentiment()`, `applyEventModifiers()`
- React components: PascalCase — `DealCard`, `InvestModal`, `ErrorBoundary`
- Action creators in Zustand store: camelCase verbs — `initFund()`, `advanceTime()`, `undoAdvance()`, `performLPAction()`
- Utility formatters: `format` prefix — `formatCurrency()`, `formatMultiple()`, `formatPercent()`, `formatIRR()`, `formatFeeRate()`

**Variables:**

- Constants: SCREAMING_SNAKE_CASE — `SECTOR_DATA`, `CYCLE_ORDER`, `BASE_FAIL_RATES`, `MARKET_COLORS`, `REGION_MODIFIERS`
- Local variables: camelCase — `dealPipeline`, `sentimentBefore`, `monthAfterFirst`
- Numeric literals: underscores for readability — `100_000_000`, `5_000_000`, `1_000_000_000`

**Types:**

- Interfaces: PascalCase, no `I` prefix — `FounderTraits`, `DealCardProps`, `InvestModalProps`
- Union type aliases: PascalCase — `FundType`, `MarketCycle`, `CompanyStatus`, `LPActionType`
- Generic type parameters: single uppercase `T` — `pickRandom<T>`, `weightedRandom<T>`

## Code Style

**Formatting:**

- No Prettier config detected — formatting is managed by editor defaults and TypeScript strict mode
- Single quotes in engine files: `import { create } from 'zustand'`
- Double quotes in UI files (React/JSX): `import { useState } from "react"`
- Trailing semicolons present in engine files; absent in some component files
- No explicit line length limit configured

**Linting:**

- ESLint v9 flat config at `eslint.config.js`
- Rules active: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- TypeScript strict mode enforced: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `strict: true`
- Unused parameters must be prefixed with `_` to satisfy `noUnusedParameters`
- One known suppression: `// eslint-disable-next-line react-hooks/exhaustive-deps` in `src/pages/Results.tsx:197`

## Import Organization

**Order (engine files):**

1. External packages — `import { create } from 'zustand'`
2. Internal engine types — `import type { GameState, Fund, ... } from './types'`
3. Internal engine functions — `import { generateStartup } from './mockData'`
4. Path-aliased utilities — `import { uuid, clamp } from '@/lib/utils'`

**Order (UI files/components):**

1. React core — `import { useState, useEffect, ... } from 'react'`
2. Router — `import { useNavigate, Link } from 'react-router-dom'`
3. shadcn/ui components — `import { Card, CardContent } from '@/components/ui/card'`
4. Engine store — `import { useGameStore } from '@/engine/gameState'`
5. Engine types (type-only) — `import type { PortfolioCompany } from '@/engine/types'`
6. Utility formatters — `import { formatCurrency } from '@/lib/utils'`
7. Lucide icons — last in imports
8. Local components — `import { DealCard } from '@/components/DealCard'`

**Path Aliases:**

- `@/` maps to `src/` — configured in both `tsconfig.app.json` and `vite.config.ts`
- Use `@/` for cross-layer imports; relative `./` for same-directory imports

## Error Handling

**Engine functions:**

- Return structured result objects with `{ success: boolean; reason?: string }` — see `canInvest()` in `src/engine/vcRealism.ts` and `invest()`, `performLPAction()` in `src/engine/gameState.ts`
- No exceptions thrown from pure engine functions; caller checks `.success` before using result

**React components:**

- Top-level error boundary using class component `src/components/ErrorBoundary.tsx`
- Wraps entire app in `src/App.tsx`
- `componentDidCatch` logs to `console.error`
- On error: shows "Try Again" (resets state flag) or "Reset Game" (clears localStorage + redirects)
- Defensive null checks in advanceTime loop: store re-fetched via `useGameStore.getState()` after each mutation
- `try { ... } catch { /* ignore */ }` used for non-critical operations (localStorage cleanup)

## Logging

**Framework:** `console.error` only (no logging library)

**Patterns:**

- Error boundary logs caught errors: `console.error("VenCap Error Boundary caught an error:", error, errorInfo)`
- No `console.log` used in production paths — all debug logging removed

## Comments

**Section Delimiters:**
Engine files use banner-style section headers uniformly:

```typescript
// ============================================================
// VenCap — Module Title
// Pure functions only. No state, no side effects.
// ============================================================
```

Within modules, logical groupings use:

```typescript
// ============ SECTION NAME ============
```

**Inline Comments:**

- Used to explain non-obvious numeric logic: `// Cycle: bull → normal → cooldown → hard → normal → bull`
- Types annotated with value ranges inline: `grit: number;  // 1-10`
- Module-level prohibition notes: `// NO logic in this file. Types and interfaces only.`

**JSDoc/TSDoc:**

- Not used — interface fields use inline comments instead of JSDoc

## Function Design

**Size:**

- Pure engine functions are short and focused (typically 10-40 lines)
- `advanceTime()` in `src/engine/gameState.ts` is the main exception (~600+ lines) — it is the core game loop
- Page components grow large (Portfolio.tsx: 1,610 lines; Dashboard.tsx: 1,091 lines) due to all UI state living in a single component

**Parameters:**

- Prefer explicit named parameters over option objects for pure functions
- Zustand actions use no parameters where state is read from the store directly

**Return Values:**

- Pure functions return plain objects or primitives
- Actions return `{ success: boolean; reason?: string }` for user-facing feedback
- Components return JSX

## Module Design

**Engine modules (`src/engine/`):**

- Pure functions only — no React imports, no side effects
- Single responsibility: `vcRealism.ts` (VC constraints), `dynamicEvents.ts` (event generation), `lpSentiment.ts` (LP calculations), `benchmarkData.ts` (industry benchmarks)
- All types centralized in `src/engine/types.ts` — no type definitions in other engine files
- `src/engine/gameState.ts` is the only stateful module (Zustand store)

**UI modules (`src/pages/`, `src/components/`):**

- Pages import from engine via `useGameStore` hook only — no direct engine function calls (engine logic stays in store actions)
- `memo()` used for performance-sensitive list items: `export const DealCard = memo(function DealCard(...))`
- Lazy loading for heavy chart components: `const PortfolioValueChart = lazy(() => import('@/components/Charts').then(...))`

**Exports:**

- Named exports preferred for engine functions and components
- Default export used for page components (`export default function InvestModal`) and some components
- Barrel files not used — imports reference specific file paths

---

_Convention analysis: 2026-03-11_
