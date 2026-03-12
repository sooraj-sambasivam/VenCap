# Feature Landscape

**Domain:** VC career simulator / educational strategy game
**Researched:** 2026-03-11
**Note on sourcing:** WebSearch unavailable. Findings draw on training knowledge of simulation game design (Dwarf Fortress, Kairosoft titles, Football Manager, Democracy series), educational platform mechanics (Codecademy, Brilliant, Khan Academy), and real VC tooling (Carta, AngelList, Visible.vc). Confidence noted per section.

---

## Scope Framing

This milestone adds five feature clusters to an existing, fully-built VC simulator:

1. **Timeline Modes** — IRL (gated, real pacing) vs Freeplay (unrestricted)
2. **Fundraising Flow** — LP pitching, commitment tracking, closing mechanics
3. **Interaction Feedback** — micro-animations, contextual tooltips, outcome previews
4. **LLM Report Generation** — stubbed AI-authored reports (no live API)
5. **VC Skills System** — hard + soft skill proficiency tracking with contextual hints

---

## Table Stakes

Features players expect. Missing = product feels incomplete or unpolished.

### Timeline Modes

| Feature                                   | Why Expected                                                                                                                                                                                            | Complexity | Notes                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Mode selection at session start           | Strategy games universally surface pacing choice before play begins (Civilization difficulty select, Football Manager speed settings). Players who don't see a choice assume default is wrong for them. | Low        | Single flag in Fund config; must persist across sessions via Zustand persist                    |
| Freeplay: no time gates anywhere          | If freeplay exists but some actions silently block, players feel deceived. Zero gates must mean zero gates — consistent across all 5 active features being built.                                       | Medium     | Every action that IRL mode gates must check a single `timelineMode` flag, not individual timers |
| IRL: visible cooldowns with countdowns    | Players need to understand WHY they are blocked. Showing "Available in 3 months" is table stakes; blocking without explanation breaks immersion and trust.                                              | Medium     | Cooldown state stored per action, rendered inline where action appears                          |
| Mode toggle cannot be changed mid-game    | Real career pacing is a session contract, not a preference. Allowing mid-game change breaks challenge integrity (same reason difficulty locks on Ironman games).                                        | Low        | Disable toggle after `initFund()` completes                                                     |
| Freeplay clearly labeled as non-canonical | Educational users need to know freeplay scores are not comparable to IRL scores. Label + separate leaderboard partition.                                                                                | Low        | UI badge; filter leaderboard writes by mode                                                     |

### Fundraising Flow

| Feature                                       | Why Expected                                                                                                                                                                  | Complexity | Notes                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| LP target list with status per LP             | Real fundraises track every LP with status: introduced / pitched / soft-circled / committed / closed. Anything less feels like fake simulation.                               | Medium     | New `LPPipeline` data structure; list view on new Fundraise page             |
| Progress bar toward fund target               | Percentage-to-close is the single most important fundraise metric. Every real fundraise tracker (Carta, Visible) shows this first.                                            | Low        | Computed from sum of committed / targetSize                                  |
| Commitment vs. capital called distinction     | In real VC, LPs commit but don't wire money at once. Capital calls happen in drawdown periods. Conflating these is educationally incorrect and breaks fund economics realism. | High       | Requires new concepts in types.ts: `committed`, `called`, `uncalled` on Fund |
| Closing mechanics (first close / final close) | Real funds do 2-3 closes. Players who have read VC basics (the target audience) will notice if this is absent. First close unlocks deployment; final close locks the fund.    | High       | Triggers state transitions in `gamePhase`; integrates with `advanceTime()`   |
| Fund terms review screen                      | Before committing, players must see their own terms (fee, carry, fund life). This is how real LP due diligence works. Skipping it breaks educational value.                   | Low        | Read-only summary pulled from existing Fund config                           |
| LP soft-circle → hard commit conversion flow  | The "will you commit?" → "here is the term sheet" → "signed" arc is the emotional core of fundraising. Without it, fundraising feels like clicking a number.                  | Medium     | 3-state LP status machine                                                    |

### Interaction Feedback

