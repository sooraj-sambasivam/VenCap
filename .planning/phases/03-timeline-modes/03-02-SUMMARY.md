---
phase: 03-timeline-modes
plan: "02"
subsystem: ui
tags: [timeline, irl-mode, freeplay, wizard, gates, react, lucide]

dependency_graph:
  requires:
    - phase: 03-timeline-modes/03-01
      provides: timelineGates module with checkTimeGate/openTimeGate/clearExpiredGates, TimelineMode type
  provides:
    - 6-step fund setup wizard with IRL/Freeplay selection as Step 2
    - IRL Pacing badge on Dashboard
    - Gate countdown on DealCard invest button (via gateMessage prop)
    - Gate countdown in InvestModal confirm button
  affects: [deals-ui, invest-flow, dashboard-header, fund-creation-wizard]

tech-stack:
  added: []
  patterns:
    [
      wizard-step-insertion-with-renumbering,
      optional-prop-for-gate-ui,
      checkTimeGate-in-components,
    ]

key-files:
  created: []
  modified:
    - src/pages/Index.tsx
    - src/pages/Dashboard.tsx
    - src/pages/Deals.tsx
    - src/components/DealCard.tsx
    - src/components/InvestModal.tsx

key-decisions:
  - "Gate display added to DealCard via optional gateMessage prop rather than fund access inside DealCard — keeps DealCard pure and parent (Deals.tsx) responsible for gate computation"
  - "IRL Pacing badge placed as standalone element after scenario banner, not inside it — avoids coupling two independent display concerns"

patterns-established:
  - "Gate UI pattern: compute gateCheck in page, pass gateMessage string down to leaf component — leaf stays pure, no fund access needed"
  - "Wizard step insertion: insert new step, renumber all subsequent step=N conditionals and setStep(N) calls throughout"

requirements-completed:
  - TIME-01
  - TIME-02

duration: 12min
completed: 2026-03-12
---

# Phase 3 Plan 2: Timeline Modes UI Summary

**6-step fund setup wizard with IRL/Freeplay selection, IRL badge on Dashboard, and gate countdown on DealCard and InvestModal invest buttons**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-12T01:30:00Z
- **Completed:** 2026-03-12T01:42:00Z
- **Tasks:** 2 (+ 1 auto-approved checkpoint)
- **Files modified:** 5

## Accomplishments

- Added timeline mode selection as Step 2 of the 6-step fund setup wizard with Freeplay (Zap icon) and IRL Pacing (Clock icon) selection cards
- IRL Pacing badge renders on Dashboard adjacent to scenario banner when `fund.timelineMode === "irl"`
- DealCard extended with optional `gateMessage` prop — invest button disabled with countdown badge when gate is active
- Deals.tsx computes gate status per deal card using `checkTimeGate(fund, gateKey)` and passes message down
- InvestModal disables confirm button and shows countdown text when gate blocks the action
- Freeplay mode completely unaffected — `checkTimeGate` returns `{ blocked: false }` in freeplay

## Task Commits

1. **Task 1: Add timeline mode wizard step to Index.tsx** - `f780b79` (feat)
2. **Task 2: Add IRL badge on Dashboard and gate display on Deals/InvestModal** - `867854e` (feat)

## Files Created/Modified

- `src/pages/Index.tsx` - 6-step wizard with IRL/Freeplay cards as new Step 2; timelineMode passed to initFund()
- `src/pages/Dashboard.tsx` - IRL Pacing badge rendered when fund.timelineMode is "irl"; imports t() i18n shim
- `src/pages/Deals.tsx` - imports checkTimeGate and t(); computes gateMessage per deal, passes to DealCard
- `src/components/DealCard.tsx` - optional gateMessage prop; invest button disabled + countdown badge when provided
- `src/components/InvestModal.tsx` - imports checkTimeGate and t(); gate check disables confirm button and shows countdown

## Decisions Made

- **Gate display via prop, not fund access in DealCard:** DealCard is a pure display component — adding fund access inside it would break its memo-comparison and reuse pattern. Parent (Deals.tsx) computes the gate message and passes it as a prop. DealCard stays unaware of fund state.
- **IRL badge as standalone element:** Placed as independent `<div>` with a Badge after the scenario banner, not nested inside it. Scenario banner is complex — embedding the badge inside would require layout changes and add coupling.
- **Invest button disable covers both DealCard and InvestModal:** DealCard provides UX prevention before the modal opens; InvestModal provides safety-net prevention at confirm time. Both use the same `checkTimeGate` function for consistency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Extended DealCard with gateMessage prop**

- **Found during:** Task 2 (Gate display on deal cards)
- **Issue:** Plan said to render badge and disable invest button "in the deal card's invest action area" but DealCard had no awareness of fund state or gate status. Directly adding fund access inside a memoized component would violate its pure-display contract.
- **Fix:** Added optional `gateMessage?: string` prop to DealCardProps; updated memo comparison to include it; rendered Badge below the invest button when provided; disabled invest button when prop is set. Parent Deals.tsx computes the gate status externally.
- **Files modified:** src/components/DealCard.tsx
- **Verification:** tsc -b passes, 202 tests pass
- **Committed in:** 867854e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — architectural pattern enforcement for pure component)
**Impact on plan:** Minimal scope addition (one new optional prop). Gate display behavior matches plan spec exactly.

## Issues Encountered

None — plan executed cleanly. Both tasks compiled and passed tests on first attempt.

## Next Phase Readiness

- Timeline modes complete: engine (Phase 03-01) + UI (Phase 03-02) both done
- Requirements TIME-01 and TIME-02 satisfied
- Phase 04 (Fund II/III Fundraising) can begin; TVPI unlock thresholds still need to be defined as named constants before implementation

---

_Phase: 03-timeline-modes_
_Completed: 2026-03-12_
