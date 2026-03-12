---
phase: 03-timeline-modes
plan: "01"
subsystem: engine
tags: [timeline, gates, irl-mode, freeplay, engine, tdd]
dependency_graph:
  requires: []
  provides: [timelineGates-module, irl-gate-enforcement]
  affects: [invest-action, advanceTime, gameState-store]
tech_stack:
  added: []
  patterns: [pure-engine-functions, tdd-red-green, zustand-state-mutation]
key_files:
  created:
    - src/engine/timelineGates.ts
    - src/engine/timelineGates.test.ts
  modified:
    - src/engine/gameState.ts
    - src/engine/gameState.test.ts
decisions:
  - IRL gate check placed BEFORE checkCanInvest in invest action — semantically correct (DD cooldown blocks regardless of check size) and prevents "Check too small" masking the gate reason
  - clearExpiredGates runs immediately after fund.currentMonth++ in advanceTime, before any other logic — ensures gates never block actions that should be available in the current month
  - openTimeGate uses Math.round(randomBetween(min, max)) for integer delays — avoids fractional months and stays within defined bounds
metrics:
  duration: "8 minutes"
  completed: "2026-03-12T08:30:45Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 3 Plan 1: Timeline Gates Engine Module Summary

**One-liner:** Pure IRL pacing engine with named VC cadence constants, gate check/open/clear helpers, and Zustand integration enforcing DD cooldowns in IRL mode.

## Tasks Completed

| Task | Name                                                                     | Commit  | Files                                                         |
| ---- | ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------- |
| 1    | Create timelineGates.ts engine module with tests                         | 8d08933 | src/engine/timelineGates.ts, src/engine/timelineGates.test.ts |
| 2    | Wire gate checks into gameState.ts invest action and advanceTime cleanup | a4c7b17 | src/engine/gameState.ts, src/engine/gameState.test.ts         |

## What Was Built

### src/engine/timelineGates.ts

Pure engine module (no React imports) with:

- `IRL_GATE_DURATIONS` — 6 named constants matching real VC cadences: seed_check (1-2 mo), due_diligence (1-3 mo), series_a_check (2-4 mo), lp_close (6-12 mo), follow_on (1-2 mo), board_meeting (1 mo)
- `checkTimeGate(fund, actionType)` — returns `{ blocked: false }` in freeplay mode; finds matching gate and checks if `availableFromMonth > currentMonth` in IRL mode
- `openTimeGate(fund, actionType, reason)` — creates a TimeGate with random delay from IRL_GATE_DURATIONS; falls back to 1 month for unknown types
- `clearExpiredGates(fund)` — filters `activeTimeGates` to keep only gates where `availableFromMonth > currentMonth`

### src/engine/gameState.ts changes

- Import of `checkTimeGate`, `openTimeGate`, `clearExpiredGates` from `./timelineGates`
- Import of `t` from `@/lib/i18n` for user-facing gate message
- `invest` action: gate check (seed_check for pre_seed/seed stages, due_diligence for series_a+) runs BEFORE checkCanInvest; on success in IRL mode, opens a new gate appended to `fund.activeTimeGates`
- `advanceTime`: `clearExpiredGates(fund)` called immediately after `fund.currentMonth++` with old-save guard `if (!fund.activeTimeGates) fund.activeTimeGates = []`

## Test Coverage

- **timelineGates.test.ts**: 19 tests covering IRL_GATE_DURATIONS calibration, checkTimeGate (freeplay passthrough, no-gate, blocked, expired, wrong-type), openTimeGate (type/reason, range for seed_check/due_diligence, fallback), clearExpiredGates (expired removal, active retention, mixed, empty)
- **gameState.test.ts**: 7 new Timeline Modes tests covering initFund IRL, initFund default freeplay, invest blocked by gate, invest opens gate on success, freeplay ignores gate, advanceTime prunes expired gates, timelineMode persists across setState cycle
- **Total test suite**: 202 tests passing, zero regressions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gate check moved before checkCanInvest**

- **Found during:** Task 2 (test failure)
- **Issue:** Plan specified gate check "after existing validation checks like canInvest", but this caused "Check too small" to surface before the gate reason, causing the "invest action is blocked" test to fail with wrong reason string
- **Fix:** Moved gate check to run BEFORE `checkCanInvest` — semantically correct (DD cooldown should block regardless of check size) and matches user expectation
- **Files modified:** src/engine/gameState.ts
- **Commit:** a4c7b17

**2. [Rule 2 - Missing guard] Old-save guard for activeTimeGates**

- **Found during:** Task 2 implementation
- **Issue:** clearExpiredGates would throw on old saves missing the `activeTimeGates` field
- **Fix:** Added `if (!fund.activeTimeGates) fund.activeTimeGates = []` guard before clearExpiredGates call in advanceTime
- **Files modified:** src/engine/gameState.ts
- **Commit:** a4c7b17

**3. [Rule 1 - Bug] TypeScript error in test file**

- **Found during:** tsc -b verification
- **Issue:** `expect(x).toBeLessThanOrEqual(y, message)` — vitest's matcher only accepts one argument; second argument caused TS2554 error
- **Fix:** Removed the message argument from the toBeLessThanOrEqual call
- **Files modified:** src/engine/timelineGates.test.ts
- **Commit:** a4c7b17

## Self-Check: PASSED

- FOUND: src/engine/timelineGates.ts
- FOUND: src/engine/timelineGates.test.ts
- FOUND: commit 8d08933 (Task 1)
- FOUND: commit a4c7b17 (Task 2)