| Feature                                          | Why Expected                                                                                                                                                                                           | Complexity | Notes                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| Visual acknowledgment on every action            | Clicking a button and seeing nothing change is broken UX by modern standards (WCAG 2.1 AA requires state change acknowledgment). Toast notifications exist but do not cover micro-states.              | Medium     | Framer Motion or CSS transitions on state changes; must not interfere with sonner toasts       |
| Contextual tooltips on metric labels             | The game has 20+ metrics (TVPI, DPI, IRR, MOIC, LP sentiment). Players who don't know VC will bounce without inline definitions. Games like Democracy 3 made this their defining educational mechanic. | Medium     | Tooltip wrapper around metric labels; content from a static definitions map                    |
| Loading / empty states for report generation     | When a report is generating (even a stub), no feedback = broken. Empty states that explain what will appear = table stakes for any UI with async-feeling operations.                                   | Low        | Skeleton loaders during "generating" phase; empty state with explanation when no reports exist |
| Success / failure feedback distinct from neutral | Positive outcome (exit, LP commit) and negative outcome (failure, LP withdrawal) need distinct visual treatments. Using the same toast style for both trains players to ignore feedback.               | Low        | Color + icon differentiation in toast calls; already partially done via sonner                 |

### LLM Report Generation (Stubbed)

| Feature                            | Why Expected                                                                                                                                                            | Complexity | Notes                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Generate button with loading state | If a generate button exists, it must show a loading state. Clicking and waiting with no feedback = the oldest UX antipattern.                                           | Low        | `isGenerating` boolean state; show spinner/skeleton during fake delay                                 |
| Stub output that looks real        | The stub output must be believable VC prose, not placeholder text. "Lorem ipsum" or "[AI RESPONSE HERE]" breaks trust and makes the feature feel unfinished.            | Medium     | Hardcoded template strings per report type that interpolate real game values; paragraph-length output |
| Report type selector (4 types)     | Deal memo, LP update, portfolio summary, market analysis are four distinct audiences and formats. A single "generate report" button implies one format, which is wrong. | Low        | Tabs or select on the report generation UI                                                            |
| Copy / export affordance           | Generated text that can't be copied is incomplete. Even stubbed output needs a copy-to-clipboard button because that's the first thing every user will try.             | Low        | `navigator.clipboard.writeText()`                                                                     |
| Error state for generation failure | Even a stubbed generation can "fail" (rate limit simulation, missing data). An error state with retry teaches users what to expect from the real API.                   | Low        | Simulate occasional failure (10% chance); show error with retry button                                |

### VC Skills System

| Feature                                     | Why Expected                                                                                                                                                                                  | Complexity | Notes                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Skills page / dashboard                     | If skills are tracked, players need to see them. Tracking without visibility is invisible progress, which breaks the engagement loop (same reason Codecademy shows streaks).                  | Medium     | New route `/skills`; grid of hard + soft skills with proficiency bars                                                |
| Skills gain on relevant actions             | Skill XP must be awarded when the player does the thing the skill represents. Financial modeling XP from clicking "advance time" = incoherent.                                                | High       | Skill award logic must be co-located with action handlers in gameState.ts; requires mapping every action to skill(s) |
| Proficiency level display (not raw numbers) | Raw XP numbers (1,247 / 5,000) are disengaging. Named levels ("Analyst → Associate → VP → Partner → MD") mirror real VC career progression and are intrinsically motivating.                  | Low        | 5-tier named level system; computed from XP thresholds                                                               |
| Skills persist across sessions              | Players who return after a break must see their accumulated skills. Persistence via Zustand persist is the existing pattern; skills must be included.                                         | Low        | Add `skills` to GameState; included in `partialize` (NOT excluded like `history`)                                    |
| Contextual hint during decisions            | When about to make a high-stakes decision, a subtle indicator of which skill is being exercised matters for learning transfer. This is the mechanism by which the game teaches intentionally. | Medium     | Small icon + label shown in decision modals/tabs; user-toggleable via setting                                        |

---

## Differentiators

Features that set VenCap apart. Not expected by players, but highly valued when present.

### Timeline Modes

