# Architecture Patterns

**Domain:** Brownfield React + Zustand game — 5-system expansion
**Researched:** 2026-03-11
**Confidence:** HIGH (primary source is the actual codebase, not training data)

---

## Existing Architecture (Baseline)

Before mapping new systems, the established pattern must be understood precisely because all 5 new systems must fit it — not reshape it.

```
src/engine/           Pure TypeScript functions + Zustand store
  types.ts            Single source of truth for all types
  gameState.ts        Zustand store with persist middleware (useGameStore)
  [domain].ts         Pure engine modules (no React imports)

src/pages/            Full-page React components, route-mounted
  [Page].tsx          Reads from useGameStore, calls store actions

src/components/       Sub-page UI components
  [Component].tsx     Props-driven or reads useGameStore directly

src/App.tsx           Router, lazy-loaded pages, global providers
```

**Critical invariants that must not be violated:**

1. Engine files (`src/engine/*.ts`) contain zero React imports. They export pure functions and types.
2. The Zustand store (`useGameStore`) is the single state owner. Pages do not have their own state for game data.
3. Persistence happens via `zustand/middleware persist` with `partialize` to exclude ephemeral fields (`history`).
4. All types flow from `src/engine/types.ts`. No parallel type hierarchies.
5. `GameState` interface in `types.ts` declares both data shape and all action signatures. Adding a feature means updating `GameState` first.
6. Strict TypeScript throughout. Unused parameters require `_` prefix.

---

## Recommended Architecture

The 5 new systems map to the existing pattern as follows:

### System 1: Timeline Mode (IRL vs Freeplay)

**What it is:** A session-start toggle that gates or removes time delays on actions.

**Where it lives:**

```
src/engine/types.ts         Add: TimelineMode = "irl" | "freeplay"
                            Add: TimelineGate interface
                            Extend: Fund to include timelineMode: TimelineMode
src/engine/timelineGates.ts New pure module — gate definitions, evaluation functions
src/engine/gameState.ts     Extend: initFund() to accept timelineMode
                            Extend: GameState to hold pendingTimeGates: TimelineGate[]
src/pages/Index.tsx         Add toggle in Step 1 or Step 2 of the 5-step wizard
src/pages/Dashboard.tsx     Show gated-action queue when in IRL mode
```

**Data flow:**

```
Index.tsx (user toggle) → initFund({ timelineMode }) → Fund.timelineMode
                                                         ↓
                         advanceTime() checks gates → resolves or enqueues gated actions
                                                         ↓
                         Dashboard.tsx reads pendingTimeGates → shows queue UI
```

**Key design decision:** Time gates are data, not UI logic. `timelineGates.ts` defines what actions cost how many real-time ticks. Gate resolution happens inside `advanceTime()`. UI only reads `pendingTimeGates[]` from the store — it does not compute gate state.

**IRL mode must not block the `advanceTime()` call itself.** It gates individual player-initiated actions (invest, follow-on, hire), not the game clock. Otherwise the game becomes unplayable.

---

### System 2: Fund Raising Flow

**What it is:** LP pitching, commitment tracking, fund size negotiation, closing mechanics, progressive fund unlocking (Fund I → II → III).

**Where it lives:**

```
src/engine/types.ts           Add: LPProspect, FundRaisingCampaign, FundRaisingStatus
                              Extend: Fund to include fundNumber: 1 | 2 | 3,
                                      raisingCampaign: FundRaisingCampaign | null
src/engine/fundraising.ts     New pure module — LP prospect generation, commitment
                              simulation, closing mechanics, unlock thresholds
src/engine/gameState.ts       Extend: GameState with activeCampaign: FundRaisingCampaign | null
                              Add actions: startRaise(), pitchLP(), acceptCommitment(),
                                          closeFund(), unlockFundII()
src/pages/Fundraising.tsx     New page — campaign dashboard, LP prospect list,
                              commitment tracker, closing progress indicator
src/App.tsx                   Add route: /fundraising
src/components/NavBar.tsx     Add nav item: Fundraising (visible only when campaign active
                              or in pre-fund phase)
```

**Data flow:**

```
Results.tsx / rebirth()        → signals eligibility for Fund II/III
Index.tsx (Fund II+ setup)     → reads unlock thresholds from fundraising.ts
startRaise() action            → creates FundRaisingCampaign in store
Fundraising.tsx                → reads activeCampaign, renders LP prospects
pitchLP() / acceptCommitment() → updates campaign.commitments[], fund.currentSize
closeFund() action             → transitions gamePhase to "playing", clears campaign
advanceTime()                  → may auto-progress campaign milestones in IRL mode
```

