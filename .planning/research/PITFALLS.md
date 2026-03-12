# Domain Pitfalls

**Domain:** VC career simulator — brownfield feature expansion (timeline modes, fundraising flow, interaction feedback, LLM stubs, skills tracking)
**Researched:** 2026-03-11
**Confidence:** HIGH (codebase-grounded; patterns verified against existing implementation)

---

## Critical Pitfalls

Mistakes that cause rewrites or significant rework.

---

### Pitfall 1: Timeline Mode as a UI Flag Instead of a Game-Engine Constraint

**What goes wrong:** IRL mode is implemented as a boolean in component state or a React context flag, and components conditionally hide buttons. The game engine (`advanceTime()`, action dispatchers) has no awareness of the mode. Result: players find workarounds, the mode is bypassable, and adding future time-gated actions requires touching every component individually.

**Why it happens:** The flag is reached first during UI work before engine architecture is locked in. It feels like a display concern.

**Consequences:** Every new action added in later milestones must remember to re-check the flag. Time-gate logic duplicates across Deals, Portfolio, Board Meetings, LP Actions, and any future pages. Removing the flag later (e.g., for sandbox scenarios) requires a sweep of all consumer sites.

**Prevention:** Add `timelineMode: "irl" | "freeplay"` to the `Fund` type (already in `src/engine/types.ts`) and store it in the Zustand store alongside `fund`. Gate actions at the Zustand action level (inside `gameState.ts`), not at the component level. Components call the action — the store decides whether to allow it and what feedback to return. The action can return a `{ blocked: true, reason: string, unlocksAtMonth: number }` shape when gated.

**Warning signs:**

- `timelineMode` first appears inside a React component file rather than `types.ts` or `gameState.ts`
- A `useGameStore` selector for `timelineMode` appears in more than two UI files
- Board meetings, LP actions, and deal investments each have their own time-gate check

**Phase:** Address in the timeline mode phase, before any other feature touches action dispatch.

---

### Pitfall 2: Fundraising Flow That Bypasses the Existing Fund Economics Model

**What goes wrong:** A new fundraising flow is built as a standalone UI experience with its own state (LP commitments, closing progress, fund size negotiation). On completion, it sets `fund.currentSize` and `fund.cashAvailable` directly. The existing fund economics calculations (management fee deduction, GP commit, carry hurdle) in `gameState.ts` are not updated for multi-fund scenarios. Fund II starts with Fund I's fee basis intact instead of resetting properly.

**Why it happens:** The existing `Fund` interface and `gameState.ts` are large (~700+ lines); it is easier to bolt on new state than to extend the existing model carefully.

**Consequences:** Fund II net TVPI and IRR calculations (shown on Dashboard and Results) use stale or incorrect fee bases. LP sentiment carry-over between funds becomes unpredictable. Progressive fund unlocking (Fund I → II → III) has no clean state boundary.

**Prevention:** Before writing any fundraising UI, model `FundraisingRound` as a type in `types.ts` with fields: `targetSize`, `commitments: LPCommitment[]`, `status: "pitching" | "first_close" | "final_close"`, `managementFeeRate`, `carryRate`, `fundLife`. The Zustand store transitions from `activeFundraising: FundraisingRound | null` to a completed `Fund` in one atomic action (`completeFundClose()`), which resets all fee-basis counters correctly. Reuse the existing `Fund` interface fields — do not shadow them.

**Warning signs:**

- `cashAvailable` or `currentSize` is set directly from a React component without going through a store action
- `totalFeesCharged` or `carryAccrued` is not reset to 0 when a new fund is created
- Fund II's `gpEarnings` accumulates Fund I's carry

**Phase:** Fundraising flow phase. Requires a `types.ts` schema review before any UI work.

---

### Pitfall 3: Skills System Stored Outside the Zustand Persist Layer

**What goes wrong:** Skills are tracked in a separate `localStorage` key (e.g., `vencap-skills`) managed by a custom hook, independent from the Zustand store. This creates a split state model: undo snapshots (`GameSnapshot` in types.ts) do not include skills, save slots do not include skills, and the Results page cannot access skill data for the end-of-fund scorecard without importing from a second source.

**Why it happens:** Skills feel "meta" — above any single game run — so they get their own persistence. But gameplay decisions that advance skills happen inside game actions (`advanceTime`, `resolveDecision`, etc.) which only touch the Zustand store.

**Consequences:** Undo (`undoAdvance()`) reverts portfolio state but not skill gains earned that turn — a visible inconsistency. Save slot load restores game state but not skills. End-of-fund scorecard must aggregate from two sources. Skills data cannot be inspected in tests that use the store directly.