| Feature                                            | Value Proposition                                                                                                                                                                                                                   | Complexity | Notes                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| IRL mode time gates that mirror real deal velocity | Real seed checks close in 2-4 weeks. Real LP closes take 6-12 months. If IRL mode gates reflect these real durations (not arbitrary numbers), it becomes a learning tool about real VC cadence — something no other simulator does. | High       | Requires a `REAL_DURATIONS` config map per action type; separate from game-month scale |
| IRL calendar showing blocked actions               | A visual calendar or timeline showing when each blocked action becomes available turns waiting from frustration into anticipation — the "stamina bar" mechanic from RPGs.                                                           | Medium     | New timeline component; renders per-action availability dates                          |
| Freeplay "sandbox" framing with creative prompts   | Rather than just removing gates, freeplay can suggest "what if?" experiments ("Try deploying $50M in 6 months"). Turns aimless play into exploration.                                                                               | Medium     | Optional prompt suggestions shown at session start in freeplay mode                    |

### Fundraising Flow

| Feature                                                      | Value Proposition                                                                                                                                                                                                        | Complexity | Notes                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| LP personality archetypes with distinct negotiation styles   | Real LPs have personalities: university endowments move slowly and value stability; family offices move fast and care about access; funds-of-funds care about ILPA compliance. Archetypes make each pitch feel distinct. | High       | New `LPArchetype` type; modifies negotiation probability, commitment speed, and pressure thresholds                                    |
| Fund II / III progressive unlock based on Fund I performance | Career progression through multiple funds is the most realistic arc in VC. No other simulator (that is public) models this. TVPI ≥ 2.0x unlocks Fund II; ≥ 3.0x unlocks Fund III with larger target size.                | High       | New `careerLevel` field on GameState; unlock check in Results.tsx; pass forward reputation score to next fund's LP pitch probabilities |
| Oversubscription mechanics                                   | Real sought-after GPs are oversubscribed and must turn away capital. If a player's reputation is high enough, LPs compete to get in — reversing the power dynamic from "please commit" to "you're on the waitlist."      | High       | Requires reputation score to exceed threshold; creates LP waitlist state                                                               |
| Side letter simulation                                       | Certain LPs demand special terms (lower fees, co-invest rights, MFN clause). Accepting a side letter closes the LP but creates future tension. Realistic, educational, and creates interesting tradeoffs.                | High       | New `SideLetter` type; conditional on LP archetype; creates deferred tension events                                                    |

### Interaction Feedback

| Feature                                                                   | Value Proposition                                                                                                                                                                                          | Complexity | Notes                                                                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Outcome previews with probability indicators before high-stakes decisions | Showing "~65% chance this follow-on extends runway 18 months" before a click is something Bloomberg Terminal and real portfolio management software does. Educationally it teaches probabilistic thinking. | High       | Requires probability computation in engine exposed to UI layer; shown in confirmation dialogs |
| Cause-and-effect replay after each advance-time tick                      | "Your follow-on in Series B increased TVPI by 0.12x. LP sentiment rose 3 points." A post-tick summary surfaces the causal chain. Football Manager does this for match results.                             | High       | Requires `TickSummary` diff between pre- and post-tick state; stored on advanceTime()         |
| Skill hint integration in decision modals                                 | When opening InvestModal, a sidebar badge "Exercising: Due Diligence, Financial Modeling" connects action to learning. This is the mechanic that makes VenCap an educational tool rather than just a game. | Medium     | Skill badge component injected into existing modals                                           |
| Animated TVPI/IRR counters on Dashboard                                   | Counters that animate to new values after advance-time (odometer effect) make metric changes visceral rather than abstract. A small touch with disproportionate perceived polish.                          | Low        | CSS counter animation or framer-motion number tween                                           |

### LLM Report Generation (Stubbed)

