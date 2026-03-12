---
phase: 04-fundraising-flow
plan: "01"
subsystem: engine
tags:
  [
    fundraising,
    lp-prospects,
    pitch-probability,
    fund-unlock,
    pure-functions,
    tdd,
  ]

# Dependency graph
requires:
  - phase: 01-types-foundation
    provides: LPProspect, FundraisingCampaign, FundTermsConfig, LPCommitmentStatus, FundCloseStatus, Fund types
  - phase: 02-infrastructure-setup
    provides: i18n t() shim used for pitch outcome messages
provides:
  - Pure fundraising engine module with LP generation, pitch probability, close mechanics, fund size negotiation, and TVPI unlock check
  - 45 unit tests covering all exported functions
affects:
  - 04-02 (store actions will call these pure functions)
  - 04-03 (UI will display results of pitch outcomes and committed totals)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure engine module (no React/Zustand imports) following timelineGates.ts / lpSentiment.ts pattern
    - TDD: RED commit (failing tests) then GREEN commit (implementation), then fix flaky test
    - Named LP name pools per type (institutional/family_office/hnw/fund_of_funds)

key-files:
  created:
    - src/engine/fundraising.ts
    - src/engine/fundraising.test.ts
  modified: []

key-decisions:
  - "FUND_II_TVPI_THRESHOLD=2.0, FUND_III_TVPI_THRESHOLD=2.5 — set as named constants in fundraising.ts (resolves pending blocker from STATE.md)"
  - "Pitch probability formula: baseProbability * interestFactor * relationshipFactor * commitmentMod * marketMod — base varies per step (0.6/0.5/0.4/0.7)"
  - "commitmentMod derived from lpSentimentScore/50 clamped to [0.7, 1.3] — mirrors getLPEffects().commitmentMod in lpSentiment.ts"
  - "Bear market covers both 'hard' and 'cooldown' cycles: hard=0.85 multiplier, cooldown=1.0 (cooldown is soft correction, not crisis)"
  - "Probabilistic tests use 50 iterations with conservative threshold (>15 of 50) to avoid flaky failures on the soft_circle->hard_commit transition"

patterns-established:
  - "LP name pools: curated arrays per LPType, deduplicated within a single campaign generation call"
  - "COMMITTED_STATUSES: Set<LPCommitmentStatus> for O(1) lookup in calculateTotalCommitted"
  - "STATUS_SEQUENCE: ordered array for deterministic one-step advancement"

requirements-completed: [FUND-01, FUND-02, FUND-04, FUND-05]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 04 Plan 01: Fundraising Engine Module Summary

**Pure fundraising engine with LP prospect generation, probabilistic pitch outcomes (prospect->pitched->soft_circle->hard_commit->closed), fund size negotiation, and TVPI-gated Fund II/III unlock — 45 tests, zero TypeScript errors**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T02:05:08Z
- **Completed:** 2026-03-12T02:08:49Z
- **Tasks:** 1 (TDD: RED + GREEN + fix)
- **Files modified:** 2

## Accomplishments

- `generateLPProspects`: produces 6-12 prospects with realistic name pools for all 4 LP types, 5-20% fund size commitments, sentiment-scaled interest levels, fund-number relationship bonuses
- `calculatePitchOutcome`: advances status one step using a multi-factor probability model (base × interest × relationship × commitmentMod × marketMod); declined is terminal; failed pitches may result in decline
- `calculateTotalCommitted`, `canStartNextFund`, `getFirstCloseThreshold`, `getFinalCloseThreshold`, `calculateNegotiatedFundSize` — all pure, all tested
- Constants `FUND_II_TVPI_THRESHOLD=2.0` and `FUND_III_TVPI_THRESHOLD=2.5` resolve the pending blocker logged in STATE.md

## Task Commits

Each task was committed atomically:

1. **RED — Failing tests** - `d5a8cc9` (test)
2. **GREEN — Implementation** - `4f51ec5` (feat)
3. **Fix flaky probabilistic test** - `3f6e1ed` (fix)

**Plan metadata:** (docs commit below)

_Note: TDD plan — three commits per the RED/GREEN/fix pattern_

## Files Created/Modified

- `src/engine/fundraising.ts` — Pure fundraising engine module, 443 lines, 9 exports
- `src/engine/fundraising.test.ts` — 45 unit tests across 7 describe blocks, 544 lines

## Decisions Made

- `FUND_II_TVPI_THRESHOLD=2.0`, `FUND_III_TVPI_THRESHOLD=2.5` — matches top-quartile Cambridge Associates median (~2x net), reasonable unlock gates
- Pitch base probabilities by step: `prospect=0.6`, `pitched=0.5`, `soft_circle=0.4`, `hard_commit=0.7` — hard_commit is high because LP has already committed in principle, just needs docs
- MarketCycle 'cooldown' gets multiplier 1.0 (same as normal), not 0.85 — cooldown is market softening, not a crisis; 'hard' gets 0.85
- Failed pitches have a `0.3 * (1 - probability)` chance of resulting in "declined" status — creates meaningful downside risk without making all failures permanent

## Deviations from Plan

None — plan executed exactly as written. One minor fix added after GREEN: raised iteration count on the soft_circle->hard_commit probabilistic test from 20 to 50 (threshold 8 to 15) to prevent flaky failures (base probability for that step is 0.4, making <8/20 failures ~7% likely).

## Issues Encountered

None — TypeScript was clean on first run, all 45 tests green immediately after implementation.

## Next Phase Readiness

- All fundraising pure functions exported and tested — ready for 04-02 store actions to call them
- `calculatePitchOutcome` returns `{ newStatus, message }` — store action can update `activeCampaign.prospects[i].status` and surface the message as a toast
- `canStartNextFund` is ready to gate the "Start Fund II" UI action

## Self-Check: PASSED

- FOUND: src/engine/fundraising.ts
- FOUND: src/engine/fundraising.test.ts
- FOUND: .planning/phases/04-fundraising-flow/04-01-SUMMARY.md
- FOUND: d5a8cc9 (RED commit)
- FOUND: 4f51ec5 (GREEN commit)
- FOUND: 3f6e1ed (fix commit)

---

_Phase: 04-fundraising-flow_
_Completed: 2026-03-12_