**Prevention:** Add `skills: VCSkills` to the `GameState` type in `types.ts` and include it in the Zustand `persist` `partialize`. Mark skills as excluded from `GameSnapshot` (like `history` already is) so undo does not revert skill growth — skills accumulate permanently. Skill mutations happen only inside store actions, not in components.

**Warning signs:**

- A file named `useSkills.ts` or `skillsStore.ts` appears in `src/hooks/` or `src/engine/` as a separate store
- `localStorage.setItem('vencap-skills', ...)` appears anywhere outside the Zustand persist middleware
- Skills state is not visible in Zustand devtools

**Phase:** Skills system phase, before any component that reads or writes skill values.

---

### Pitfall 4: LLM Stub That Hardcodes Response Shape, Blocking Real Integration Later

**What goes wrong:** The stub for LLM report generation returns a hardcoded string or a single `{ content: string }` object from a mock function. When the real API is wired in later, the response shape (streaming chunks, error states, rate limit retries, token counts) is completely different, requiring a rewrite of every component that consumes the stub.

**Why it happens:** "Stub it for now" gets implemented as the simplest possible mock rather than a minimal but complete contract.

**Consequences:** The loading/error/empty states built against the stub do not match what the real API returns. Streaming UI (typewriter effect, progressive rendering) cannot be added without component refactors. Error boundary placement is wrong because the stub never throws.

**Prevention:** Define a `ReportGenerationResult` type in `types.ts` upfront:

```typescript
export type ReportGenerationStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "complete"
  | "error";

export interface ReportGenerationResult {
  status: ReportGenerationStatus;
  content: string; // Accumulated so far (grows during streaming)
  error?: string;
  tokenCount?: number;
  generatedAt?: number; // ms timestamp
}
```

The stub function returns this shape with `status: "complete"` after a `setTimeout` delay (simulating network latency). Components are written against this interface. When the real API is wired, only the stub function body changes — no component changes required.

**Warning signs:**

- The stub function signature is `generateReport(): string` or `generateReport(): Promise<string>`
- Loading state is a single boolean (`isGenerating: boolean`) rather than the enum status
- No artificial delay in the stub (makes latency-dependent bugs invisible during development)

**Phase:** LLM report generation phase. Define the type contract first, then build UI.

---

### Pitfall 5: Interaction Feedback (Animations, Tooltips, Outcome Previews) Coupled to Component Internal State

**What goes wrong:** Micro-animations, contextual tooltips showing metric impact, and outcome previews are implemented as local `useState` inside individual components (Deals, Portfolio, Dashboard). Each component manages its own hover state, preview-open state, and animation trigger. When a decision causes cascading effects across multiple components, only the component that dispatched it shows feedback — the others are unaware.

**Why it happens:** Feedback feels like a display concern local to the component. It is the path of least resistance.

**Consequences:** A portfolio action that affects cash, LP sentiment, and a company's valuation simultaneously — three panels — shows animation only in the panel the player clicked. The "cause and effect" goal in the spec (clear feedback between actions and portfolio performance) is not achievable because effects are scattered.

**Prevention:** Introduce a lightweight `feedbackEvents` queue in the Zustand store: an array of `{ id, type, targetComponent, payload, expiresAt }` entries. Store actions push feedback events when they mutate state. Components subscribe to events targeting them via a selector and animate/highlight in response. Events are cleared after a short TTL. This is not a full event bus — it is a minimal addition to the existing store pattern.

**Warning signs:**

- `const [showPreview, setShowPreview] = useState(false)` appears in more than three components for the same conceptual interaction
- A portfolio action in `gameState.ts` has no corresponding feedback event emission
- Outcome preview shows a different delta from what actually happens (preview computed in component, not in store)

**Phase:** Interaction feedback phase. The store-side feedback queue should be added before any animation work starts.

---

## Moderate Pitfalls

---

### Pitfall 6: Progressive Fund Unlocking Checks Scattered Across UI

**What goes wrong:** The condition for unlocking Fund II (e.g., TVPI > 1.5x, LP sentiment > 60) is checked inline in multiple places: the Results page, a Dashboard banner, and the fundraising flow entry point. The threshold is either duplicated or imported from an ad-hoc constants file.

**Prevention:** Add a pure function `canUnlockFundII(state: GameState): boolean` in `vcRealism.ts` (where unlock/eligibility logic already lives) with a single source of truth for the threshold. All UI reads from this function via a selector.