| Feature                                      | Value Proposition                                                                                                                                                                                                     | Complexity | Notes                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Stub output interpolates real game numbers   | "Q3 portfolio update: Your 12-company portfolio is performing at 1.8x TVPI, led by [CompanyName] (4.2x)..." using actual state values makes the stub feel real — and previews what the live LLM version will produce. | Medium     | Template strings with `${state.fund.tvpi}` interpolation; written in realistic VC prose voice |
| Deal memo format matches real VC deal memos  | Real deal memos have: executive summary, team, market, product, traction, risks, recommendation. If the stub output follows this structure, it teaches the format — the educational payoff.                           | Medium     | Per-type templates with section headers matching real-world formats                           |
| "Regenerate with different angle" affordance | Multiple generations with different framings (bull case, bear case, neutral) turns the stub into something interactive — and previews multi-prompt LLM usage patterns.                                                | Medium     | 3 tone variants per report type; randomly selected or player-chosen                           |

### VC Skills System

| Feature                                          | Value Proposition                                                                                                                                                                | Complexity | Notes                                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| Skill constellation / web visualization          | Radar chart showing hard vs soft skill balance. This makes the meta-game of career building visual — am I a finance-heavy VC or a people-skills VC?                              | Medium     | Recharts RadarChart; already have Recharts installed                                               |
| Context-specific skill variants (seed vs growth) | "Due diligence" means different things at seed vs Series B. Tracking seed-specific vs growth-specific sub-skills mirrors how real VC careers specialize. Increases replay value. | High       | Sub-skill variants under parent skills; unlocked by fund strategy selection                        |
| Skills unlock narrative flavor text              | When a player hits "Partner" level in Founder Assessment, show a brief narrative: "You've backed 8 founders and learned to read the room." Small write-up per level per skill.   | Medium     | Static flavor text per (skill, level) pair; shown in a modal on level-up                           |
| Cross-fund skill accumulation                    | Skills earned in Fund I carry forward to Fund II. This is the roguelite meta-progression mechanic — permanent XP that makes replays feel meaningful rather than starting over.   | High       | Skills stored at career level (not fund level) in GameState; persisted independently of fund reset |

---

## Anti-Features

Features to explicitly NOT build in this milestone. Reasoning included to prevent re-addition.

| Anti-Feature                                               | Why Avoid                                                                                                                                                      | What to Do Instead                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Real-time LLM API calls                                    | Introduces API cost, rate limits, latency, CORS, and key management before the UI/flow is validated. Ship stubbed UI first; wire API in a dedicated milestone. | Stub with template strings that interpolate game state; add TODO comment marking the API injection point             |
| Multiplayer fundraising rounds                             | Adds backend requirement, auth, and conflict resolution. Out of scope per PROJECT.md.                                                                          | Keep all state in localStorage; single-player LP negotiation is sufficient for career sim depth                      |
| Granular real-time animations on every state update        | Animating every Zustand state change creates jank on rapid advanceTime() calls and fights React's batched renders.                                             | Animate discrete user-initiated events only (invest, board meeting, level-up); leave bulk tick updates static        |
| Skills as visible to LPs / affecting LP sentiment directly | Coupling skills to LP sentiment creates a feedback loop that's hard to balance and may make early-game LP management feel broken.                              | Skills affect player decisions and educational learning — keep them in the meta-game layer, not the simulation layer |
| Mandatory tutorial for skills system                       | Forced tutorials for optional meta-game features have high drop-off rates. If skills require explanation to use, the UX design has failed.                     | Make first skill gain visible and self-explanatory via a contextual hint; use progressive disclosure                 |
| Side letter simulation (this milestone)                    | Side letters require LP archetype depth that doesn't exist yet. Building side letters without archetypes produces shallow mechanics.                           | Mark as deferred; build LP archetypes first in a future milestone, then side letters are natural                     |
| Timeline mode switching during active fund                 | Allowing mode change mid-game creates exploits (switch to freeplay to skip a blocked action, switch back).                                                     | Lock mode at fund init; surface this clearly in the mode selection UI                                                |
| Separate skills leaderboard                                | Maintaining two leaderboards (performance + skills) splits player attention and dilutes the main scoring metric.                                               | Surface skill levels on the existing end-of-fund scorecard as a secondary stat, not a separate ranking               |
| Oversubscription mechanics (this milestone)                | Oversubscription requires LP archetype system and reputation engine that don't exist yet.                                                                      | Stub as a post-Fund-I upgrade possibility; keep fundraising flow straightforward for initial implementation          |

