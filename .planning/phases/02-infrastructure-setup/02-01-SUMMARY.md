---
phase: 02-infrastructure-setup
plan: 01
subsystem: infra
tags: [i18n, vercel, speed-insights, utilities, testing]

# Dependency graph
requires: []
provides:
  - t() i18n shim importable from @/lib/i18n with zero React dependencies
  - SpeedInsights component rendering inside BrowserRouter for Core Web Vitals
affects:
  - 03-fund-setup
  - 04-dashboard
  - 05-portfolio
  - 06-deals
  - 07-analytics
  - 08-polish

# Tech tracking
tech-stack:
  added: ["@vercel/speed-insights ^2.0.0"]
  patterns: ["t(key, fallback?) shim pattern for all new user-facing strings"]

key-files:
  created:
    - src/lib/i18n.ts
    - src/lib/i18n.test.ts
  modified:
    - src/App.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "i18n shim is a v1 passthrough (returns fallback ?? key) — no react-i18next needed yet; v2 replaces when multi-locale support required"
  - "SpeedInsights placed inside BrowserRouter as last child after Toaster — no props needed, defaults correct for this project"

patterns-established:
  - "i18n pattern: import { t } from '@/lib/i18n'; use t('namespace.key', 'English string') for all new UI strings"
  - "Zero-import utility pattern: engine/lib files must have no React or external deps"

requirements-completed: [FOUND-03, FOUND-04]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 2 Plan 1: Infrastructure Setup (i18n + Speed Insights) Summary

**Zero-dependency t() i18n shim and Vercel SpeedInsights wired in under 2 minutes — all 176 tests pass, tsc clean, bundle delta under 15 KB**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T07:50:08Z
- **Completed:** 2026-03-12T07:52:18Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `src/lib/i18n.ts` — zero-import `t(key, fallback?)` shim, JSDoc with dot-namespaced key convention
- Created `src/lib/i18n.test.ts` — 3 TDD tests covering fallback, key-only, and alternate key behaviors
- Installed `@vercel/speed-insights ^2.0.0` and wired `<SpeedInsights />` into App.tsx inside BrowserRouter

## Task Commits

Each task was committed atomically:

1. **Task 1: Create i18n shim with tests** - `6e59d3d` (feat)
2. **Task 2: Install Speed Insights and wire into App.tsx** - `505a527` (feat)

**Plan metadata:** (docs commit to follow)

_Note: Task 1 used TDD — tests written first (RED: module not found), then implementation (GREEN: 3/3 pass)_

## Files Created/Modified

- `src/lib/i18n.ts` - Zero-import t(key, fallback?) shim with JSDoc explaining v1 shim intent
- `src/lib/i18n.test.ts` - 3 unit tests for i18n shim
- `src/App.tsx` - Added SpeedInsights import and JSX render after Toaster
- `package.json` - Added @vercel/speed-insights ^2.0.0 to dependencies
- `package-lock.json` - Updated lock file

## Decisions Made

- i18n shim is a deliberate v1 passthrough; `return fallback ?? key` is the entire implementation — no runtime overhead, no context, no provider. v2 replaces with react-i18next when multi-locale is needed.
- SpeedInsights placed inside BrowserRouter after Toaster with no props — Vercel defaults auto-detect environment (dev vs prod) and handle no-op in local dev.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. SpeedInsights auto-activates on Vercel deploy; it is a no-op in local dev.

## Next Phase Readiness

- `t()` is ready for all subsequent phases (3-8) to import and use for new UI strings
- SpeedInsights will begin collecting Core Web Vitals on next Vercel deploy
- No blockers

---

_Phase: 02-infrastructure-setup_
_Completed: 2026-03-12_

## Self-Check: PASSED

- src/lib/i18n.ts — FOUND
- src/lib/i18n.test.ts — FOUND
- 02-01-SUMMARY.md — FOUND
- Commit 6e59d3d — FOUND
- Commit 505a527 — FOUND