**Warning signs:** The number `1.5` (or whatever the TVPI threshold is) appears as a literal in more than one file.

**Phase:** Fundraising flow phase.

---

### Pitfall 7: Skills Hints Causing Notification Fatigue

**What goes wrong:** The spec requires "subtle contextual hints during decisions showing skills exercised." If hints appear on every decision, every board meeting, and every investment action, players disable them immediately. The toggleable feedback system becomes an all-or-nothing setting players turn off permanently.

**Prevention:** Rate-limit skill hints. Show a hint only when: (a) the skill is being exercised for the first time or first time in 10+ months, or (b) the decision represents an unusually high-value skill application (e.g., a term sheet negotiation teaches skills differently than a follow-on investment). Implement `shouldShowSkillHint(skillId, gameState): boolean` in `gameState.ts` rather than in the component, so the logic is testable.

**Warning signs:** Skill hints appear on every `advanceTime()` call or every board meeting resolution regardless of context.

**Phase:** Skills system phase.

---

### Pitfall 8: IRL Mode Wall-Clock Time Creating Cross-Session Continuity Problems

**What goes wrong:** "IRL mode gates actions behind realistic time delays" — if these delays are measured in real wall-clock time (a 3-day cooldown means the player must return in 3 days), the game state needs to track the real timestamp at which the gate opens. Closing and reopening the browser, loading a save slot, or the undo action all interact with real-time gates in non-obvious ways.

