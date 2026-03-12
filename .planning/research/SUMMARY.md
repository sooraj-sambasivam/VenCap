# Project Research Summary

**Project:** VenCap v4.0 — Career Simulator Expansion
**Domain:** Brownfield React/TypeScript game — 5-system feature expansion
**Researched:** 2026-03-11
**Confidence:** HIGH

## Executive Summary

VenCap v4.0 adds five interdependent feature systems to an already-complete VC fund simulator: Timeline Modes (IRL vs Freeplay pacing), a Fundraising Flow (LP pitching through fund closing), richer Interaction Feedback (micro-animations, tooltips, outcome previews), stubbed LLM Report Generation, and a VC Skills Tracking system. All five must integrate cleanly into an existing React 19 + Zustand v5 codebase with 173 passing tests, strict TypeScript, and a well-established engine/store/page architecture. The recommended approach follows the existing architectural pattern precisely: new pure engine modules in `src/engine/`, state changes only through the Zustand store, and UI components that read store state without owning game logic.

The highest-leverage decision across all five features is build order. Timeline Mode must ship first because its `timelineMode` flag on the `Fund` type is referenced by every subsequent feature — Fundraising Flow respects IRL pacing, Skills hints are time-gated in IRL mode, and Interaction Feedback surfaces gated-action queues. Similarly, `src/engine/types.ts` must receive all new types for all five systems before any implementation begins, preventing the types file from becoming a mid-build bottleneck. The Skills system is the most architecturally significant addition: it touches every action in `gameState.ts` and must be integrated at the store level, not the component level.

The dominant risk category is architectural drift under brownfield pressure: five features all want to borrow the path of least resistance, which in this codebase means moving logic into components and creating parallel state. The three most dangerous specific drifts are (1) treating `timelineMode` as a UI flag rather than an engine constraint, (2) storing generated LLM reports in Zustand/localStorage (they are ephemeral output, not game state), and (3) tracking skills in a separate localStorage key outside the Zustand persist layer. Preventing these requires establishing type contracts and store extensions before writing any UI, not after.

---

## Key Findings

### Recommended Stack

The stack is locked — no new frameworks and only two small additions are needed for this entire milestone. The existing React 19 + Vite 7 + Tailwind v4 + Zustand v5 + shadcn/ui stack handles every requirement. `tw-animate-css` (already installed) replaces Framer Motion for micro-animations; native `async generators` replace the Vercel AI SDK for streaming-simulation; the existing Zustand `persist` middleware covers all new persistence needs; and the existing Recharts bundle includes `RadarChart` for the skills constellation view.

The only two additions are `@vercel/speed-insights` (npm install, ~8 KB) and the `Switch` shadcn component (`npx shadcn add switch`). Total projected bundle delta: ~10 KB on a ~1 MB base.

**Core technologies:**

- React 19 + Zustand v5 — UI runtime and state management — already installed, no change
- `tw-animate-css` — micro-animations — already installed, replaces Framer Motion (saves 150 KB)
- Native async generators — LLM streaming simulation — zero deps, seamless swap to real API later
- Zustand `persist` with `partialize` — skills and fundraising persistence — existing pattern, extend in place
- `@vercel/speed-insights/react` — Vite-specific import path — only new npm package in this milestone
- `Switch` (shadcn/ui) — skills feedback toggle, IRL/freeplay toggle — only new UI primitive needed

### Expected Features

All five feature clusters have clear table-stakes requirements that must be present for the feature to feel complete, plus differentiators to pursue as scope allows.

**Must have (table stakes):**

- Timeline mode selector locked at fund init, visible cooldowns in IRL mode, freeplay with zero gates everywhere
- LP pipeline with status tracking (soft-circle → hard commit → closed), progress bar toward fund target, first/final close mechanics
- Visual acknowledgment on every user action, contextual tooltips on all 20+ metric labels, distinct success/failure feedback treatment
- LLM stub with realistic VC prose interpolating real game values, loading state, copy affordance, and error state
- Skills page showing proficiency by category, skill gain on relevant actions only (not on every `advanceTime()`), named career-tier levels (Analyst → MD), persistence across sessions

**Should have (differentiators):**

- IRL mode calendar showing blocked-action queue with estimated unlock dates
- LP personality archetypes (endowment vs family office vs FoF) with distinct negotiation behavior
- Fund II/III progressive unlock based on Fund I TVPI thresholds — career meta-progression
- Outcome previews before high-stakes actions showing projected effect ranges
- Cause-and-effect tick summary after each `advanceTime()` — what changed and why
- Skill constellation radar chart (Recharts RadarChart already bundled)
- Cross-fund skill accumulation (requires Fund II/III first)

**Defer (v2+):**

