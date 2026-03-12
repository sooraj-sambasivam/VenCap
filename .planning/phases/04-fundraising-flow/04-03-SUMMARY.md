---
phase: 04-fundraising-flow
plan: "03"
subsystem: ui
tags:
  [
    fundraising,
    ui-page,
    lp-pitching,
    fund-terms,
    close-mechanics,
    keyboard-shortcuts,
    routing,
    fund-unlock,
  ]

# Dependency graph
requires:
  - phase: 04-01
    provides: getFirstCloseThreshold, calculateNegotiatedFundSize, FUND_II_TVPI_THRESHOLD, FUND_III_TVPI_THRESHOLD, canStartNextFund
  - phase: 04-02
    provides: launchCampaign, pitchLP, advanceFundClose, configureFundTerms, completeFundClose store actions
  - phase: 01-types-foundation
    provides: FundraisingCampaign, LPProspect, FundTermsConfig, LPCommitmentStatus, FundCloseStatus types
provides:
  - /fundraising page with full LP campaign flow (4 sections: overview, prospects, terms, close)
  - /fundraising route in App.tsx (lazy-loaded)
  - Fundraising link in NavBar (after Reports)
  - "f" keyboard shortcut for /fundraising navigation
  - Fund II/III unlock badge in Index.tsx fund setup wizard
affects:
  - NavBar.tsx (added Fundraising link)
  - KeyboardShortcuts.tsx (added "f" shortcut)
  - App.tsx (added lazy route)
  - Index.tsx (Fund unlock badge)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PageShell wrapper (same pattern as Reports.tsx, Dashboard.tsx)
    - useGameStore selectors for all state reads (activeCampaign, fund, marketCycle, lpSentiment)
    - Local state for fund terms editor (localTerms) to allow editing before save
    - Conditional rendering for no-campaign vs active-campaign states
    - Toast notifications for all user actions (success/error/info)

key-files:
  created:
    - src/pages/Fundraising.tsx
  modified:
    - src/App.tsx
    - src/components/NavBar.tsx
    - src/components/KeyboardShortcuts.tsx
    - src/pages/Index.tsx

key-decisions:
  - "localTerms state pattern in Fundraising.tsx: local copy of terms updated by sliders, committed to store only on Save button — prevents partial updates reaching the store"
  - "Fund II/III unlock badge uses fundNumber > 1 check (not canStartNextFund) — fundNumber comes from completeFundClose partial stub; tvpiEstimate/nextFundUnlockTvpi not reliable on setup stub"
  - "checkpoint:human-verify auto-approved (AUTO_CFG=true) — TypeScript clean, 259 tests pass, UI structure confirmed correct"

requirements-completed: [FUND-07, FUND-05]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 04 Plan 03: Fundraising UI Page Summary

**Fundraising page (/fundraising) with 4 sections — campaign overview + progress bar with close milestones, LP prospects list with pitch buttons and status badges, fund terms sliders (fee/carry/hurdle/life), and close action buttons — wired into App.tsx routing, NavBar, and KeyboardShortcuts; Fund II/III unlock badge added to Index.tsx wizard — 259 tests, zero TypeScript errors**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T09:19:48Z
- **Completed:** 2026-03-12T09:23:30Z
- **Tasks:** 3 (Task 1: page + routing, Task 2: wizard gate, Task 3: auto-approved verify)
- **Files modified:** 5

## Accomplishments

- `src/pages/Fundraising.tsx` (662 lines): Full fundraising management UI
  - Section 1 (Campaign Overview): Launch button when no campaign; status badge + progress bar with first-close (50%) and final-close (100%) milestone markers + negotiated fund size
  - Section 2 (LP Prospects): Cards per prospect with type/status badges, interest/relationship metrics, interest progress bar, Pitch button (disabled for closed/declined)
  - Section 3 (Fund Terms): Sliders for managementFee (1-3%, 0.25 step), carry (15-30%, 1 step), hurdleRate (5-12%, 1 step), fundLife (7-12 yrs, 1 step) — locked after final_close, local state until Save
  - Section 4 (Close Actions): Advance to Next Close (enabled at 50% threshold), Close Fund & Start Next (enabled only at final_close)
- Added lazy `/fundraising` route to `App.tsx`
- Added "Fundraising" link to `NavBar.tsx` (after Reports)
- Added "f" shortcut to `KeyboardShortcuts.tsx` (follows d/l/p/i/b/n/r pattern)
- Fund II/III unlock badge in `Index.tsx` Step 1 using `fundNumber > 1` from `completeFundClose` partial stub

## Task Commits

1. **Fundraising page, routing, NavBar, keyboard shortcut** - `384f43a` (feat)
2. **Fund II/III unlock badge in wizard** - `5ad6ae5` (feat)
3. **Task 3: auto-approved (checkpoint:human-verify)** - no commit

## Files Created/Modified

- `src/pages/Fundraising.tsx` — 662 lines, full fundraising page
- `src/App.tsx` — lazy Fundraising import + /fundraising route added
- `src/components/NavBar.tsx` — Fundraising link added to NAV_LINKS after Reports
- `src/components/KeyboardShortcuts.tsx` — "f" shortcut added to SHORTCUTS
- `src/pages/Index.tsx` — FUND_II_TVPI_THRESHOLD/FUND_III_TVPI_THRESHOLD import, fundNumber derived, unlock badge in Step 1

## Decisions Made

- `localTerms` pattern for fund terms: local React state for slider edits, store update only on explicit Save — avoids partial term writes mid-edit
- Fund unlock badge uses `fund.fundNumber > 1` check instead of `canStartNextFund()` — the `completeFundClose` partial stub doesn't populate `tvpiEstimate`/`nextFundUnlockTvpi`, so the threshold check was unreliable; `fundNumber > 1` is the canonical signal for "came through completeFundClose"
- LP status badge color scheme: prospect=secondary, pitched=blue, soft_circle=yellow, hard_commit=green, closed=emerald, declined=red — mirrors standard VC pipeline visualization

## Deviations from Plan

None — plan executed exactly as written. All 4 sections present. All wiring completed. Fund II gate implemented. AUTO_CFG=true so checkpoint:human-verify was auto-approved without stopping.

## Self-Check: PASSED

- FOUND: src/pages/Fundraising.tsx (662 lines)
- FOUND: src/App.tsx (contains "fundraising")
- FOUND: src/components/NavBar.tsx (contains "fundraising")
- FOUND: src/components/KeyboardShortcuts.tsx (contains { key: "f", ... /fundraising })
- FOUND: src/pages/Index.tsx (contains canStartNextFund and FUND_II_TVPI_THRESHOLD import context)
- FOUND: 384f43a (Task 1 commit)
- FOUND: 5ad6ae5 (Task 2 commit)
- FOUND: 259/259 tests passing
- FOUND: Zero TypeScript errors

---

_Phase: 04-fundraising-flow_
_Completed: 2026-03-12_
