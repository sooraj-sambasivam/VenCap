# Requirements: VenCap v4.0

**Defined:** 2026-03-12
**Core Value:** Players should feel like they're living a real VC career — fundraising feels like a real fundraise, every decision teaches a real skill, and the timeline creates authentic pacing.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: All new types added to `src/engine/types.ts` in a single batch (types-first pattern)
- [ ] **FOUND-02**: `GameSnapshot` refactored to `Omit<GameState, ...>` alias to prevent undo bugs on new fields
- [ ] **FOUND-03**: i18n shim (`t()` function) wrapping all new user-facing strings
- [ ] **FOUND-04**: Vercel Speed Insights integrated via `@vercel/speed-insights/react` in App.tsx

### Timeline Modes

- [ ] **TIME-01**: User can select IRL or Freeplay mode at session start (fund setup wizard)
- [ ] **TIME-02**: IRL mode gates actions behind realistic time delays with "available in N months" display
- [ ] **TIME-03**: Freeplay mode removes all time gates for accelerated play
- [ ] **TIME-04**: IRL gates calibrated to real VC cadence (seed check 2-4 weeks, LP close 6-12 months, due diligence 1-3 months)
- [ ] **TIME-05**: Timeline mode stored as engine-level state in Fund, not UI flag

### Fundraising Flow

- [ ] **FUND-01**: User can pitch to LPs with commitment tracking (committed vs called capital distinction)
- [ ] **FUND-02**: First close / final close mechanics with progress indicators
- [ ] **FUND-03**: User can configure fund terms (management fee %, carry %, fund life years)
- [ ] **FUND-04**: Fund size negotiation based on LP interest and market conditions
- [ ] **FUND-05**: Progressive fund unlock — Fund II available after Fund I meets performance thresholds
- [ ] **FUND-06**: Fund II/III creation resets economics counters atomically via `completeFundClose()` action
- [ ] **FUND-07**: Fundraising page with dedicated UI for the LP pitching and closing flow

### Interaction Feedback

- [ ] **FEED-01**: Micro-animations on portfolio company and team member interactions (tw-animate-css)
- [ ] **FEED-02**: Contextual tooltips showing what an action does to underlying metrics before clicking
- [ ] **FEED-03**: Outcome preview modal before confirming high-stakes decisions (investments, exits, board votes)
- [ ] **FEED-04**: Cause-and-effect tick summary after advancing time showing what changed and why
- [ ] **FEED-05**: Loading states on every async-feeling operation including stubbed LLM
- [ ] **FEED-06**: Success/failure states visually distinct from neutral states

### LLM Report Generation

- [ ] **REPT-01**: Portfolio performance summary report using real game data (stubbed, template strings)
- [ ] **REPT-02**: Deal memo draft for new investments using startup and fund context
- [ ] **REPT-03**: LP update letter using fund performance, portfolio, and market data
- [ ] **REPT-04**: Market analysis report for specific sectors using in-game sector data
- [ ] **REPT-05**: Streaming-style output animation (text appears progressively)
- [ ] **REPT-06**: Loading state, error state, and empty state for report generation
- [ ] **REPT-07**: Report history — persist past generated reports for comparison
- [ ] **REPT-08**: Typed response contract (`ReportGenerationResult` with status enum) for future API swap
- [ ] **REPT-09**: Reports generated using native async generators (structurally identical to streaming API)

### VC Skills System

- [ ] **SKIL-01**: Skills tracking across 3 categories: hard skills, soft skills, context-specific skills
- [ ] **SKIL-02**: Proficiency levels with career title progression (Analyst → Associate → VP → Partner → MD)
- [ ] **SKIL-03**: Skills exercised are co-located with action handlers in gameState.ts (not computed after the fact)
- [ ] **SKIL-04**: Dedicated skills dashboard page showing all skills, proficiency, and career level
- [ ] **SKIL-05**: Contextual hints during decisions showing which skills are being exercised (toggleable)
- [ ] **SKIL-06**: Skills persist across sessions via Zustand persist (inside main store, not separate localStorage)
- [ ] **SKIL-07**: Cross-fund skill accumulation — skills carry over when starting Fund II/III
- [ ] **SKIL-08**: Skills excluded from `GameSnapshot` so undo never rolls back player progression

