---
phase: 04-fundraising-flow
plan: "02"
subsystem: store
tags:
  [
    fundraising,
    zustand-actions,
    store-mutations,
    lp-campaign,
    pitch-flow,
    fund-close,
    tdd,
  ]

# Dependency graph
requires:
  - phase: 04-01
    provides: generateLPProspects, calculatePitchOutcome, calculateTotalCommitted, getFirstCloseThreshold, getFinalCloseThreshold, DEFAULT_FUND_TERMS
  - phase: 01-types-foundation
    provides: FundraisingCampaign, FundTermsConfig, LPCommitmentStatus, FundCloseStatus, Fund, GameStateActions
provides:
  - 5 new Zustand store actions for the full fundraising flow (launchCampaign, pitchLP, advanceFundClose, configureFundTerms, completeFundClose)
  - GameStateActions interface extended with 5 typed fundraising action signatures
affects:
  - 04-03 (UI components will call these store actions to drive fundraising flow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Store action pattern: read with get(), compute with pure functions, set() the result
    - TDD: RED commit (13 failing tests) then GREEN commit (implementation)
    - Pitfall 3 fix: configureFundTerms updates BOTH activeCampaign.terms AND fund economics fields atomically in a single set() call
    - Terminal action pattern: completeFundClose clears history after reset (mirrors rebirth())

key-files:
  created: []
  modified:
    - src/engine/gameState.ts
    - src/engine/types.ts
    - src/engine/gameState.test.ts

key-decisions:
  - "configureFundTerms uses a single set() call to update activeCampaign.terms AND fund.managementFeeRate/carryRate/hurdleRate/gpCommit atomically — prevents the pitfall where only campaign terms update but fund economics stay stale"
  - "completeFundClose clears history immediately after reset — terminal action not undoable, mirrors rebirth() pattern"
  - "advanceFundClose only advances forward — uses STATUS_ORDER array index comparison to prevent backward transitions"
  - "pitchLP returns success:false for no-advance outcomes (same status or declined) but still executes calculatePitchOutcome — caller can inspect newStatus and reason"
  - "launchCampaign uses fund.targetSize as targetAmount (not currentSize) to anchor the close thresholds to the original fundraise goal"

requirements-completed: [FUND-03, FUND-06]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 04 Plan 02: Fundraising Store Actions Summary

**5 Zustand store actions (launchCampaign, pitchLP, advanceFundClose, configureFundTerms, completeFundClose) wired into gameState.ts — imports pure fundraising functions from fundraising.ts, atomically syncs campaign terms to fund economics, terminal completeFundClose preserves playerProfile and clears undo history — 259 tests, zero TypeScript errors**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T09:13:00Z
- **Completed:** 2026-03-12T09:16:23Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments

- `launchCampaign(terms?)`: creates `FundraisingCampaign` with `id=uuid()`, calls `generateLPProspects()`, sets `closeStatus="pre_marketing"`, guards against duplicate campaign
- `pitchLP(prospectId)`: calls `calculatePitchOutcome()`, updates prospect status in-place, recalculates `committedAmount` via `calculateTotalCommitted()`, fires news item on success
- `advanceFundClose()`: pure state machine using `STATUS_ORDER` index comparison — transitions `pre_marketing→first_close` at 50% and `→final_close` at 100% of target, never regresses
- `configureFundTerms(partial)`: single `set()` call updates both `activeCampaign.terms` AND `fund.managementFeeRate/carryRate/hurdleRate/gpCommit` atomically — blocked after `final_close`
- `completeFundClose()`: terminal action — captures snapshot, resets fund/portfolio/campaign/news, clears history (not undoable), preserves `playerProfile`, stores next fund's `skillLevel/rebirthCount/fundNumber` for setup page
- Extended `GameStateActions` interface in `types.ts` with 5 fully typed signatures
- All 259 tests pass (34 new + 225 pre-existing)

## Task Commits

1. **RED — Failing tests** - `56f5996` (test)
2. **GREEN — Implementation** - `0ab7e6b` (feat)

## Files Created/Modified

- `src/engine/gameState.ts` — 5 new store actions, fundraising.ts import, ~190 lines added
- `src/engine/types.ts` — 5 action signatures added to GameStateActions interface
- `src/engine/gameState.test.ts` — 13 new test cases in `describe("gameState — Fundraising Flow")`, 164 lines added

## Decisions Made

- `configureFundTerms` uses a single `set()` call for both `activeCampaign.terms` and fund economics — prevents the "Pitfall 3" where campaign shows updated terms but fund's fee rates are stale
- `completeFundClose` clears `history: []` immediately after the state reset — terminal actions must not be undoable, matching the established `rebirth()` pattern
- `advanceFundClose` uses a `STATUS_ORDER` index comparison to ensure forward-only transitions — calling it multiple times at the same committed level is idempotent
- `pitchLP` returns `success: false` for no-advance outcomes but still returns `newStatus` so UI can surface the outcome message (declined vs. "not yet")
- `launchCampaign` anchors `targetAmount` to `fund.targetSize` (not `cashAvailable`) to keep close thresholds aligned with the stated fundraise goal

## Deviations from Plan

None — plan executed exactly as written. All 5 action behaviors match the spec. The `pitchLP` test uses a shape assertion rather than a deterministic outcome assertion since pitch probability is probabilistic by design.

## Self-Check: PASSED

- FOUND: src/engine/gameState.ts (launchCampaign|pitchLP|advanceFundClose|configureFundTerms|completeFundClose present)
- FOUND: src/engine/gameState.test.ts (describe("gameState — Fundraising Flow") block with 13 tests)
- FOUND: src/engine/types.ts (5 action signatures in GameStateActions)
- FOUND: 56f5996 (RED commit)
- FOUND: 0ab7e6b (GREEN commit)
- FOUND: 259/259 tests passing

---

_Phase: 04-fundraising-flow_
_Completed: 2026-03-12_
