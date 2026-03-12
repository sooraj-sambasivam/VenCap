# Roadmap: VenCap v4.0 — Career Simulator Expansion

## Overview

VenCap v4.0 adds five interdependent feature systems to a complete VC fund simulator: Timeline Modes, Fundraising Flow, VC Skills Tracking, Interaction Feedback, and LLM Report Generation. The build follows a strict dependency order — types first, then engine modules, then store integration, then UI — because every subsequent phase depends on the type contracts established in Phase 1. Foundation and infrastructure work (Phases 1-2) unblock parallel engine development. Timeline Modes (Phase 3) gate fundraising and skills behavior, so it ships before the features that reference it. Fundraising (Phase 4) and Skills (Phase 5) are the two heaviest systems and build on the timeline mode engine. Feedback (Phase 6) and Reports (Phase 7) wrap existing surfaces and have no blocking dependencies on each other. Quality Gate (Phase 8) validates all 173+ tests pass and every new component meets mobile and TypeScript standards.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Types Foundation** - Add all new types to types.ts in one batch and fix GameSnapshot aliasing
- [x] **Phase 2: Infrastructure Setup** - Install Speed Insights and wire i18n shim so all subsequent UI is ready (completed 2026-03-12)
- [ ] **Phase 3: Timeline Modes** - IRL vs Freeplay toggle at fund start with realistic gate calibration throughout
- [ ] **Phase 4: Fundraising Flow** - LP pitching, commitment tracking, closing mechanics, and Fund II/III unlock
- [ ] **Phase 5: VC Skills System** - 19-skill tracking engine, career title progression, and dedicated skills page
- [ ] **Phase 6: Interaction Feedback** - Micro-animations, contextual tooltips, outcome previews, and tick summaries
- [ ] **Phase 7: LLM Report Generation** - Four stubbed report types with streaming simulation and full state handling
- [ ] **Phase 8: Quality Gate** - All tests passing, mobile responsive, TypeScript strict, no regressions

## Phase Details

### Phase 1: Types Foundation

**Goal**: All new type contracts for v4.0 exist in types.ts before any implementation begins
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02
**Success Criteria** (what must be TRUE):

1. `types.ts` compiles cleanly with all new interfaces for Timeline, Fundraising, Skills, Feedback, and Reports
2. `GameSnapshot` is defined as an `Omit<GameState, ...>` alias (not a duplicate interface) so new fields added to GameState automatically propagate without undo bugs
3. TypeScript strict mode reports zero errors on `tsc -b` after types are added
4. All five feature clusters have their core types defined and no downstream file needs to add new interfaces
   **Plans**: TBD

### Phase 2: Infrastructure Setup

**Goal**: Cross-cutting utilities (i18n shim, Speed Insights) are in place before any new UI component is written
**Depends on**: Phase 1
**Requirements**: FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):

1. `@vercel/speed-insights/react` is installed and rendered inside `App.tsx` — performance data flows to Vercel dashboard on deploy
2. A `t()` function exists in `src/lib/` and all new user-facing strings in subsequent phases use it (no raw string literals in JSX)
3. Build passes `tsc -b` with the new additions; bundle delta is under 15 KB
   **Plans:** 1/1 plans complete

Plans:

- [ ] 02-01-PLAN.md — i18n shim + Vercel Speed Insights

### Phase 3: Timeline Modes

**Goal**: Players can choose IRL or Freeplay pacing at fund setup, and that choice gates or unblocks actions throughout the game
**Depends on**: Phase 2
**Requirements**: TIME-01, TIME-02, TIME-03, TIME-04, TIME-05
**Success Criteria** (what must be TRUE):

1. Fund setup wizard shows a mode toggle on step 1 (or dedicated step); player's choice is locked for the session and visible in the Dashboard
2. In IRL mode, actions requiring time (seed check: 2-4 months, due diligence: 1-3 months, LP close: 6-12 months) show "available in N months" and are non-interactive until that point
3. In Freeplay mode, the same actions are immediately available with no cooldown display
4. `timelineMode` is stored on the `Fund` type in engine state — it is not a React component flag and cannot be changed after fund init
5. IRL gate calibrations match real VC cadences (defined as named constants, not magic numbers)
   **Plans**: TBD

### Phase 4: Fundraising Flow

**Goal**: Players can run an LP fundraising campaign — pitch prospects, track commitments, negotiate fund size, and close the fund — with Fund II/III unlocked by performance
**Depends on**: Phase 3
**Requirements**: FUND-01, FUND-02, FUND-03, FUND-04, FUND-05, FUND-06, FUND-07
**Success Criteria** (what must be TRUE):