### Quality

- [ ] **QUAL-01**: Unit tests for every new component
- [ ] **QUAL-02**: All 173 existing tests continue passing
- [ ] **QUAL-03**: Mobile responsive for all new components
- [ ] **QUAL-04**: TypeScript strict mode compliance throughout

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Fundraising

- **FUND-V2-01**: LP archetype system (institutional, family office, HNW individual, fund-of-funds)
- **FUND-V2-02**: LP relationship management with trust/reputation tracking

### LLM Reports

- **REPT-V2-01**: Live LLM API integration (Anthropic Claude or OpenAI)
- **REPT-V2-02**: User-customizable report templates
- **REPT-V2-03**: Export reports as PDF

### Skills

- **SKIL-V2-01**: Skill-based unlocks (certain actions require minimum proficiency)
- **SKIL-V2-02**: Skills leaderboard comparing across saved games

### i18n

- **I18N-V2-01**: Full localization with react-i18next (replace shim)
- **I18N-V2-02**: Multi-language support (ES, FR, ZH, JA)

## Out of Scope

| Feature                 | Reason                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Live LLM API calls      | Build UI/flow first, stub calls, wire API in dedicated future phase                |
| Multiplayer / co-op     | Single-player focus for this milestone                                             |
| Supabase / backend      | localStorage-only; no server infrastructure                                        |
| Real money transactions | Simulator game, not fintech                                                        |
| Native mobile app       | Web-first, PWA later                                                               |
| Framer Motion           | tw-animate-css already installed, covers all animation needs, avoids ~150KB bundle |
| react-i18next           | Zero-dep shim sufficient for now, full i18n deferred to v2                         |
| LP archetypes           | Adds complexity without core value; deferred to v2 fundraising                     |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase   | Status  |
| ----------- | ------- | ------- |
| FOUND-01    | Phase 1 | Pending |
| FOUND-02    | Phase 1 | Pending |
| FOUND-03    | Phase 2 | Pending |
| FOUND-04    | Phase 2 | Pending |
| TIME-01     | Phase 3 | Pending |
| TIME-02     | Phase 3 | Pending |
| TIME-03     | Phase 3 | Pending |
| TIME-04     | Phase 3 | Pending |
| TIME-05     | Phase 3 | Pending |
| FUND-01     | Phase 4 | Pending |
| FUND-02     | Phase 4 | Pending |
| FUND-03     | Phase 4 | Pending |
| FUND-04     | Phase 4 | Pending |
| FUND-05     | Phase 4 | Pending |
| FUND-06     | Phase 4 | Pending |
| FUND-07     | Phase 4 | Pending |
| SKIL-01     | Phase 5 | Pending |
| SKIL-02     | Phase 5 | Pending |
| SKIL-03     | Phase 5 | Pending |
| SKIL-04     | Phase 5 | Pending |
| SKIL-05     | Phase 5 | Pending |
| SKIL-06     | Phase 5 | Pending |
| SKIL-07     | Phase 5 | Pending |
| SKIL-08     | Phase 5 | Pending |
| FEED-01     | Phase 6 | Pending |
| FEED-02     | Phase 6 | Pending |
| FEED-03     | Phase 6 | Pending |
| FEED-04     | Phase 6 | Pending |
| FEED-05     | Phase 6 | Pending |
| FEED-06     | Phase 6 | Pending |
| REPT-01     | Phase 7 | Pending |
| REPT-02     | Phase 7 | Pending |
| REPT-03     | Phase 7 | Pending |
| REPT-04     | Phase 7 | Pending |
| REPT-05     | Phase 7 | Pending |
| REPT-06     | Phase 7 | Pending |
| REPT-07     | Phase 7 | Pending |
| REPT-08     | Phase 7 | Pending |
| REPT-09     | Phase 7 | Pending |
| QUAL-01     | Phase 8 | Pending |
| QUAL-02     | Phase 8 | Pending |
| QUAL-03     | Phase 8 | Pending |
| QUAL-04     | Phase 8 | Pending |

**Coverage:**

- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

---

_Requirements defined: 2026-03-12_
_Last updated: 2026-03-12 after roadmap creation — all 43 requirements mapped_
