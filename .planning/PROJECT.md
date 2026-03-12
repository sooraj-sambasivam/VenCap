# VenCap v4.0 — Career Simulator Expansion

## What This Is

VenCap is a single-player venture capital fund management simulator where players live a 10-year VC career lifecycle. It combines career simulation, education, and strategic gameplay — players fundraise from LPs, deploy capital into startups, manage portfolios, and learn real VC skills through natural gameplay moments. Built with React 18 + TypeScript + Vite + Tailwind CSS v4 + Zustand.

## Core Value

Players should feel like they're living a real VC career — fundraising feels like a real fundraise, every decision teaches a real skill, and the timeline creates authentic pacing that mirrors real venture capital.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Fund setup wizard (5-step) with strategy/scenario selection — existing
- ✓ Deal pipeline with filter/sort, investment modals, due diligence signals — existing
- ✓ Portfolio management with company actions, events, follow-on, secondary sales — existing
- ✓ Incubator batch management and mentoring — existing
- ✓ Lab project creation and R&D — existing
- ✓ LP sentiment system with 8 factors, pressure mechanics, LP actions — existing
- ✓ Dynamic events (15 event types including legal events) — existing
- ✓ Fund economics (mgmt fees, carry, hurdle, GP commit) — existing
- ✓ Cap table visualization per company — existing
- ✓ Board meetings every 6/12 months with agenda items — existing
- ✓ 8 game scenarios with win conditions — existing
- ✓ Regional startup markets with geographic modifiers — existing
- ✓ Benchmark data (Cambridge Associates) for performance comparison — existing
- ✓ Undo system (3-snapshot history) — existing
- ✓ Keyboard shortcuts and onboarding tutorial — existing
- ✓ Real economy engine with historical data (2000-2025) + live FRED API — existing
- ✓ News generation, toast notifications, charts (Recharts) — existing
- ✓ End-of-fund scorecard with grading and share — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Timeline mode toggle (IRL vs freeplay) at session start
- [ ] IRL mode gates actions behind realistic time delays
- [ ] Freeplay mode removes time gates for accelerated play
- [ ] Fund raising flow with LP pitching and commitment tracking
- [ ] Fund size negotiation mechanics
- [ ] Closing mechanics with progress indicators
- [ ] Fund terms configuration (management fee, carry, fund life)
- [ ] Progressive fund unlocking (Fund I → II → III based on performance)
- [ ] Micro-animations on portfolio/team interactions
- [ ] Contextual tooltips showing metric impact of actions
- [ ] Outcome previews before high-stakes decisions
- [ ] Clear cause-and-effect feedback between actions and portfolio performance
- [ ] LLM report generation interface (stubbed, no API yet)
- [ ] Portfolio performance summary reports
- [ ] Deal memo draft generation
- [ ] LP update letter generation
- [ ] Market analysis reports for sectors
- [ ] Loading, error, and empty states for report generation
- [ ] VC skills tracking system with proficiency levels
- [ ] Hard skills: financial modeling, statements, unit economics, due diligence, term sheets, portfolio mgmt, domain expertise, market sizing, GTM evaluation, cap table, securities regs
- [ ] Soft skills: founder assessment, risk/conviction, bias awareness, empathy, reading people, persuasion, strategic thinking, resilience
- [ ] Context-specific skills (seed vs growth vs specialized)
- [ ] Skills dashboard page
- [ ] Subtle contextual hints during decisions showing skills exercised
- [ ] Integrated feedback showing proficiency changes (user-toggleable)
- [ ] Skills persistence across sessions (localStorage)
- [ ] Vercel Speed Insights integration (@vercel/speed-insights/react)
- [ ] i18n-ready user-facing strings
- [ ] Mobile responsive for all new components
- [ ] Unit tests for every new component

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Live LLM API integration — build UI/flow first, stub calls, wire API later
- Multiplayer / co-op fund management — single-player focus
- Supabase/backend integration — localStorage-only for now
- Real money transactions — this is a simulator game
- Native mobile app — web-first

## Context

- Brownfield project: full game engine and UI already built (v3.0, 22 steps complete)
- Engine files are pure functions in `src/engine/` — no React imports
- Zustand store with persist middleware (localStorage key: `vencap-game-state`)
- Dark-only theme using oklch colors in `src/index.css`
- shadcn/ui components in `src/components/ui/` (16+ primitives)
- Bundle size ~1MB (Recharts is bulk); code-splitting available
- Codebase map at `.planning/codebase/` (7 documents, 1362 lines of context)
- Existing test suite: 173 tests passing
- Build uses `tsc -b` with strict mode

## Constraints

- **Tech stack**: React 18 + TypeScript + Vite + Tailwind CSS v4 + Zustand + shadcn/ui — no new frameworks
- **Strict mode**: TypeScript strict mode throughout, unused params need `_` prefix
- **No breaking changes**: All 173 existing tests must continue passing
- **No backend**: All state in localStorage via Zustand persist
- **LLM stubbed**: Report generation UI built but API calls stubbed with mock data
- **Mobile responsive**: Every new component must work on mobile
- **i18n ready**: All user-facing strings must be i18n-compatible

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision                                                | Rationale                                          | Outcome   |
| ------------------------------------------------------- | -------------------------------------------------- | --------- |
| Stub LLM calls, no API yet                              | Build UI/flow first, avoid API cost during dev     | — Pending |
| Progressive fund unlocking (I→II→III)                   | Creates career progression reward loop             | — Pending |
| Skills: subtle hints + integrated feedback (toggleable) | Gives players control over learning intensity      | — Pending |
| Speed Insights via @vercel/speed-insights/react         | Not Next.js — must use /react import path          | — Pending |
| IRL vs Freeplay as session-start toggle                 | Shapes entire game pacing, must be decided upfront | — Pending |

---

_Last updated: 2026-03-11 after initialization_
