# Phase 3: Timeline Modes - Research

**Researched:** 2026-03-12
**Domain:** Engine-level game mode flag, action-gating pattern, fund setup wizard extension
**Confidence:** HIGH

## Summary

Phase 3 adds a `timelineMode` toggle to the fund setup wizard and wires it into every action that has a real-world time cost. The codebase already has all required types in place: `TimelineMode`, `TimeGate`, and `IrlGateDurations` are defined in `src/engine/types.ts`, and `Fund` already carries both `timelineMode: TimelineMode` and `activeTimeGates: TimeGate[]`. The `initFund` action in `gameState.ts` already sets `timelineMode: mergedConfig.timelineMode ?? "freeplay"` and `activeTimeGates: []`. This means Phase 3 is purely an integration task — no new types are needed. The work is: (1) add the wizard UI step, (2) create an engine module that houses the IRL gate constants and a `checkTimeGate()` helper, (3) gate the relevant store actions using that helper, and (4) surface gate status in the UI.

The key STATE.md blocker is documented: "IRL mode time interpretation must be locked in PROJECT.md before store integration — gate logic is calibrated to in-game months, not wall-clock." The interpretation is **in-game months** (each `advanceTime()` call = 1 in-game month). This is critical for calibrating the constants.

**Primary recommendation:** Create `src/engine/timelineGates.ts` as the single source of truth for IRL gate durations and the `checkTimeGate()` / `openTimeGate()` / `clearTimeGate()` helpers. All gated store actions import from there. No gate logic lives in React components.

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                    | Research Support                                                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TIME-01 | User can select IRL or Freeplay mode at session start (fund setup wizard)                                      | Wizard is in `src/pages/Index.tsx`, currently 5 steps. Add a new step or sub-section on step 1 with a two-option toggle. `initFund` already accepts `timelineMode` via config. |
| TIME-02 | IRL mode gates actions behind realistic time delays with "available in N months" display                       | `activeTimeGates: TimeGate[]` is already on `Fund`. Need `checkTimeGate(fund, actionType)` helper and UI to read gate state and disable controls with countdown label.         |
| TIME-03 | Freeplay mode removes all time gates for accelerated play                                                      | `checkTimeGate` returns `{ blocked: false }` when `fund.timelineMode === "freeplay"`. No UI changes needed for freeplay.                                                       |
| TIME-04 | IRL gates calibrated to real VC cadence (seed check 2-4 weeks, LP close 6-12 months, due diligence 1-3 months) | Named constants object `IRL_GATE_DURATIONS` in `timelineGates.ts`. Durations in in-game months.                                                                                |
| TIME-05 | Timeline mode stored as engine-level state in Fund, not UI flag                                                | Already satisfied in types.ts and gameState.ts initFund. Phase 3 must pass it through wizard state -> initFund call in Index.tsx.                                              |

</phase_requirements>

## Standard Stack

### Core

| Library            | Version | Purpose                                                   | Why Standard                                                |
| ------------------ | ------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Zustand (existing) | ~4.x    | Store state (`fund.timelineMode`, `fund.activeTimeGates`) | All game state is already in Zustand; no new library needed |
| Vitest (existing)  | ~2.x    | Unit tests for `timelineGates.ts`                         | Already configured in `vite.config.ts`                      |

### Supporting

| Library                | Version | Purpose                                                    | When to Use                                                                         |
| ---------------------- | ------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| React state (existing) | 18      | `timelineMode` wizard selection local state in `Index.tsx` | Wizard local state pattern already used for `selectedScenario`, `selectedEra`, etc. |
| shadcn/ui (existing)   | latest  | Toggle/card UI in the wizard step                          | All other wizard steps use `Card` + `CardContent` selection pattern                 |

### Alternatives Considered

| Instead of                    | Could Use                           | Tradeoff                                                                                                           |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| New `timelineGates.ts` module | Inline gate logic in `gameState.ts` | Inline makes the store file even larger (~3,000 lines already) and harder to unit-test the gate logic in isolation |
| Named constants object        | Magic numbers in each action        | Requirements explicitly forbid magic numbers (TIME-04)                                                             |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── engine/
│   ├── timelineGates.ts     # NEW: IRL_GATE_DURATIONS constants + checkTimeGate/openTimeGate helpers
│   ├── gameState.ts         # MODIFIED: import timelineGates, gate invest/lpActions/dueDiligence
│   └── types.ts             # UNCHANGED: all required types already present
├── pages/
│   └── Index.tsx            # MODIFIED: add timelineMode wizard step, pass to initFund
└── components/
    └── TimeGateBadge.tsx    # NEW (optional): reusable "available in N months" badge
