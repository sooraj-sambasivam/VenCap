---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: milestone
status: planning
stopped_at: Completed 04-03-PLAN.md — Fundraising page, routing, NavBar link, keyboard shortcut, Fund II unlock badge
last_updated: "2026-03-12T09:25:01.545Z"
last_activity: 2026-03-12 — Roadmap created, phases derived from 43 v1 requirements
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** Players should feel like they're living a real VC career — fundraising feels like a real fundraise, every decision teaches a real skill, and the timeline creates authentic pacing.
**Current focus:** Phase 1 — Types Foundation

## Current Position

Phase: 1 of 8 (Types Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-12 — Roadmap created, phases derived from 43 v1 requirements

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| -     | -     | -     | -        |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

_Updated after each plan completion_
| Phase 02-infrastructure-setup P01 | 2 | 2 tasks | 5 files |
| Phase 03-timeline-modes P01 | 8 | 2 tasks | 4 files |
| Phase 03-timeline-modes P02 | 12 | 2 tasks | 5 files |
| Phase 04-fundraising-flow P01 | 4 | 3 tasks | 2 files |
| Phase 04-fundraising-flow P02 | 3 | 1 tasks | 3 files |
| Phase 04-fundraising-flow P03 | 4 | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- IRL mode interpretation: in-game turns (each advanceTime() = 1 month), not wall-clock time — must be documented in PROJECT.md before Phase 3 begins
- LLM stub: ephemeral output in local component state only, never Zustand
- Skills in Zustand with partialize inclusion, explicitly excluded from GameSnapshot
- Fund II/III TVPI unlock thresholds: to be set as constants in fundraising.ts (validate against ~2x net median top-quartile)
- Skills XP curve (action-to-skill mapping): design surface to produce during Phase 5 planning
- [Phase 02-infrastructure-setup]: i18n shim is a v1 passthrough (returns fallback ?? key) — no react-i18next needed yet; v2 replaces when multi-locale support required
- [Phase 02-infrastructure-setup]: SpeedInsights placed inside BrowserRouter after Toaster with no props — defaults auto-detect environment and are no-op in local dev
- [Phase 03-timeline-modes]: IRL gate check placed before checkCanInvest — DD cooldown blocks regardless of check size, prevents wrong reason masking gate message
- [Phase 03-timeline-modes]: Gate display via optional gateMessage prop in DealCard — parent computes gate, passes string down, leaf stays pure and fund-unaware
- [Phase 03-timeline-modes]: IRL Pacing badge placed as standalone element after scenario banner — avoids coupling two independent display concerns
- [Phase 04-fundraising-flow]: FUND_II_TVPI_THRESHOLD=2.0, FUND_III_TVPI_THRESHOLD=2.5 set as named constants in fundraising.ts — resolves Phase 4 blocker
- [Phase 04-fundraising-flow]: Pitch probability: baseProbability(0.6/0.5/0.4/0.7) _ interestFactor _ relationshipFactor _ commitmentMod(lp/50 clamped 0.7-1.3) _ marketMod
- [Phase 04-fundraising-flow]: configureFundTerms uses single set() to update activeCampaign.terms AND fund economics atomically — prevents stale fee rate pitfall
- [Phase 04-fundraising-flow]: completeFundClose clears history immediately — terminal action not undoable, mirrors rebirth() pattern
- [Phase 04-fundraising-flow]: localTerms pattern in Fundraising.tsx: local React state for slider edits, store updated only on explicit Save — avoids partial term writes mid-edit
- [Phase 04-fundraising-flow]: Fund unlock badge uses fundNumber > 1 (not canStartNextFund) — completeFundClose partial stub lacks tvpiEstimate/nextFundUnlockTvpi, making threshold check unreliable

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3] IRL mode time interpretation must be locked in PROJECT.md before store integration — gate logic is calibrated to in-game months, not wall-clock
- [Phase 4] Fund II/III TVPI thresholds not yet defined — must be set as named constants before any UI displays them
- [Phase 5] 19-skill to action mapping table not yet defined — largest design surface in milestone, needs full planning before coding

## Session Continuity

Last session: 2026-03-12T09:25:01.544Z
Stopped at: Completed 04-03-PLAN.md — Fundraising page, routing, NavBar link, keyboard shortcut, Fund II unlock badge
Resume file: None