**Progressive unlock logic belongs in `fundraising.ts`,** not in `Results.tsx`. `Results.tsx` calls `getUnlockThreshold(rebirthCount)` from `fundraising.ts` to display the requirement. The actual gating is enforced in `initFund()`.

**Fund II/III unlocking:** Add `rebirthCount` to the unlock check. Fund I is always available. Fund II requires a minimum net TVPI from Fund I (e.g., 1.5x). Fund III requires Fund II completion above a higher threshold. Thresholds live in `fundraising.ts` as constants, not hardcoded in UI.

---

### System 3: Feedback Micro-Interactions

**What it is:** Micro-animations on portfolio/team interactions, contextual tooltips showing metric impact, outcome previews before high-stakes decisions, cause-and-effect feedback.

**Where it lives:**

```
src/components/ActionFeedback.tsx   New component — animated delta badges
                                    ("+12 LP sentiment", "-5% ownership")
src/components/OutcomePreview.tsx   New component — pre-decision modal showing
                                    projected effects before confirmation
src/components/TooltipMetric.tsx    New component — hoverable metric cards that
                                    explain what drives a number
src/engine/outcomeProjection.ts     New pure module — given an action + current state,
                                    return projected effect range
```

**No new store state required.** This system is purely presentational. It reads existing store state and calls pure projection functions from `outcomeProjection.ts`. No data is persisted.

**Data flow:**

```
User hovers action button
  → TooltipMetric reads current store state + action type
  → calls outcomeProjection.ts: projectAction(actionType, company, fund)
  → returns { low: Effect, expected: Effect, high: Effect }
  → TooltipMetric renders range

User clicks high-stakes action (invest, follow-on, accept buyout)
  → OutcomePreview renders projected effects
  → User confirms → existing store action fires
  → ActionFeedback animates actual delta against projected
```

**outcomeProjection.ts must be a pure function.** It takes current state slices as arguments, not `useGameStore`. This keeps it testable and engine-boundary-clean.

**Micro-animations:** Use CSS transitions via Tailwind (`transition-all`, `animate-pulse`) rather than a new animation library. The existing `PageTransition.tsx` already establishes this pattern. Only introduce Framer Motion if Tailwind transitions prove insufficient after implementation — do not add it preemptively.

---

### System 4: LLM Report Generation (Stubbed)

**What it is:** UI for portfolio performance summary reports, deal memo drafts, LP update letters, and market analysis reports. API calls are stubbed — no actual LLM integration yet.

**Where it lives:**

```
src/engine/types.ts              Add: ReportType, ReportRequest, ReportResult,
                                 ReportGenerationStatus
src/engine/reportStubs.ts        New pure module — mock report generator that returns
                                 plausible template-filled strings from game state.
                                 Simulates a 1-2 second async delay.
src/pages/Reports.tsx            Extend existing page — add "Generate Report" section
                                 with report type selector, loading state, rendered output
src/components/ReportGenerator.tsx  New component — type picker, generate button,
                                    loading skeleton, error state, copy/export actions
```

**No new route.** The LLM report UI extends the existing `/reports` page. The existing `Reports.tsx` already has LP reports and benchmarks; the AI generation section becomes a new tab or card within it.

**Data flow:**

```
ReportGenerator.tsx
  → user selects report type + optional parameters (company, sector, period)
  → calls reportStubs.generateReport(type, gameStateSlice): Promise<ReportResult>
  → shows loading skeleton (simulated 1.5s delay in stub)
  → renders markdown-formatted output in a read-only card
  → offers copy-to-clipboard and download-as-text actions

reportStubs.ts
  → receives a minimal game state slice (not the whole store)
  → uses template strings populated with real game data
  → returns ReportResult { content: string, generatedAt: number, reportType }
  → when real API is wired later, this module's interface does not change — only
    the implementation inside generateReport() swaps from stub to fetch()
```

**Why the stub lives in engine, not in a React component:** The stub must be replaceable with a real API call without touching any React component. The interface `(type, stateSlice) => Promise<ReportResult>` stays constant. Future work replaces the implementation, not the call sites.

**State for report generation is local component state (`useState`), not Zustand.** Reports are ephemeral output — they are not game state. They do not need persistence. A `reportHistory` array in Zustand would be premature and grow indefinitely in localStorage.

---

### System 5: VC Skills Tracking

