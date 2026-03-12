# Technology Stack

**Project:** VenCap v4.0 — Career Simulator Expansion
**Researched:** 2026-03-11
**Context:** Brownfield — adding 5 feature sets to an existing React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + Zustand v5 + shadcn/ui codebase.

---

## Existing Stack (Locked — Do Not Change)

| Technology       | Installed Version | Role                                    |
| ---------------- | ----------------- | --------------------------------------- |
| React            | ^19.2.0           | UI runtime                              |
| TypeScript       | ~5.9.3            | Type safety (strict mode)               |
| Vite             | ^7.3.1            | Build tool, dev server                  |
| Tailwind CSS     | ^4.2.1            | Styling (CSS-first, no config file)     |
| Zustand          | ^5.0.11           | State management + localStorage persist |
| shadcn/ui        | ^3.8.5            | Component library (radix-ui primitives) |
| react-router-dom | ^7.13.1           | Client-side routing                     |
| Recharts         | ^3.7.0            | Charts                                  |
| Sonner           | ^2.0.7            | Toast notifications                     |
| tw-animate-css   | ^1.4.0            | CSS animations for Tailwind v4          |
| Vitest           | ^4.0.18           | Unit testing                            |

**Constraint:** No new frameworks. Every addition must integrate with this stack without breaking the 173 existing tests.

---

## Feature 1: Timeline Modes (IRL vs Freeplay)

### Approach: Pure Zustand state — zero new libraries

The IRL/freeplay toggle is entirely a game-logic concern: a session flag that gates `advanceTime()` by a real-world timer or removes gates entirely.

**Implementation:**

- Add `timelineMode: "irl" | "freeplay"` and `irlLockUntil: number | null` to GameState in `src/engine/types.ts`
- `advanceTime()` in `src/engine/gameState.ts` checks the lock before proceeding in IRL mode
- The mode selector renders at the end of the existing 5-step Index wizard (becomes step 1, or a modal at game start)
- Real-time lock countdown uses `Date.now()` stored in Zustand; no external timer library needed because the lock is checked on user action, not polled

**What NOT to use:**

- Do not introduce `rxjs` or any observable timer system. The game already advances time only when the user clicks "Advance Month" — IRL mode simply adds a `Date.now()` guard on that click, which is trivially handled in the store action.
- Do not use `react-use` for `useInterval`. The IRL cooldown display can be computed from `Date.now() - irlLockUntil` inside a component using `useState` + `useEffect` with a 1-second `setInterval` scoped to that component only.

**Confidence:** HIGH — this is pure application logic with no dependency on external libraries.

---

## Feature 2: Fund Raising Flow

### Approach: New Zustand slice + existing shadcn/ui components

The fundraising flow (LP pitching, commitment tracking, closing mechanics, fund terms config, progressive Fund I→II→III unlocking) is a multi-step wizard over new game state. The pattern already exists in the Index.tsx 5-step setup wizard.

**Implementation:**

- Extend `src/engine/types.ts` with `FundraisingRound`, `LPCommitment`, `FundingTarget`, and `FundGeneration` types
- New engine module `src/engine/fundraising.ts` for LP commitment probability, negotiation outcomes, closing conditions
- New page `src/pages/Fundraising.tsx` using the existing Dialog/Progress/Slider/Badge shadcn/ui components
- Fund progression (I→II→III) stored in Zustand as `fundGeneration: 1 | 2 | 3` with unlock conditions based on TVPI thresholds

**Specific components needed (all already installed):**
| shadcn/ui Component | Use |
|--------------------|-----|
| `Progress` | Closing progress bar (% of fund target committed) |
| `Dialog` | LP pitch modal, term negotiation modal |
| `Slider` | Fund size / fee / carry sliders |
| `Badge` | LP tier badges (seed LP, anchor LP, strategic LP) |
| `Tabs` | Fundraising pipeline tabs (prospecting / soft-circle / closed) |
| `Skeleton` | LP response loading state |

**What NOT to use:**

- Do not use a form library (React Hook Form, Formik). The fund terms form has 4-5 sliders and two inputs — the existing controlled-state pattern used throughout the codebase (useState + onChange) is sufficient. Adding a form library for this scope creates complexity and bundle weight without benefit.