1. A dedicated `/fundraising` page shows LP prospects, committed vs called capital, and a progress bar toward the fund target
2. Player can pitch an LP and see commitment status advance through soft-circle → hard-commit → closed states
3. First close and final close milestones are visible on the fundraising page with progress indicators
4. Player can configure management fee %, carry %, and fund life years before closing — these values affect fund economics calculations
5. Fund II becomes available in the fund setup wizard when Fund I's net TVPI meets the defined threshold; Fund III similarly requires Fund II threshold
6. Closing a new fund via `completeFundClose()` atomically resets economics counters (fees, carry, GP earnings) without affecting skills
   **Plans**: TBD

### Phase 5: VC Skills System

**Goal**: Players accumulate VC skills through gameplay decisions, see their career title advance from Analyst to MD, and can review their proficiency on a dedicated skills page
**Depends on**: Phase 3
**Requirements**: SKIL-01, SKIL-02, SKIL-03, SKIL-04, SKIL-05, SKIL-06, SKIL-07, SKIL-08
**Success Criteria** (what must be TRUE):

1. Performing any of the 20+ store actions awards XP to the relevant skills immediately — skill gains are co-located with action handlers in `gameState.ts`, not computed from event history after the fact
2. The `/skills` page displays all 19 skills grouped by category (hard, soft, context-specific) with proficiency bars and the player's current career title (Analyst / Associate / VP / Partner / MD)
3. A toggleable contextual hint appears after high-stakes decisions naming which skills were exercised and by how much
4. Skills data persists in the Zustand store across browser sessions and fund resets — starting Fund II carries over all skill XP from Fund I
5. Undo (Cmd+Z / undo button) never rolls back skill XP — skills are excluded from `GameSnapshot` at the type level
   **Plans**: TBD

### Phase 6: Interaction Feedback

**Goal**: Every player action produces immediate, legible feedback — animations confirm changes, tooltips explain metrics before clicking, outcome previews show stakes before committing, and tick summaries explain what changed after time advances
**Depends on**: Phase 5
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-04, FEED-05, FEED-06
**Success Criteria** (what must be TRUE):

1. Portfolio company cards and team member rows animate visibly (tw-animate-css) when the player takes an action affecting them
2. Hovering any metric label on the Dashboard shows a tooltip explaining what the metric measures and what actions move it
3. Before confirming an investment, exit, or board vote, a preview modal shows the projected effect range on portfolio and fund metrics
4. After advancing time, a summary panel or toast lists what changed (portfolio values, LP sentiment, skills gained, events triggered) and why
5. Every operation that takes observable time — including stubbed LLM calls — shows a loading state; success and failure states are visually distinct from the neutral/idle state
   **Plans**: TBD

### Phase 7: LLM Report Generation

**Goal**: Players can generate four types of VC reports using real game data, with realistic streaming-style output and full loading/error/empty state handling
**Depends on**: Phase 2
**Requirements**: REPT-01, REPT-02, REPT-03, REPT-04, REPT-05, REPT-06, REPT-07, REPT-08, REPT-09
**Success Criteria** (what must be TRUE):

1. The Reports page has a report generation tab with four report types: portfolio summary, deal memo, LP update letter, and market analysis
2. Clicking "Generate" on any report type produces a streaming-style text output that appears progressively using native async generators — it reads like a real VC document with actual fund values interpolated
3. Generated reports are saved to report history within the session and can be compared side-by-side
4. A simulated error state (triggered ~10% of the time) shows a retry-able failure UI distinct from the loading skeleton
5. The `ReportGenerationResult` type contract (`status`, `content`, `error?`, `generatedAt?`) is the only interface between the generator and the UI — swapping the stub for a real API requires changing only the generator function body
   **Plans**: TBD

### Phase 8: Quality Gate

**Goal**: All v4.0 features meet the project's non-negotiable quality standards — tests passing, mobile responsive, TypeScript strict, no regressions
**Depends on**: Phase 7
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):

1. All 173 pre-existing tests continue passing; new unit tests exist for every new component and engine module
2. Every new page and component is usable on a 375px-wide mobile screen — no horizontal scroll, no clipped controls
3. `tsc -b` reports zero errors in strict mode — no `any`, no implicit types, no unused parameters without `_` prefix
4. The full test suite runs green via `npm test` with no skipped or pending tests introduced during v4.0
   **Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase                    | Plans Complete | Status      | Completed  |
| ------------------------ | -------------- | ----------- | ---------- |
| 1. Types Foundation      | 0/TBD          | Not started | -          |
| 2. Infrastructure Setup  | 1/1            | Complete    | 2026-03-12 |
| 3. Timeline Modes        | 0/TBD          | Not started | -          |
| 4. Fundraising Flow      | 0/TBD          | Not started | -          |
| 5. VC Skills System      | 0/TBD          | Not started | -          |
| 6. Interaction Feedback  | 0/TBD          | Not started | -          |
| 7. LLM Report Generation | 0/TBD          | Not started | -          |
| 8. Quality Gate          | 0/TBD          | Not started | -          |