**What it is:** Proficiency levels for 19 skills (11 hard, 8 soft), context-specific skill tiers, skills dashboard page, subtle in-decision hints, toggleable proficiency feedback, persistence across sessions.

**Where it lives:**

```
src/engine/types.ts          Add: VCSkill (union of all 19 skill ids),
                             SkillCategory = "hard" | "soft",
                             SkillProfile interface { [skill: VCSkill]: number (0-100) },
                             SkillEvent { skill, delta, reason, month }
src/engine/skillsEngine.ts   New pure module — skill definitions (name, category,
                             context triggers, proficiency thresholds),
                             calculateSkillGain(action, context): SkillEvent[],
                             getSkillLevel(score): "novice" | "developing" |
                             "proficient" | "expert"
src/engine/gameState.ts      Extend: GameState with skillProfile: SkillProfile,
                             skillHistory: SkillEvent[], showSkillFeedback: boolean
                             Add action: recordSkillEvent(events: SkillEvent[])
                             Add action: toggleSkillFeedback()
                             Extend: partialize to include skillProfile + skillHistory
                             (must persist — skills carry across sessions)
src/pages/Skills.tsx         New page — skills dashboard with proficiency bars,
                             history timeline, category filter
src/components/SkillHint.tsx New component — inline subtle hint shown after decisions
                             ("You exercised: Term Sheet Negotiation +3")
src/App.tsx                  Add route: /skills
src/components/NavBar.tsx    Add nav item: Skills
src/components/KeyboardShortcuts.tsx  Add shortcut: 's' for /skills
```

**Data flow:**

```
Player takes action (invest, resolve board meeting, negotiate term, etc.)
  → existing store action fires (e.g. invest(), resolveBoardMeeting())
  → inside the action, call skillsEngine.calculateSkillGain(actionType, context)
  → call recordSkillEvent(gainedEvents) to update skillProfile + skillHistory
  → if showSkillFeedback === true, dispatch toast or render SkillHint component

Skills.tsx
  → reads skillProfile, skillHistory from useGameStore
  → renders proficiency bars per skill
  → reads showSkillFeedback from store → toggle control

Skills persist via existing partialize pattern:
  → skillProfile and skillHistory are included in persisted state
  → history (undo stack) already excludes them correctly since undo
    only rolls back game simulation state, not meta-player progression
```

**Skills must NOT be rolled back by undo.** The undo system (`undoAdvance()`) restores `GameSnapshot`. `GameSnapshot` type must NOT include `skillProfile` or `skillHistory`. Skill gains from a time step that gets undone should remain (player still exercised the judgment, even if the game outcome reverts).

**Skill gains trigger inside store actions, not in React components.** Any component that calls `invest()` does not need to know about skills. The store action is the single integration point.

---

## Component Boundaries Summary

| Component              | Responsibility                                     | Reads From                             | Writes To                        |
| ---------------------- | -------------------------------------------------- | -------------------------------------- | -------------------------------- |
| `timelineGates.ts`     | Gate definitions and evaluation                    | Pure function args                     | Returns gate state               |
| `fundraising.ts`       | LP prospect gen, commitment sim, unlock thresholds | Pure function args                     | Returns campaign state           |
| `outcomeProjection.ts` | Pre-action effect projection                       | Pure function args                     | Returns projection               |
| `reportStubs.ts`       | Mock report generation                             | GameState slice arg                    | Returns `Promise<ReportResult>`  |
| `skillsEngine.ts`      | Skill gain calculation, level thresholds           | Pure function args                     | Returns `SkillEvent[]`           |
| `gameState.ts`         | All game state + actions                           | All engine modules                     | Zustand store                    |
| `Fundraising.tsx`      | Campaign management UI                             | `useGameStore`                         | Store actions                    |
| `Skills.tsx`           | Skills dashboard page                              | `useGameStore`                         | `toggleSkillFeedback()`          |
| `ReportGenerator.tsx`  | Report type selection + output                     | `useGameStore` slice, `reportStubs.ts` | Local state only                 |
| `ActionFeedback.tsx`   | Animated effect deltas                             | Props (delta values)                   | Nothing                          |
| `OutcomePreview.tsx`   | Pre-decision projection modal                      | `outcomeProjection.ts` + store         | Calls existing action on confirm |
| `SkillHint.tsx`        | Post-decision skill gain hint                      | Props (SkillEvent[])                   | Nothing                          |

---

## Data Flow: Full Picture