---

## Feature Dependencies

```
Timeline Modes
  └── required by: Fundraising Flow (LP pitch cadence in IRL mode needs time gates)
  └── required by: Skills System (IRL mode skill hints are time-gated to feel authentic)

Fundraising Flow
  └── requires: Fund terms config (already exists in Index.tsx wizard)
  └── requires: LP data model extension (LPPipeline, commitment states)
  └── feeds into: Fund Economics (capital called vs committed changes cash flow model)
  └── feeds into: Progressive Fund Unlock (Fund II/III unlock in Results.tsx)

Interaction Feedback
  └── requires: Skills System (skill hint badges displayed inside decision modals)
  └── requires: Outcome previews (probability engine in src/engine/)
  └── feeds into: Report Generation (loading/skeleton states are part of feedback system)

LLM Report Generation
  └── requires: Game state access (templates interpolate live fund/portfolio values)
  └── loosely coupled: stands alone, no hard dependency on other new features
  └── future dependency: Skills System report ("Your skills profile: ...")

VC Skills System
  └── requires: Every action in gameState.ts mapped to skills (large surface area)
  └── feeds into: Interaction Feedback (skill hints shown in decision moments)
  └── feeds into: Progressive Fund Unlock (career XP carries forward)
  └── feeds into: LLM Report Generation (can generate a skills summary report)
```

---

## MVP Recommendation (This Milestone)

**Build in this order to unlock dependencies early:**

1. **Timeline Mode toggle** — Smallest surface area, highest leverage. All other features in this milestone reference `timelineMode`. Build first.
2. **Interaction Feedback foundations** — Micro-animations and tooltip infrastructure needed by Fundraising Flow and Skills hints. Build the system; wire to a few key actions initially.
3. **Fundraising Flow** — Uses timeline mode (gates) and interaction feedback (progress animations). Biggest new feature; needs foundation work done first.
4. **VC Skills System** — Requires action mapping across gameState.ts. Do after Fundraising Flow so that LP pitch actions are already defined and mappable.
5. **LLM Report Generation** — Loosest coupling; can be built last without blocking anything. UI scaffolding only.

**Defer within this milestone:**

- Outcome previews with probability distributions (high complexity; needs engine work; defer to post-MVP)
- Cause-and-effect tick summary / replay (high complexity; separate feature request)
- LP archetype personalities (prerequisite for oversubscription and side letters; defer to dedicated fundraising milestone)
- Cross-fund skill accumulation (Fund II/III not yet built; defer until progressive fund unlock is complete)
- Skill constellation radar chart (implement after basic skills page is stable)

---

## Sources

**Confidence Assessment:**

| Claim                                                                | Confidence | Basis                                                                                       |
| -------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| LP pipeline status terminology (soft-circle, hard commit)            | HIGH       | Standard VC practice; used in Carta, Visible, AngelList raise tooling                       |
| First close / final close mechanics                                  | HIGH       | Standard fund formation; described in NVCA model LP agreement                               |
| IRL deal timing (seed check 2-4 weeks, LP close 6-12 months)         | HIGH       | Published GP/LP experience; consistent across multiple public sources                       |
| Named VC career levels (Analyst → Associate → VP → Partner → MD)     | HIGH       | Standard VC career ladder; used in Venture for America, a16z public org charts              |
| Football Manager-style post-match summary as game design pattern     | MEDIUM     | Well-documented pattern in sports management genre; extrapolated to VC context              |
| Democracy 3 tooltip system as benchmark for educational sim tooltips | MEDIUM     | Training knowledge; game design pattern widely documented                                   |
| 10% stub failure simulation rate                                     | LOW        | No empirical basis; chosen as "low enough to not frustrate, high enough to test error path" |
| Kairosoft / Dwarf Fortress as comparable pacing references           | MEDIUM     | Training knowledge; these games' pacing mechanics are well-documented                       |

_Note: WebSearch tool was unavailable for this research session. All competitor analysis claims are based on training data through August 2025. Claims marked LOW or MEDIUM should be verified against current competitor products before being treated as authoritative._
