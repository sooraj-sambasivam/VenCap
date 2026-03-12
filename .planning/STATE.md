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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- IRL mode interpretation: in-game turns (each advanceTime() = 1 month), not wall-clock time — must be documented in PROJECT.md before Phase 3 begins
- LLM stub: ephemeral output in local component state only, never Zustand
- Skills in Zustand with partialize inclusion, explicitly excluded from GameSnapshot
- Fund II/III TVPI unlock thresholds: to be set as constants in fundraising.ts (validate against ~2x net median top-quartile)
- Skills XP curve (action-to-skill mapping): design surface to produce during Phase 5 planning

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 3] IRL mode time interpretation must be locked in PROJECT.md before store integration — gate logic is calibrated to in-game months, not wall-clock
- [Phase 4] Fund II/III TVPI thresholds not yet defined — must be set as named constants before any UI displays them
- [Phase 5] 19-skill to action mapping table not yet defined — largest design surface in milestone, needs full planning before coding

## Session Continuity

Last session: 2026-03-12
Stopped at: Roadmap created and written to .planning/ROADMAP.md
Resume file: None