**Confidence:** HIGH — all required UI primitives are installed; pattern mirrors existing Index.tsx wizard.

---

## Feature 3: Richer Interaction Feedback (Micro-animations, Tooltips, Outcome Previews)

### Approach: tw-animate-css (already installed) + CSS transitions + Radix Tooltip (already installed)

This is the most opinionated decision in the stack. The choice is between adding Framer Motion (~150 KB gzipped) vs using what is already present.

**Decision: Use tw-animate-css + Tailwind transitions. Do NOT add Framer Motion.**

**Rationale:**

1. `tw-animate-css` is already installed and imported in `src/index.css`. It provides `animate-in`, `animate-out`, `fade-in`, `slide-in-from-bottom`, `zoom-in`, `spin`, `bounce`, and custom keyframe utilities — everything needed for the described micro-animations.
2. The codebase is dark-only with Tailwind v4 CSS-first architecture. Framer Motion's JS-driven animations conflict with the CSS-variable theming approach and add a bundle cost that is unjustified for the scope described (entry animations on cards, state change feedback, outcome preview slide-ins).
3. Tailwind's `transition-*` utilities handle hover/focus state feedback on interactive elements.
4. Radix Tooltip (backing shadcn/ui `Tooltip`) already handles contextual tooltips — the `Tooltip` component is installed.

**Specific tw-animate-css patterns for each use case:**
| Use Case | tw-animate-css Class |
|----------|---------------------|
| Card entry animation | `animate-in fade-in slide-in-from-bottom-4 duration-300` |
| Metric value change | `animate-in zoom-in-50 duration-150` (apply on value change via key prop) |
| Outcome preview panel | `animate-in slide-in-from-right duration-200` |
| Skill hint badge | `animate-in fade-in-50 duration-500` |
| Toast-like feedback | Sonner already handles this |

**Contextual tooltips** (metric impact, skill hints):

- Use existing `Tooltip` + `TooltipContent` + `TooltipTrigger` from `src/components/ui/tooltip.tsx`
- For outcome previews: a controlled `Dialog` (already installed) that renders before the user confirms a high-stakes action, showing the projected delta values

**What NOT to use:**

- Framer Motion — unjustified bundle cost (~150 KB) for this scope; tw-animate-css covers all requirements
- `react-spring` — same reasoning; CSS-first approach is sufficient and already wired
- Any tooltip library outside Radix — the installed one is sufficient and avoids z-index conflicts

**Confidence:** HIGH — tw-animate-css capabilities confirmed from local README; Radix Tooltip confirmed installed.

---

## Feature 4: LLM Report Generation (Stubbed)

### Approach: Native fetch (stubbed) + streaming-ready interface pattern

Since the requirement explicitly calls for no live API yet, the architecture decision is about building the interface correctly so that wiring the real API later is a one-line change per stub.

**Implementation:**

- New module `src/engine/reportGeneration.ts` with functions that accept game state and return `Promise<string>` — today returning `Promise.resolve(mockReport)`, later replaced with `fetch(API_URL, { body: JSON.stringify(prompt) })`
- For streaming simulation (makes the UI feel like a real LLM): use `ReadableStream` with a custom stub that yields the mock string in chunks via a `TextDecoder`-based reader — this makes the loading/streaming UI work identically against the stub and the real API
- Report types: `portfolio-summary`, `deal-memo`, `lp-update`, `market-analysis`

**Streaming UI pattern (no library needed):**

```typescript
// Stub in reportGeneration.ts
async function* streamReport(prompt: string): AsyncGenerator<string> {
  const mockText = MOCK_REPORTS[prompt.type];
  for (const chunk of mockText.match(/.{1,20}/g) ?? []) {
    await new Promise((r) => setTimeout(r, 30));
    yield chunk;
  }
}
```

Components read from the async generator with `for await...of`, updating a string state. This is identical to how the OpenAI streaming API works, so the swap is seamless.

**Loading / error / empty states:**

- Loading: `Skeleton` component (installed) arranged as a document outline
- Streaming: render the string as it accumulates in a `<pre>` or prose div
- Error: existing `toast` from Sonner (installed)
- Empty: descriptive empty-state div with Lucide icon (installed)