- Real LLM API integration (ship stub first; add Vercel AI SDK when API is wired)
- LP archetype system, oversubscription mechanics, side letter simulation — each requires prior archetype work
- Separate skills leaderboard — surfaces on end-of-fund scorecard as secondary stat only
- Outcome probability distributions — needs engine work, defer post-MVP

### Architecture Approach

The five systems map cleanly onto the existing engine/store/page layering. Every new system follows the same pattern: new types in `types.ts` first, pure logic in a new `src/engine/[domain].ts` module, store extensions in `gameState.ts`, then pages and components last. The Interaction Feedback system requires one store-level addition — a `feedbackEvents: FeedbackEvent[]` queue — so that cascading effects across multiple panels can all animate in response to a single store action. LLM report state lives in local component state only (never Zustand) because reports are ephemeral output. Skill state lives in Zustand with `partialize` inclusion, but skills are explicitly excluded from `GameSnapshot` so undo does not roll back career progression.

**Major components:**

1. `src/engine/timelineGates.ts` — pure gate definitions and evaluation; store reads results, UI only reads `pendingTimeGates[]`
2. `src/engine/fundraising.ts` — LP prospect generation, commitment simulation, closing mechanics, Fund II/III unlock thresholds
3. `src/engine/skillsEngine.ts` — 19-skill definitions, `calculateSkillGain(action, context)`, proficiency tier thresholds
4. `src/engine/reportStubs.ts` — async generator stub returning `ReportGenerationResult` shape; interface identical to future real API
5. `src/engine/outcomeProjection.ts` — pure function: given action + current state, return projected effect range for OutcomePreview
6. `src/pages/Fundraising.tsx` — campaign dashboard, LP prospect list, commitment tracker, closing progress
7. `src/pages/Skills.tsx` — skills grid with proficiency bars, history timeline, category filter, feedback toggle
8. `src/components/ReportGenerator.tsx` — report type picker, loading skeleton, rendered output, copy/export
9. `src/components/SkillHint.tsx` — inline post-decision hint with rate limiting via `shouldShowSkillHint()`
10. `src/components/OutcomePreview.tsx` — pre-decision projection modal for high-stakes actions

### Critical Pitfalls

1. **Timeline mode as a UI flag** — Store `timelineMode` on the `Fund` type in `types.ts` and gate actions inside `gameState.ts` store actions. Components call actions; the store decides whether to allow them. If `timelineMode` first appears in a React component file, stop and move it.

2. **Fundraising bypassing fund economics** — Define `FundraisingRound` type first; the transition from active campaign to completed `Fund` must happen in one atomic `completeFundClose()` action that resets `totalFeesCharged`, `carryAccrued`, and `gpEarnings` correctly. Never set `cashAvailable` or `currentSize` from a component.

3. **Skills stored outside Zustand persist layer** — Add `skillProfile: SkillProfile` to `GameState`, include in `partialize`, and explicitly exclude from `GameSnapshot`. No separate `localStorage` key. No `useSkills.ts` hook as a parallel store.

4. **LLM stub shape incompatible with real API** — The stub must return `ReportGenerationResult { status: ReportGenerationStatus; content: string; error?: string; generatedAt?: number }`. Components are written against this interface. When the real API ships, only the stub function body changes.

5. **Interaction feedback in component-local state** — Add a `feedbackEvents: FeedbackEvent[]` queue to the Zustand store before writing any animation code. Store actions push events; components subscribe via selectors. Otherwise, portfolio actions that affect multiple panels will only animate in the panel that was clicked.

---

## Implications for Roadmap

Based on research, suggested phase structure (7 phases, ordered by type dependencies and integration points):

### Phase 1: Types Foundation

**Rationale:** All five systems extend `src/engine/types.ts`. Writing all new types first unblocks parallel development and prevents the types file from being a mid-build bottleneck. This phase has zero UI work.
**Delivers:** Updated `types.ts` with all new interfaces; updated `GameSnapshot` converted to `Omit<GameState, 'history' | 'skillProfile' | 'skillHistory'>` alias to enforce undo exclusions at the compiler level.
**Addresses:** All five feature clusters begin here.
**Avoids:** Pitfall 10 (GameSnapshot drift), Pitfall 3 (skills outside persist layer), Pitfall 4 (stub shape incompatibility).

### Phase 2: Pure Engine Modules

**Rationale:** All five engine modules are independently testable pure functions with no React dependency. Building them before store integration allows unit tests to be written alongside the logic, targeting 220+ total tests.
**Delivers:** `skillsEngine.ts`, `timelineGates.ts`, `fundraising.ts`, `reportStubs.ts`, `outcomeProjection.ts` — each with unit tests.
**Uses:** No new dependencies; pure TypeScript logic only.
**Avoids:** Pitfall 1 (engine logic in components), Pitfall 2 (fundraising bypass).