```

### Pattern 1: Named Constants Module (`timelineGates.ts`)

**What:** A pure-engine file (no React imports) that exports `IRL_GATE_DURATIONS`, `checkTimeGate()`, `openTimeGate()`, and `clearTimeGate()`.

**When to use:** Any store action that has a real-world time cost in IRL mode reads from here.

**Example:**

```typescript
// src/engine/timelineGates.ts
import type { Fund, TimeGate, IrlGateDurations } from "./types";

// Real VC cadences expressed as in-game months (1 advanceTime() = 1 month)
export const IRL_GATE_DURATIONS: IrlGateDurations = {
  seed_check: { min: 1, max: 2 }, // 2-4 weeks ~ 0.5-1 month; use 1-2 for playability
  due_diligence: { min: 1, max: 3 }, // 1-3 months
  series_a_check: { min: 2, max: 4 }, // 2-4 months
  lp_close: { min: 6, max: 12 }, // 6-12 months
  board_meeting: { min: 1, max: 1 }, // 1 month notice
  follow_on: { min: 1, max: 2 }, // 1-2 months diligence
};

// Returns gate info for a given action. Returns null if not gated.
export function checkTimeGate(
  fund: Fund,
  actionType: string,
): { blocked: boolean; availableFromMonth?: number; monthsRemaining?: number } {
  if (fund.timelineMode !== "irl") return { blocked: false };
  const gate = fund.activeTimeGates.find((g) => g.actionType === actionType);
  if (!gate) return { blocked: false };
  const monthsRemaining = gate.availableFromMonth - fund.currentMonth;
  if (monthsRemaining <= 0) return { blocked: false };
  return {
    blocked: true,
    availableFromMonth: gate.availableFromMonth,
    monthsRemaining,
  };
}

// Opens a new time gate for an action starting now + random duration
export function openTimeGate(
  fund: Fund,
  actionType: string,
  reason: string,
): TimeGate {
  const durations = IRL_GATE_DURATIONS[actionType];
  const delay = durations
    ? Math.round(
        durations.min + Math.random() * (durations.max - durations.min),
      )
    : 1;
  return {
    actionType,
    availableFromMonth: fund.currentMonth + delay,
    reason,
  };
}

// Removes an expired gate from the array (call after gate lifts)
export function clearExpiredGates(fund: Fund): TimeGate[] {
  return fund.activeTimeGates.filter(
    (g) => g.availableFromMonth > fund.currentMonth,
  );
}
```

### Pattern 2: Wizard Step for Mode Selection

**What:** Add a new wizard step (or inline toggle on Step 1) in `Index.tsx` for IRL vs Freeplay. The current wizard has 5 steps. Adding a 6th step is the cleaner option to avoid overloading Step 1.

**When to use:** Step between current Step 1 (name) and Step 2 (fund type) — renumber remaining steps or append as new step 2 and push others to 3-6.

**Example:**

```tsx
// In Index.tsx — local wizard state
const [timelineMode, setTimelineMode] = useState<TimelineMode>("freeplay");

// Add to launchFund() call:
initFund({
  ...existingConfig,
  timelineMode, // Pass through to engine
});
```

**Note:** `TimelineMode` type is already imported-ready from `@/engine/types`.

### Pattern 3: Gating an Action in the Store

**What:** Each gated action calls `checkTimeGate` before proceeding and returns an early failure if blocked.

**When to use:** Any `gameState.ts` action that involves an IRL-paced activity.

**Example:**

```typescript
// In gameState.ts invest action (after existing fund/startup checks):
import { checkTimeGate } from "./timelineGates";

const gateCheck = checkTimeGate(state.fund, "seed_check");
if (gateCheck.blocked) {
  return {
    success: false,
    reason: `Due diligence in progress. Available in ${gateCheck.monthsRemaining} month(s).`,
  };
}
```

### Pattern 4: "Available in N months" UI Badge

**What:** In `Deals.tsx` and `InvestModal.tsx`, read `fund.activeTimeGates` and render a disabled state with countdown.

**When to use:** Wherever an action button exists for a gated action type.

**Example:**

```tsx
// In Deals.tsx or InvestModal.tsx
const gateCheck = checkTimeGate(fund, "seed_check");
<Button disabled={gateCheck.blocked}>
  {gateCheck.blocked
    ? `Available in ${gateCheck.monthsRemaining} month(s)`
    : "Invest"}