```
User action
    │
    ▼
React component (page or modal)
    │
    ├─ reads current state via useGameStore(selector)
    │
    ├─ [optionally] calls outcomeProjection.ts to show preview
    │
    ▼
Store action (gameState.ts)
    │
    ├─ calls engine modules (pure functions)
    │   ├─ skillsEngine.calculateSkillGain() → SkillEvent[]
    │   ├─ timelineGates evaluation
    │   └─ existing: dynamicEvents, lpSentiment, vcRealism, etc.
    │
    ├─ calls set() to update Zustand state
    │
    └─ partialize filters state before localStorage write
           (excludes: history undo stack)
           (includes: skillProfile, skillHistory, fund.timelineMode)

Zustand state change
    │
    ▼
React re-render (selector-based, minimal)
    │
    ├─ SkillHint renders if showSkillFeedback + recent skill events
    ├─ ActionFeedback animates if delta present
    └─ Dashboard/Portfolio/Skills pages update
```

---

## Suggested Build Order

Order is determined by type dependencies and integration points. Later systems depend on types and patterns from earlier ones.

### Phase 1: Types Foundation

**File:** `src/engine/types.ts`

Add all new types for all 5 systems before writing any implementation. This unblocks parallel development and prevents the types file from becoming a bottleneck mid-build.

New types to add:

- `TimelineMode`, `TimelineGate` (System 1)
- `LPProspect`, `FundRaisingCampaign`, `FundRaisingStatus` (System 2)
- `ReportType`, `ReportRequest`, `ReportResult` (System 4)
- `VCSkill`, `SkillCategory`, `SkillProfile`, `SkillEvent` (System 5)
- Extend `Fund` with `timelineMode`, `fundNumber`, `raisingCampaign`
- Extend `GameState` with `skillProfile`, `skillHistory`, `showSkillFeedback`, `activeCampaign`, `pendingTimeGates`
- Extend `GameSnapshot` to explicitly exclude `skillProfile`, `skillHistory`

### Phase 2: Pure Engine Modules

**Files:** `skillsEngine.ts`, `fundraising.ts`, `timelineGates.ts`, `reportStubs.ts`, `outcomeProjection.ts`

Build all pure engine modules. Each is independently testable with no store dependency. Write unit tests alongside each module. This phase has no React work.

Build order within this phase:

1. `skillsEngine.ts` — no dependencies on other new modules
2. `timelineGates.ts` — no dependencies on other new modules
3. `fundraising.ts` — references `Fund` and `LPSentiment` from types
4. `reportStubs.ts` — references several existing types for template population
5. `outcomeProjection.ts` — references all company/fund types; build last

### Phase 3: Store Integration

**File:** `src/engine/gameState.ts`

Extend the Zustand store with new state fields and actions. Hook engine modules in:

- `initFund()` — accept and store `timelineMode`, `fundNumber`
- `advanceTime()` — evaluate time gates, call `skillsEngine.calculateSkillGain` for passive gains
- `invest()`, `resolveBoardMeeting()`, `resolveDecision()`, `hireTalent()` — call `calculateSkillGain` and `recordSkillEvent`
- Add `startRaise()`, `pitchLP()`, `acceptCommitment()`, `closeFund()` actions
- Add `recordSkillEvent()`, `toggleSkillFeedback()` actions
- Update `partialize` to include skill fields, exclude new ephemeral fields

### Phase 4: Index.tsx Extension

**File:** `src/pages/Index.tsx`

Extend the 5-step wizard:

- Add `timelineMode` toggle (Step 1 or between Step 1 and 2)
- Add Fund II/III unlock display for rebirth sessions
- Pass `timelineMode` and `fundNumber` to `initFund()`

This comes before new pages because the game cannot start with the new config until this step is wired.

### Phase 5: New Pages and Components

**Files:** `src/pages/Fundraising.tsx`, `src/pages/Skills.tsx`

Build new pages after store is ready. Both pages are read-heavy — they primarily display state.

Order:

1. `Skills.tsx` — simpler read-only display, good smoke test of skill types
2. `SkillHint.tsx` — small inline component used across existing pages
3. `Fundraising.tsx` — more complex, depends on campaign action correctness
4. `ReportGenerator.tsx` + extend `Reports.tsx`

### Phase 6: Feedback Layer

**Files:** `outcomeProjection.ts` (already built), `OutcomePreview.tsx`, `ActionFeedback.tsx`, `TooltipMetric.tsx`