**What NOT to add:**

- Do not add the Vercel AI SDK (`ai`) at this stage. It provides useChat/useCompletion hooks that are excellent for real API integration, but they pull in streaming infrastructure that is dead code until the API is wired. Stub manually now; add the AI SDK (version ^4.x) when the API integration phase begins.
- Do not add `@anthropic-ai/sdk` or `openai` npm packages. No backend, no API key management in the browser.
- Do not add a markdown renderer (react-markdown, remark) yet. The stub output can be plain text. If rich formatting is needed when the real API ships, add `react-markdown ^9.x` (ES module, small, React 19 compatible) at that point.

**Confidence:** HIGH — native browser APIs cover all requirements; the stub → real API swap pattern is well-established.

---

## Feature 5: VC Skills Tracking System

### Approach: New Zustand slice + localStorage persistence (existing middleware)

The skills system (19 skills across hard/soft/context categories, proficiency levels, contextual hints, toggleable feedback, persistence) is a data-model and UI concern. No external library is needed.

**Data persistence:**

- The existing Zustand `persist` middleware with `localStorage` key `vencap-game-state` already handles cross-session persistence
- Add `skillsProfile: SkillsProfile` to the persisted state shape; `partialize` to include it (alongside existing game state)
- Skills progress is a simple `Record<SkillId, { level: number; xp: number; lastEarned: number }>` — no indexedDB, no external storage

**Proficiency visualization:**

- Use existing `Progress` component for XP bars
- Use existing `Badge` component for level tiers (Novice / Practitioner / Expert / Master)
- Use existing `Tabs` for skills dashboard categories (Hard Skills / Soft Skills / Context-Specific)
- Skill hint badges rendered inline use `Tooltip` (installed) for "You exercised: Financial Modeling" contextual messages

**Toggleable feedback:**

- Store `showSkillFeedback: boolean` in Zustand (persisted)
- A toggle in settings or the dashboard; use shadcn/ui `Switch` (not yet installed — add via `npx shadcn add switch`)

**What NOT to use:**

- Do not add a charting library for skills radar chart. A spider/radar chart is tempting, but Recharts `RadarChart` (already installed in the `recharts` package) covers this if a visual chart is desired.
- Do not add a game-framework level XP/leveling library. The math is simple linear XP — implement it as a 10-line pure function in `src/engine/skills.ts`.

**Confidence:** HIGH — all required primitives are either installed or trivially available via `npx shadcn add`.

---

## Feature 6: Performance Monitoring (Vercel Speed Insights)

### Add: `@vercel/speed-insights`

The PROJECT.md specifies the import path explicitly: `@vercel/speed-insights/react` (not the Next.js path).

**Installation:**

```bash
npm install @vercel/speed-insights
```

**Usage (in `src/main.tsx` or `src/App.tsx`):**

```typescript
import { SpeedInsights } from "@vercel/speed-insights/react";
// Render <SpeedInsights /> once at the root
```

**Version:** As of August 2025, the package is at `^1.x`. The `/react` import path is the correct non-Next.js path for Vite projects. This is confirmed by the Vercel documentation pattern referenced in the PROJECT.md key decisions table.

**Confidence:** MEDIUM — version confirmed from training data through August 2025; `@vercel/speed-insights/react` path is the documented Vite/non-Next.js import per Vercel docs. Verify version on install.

---

## Feature 7: i18n-Ready Strings

### Approach: Extract strings into a constants object — do NOT add react-i18next yet

The requirement says "i18n-ready", not "ship i18n now". The correct lightweight interpretation for a brownfield game codebase is:

1. All user-facing strings in new components use a `t()` shim (a no-op function that returns its argument)
2. This shim is replaced with the real `react-i18next` `useTranslation()` hook when localization is needed
3. No translation JSON files, no language detector, no namespace configuration in this milestone

**The shim (add to `src/lib/utils.ts`):**

```typescript
// i18n shim — replace with useTranslation when localizing
export const t = (key: string, _fallback?: string): string => key;
```

All new components call `t("some.key")` instead of hardcoding strings. The key doubles as the English string. When localization ships, swap the shim for a real translation hook with no refactoring of call sites.

**What NOT to add:**