</Button>;
```

**Important:** Import `checkTimeGate` from the engine module, not re-implement in the component. This keeps TIME-05 satisfied.

### Anti-Patterns to Avoid

- **Storing `timelineMode` in React component state as the source of truth:** The requirement (TIME-05) mandates it lives on `Fund` in engine state. Component state is only for the wizard _before_ `initFund` is called.
- **Magic number gate durations:** Every duration must be a named constant in `IRL_GATE_DURATIONS` (TIME-04).
- **Gating `advanceTime()`:** The game loop must never be blocked by time gates — only player-initiated actions are gated.
- **Allowing `timelineMode` changes post-init:** `initFund` sets it once. No action in the store should mutate `fund.timelineMode` after setup.
- **Opening gates per-company instead of per-action-type:** Gates track action types (e.g., `"seed_check"`) not individual startups. A gate blocks the action category until it lifts, then all startups become investable again. This is simpler and matches real VC diligence queuing.

## Don't Hand-Roll

| Problem           | Don't Build                                | Use Instead                                                                                                | Why                                                 |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Countdown display | Custom time calculation logic in JSX       | `checkTimeGate()` helper returning `monthsRemaining`                                                       | Keeps UI dumb; engine owns all business logic       |
| Gate persistence  | Separate localStorage key for gates        | `fund.activeTimeGates` already persisted via Zustand persist middleware                                    | Adding a second persistence layer creates sync bugs |
| Mode validation   | Runtime checks scattered across components | `checkTimeGate` returns `{ blocked: false }` in freeplay — components need zero conditional logic for mode | Centralized check eliminates divergence             |

**Key insight:** The gate data structure is already designed. The entire phase is wiring, not inventing.

## Common Pitfalls

### Pitfall 1: Wizard Step Count Mismatch

**What goes wrong:** The wizard progress indicator in `Index.tsx` is hardcoded to render steps `[1, 2, 3, 4, 5]`. Adding a new step breaks the indicator unless the array and navigation are both updated.
**Why it happens:** Step count is a literal array `[1, 2, 3, 4, 5].map(...)` not derived from a constant.
**How to avoid:** Either bump the array to `[1, 2, 3, 4, 5, 6]` and renumber all step references, or insert the mode toggle into an existing step (Step 1 is least disruptive — it only has a name input and has extra vertical space).
**Warning signs:** Clicking "Continue" on the new step jumps to the wrong step number.

### Pitfall 2: Gate Not Passed to `initFund`

**What goes wrong:** Wizard collects `timelineMode` in local state but `launchFund()` doesn't pass it to `initFund()`. The engine defaults to `"freeplay"`.
**Why it happens:** `launchFund` in `Index.tsx` has a fixed config object — easy to forget to add `timelineMode`.
**How to avoid:** Explicitly add `timelineMode` to the object passed to `initFund`. Write a test that inits with `timelineMode: "irl"` and asserts `fund.timelineMode === "irl"`.
**Warning signs:** IRL mode selection in wizard has no observable effect on gameplay.

### Pitfall 3: Gate Accumulation Without Cleanup

**What goes wrong:** Every call to `openTimeGate` appends to `fund.activeTimeGates`. If gates are never cleared, the array grows indefinitely and old expired gates block re-checking.
**Why it happens:** `clearExpiredGates` is not called as part of `advanceTime()` or after a gate lifts.
**How to avoid:** Call `clearExpiredGates(fund)` inside `advanceTime()` to prune stale gates each month, and optionally when a gate check passes (gate has lifted).
**Warning signs:** After 10+ months, `fund.activeTimeGates.length` keeps growing; or an action that should be available is still blocked.

### Pitfall 4: `checkTimeGate` Called Outside Engine

**What goes wrong:** A component re-implements the gate check inline (`fund.activeTimeGates.find(...)`) instead of importing `checkTimeGate`. If the gate logic changes, the component diverges.
**Why it happens:** Convenience — one less import.
**How to avoid:** Export `checkTimeGate` from `timelineGates.ts` and use it in components. Lint rule: no direct access to `fund.activeTimeGates` in `.tsx` files.
**Warning signs:** Two different implementations of gate resolution in codebase.

### Pitfall 5: IRL Seed Check vs Due Diligence Distinction

**What goes wrong:** "Seed check" (2-4 weeks in reality) is conflated with "full due diligence" (1-3 months). The spec says both are distinct cadences.
**Why it happens:** Both happen during the investment flow; easy to use one gate for both.
**How to avoid:** Define `seed_check` (1-2 months) and `due_diligence` (1-3 months) as separate keys in `IRL_GATE_DURATIONS`. Use stage to select which gate applies: pre_seed/seed use `seed_check`, series_a/growth use `due_diligence`.
**Warning signs:** All stages have the same gate duration.

## Code Examples

### Defining IRL Gate Durations (named constants)

```typescript
// Source: src/engine/timelineGates.ts (new file)
// Durations in in-game months. 1 advanceTime() call = 1 in-game month.
export const IRL_GATE_DURATIONS: IrlGateDurations = {
  seed_check: { min: 1, max: 2 },
  due_diligence: { min: 1, max: 3 },
  series_a_check: { min: 2, max: 4 },
  lp_close: { min: 6, max: 12 },
  follow_on: { min: 1, max: 2 },
};
```

### Gating invest action in gameState.ts

```typescript
// Source: src/engine/gameState.ts (invest action, after existing validation)
import { checkTimeGate, openTimeGate } from "./timelineGates";