### Phase 3: Store Integration

**Rationale:** Once engine modules exist, the Zustand store can be extended and integrated in one pass. This is the largest single file change — `gameState.ts` grows from ~3,200 to ~3,700 lines — and must happen before any page work.
**Delivers:** Extended `GameState` with all new fields and actions; `advanceTime()` calling `calculateSkillGain()`; `initFund()` accepting `timelineMode`; `feedbackEvents` queue; `partialize` updated.
**Implements:** All 5 architecture components at the store level.
**Avoids:** Pitfall 1, Pitfall 2, Pitfall 3, Pitfall 5 (feedback in component-local state).

### Phase 4: Index.tsx and Infrastructure Setup

**Rationale:** Before new pages can be built, the game must be able to start with the new config. The fund setup wizard must pass `timelineMode` and `fundNumber` to `initFund()`. Infrastructure additions (Speed Insights, `t()` i18n shim, `Switch` component) belong here so all subsequent components use them from the start.
**Delivers:** Timeline mode toggle in Index.tsx wizard; Fund II/III unlock display; `@vercel/speed-insights` in App.tsx; `t()` shim in `src/lib/utils.ts`; `Switch` component installed.
**Avoids:** Pitfall 8 (IRL mode interpretation locked as in-game-turn, not wall-clock), Pitfall 11 (i18n strings), Pitfall 12 (Speed Insights import path).

### Phase 5: New Pages

**Rationale:** Pages are read-heavy and depend on the store being complete. Skills.tsx is built first as the simpler read-only display, then Fundraising.tsx which has more complex action flows.
**Delivers:** `/skills` route with proficiency grid, history timeline, feedback toggle; `/fundraising` route with LP prospect list, commitment tracker, closing progress indicator; NavBar and keyboard shortcut updates.
**Addresses:** Skills table stakes, Fundraising table stakes.
**Avoids:** Pitfall 13 (mobile responsiveness — design mobile-first).

### Phase 6: Feedback and Animation Layer

**Rationale:** The feedback layer wraps existing actions without modifying them and is built last to avoid premature abstraction. `OutcomePreview` slots in front of existing modals as an optional step. `ActionFeedback` and `SkillHint` are display-only.
**Delivers:** `ActionFeedback.tsx`, `OutcomePreview.tsx`, `TooltipMetric.tsx`, `SkillHint.tsx`; metric tooltips on all 20+ Dashboard labels; animated TVPI/IRR counters using `key` prop + `tw-animate-css`.
**Implements:** Feedback layer architecture pattern.
**Avoids:** Pitfall 5, Pitfall 7 (notification fatigue — `shouldShowSkillHint()` rate limiting).

### Phase 7: LLM Report Generation UI

**Rationale:** Loosest coupling of all five features — can be built last without blocking anything. Extends the existing `/reports` page with a new tab rather than a new route.
**Delivers:** `ReportGenerator.tsx` in Reports.tsx; 4 report types with realistic template-filled stub output; loading skeleton; copy-to-clipboard; simulated error state (10% failure); async generator streaming simulation.
**Uses:** Native async generators; existing Skeleton, Tabs, Sonner components.
**Avoids:** Pitfall 4 (stub shape fully compatible with future real API).

### Phase Ordering Rationale

- Phases 1–3 (types → engine → store) are strictly ordered by dependency: you cannot write engine code without types, and you cannot write store code without engine modules.
- Phase 4 (Index.tsx) must precede pages because the game cannot start with the new config until the wizard passes it.
- Phase 5 (Pages) before Phase 6 (Feedback) because feedback components wrap existing pages — they should not exist before the pages they wrap.
- Phase 7 (LLM reports) is last because it has zero dependencies on phases 5 or 6 and its ordering does not affect delivery of any other feature.
- This order also mirrors the existing codebase build order from v1.0 through v3.0: engine first, store second, UI last.

### Research Flags

Phases needing closer attention during planning:

- **Phase 3 (Store Integration):** `gameState.ts` is already ~3,200 lines. Integrating 5 new systems could push it toward maintainability limits. Consider extracting action groups into helper functions within the same file before adding new actions. No split of the store itself — one store keeps the mental model clean.
- **Phase 5 (Fundraising.tsx):** The commitment → closing state machine (pitching → first_close → final_close → fund_complete) has non-obvious edge cases: partial closes, LP withdrawals after soft-circle, and fund size renegotiation. Plan these state transitions in detail before coding.
- **Phase 6 (Feedback Layer):** Outcome previews require `outcomeProjection.ts` to produce accurate projections. If the projection logic is too optimistic (always predicts the median), the previews will train players to mistrust them. Define the projection confidence interval approach before building the UI.