- Do not install `react-i18next` or `i18next` in this milestone. They add ~30 KB and require namespace configuration, language detection setup, and translation file management — all overhead with zero user-visible benefit until the second language ships.
- Do not use ICU message format or pseudo-localization tooling yet.

**If/when localization ships:**

- `react-i18next ^15.x` — the current major version, compatible with React 19
- `i18next ^24.x` — the backing library, compatible with Vite (ESM)
- Translation files as JSON in `public/locales/{lang}/translation.json`
- Lazy-loaded per language via `i18next-http-backend`

**Confidence:** HIGH — the shim pattern is a standard "i18n ready but not yet localized" approach; react-i18next v15/i18next v24 compatibility with React 19 is confirmed from training data.

---

## One New shadcn/ui Component Needed

| Component | Why                                         | Install Command         |
| --------- | ------------------------------------------- | ----------------------- |
| `Switch`  | Skills feedback toggle, IRL/freeplay toggle | `npx shadcn add switch` |

All other required components (`Progress`, `Dialog`, `Tabs`, `Slider`, `Badge`, `Skeleton`, `Tooltip`, `Select`, `Input`, `Card`, `Separator`, `Sheet`, `ScrollArea`, `Table`) are already installed.

---

## Bundle Impact Assessment

| Feature              | New Dependencies                           | Bundle Delta |
| -------------------- | ------------------------------------------ | ------------ |
| Timeline Modes       | None                                       | +0 KB        |
| Fund Raising Flow    | None (shadcn Switch: ~2 KB)                | +~2 KB       |
| Interaction Feedback | None (tw-animate-css already present)      | +0 KB        |
| LLM Report Stubs     | None (native fetch/async generators)       | +0 KB        |
| Skills Tracking      | None (Recharts RadarChart already bundled) | +0 KB        |
| Speed Insights       | `@vercel/speed-insights` (~8 KB)           | +~8 KB       |

**Current bundle:** ~1 MB (Recharts is the dominant cost, already code-split).
**Projected new bundle:** ~1.01 MB — negligible increase.

---

## Alternatives Considered

| Category           | Recommended                            | Alternative                   | Why Not                                                                 |
| ------------------ | -------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| Micro-animations   | tw-animate-css (installed)             | Framer Motion                 | +150 KB bundle; CSS-first stack; tw-animate-css covers all cases        |
| Micro-animations   | tw-animate-css (installed)             | react-spring                  | Same reasoning; JS-driven adds bundle overhead for no gain              |
| Fund Raising Forms | Controlled useState (existing pattern) | React Hook Form               | Overkill for 4-5 slider form; adds dependency                           |
| LLM Streaming      | Native async generator                 | Vercel AI SDK `useCompletion` | Dead code until API ships; add at API integration time                  |
| i18n               | t() shim (zero deps)                   | react-i18next now             | Zero user benefit until second language; adds 30 KB and config overhead |
| Skills persistence | Zustand persist (existing)             | IndexedDB / idb               | LocalStorage is sufficient; no offline-first or large-data requirement  |
| Outcome previews   | shadcn Dialog (installed)              | Popover library               | Dialog is already used for modals; consistent UX                        |

---

## Installation Summary

Only one net-new dependency and one new shadcn component are required for this entire milestone:

```bash
# New npm package
npm install @vercel/speed-insights

# New shadcn component
npx shadcn add switch
```

Everything else is built from existing stack primitives.

---

## Sources

- Local `package.json` — confirmed installed versions (React 19.2, Zustand 5.0.11, Tailwind 4.2.1, tw-animate-css 1.4.0, Vitest 4.0.18)
- Local `node_modules/tw-animate-css/README.md` — confirmed animation utilities available
- Local `src/components/ui/` directory — confirmed installed shadcn/ui components
- Local `vite.config.ts` — confirmed code-splitting strategy and test environment
- Local `src/index.css` — confirmed tw-animate-css imported, Tailwind v4 CSS-first architecture
- PROJECT.md — confirmed constraints (no backend, localStorage only, LLM stubbed, Speed Insights `/react` path)
- Training data (August 2025 cutoff): Framer Motion v11, react-i18next v15, i18next v24, @vercel/speed-insights v1 — MEDIUM confidence on exact versions; verify on install