**Prevention:** Decide early whether IRL mode means real wall-clock delays or in-game-turn delays. Based on the spec ("session-start toggle" that "shapes entire game pacing"), IRL mode almost certainly means in-game turn delays (each `advanceTime()` click represents a month; some actions require advancing N months before they're available). Confirm this interpretation and document it as a Key Decision in PROJECT.md before implementation. If wall-clock is intended, the `GameSnapshot` type needs a `realTimeGates: Record<string, number>` field (epoch ms) that is excluded from undo but included in persist.

**Warning signs:** The word "cooldown" in IRL-mode code references `Date.now()` rather than `fund.currentMonth`.

**Phase:** Timeline mode phase, first design decision to lock down.

---

### Pitfall 9: Fundraising LP Commitments Conflated With Existing LP Sentiment System

**What goes wrong:** The fundraising flow introduces "LP pitching and commitment tracking" — new LPs who may or may not commit capital. These are distinct from the existing LP sentiment system, which models the emotional relationship with LPs who have already committed. The two are conflated: prospect LP commitment rates are driven by `lpSentiment.score`, and prospect LP objects are stored in the `LPSentiment` structure.

**Prevention:** Create a separate `FundraisingProspect` type for the fundraising flow. Existing LP sentiment (`lpSentiment.ts`) influences prospecting odds (a high score makes pitching easier) but is not the same concept as prospect conversion. Keep the two systems loosely coupled via a modifier function: `getLPSentimentFundraisingBonus(lpScore: number): number`.

**Warning signs:** `lpSentiment.score` is read directly inside fundraising flow logic to determine whether a specific prospect commits, rather than through a modifier function.

**Phase:** Fundraising flow phase.

---

### Pitfall 10: TypeScript Strict Mode Violations Discovered Late From New Types

**What goes wrong:** New types for skills (`VCSkills`), fundraising (`FundraisingRound`, `LPCommitment`), LLM report state (`ReportGenerationResult`), and timeline mode are added to `types.ts` but not to the `GameSnapshot` type or the Zustand store's `partialize` exclusion list. The build passes (`tsc -b` strict) only because the new fields are `optional` — but the `GameSnapshot` used by undo becomes subtly incomplete and missing fields silently fall back to `undefined` after an undo.

**Prevention:** When adding a field to `GameState`, immediately decide: (a) should it be in `GameSnapshot` (yes for undoable game state, no for meta-state like skills and history), and (b) should it be in `partialize` exclusions (only for `history: GameSnapshot[]` which is already excluded). Add a TypeScript compiler check: make `GameSnapshot` an explicit `Omit<GameState, 'history' | 'skills' | ...>` type alias rather than a manually maintained parallel interface. This makes the compiler catch any new `GameState` field that is not consciously excluded.

**Warning signs:**

- `GameSnapshot` is a manually typed interface with fields listed one by one (current pattern, as seen in `types.ts` line 546+)
- A new `GameState` field is added but `GameSnapshot` is not updated
- An undo restores the game to a state where newly added fields are `undefined`

**Phase:** Every phase. Review `GameSnapshot` completeness as part of each phase's definition of done.

---

## Minor Pitfalls

---

### Pitfall 11: i18n-Ready Strings Added as an Afterthought

**What goes wrong:** User-facing strings in the skills system, fundraising flow, and LLM reports are written as direct JSX string literals. Retrofitting i18n key extraction across 5+ new components is a multi-hour sweep after the fact.

**Prevention:** Establish the i18n pattern (even a lightweight one — a simple `t(key, fallback)` wrapper) before any component work starts. All new components use `t()` from day one. The constraint is already in PROJECT.md — enforce it at the first component, not the last.

**Phase:** First component phase (whichever feature is built first).

---

### Pitfall 12: Vercel Speed Insights Import Path

**What goes wrong:** `@vercel/speed-insights` is imported from the root package rather than `/react`. The component silently fails or throws a runtime error in non-Next.js environments.

**Prevention:** The correct import is `import { SpeedInsights } from "@vercel/speed-insights/react"`. This is already documented as a Key Decision in PROJECT.md. Add it once to `App.tsx` and do not import it elsewhere.

**Warning signs:** `from "@vercel/speed-insights"` without the `/react` suffix anywhere in the codebase.

**Phase:** Infrastructure / setup phase.

---

### Pitfall 13: Mobile Responsiveness Skipped for Complex New Layouts

**What goes wrong:** The skills dashboard page and fundraising flow involve multi-column layouts, progress indicators, and data tables that work on desktop but break on mobile. The constraint ("Mobile responsive for all new components") is in PROJECT.md but gets deferred under time pressure.

**Prevention:** Use shadcn/ui's responsive grid primitives from the start (already present in `src/components/ui/`). Test at 375px viewport width during development, not after. For data-heavy components like the skills matrix, design mobile layout first — it is easier to expand to desktop than to collapse desktop to mobile.

**Phase:** All phases. Treat mobile as a first-class constraint, not a final QA step.

---

## Phase-Specific Warnings

| Phase Topic          | Likely Pitfall                                                  | Mitigation                                                                     |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Timeline mode        | Mode as UI flag rather than engine constraint (Pitfall 1)       | Add `timelineMode` to `Fund` type in `types.ts` first; gate in Zustand actions |
| Timeline mode        | Wall-clock vs in-game-turn ambiguity for IRL delays (Pitfall 8) | Lock down interpretation as a Key Decision before writing any code             |
| Fundraising flow     | Bypass existing Fund economics model (Pitfall 2)                | Define `FundraisingRound` type and `completeFundClose()` action before UI      |
| Fundraising flow     | Conflating prospect LPs with existing LP sentiment (Pitfall 9)  | Separate types; use modifier function for sentiment influence                  |
| Fundraising flow     | Fund unlock condition scattered across UI (Pitfall 6)           | Single `canUnlockFundII()` function in `vcRealism.ts`                          |
| Interaction feedback | Feedback coupled to component-local state (Pitfall 5)           | Add `feedbackEvents` queue to Zustand store before animation work              |
| LLM stubs            | Stub shape incompatible with real API (Pitfall 4)               | Define `ReportGenerationResult` type first; stub returns this shape            |
| Skills system        | Skills outside Zustand persist layer (Pitfall 3)                | Add `skills: VCSkills` to `GameState`; exclude from `GameSnapshot`             |
| Skills system        | Notification fatigue from over-eager hints (Pitfall 7)          | Gate hints behind `shouldShowSkillHint()` with rate limiting                   |
| All phases           | `GameSnapshot` drift as new types are added (Pitfall 10)        | Convert `GameSnapshot` to `Omit<GameState, ...>` alias                         |
| All phases           | i18n strings added as afterthought (Pitfall 11)                 | Establish `t()` wrapper before first component                                 |
| All phases           | Mobile layout skipped under time pressure (Pitfall 13)          | Design mobile-first for all data-heavy new pages                               |

---

## Sources

- Codebase inspection: `/Users/soorajsambasivam/Documents/projects/VenCap/src/engine/types.ts`, `gameState.ts`, `vcRealism.ts`, `lpSentiment.ts` — HIGH confidence (direct source)
- Project spec: `/Users/soorajsambasivam/Documents/projects/VenCap/.planning/PROJECT.md` — HIGH confidence (direct source)
- Pattern analysis: Brownfield game feature expansion patterns from training data — MEDIUM confidence (verify against specific implementation choices as phases proceed)
- TypeScript strict mode behavior with optional fields on union types — HIGH confidence (compiler behavior is deterministic)