Phases with well-documented patterns (can proceed without additional research):

- **Phase 1 (Types Foundation):** Pure TypeScript interface design; no ambiguity.
- **Phase 2 (Engine Modules):** All five modules are pure functions with no external dependencies; standard TDD applies.
- **Phase 4 (Infrastructure):** Speed Insights import path is documented; `t()` shim is a one-liner; `Switch` is `npx shadcn add switch`.
- **Phase 7 (LLM Reports):** Async generator streaming pattern is well-defined; stub-to-real-API swap path is clear.

---

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                                                                                                                                 |
| ------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | Primary source: local `package.json`, `node_modules/`, `src/index.css`, `vite.config.ts` — all verified against actual installed files. Only `@vercel/speed-insights` version is MEDIUM (verify on install).                                          |
| Features     | HIGH       | Table stakes grounded in real VC practice (LP pipeline terminology, closing mechanics, career ladder). Game design patterns (FM-style summaries, Democracy 3 tooltips) are MEDIUM — extrapolated from training data, not current competitor analysis. |
| Architecture | HIGH       | Primary source: direct codebase analysis of `types.ts`, `gameState.ts`, `App.tsx`, `Index.tsx`, `Reports.tsx`. All architectural claims are grounded in existing code, not assumptions.                                                               |
| Pitfalls     | HIGH       | Pitfalls 1–5 (critical) all derived from direct codebase inspection and verifiable anti-patterns. Pitfalls 6–13 are MEDIUM — pattern analysis from brownfield expansion experience, not specific VenCap failure data.                                 |

**Overall confidence:** HIGH

### Gaps to Address

- **IRL mode time interpretation:** PITFALLS.md flags this as the first Key Decision to lock. The spec says "IRL pacing" but does not define whether gates are measured in real wall-clock time or in-game turns. Interpretation as in-game turns (each `advanceTime()` click = 1 month; some actions require N months before available) is strongly recommended and must be documented in PROJECT.md before Phase 3 begins.

- **Fund II/III TVPI unlock thresholds:** The specific thresholds (e.g., Fund I net TVPI ≥ 1.5x for Fund II unlock) are not defined in PROJECT.md. These must be set as constants in `fundraising.ts` before any UI shows them. Validate against real VC return expectations (median top-quartile fund returns ~2x net) before finalizing numbers.

- **Skills XP curve:** The 19-skill action mapping (which store action awards XP to which skills, and how much) is the largest design surface in the milestone. A complete mapping table should be produced during Phase 3 planning, not discovered during implementation.

- **`@vercel/speed-insights` version:** Documented as MEDIUM confidence in STACK.md. Run `npm install @vercel/speed-insights` and verify the installed version matches expectations before marking Phase 4 complete.

- **WebSearch unavailability:** FEATURES.md notes WebSearch was unavailable during research. Competitor analysis claims (no other public simulator models multi-fund career progression) are based on training data through August 2025 and should be treated as MEDIUM confidence.

---

## Sources

### Primary (HIGH confidence)

- `/Users/soorajsambasivam/Documents/projects/VenCap/src/engine/types.ts` — existing type shapes, GameState interface, GameSnapshot definition
- `/Users/soorajsambasivam/Documents/projects/VenCap/src/engine/gameState.ts` — store actions, advanceTime() pattern, partialize exclusions
- `/Users/soorajsambasivam/Documents/projects/VenCap/src/App.tsx` — routing, lazy loading, provider structure
- `/Users/soorajsambasivam/Documents/projects/VenCap/src/pages/Index.tsx` — 5-step wizard pattern
- `/Users/soorajsambasivam/Documents/projects/VenCap/src/pages/Reports.tsx` — existing reports page structure
- `/Users/soorajsambasivam/Documents/projects/VenCap/package.json` — installed dependency versions
- `/Users/soorajsambasivam/Documents/projects/VenCap/node_modules/tw-animate-css/README.md` — animation utility availability
- `/Users/soorajsambasivam/Documents/projects/VenCap/.planning/PROJECT.md` — feature requirements and constraints

### Secondary (MEDIUM confidence)

- Training data (August 2025 cutoff): Framer Motion v11, react-i18next v15, i18next v24, @vercel/speed-insights v1
- VC industry practice: LP pipeline terminology, fund closing mechanics, career ladder structure
- Game design pattern analysis: Football Manager post-match summaries, Democracy 3 tooltip system, Kairosoft pacing

### Tertiary (LOW confidence)

- 10% stub failure simulation rate — no empirical basis; chosen as lowest-friction error path exercise
- Competitor simulator feature analysis — training data only, WebSearch unavailable during research session

---

_Research completed: 2026-03-11_
_Ready for roadmap: yes_