const gateKey =
  fund.stage === "pre_seed" || fund.stage === "seed"
    ? "seed_check"
    : "due_diligence";
const gate = checkTimeGate(state.fund, gateKey);
if (gate.blocked) {
  return {
    success: false,
    reason: t(
      "timeGate.blocked",
      `Due diligence in progress — available in ${gate.monthsRemaining} month(s).`,
    ),
  };
}
// On successful investment, open a new gate for the NEXT investment
const newGate = openTimeGate(state.fund, gateKey, "Due diligence queue");
set({
  fund: {
    ...state.fund,
    activeTimeGates: [...state.fund.activeTimeGates, newGate],
    // ... other fields
  },
});
```

### Wizard mode selection (Index.tsx)

```tsx
// Source: src/pages/Index.tsx (new step or Step 1 addition)
import type { TimelineMode } from "@/engine/types";
const [timelineMode, setTimelineMode] = useState<TimelineMode>("freeplay");

// In launchFund():
initFund({
  name: fundName.trim(),
  type: fundType!,
  stage: fundStage!,
  targetSize: raiseTarget || raised,
  currentSize: raised,
  skillLevel,
  rebirthCount,
  geographicFocus,
  scenarioId: selectedScenario,
  marketEra: selectedEra,
  timelineMode, // <-- new
} as Parameters<typeof initFund>[0]);
```

### Dashboard mode indicator

```tsx
// Source: src/pages/Dashboard.tsx (header area or scenario banner)
// fund.timelineMode is available from useGameStore
{
  fund.timelineMode === "irl" && (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" /> IRL Pacing
    </Badge>
  );
}
```

## State of the Art

| Old Approach          | Current Approach                              | When Changed | Impact                                                                   |
| --------------------- | --------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| No timeline gating    | `TimeGate[]` on Fund + `checkTimeGate` helper | Phase 3      | Actions that have real VC time costs are now blockable in IRL mode       |
| Default freeplay only | User-selectable at wizard                     | Phase 3      | IRL mode becomes accessible; freeplay remains default for casual players |

**Deprecated/outdated:**

- None. Phase 3 is purely additive.

## Open Questions

1. **Where in the wizard does the mode toggle live?**
   - What we know: Wizard has 5 steps; Step 1 (name) is simple with room to add a toggle below. Step 6 is the cleanest separation.
   - What's unclear: Product preference — inline on Step 1 vs dedicated step. Planner should decide. Both are equivalent technically.
   - Recommendation: Add as new Step 2 (between name and fund type), renumber others to 3-6. Mode feels as fundamental as fund name.

2. **Do gate durations vary by market cycle?**
   - What we know: Real diligence timelines lengthen in cold markets. The spec does not mention cycle-dependent gates.
   - What's unclear: Whether to apply `DifficultyModifiers` to gate durations in IRL mode.
   - Recommendation: Keep gates cycle-independent for Phase 3. Market cycle already affects deal quality and exit rates. Adding cycle-based gate durations is a Phase 3 extension, not a requirement.

3. **Which specific actions are gated?**
   - What we know: Requirements say "seed check: 2-4 months, due diligence: 1-3 months, LP close: 6-12 months." Current actions that match: `invest`, `performLPAction` (specifically `lp_close` type). Follow-on may also qualify.
   - What's unclear: Are board meeting scheduling, incubator graduation, or lab spin-outs gated?
   - Recommendation: Gate only the three explicitly listed in requirements: `invest` (seed_check or due_diligence by stage), `performLPAction` for lp_close type. Follow-on gated separately. All others left ungated in Phase 3 — can extend in later phases.

## Validation Architecture

### Test Framework

| Property           | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| Framework          | Vitest 2.x                                              |
| Config file        | `vite.config.ts` (`test.include: ["src/**/*.test.ts"]`) |
| Quick run command  | `npx vitest run src/engine/timelineGates.test.ts`       |
| Full suite command | `npx vitest run`                                        |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                                       | Test Type | Automated Command                                 | File Exists?         |
| ------- | ------------------------------------------------------------------------------ | --------- | ------------------------------------------------- | -------------------- |
| TIME-01 | `initFund` with `timelineMode: "irl"` sets `fund.timelineMode === "irl"`       | unit      | `npx vitest run src/engine/gameState.test.ts`     | ✅ (extend existing) |
| TIME-01 | `initFund` without `timelineMode` defaults to `"freeplay"`                     | unit      | `npx vitest run src/engine/gameState.test.ts`     | ✅ (extend existing) |
| TIME-02 | `checkTimeGate` returns `blocked: true` in IRL mode when gate active           | unit      | `npx vitest run src/engine/timelineGates.test.ts` | ❌ Wave 0            |
| TIME-02 | `invest` returns `success: false` in IRL mode with active gate                 | unit      | `npx vitest run src/engine/gameState.test.ts`     | ❌ Wave 0            |
| TIME-03 | `checkTimeGate` returns `blocked: false` in freeplay mode regardless of gates  | unit      | `npx vitest run src/engine/timelineGates.test.ts` | ❌ Wave 0            |
| TIME-04 | `IRL_GATE_DURATIONS.seed_check.max <= 2` (named constant, correct calibration) | unit      | `npx vitest run src/engine/timelineGates.test.ts` | ❌ Wave 0            |
| TIME-04 | `IRL_GATE_DURATIONS.lp_close.min >= 6`                                         | unit      | `npx vitest run src/engine/timelineGates.test.ts` | ❌ Wave 0            |
| TIME-05 | `fund.timelineMode` survives Zustand persist/rehydrate cycle                   | unit      | `npx vitest run src/engine/gameState.test.ts`     | ❌ Wave 0            |

### Sampling Rate

- **Per task commit:** `npx vitest run src/engine/timelineGates.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (`npx vitest run`) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/engine/timelineGates.test.ts` — covers TIME-02, TIME-03, TIME-04 (new engine module, zero test coverage until created)
- [ ] Extend `src/engine/gameState.test.ts` — add `timelineMode: "irl"` variant to `initDefaultFund` helper and test TIME-01, TIME-02 (invest blocking), TIME-05

_(No new framework install needed — Vitest already configured)_

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `src/engine/types.ts` — `TimelineMode`, `TimeGate`, `IrlGateDurations`, `Fund.timelineMode`, `Fund.activeTimeGates` already defined
- Direct codebase inspection: `src/engine/gameState.ts` line 1003-1005 — `initFund` already sets `timelineMode` and `activeTimeGates`
- Direct codebase inspection: `src/pages/Index.tsx` — 5-step wizard structure, `launchFund()` call pattern
- `.planning/STATE.md` — "IRL mode time interpretation: in-game turns (each advanceTime() = 1 month)"
- `.planning/REQUIREMENTS.md` — TIME-01 through TIME-05 definitions

### Secondary (MEDIUM confidence)

- Real VC cadence cross-reference: seed check 2-4 weeks, due diligence 1-3 months, LP close 6-12 months — consistent with documented VC industry practice; calibrated to in-game months for playability

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new dependencies, all types pre-defined
- Architecture: HIGH — patterns directly derived from existing codebase conventions (`lpSentiment.ts` module pattern, `LPActionCooldown` precedent for time-gating in store)
- Pitfalls: HIGH — identified by reading actual code paths that will be touched

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable codebase, no external dependencies)