Add the feedback layer last. It wraps existing actions without modifying them. OutcomePreview sits in front of existing modals (InvestModal, follow-on confirmation) as an optional preview step. ActionFeedback is a display-only overlay.

### Phase 7: Routing and Navigation

**Files:** `src/App.tsx`, `src/components/NavBar.tsx`, `src/components/KeyboardShortcuts.tsx`

Wire new routes `/fundraising` and `/skills`. Add nav items and keyboard shortcut `s` for Skills. This is last because routes should only be added once pages are complete enough to render.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Engine Logic in Components

**What:** Putting skill gain calculations or time gate checks inside `useEffect` or event handlers in React components.
**Why bad:** Breaks the engine/UI boundary. Creates untestable logic mixed with render cycles. Skills would not fire in headless test environments.
**Instead:** All calculation in engine modules, called from store actions.

### Anti-Pattern 2: Report State in Zustand

**What:** Storing generated report content in the Zustand store and persisting it to localStorage.
**Why bad:** Reports are output, not input. They grow unboundedly in localStorage. They can be regenerated on demand.
**Instead:** Local component state (`useState`) in `ReportGenerator.tsx`. Store only the metadata needed to regenerate (which the store already has).

### Anti-Pattern 3: Undo Rolling Back Skill Progress

**What:** Including `skillProfile` or `skillHistory` in `GameSnapshot`.
**Why bad:** Skills represent player growth across a career, not game simulation state. Rolling back skill gains when undoing a time step destroys the career progression metaphor.
**Instead:** Keep `GameSnapshot` limited to simulation state. `skillProfile` and `skillHistory` are meta-player state that lives in `GameState` but not `GameSnapshot`.

### Anti-Pattern 4: Timeline Mode as Global CSS/Route Guard

**What:** Implementing IRL mode by blocking navigation or adding a loading overlay on every page.
**Why bad:** Breaks game flow. The time delay model in real VC is about action sequencing, not UI blocking. A blanket UI blocker is annoying and doesn't teach the right lesson.
**Instead:** IRL mode gates specific actions via `pendingTimeGates[]` in the store. The UI shows a queue of upcoming actions with estimated availability times. Other parts of the game remain accessible.

### Anti-Pattern 5: Parallel Type Files

**What:** Adding `src/engine/skillTypes.ts` or `src/engine/fundraisingTypes.ts` as separate type files.
**Why bad:** Violates the existing "single source of truth" pattern in `types.ts`. Creates import graph confusion and risks circular dependencies.
**Instead:** All types — old and new — go in `src/engine/types.ts`. Engine module files import from types, never from each other's type definitions.

---

## Scalability Considerations

| Concern             | Current State            | With 5 New Systems            | Mitigation                                                                                                                                                            |
| ------------------- | ------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts` size     | ~776 lines               | ~950-1000 lines               | Acceptable. Split only if file exceeds ~1500 lines and IDE performance degrades.                                                                                      |
| `gameState.ts` size | ~3200 lines              | ~3700 lines                   | Already large. Consider extracting action groups into helper functions called from the store. Do not split the store itself — one store keeps the mental model clean. |
| localStorage size   | ~50-100KB estimated      | +skill history, campaign data | Monitor with DevTools. `skillHistory` should cap at last 500 events. Prune in `recordSkillEvent`.                                                                     |
| Bundle size         | ~1MB (Recharts dominant) | +small new modules            | No new large dependencies expected. `reportStubs.ts` and `skillsEngine.ts` are pure logic.                                                                            |
| Test count          | 173 tests                | Target: 220+                  | Each new engine module needs unit tests. Store integration tests for new actions.                                                                                     |

---

## Sources

- Direct codebase analysis: `/Users/soorajsambasivam/Documents/projects/VenCap/src/engine/types.ts` (lines 1-776)
- Direct codebase analysis: `/Users/soorajsambasivam/Documents/projects/VenCap/src/engine/gameState.ts` (lines 1-340, 857-900, 3173-3183)
- Direct codebase analysis: `/Users/soorajsambasivam/Documents/projects/VenCap/src/App.tsx`
- Direct codebase analysis: `/Users/soorajsambasivam/Documents/projects/VenCap/src/pages/Index.tsx`
- Direct codebase analysis: `/Users/soorajsambasivam/Documents/projects/VenCap/src/pages/Reports.tsx`
- Project spec: `/Users/soorajsambasivam/Documents/projects/VenCap/.planning/PROJECT.md`
- Confidence: HIGH — all claims derived from current codebase, not training data assumptions
