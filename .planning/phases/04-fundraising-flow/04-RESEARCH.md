# Phase 4: Fundraising Flow - Research

**Researched:** 2026-03-12
**Domain:** VC fundraising mechanics, Zustand store actions, React Router pages, fund economics
**Confidence:** HIGH

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                              | Research Support                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| FUND-01 | User can pitch to LPs with commitment tracking (committed vs called capital distinction) | LPProspect + FundraisingCampaign types already defined in types.ts; pitchLP() action needed in store                    |
| FUND-02 | First close / final close mechanics with progress indicators                             | FundCloseStatus type exists (pre_marketing → first_close → interim_close → final_close); need advanceFundClose() action |
| FUND-03 | User can configure fund terms (management fee %, carry %, fund life years)               | FundTermsConfig interface exists; configureFundTerms() action needed; applies before final close                        |
| FUND-04 | Fund size negotiation based on LP interest and market conditions                         | Calculated from LPProspect commitments × commitmentMod from existing getLPEffects(); no new types needed                |
| FUND-05 | Progressive fund unlock — Fund II available after Fund I meets performance thresholds    | fund.nextFundUnlockTvpi and fund.fundNumber already on Fund type; canStartNextFund() pure function needed               |
| FUND-06 | Fund II/III creation resets economics counters atomically via completeFundClose()        | New store action; preserves playerProfile (skills), resets Fund economics fields                                        |
| FUND-07 | Fundraising page with dedicated UI for the LP pitching and closing flow                  | New /fundraising route + page component + NavBar entry                                                                  |

</phase_requirements>

---

## Summary

Phase 4 implements the full fundraising flow. The type contract for this phase was already established in types.ts (Phase 1's intent): `LPProspect`, `FundraisingCampaign`, `FundTermsConfig`, `LPCommitmentStatus`, and `FundCloseStatus` are all defined. The store has `activeCampaign: FundraisingCampaign | null` in `GameState`, and `Fund` carries `fundNumber` and `nextFundUnlockTvpi`. This means Phase 4 is almost entirely **engine logic + store actions + one new page** — no new types needed, no type.ts changes.

The three main work clusters are: (1) a pure `fundraising.ts` engine module with LP generation, pitch probability, and close mechanics; (2) three new Zustand actions (`launchCampaign`, `pitchLP`, `advanceFundClose`, `configureFundTerms`, `completeFundClose`); and (3) the `/fundraising` page component plus NavBar + router wiring. Fund II/III unlock is a read-only check that gates the fund setup wizard — it does not require a new store action, only a `canStartNextFund()` predicate that reads `fund.tvpiEstimate` vs `fund.nextFundUnlockTvpi`.

The one critical design decision not yet locked: **Fund II/III TVPI unlock thresholds**. STATE.md explicitly flags this: "Fund II/III TVPI thresholds not yet defined — must be set as named constants before any UI displays them." Research supports ~2.0x net TVPI as Fund II threshold (Cambridge Associates top-quartile median for seed funds) and ~2.5x for Fund III. These must be constants in the engine, not magic numbers in the UI.

**Primary recommendation:** Build `src/engine/fundraising.ts` as a pure module with all LP/campaign logic, add 5 store actions, add `/fundraising` page, wire router + NavBar.

---

## Standard Stack

### Core

| Library        | Version           | Purpose                                 | Why Standard                                           |
| -------------- | ----------------- | --------------------------------------- | ------------------------------------------------------ |
| Zustand        | Already installed | Store actions for campaign state        | All other game actions follow this pattern             |
| React Router   | Already installed | `/fundraising` route                    | All pages use `<Route>` in existing router config      |
| shadcn/ui      | Already installed | Progress bar, cards, badges, dialogs    | All UI in project uses shadcn                          |
| Recharts       | Already installed | Optional: committed vs called bar chart | Used in Charts.tsx already                             |
| tw-animate-css | Already installed | Status badge transitions                | Phase 6 will build on this; Phase 4 should leave hooks |

### No New Dependencies

This phase requires zero new npm packages. All needed libraries are already installed.

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Structure

```
src/engine/fundraising.ts        # Pure engine module — LP generation, pitch logic, close mechanics
src/engine/fundraising.test.ts   # Unit tests for all pure functions
src/pages/Fundraising.tsx        # /fundraising page component
```

Changes to existing files:

- `src/engine/gameState.ts` — add 5 store actions
- `src/components/NavBar.tsx` — add /fundraising link
- `src/main.tsx` (or router file) — add Route
- `src/pages/Index.tsx` — Fund II/III lock check in fund setup wizard

### Pattern 1: Pure Engine Module (fundraising.ts)

**What:** All LP/campaign business logic as pure functions with no React imports, following the existing pattern of lpSentiment.ts and timelineGates.ts.

**When to use:** Any logic that can be tested without the store — LP generation, pitch probability, close advancement, TVPI threshold check.

**Example:**

```typescript
// src/engine/fundraising.ts

// Named constants — never magic numbers
export const FUND_II_TVPI_THRESHOLD = 2.0;  // top-quartile seed fund median
export const FUND_III_TVPI_THRESHOLD = 2.5; // strong performer required for Fund III
export const DEFAULT_FUND_TERMS: FundTermsConfig = {
  managementFee: 0.02,
  carry: 0.20,
  hurdleRate: 0.08,
  fundLife: 10,
  gpCommitPercent: 0.01,
};

export function generateLPProspects(
  fundNumber: number,
  fundSize: number,
  lpSentimentScore: number,
): LPProspect[] { ... }

export function calculatePitchOutcome(
  prospect: LPProspect,
  lpSentimentScore: number,
  marketCycle: MarketCycle,
): { newStatus: LPCommitmentStatus; message: string } { ... }

export function calculateTotalCommitted(prospects: LPProspect[]): number { ... }

export function canStartNextFund(fund: Fund): boolean {
  return fund.tvpiEstimate >= fund.nextFundUnlockTvpi;
}

export function getFirstCloseThreshold(targetAmount: number): number {
  return Math.round(targetAmount * 0.5); // 50% = first close
}

export function getFinalCloseThreshold(targetAmount: number): number {
  return targetAmount; // 100% = final close (or manager discretion to close below)
}
```

### Pattern 2: Store Actions Follow Existing Shape

**What:** All 5 new actions follow the exact signature pattern already in `GameStateActions` — they read from `get()`, produce the new state, call `set()`, and return a result object.

**When to use:** Every store mutation in this phase.

**Example shape (from existing performLPAction):**

```typescript
// Pattern from existing code — all new actions should match
pitchLP: (prospectId: string) => {
  success: boolean;
  reason?: string;
  newStatus?: LPCommitmentStatus;
}

launchCampaign: (terms: FundTermsConfig) => void;

advanceFundClose: () => {
  newCloseStatus: FundCloseStatus;
  committed: number;
}

configureFundTerms: (terms: Partial<FundTermsConfig>) => {
  success: boolean;
  reason?: string;
}

completeFundClose: () => void;  // atomic reset — resets economics, preserves skills
```

### Pattern 3: completeFundClose() Atomic Reset

**What:** `completeFundClose()` must atomically reset all fund economics counters to zero — `totalFeesCharged`, `carryAccrued`, `totalDistributions`, `gpEarnings`, `deployed`, `cashAvailable` — while explicitly preserving `playerProfile` (skills) and `rebirthCount`/`skillLevel`. It should increment `fundNumber` and transition `gamePhase` back to `"setup"` so the fund setup wizard re-runs.

**Critical constraint:** `activeCampaign` is already in `captureSnapshot()` (line 746 of gameState.ts), meaning it IS included in undo history. This is correct — pitching an LP and seeing it rejected should be undoable. However, `completeFundClose()` should push a snapshot BEFORE wiping state (same pattern as `advanceTime()` pushing to `history`).

**Example:**

```typescript
completeFundClose: () => {
  const state = get();
  if (!state.fund || !state.activeCampaign) return;

  const skillLevel = state.fund.skillLevel + 1; // skills carry forward
  const rebirthCount = state.fund.rebirthCount + 1;
  const nextFundNumber = state.fund.fundNumber + 1;

  set({
    fund: {
      skillLevel,
      rebirthCount,
      fundNumber: nextFundNumber,
    } as unknown as Fund,
    gamePhase: "setup",
    portfolio: [],
    dealPipeline: [],
    activeCampaign: null,
    // reset economics — same fields as initFund zeros them
    // playerProfile is NOT in this set() — it persists implicitly
  });
};
```

### Pattern 4: Fund II/III Unlock Gate in Index.tsx

**What:** The fund setup wizard (Index.tsx) reads `fund.tvpiEstimate` and `fund.nextFundUnlockTvpi` before showing Fund II/III as selectable. This is a READ-ONLY check, not a store action.

**When to use:** In the fund setup wizard, when the user reaches the fund naming/configuration step after a rebirth/completeFundClose.

**Example:**

```typescript
// In Index.tsx — fund number selector
const currentFund = useGameStore((s) => s.fund);
const nextFundNumber = (currentFund?.fundNumber ?? 0) + 1;
const canUnlockFundII = canStartNextFund(currentFund); // pure function from fundraising.ts
// Show "Fund II" option only if canUnlockFundII === true
```

### Pattern 5: /fundraising Page Layout

**What:** The page has three sections — (1) campaign status header with target/committed/called progress, (2) LP prospects table showing each LP's status and actions, (3) fund terms panel (editable before final close, read-only after).

**When to use:** Rendered at `/fundraising` route, only accessible after `gamePhase === "playing"` (same guard as other pages).

**Structural breakdown:**

```tsx
<PageShell title="Fundraising">
  {/* Section 1: Campaign Overview */}
  <CampaignStatusCard campaign={activeCampaign} /> // progress bar, close status
  badge
  {/* Section 2: LP Prospects */}
  <LPProspectsList
    prospects={activeCampaign.prospects}
    onPitch={(id) => pitchLP(id)}
  />
  {/* Section 3: Fund Terms */}
  <FundTermsPanel
    terms={activeCampaign.terms}
    locked={activeCampaign.closeStatus === "final_close"}
    onSave={(t) => configureFundTerms(t)}
  />
  {/* Section 4: Close Actions */}
  {canAdvanceClose && (
    <Button onClick={advanceFundClose}>Advance to Next Close</Button>
  )}
  {canFinalClose && <Button onClick={completeFundClose}>Close Fund</Button>}
</PageShell>
```

### Anti-Patterns to Avoid

- **Duplicating FundTermsConfig fields on Fund:** `Fund` already has `managementFeeRate`, `carryRate`, `hurdleRate`, `gpCommit`. `FundTermsConfig` in `FundraisingCampaign.terms` is the staging area; `completeFundClose()` copies terms → Fund fields before resetting.
- **LP archetypes system:** V2 requirement (FUND-V2-01). Do NOT build LP archetype behavior, reputation tracking, or institutional preference logic. LPProspect has `type: LPType` field only for display.
- **Storing campaign in localStorage via persist:** `activeCampaign` is already in the Zustand store which persists via `persist` middleware. It is included in `captureSnapshot()` (verified in gameState.ts line 746). No special handling needed.
- **Blocking completeFundClose() with the undo mechanism:** `completeFundClose()` is a terminal action (like `rebirth()`). It should NOT be undoable — clear `history: []` when calling it, or skip pushing snapshot.
- **Fund size negotiation as a separate negotiation "loop":** FUND-04 is fund size based on LP interest × market conditions. This is a computed value shown as a suggestion in the UI, not a turn-based negotiation minigame. Keep it as a pure `calculateNegotiatedFundSize(prospects, marketCycle, lpSentiment)` function.

---

## Don't Hand-Roll

| Problem                         | Don't Build         | Use Instead                                                   | Why                                    |
| ------------------------------- | ------------------- | ------------------------------------------------------------- | -------------------------------------- |
| Progress bar toward fund target | Custom CSS bar      | shadcn Progress component                                     | Already used in Onboarding.tsx         |
| LP commitment state machine     | Custom reducer      | Simple `LPCommitmentStatus` enum transitions in pure function | The type already defines all states    |
| Fund terms form                 | Custom form         | shadcn Input + Slider                                         | Slider already used in InvestModal.tsx |
| Status badges                   | Custom styled divs  | shadcn Badge with color variants                              | Used throughout DealCard, Portfolio    |
| Toast on pitch result           | Custom notification | sonner `toast()`                                              | Used in all existing action handlers   |
| Committed vs called capital bar | Custom SVG          | Recharts BarChart or simple Progress stack                    | Charts.tsx has the Recharts setup      |

**Key insight:** Every UI pattern in this phase already appears somewhere in the codebase. The fundraising page is a composition of DealCard-style status display + InvestModal-style slider form + Reports-style full-page layout.

---

## Common Pitfalls

### Pitfall 1: Forgetting activeCampaign in GameSnapshot

**What goes wrong:** If a new field is added to `FundraisingCampaign` after this phase and `captureSnapshot()` is not updated, undo will silently revert to stale campaign state.
**Why it happens:** `captureSnapshot()` in gameState.ts is a manual field list (lines 714-749), not a spread. It currently includes `activeCampaign` (line 746).
**How to avoid:** Verify `captureSnapshot()` includes `activeCampaign` — it already does. Any new top-level GameState fields added in this phase must also be added to `captureSnapshot()`.
**Warning signs:** Undo reverts portfolio but LP commitment status stays at "hard_commit" after undo.

### Pitfall 2: Economics Reset Leaves Stale calledAmount

**What goes wrong:** `completeFundClose()` resets `fund.deployed` and `fund.cashAvailable` but `activeCampaign.calledAmount` still shows a non-zero value when the next campaign starts.
**Why it happens:** `activeCampaign` is set to `null` in `completeFundClose()`, so it's not an issue — the old campaign disappears. The NEW campaign's `calledAmount` starts at 0. But if `launchCampaign()` accidentally carries `calledAmount` from a previous campaign, it will show stale data.
**How to avoid:** `launchCampaign()` always creates a fresh `FundraisingCampaign` with `committedAmount: 0, calledAmount: 0`.
**Warning signs:** Fund I shows $50M called after launching Fund II campaign.

### Pitfall 3: Fund Terms Applied Too Early

**What goes wrong:** Player configures fund terms (fee 2.5%, carry 25%) before final close, but the game is already deducting management fees monthly using the old rate.
**Why it happens:** `advanceTime()` reads `fund.managementFeeRate` directly. If terms aren't applied to `fund` until `completeFundClose()`, the live fee calculation uses stale values.
**How to avoid:** `configureFundTerms()` must update BOTH `activeCampaign.terms` AND the corresponding `fund.*` fields atomically. Define clearly: terms take effect immediately when configured (not at close).
**Warning signs:** Dashboard shows 2% mgmt fee but player set 2.5%.

### Pitfall 4: nextFundUnlockTvpi Displayed Before Fund Ends

**What goes wrong:** A Fund II unlock badge appears on the dashboard mid-game when TVPI crosses 2.0x, confusing the player (Fund I is still running).
**Why it happens:** `canStartNextFund()` returns `true` any time TVPI >= threshold, not just after `gamePhase === "ended"`.
**How to avoid:** Fund II/III availability check must also require `gamePhase === "ended"` OR be surfaced only in the fund setup wizard (post-rebirth/completeFundClose), not during active play.
**Warning signs:** "Start Fund II" button appears on dashboard mid-game.

### Pitfall 5: IRL Mode Gate on LP Pitching

**What goes wrong:** In IRL mode, pitching an LP should be gated (lp_close: 6-12 months), but the gate fires once for the entire close, not per LP.
**Why it happens:** `openTimeGate()` in timelineGates.ts operates per `actionType`. If `actionType = "lp_pitch"` is used per-LP, each pitch opens a separate gate. The intent is that the CLOSE PROCESS takes 6-12 months total, not each individual pitch.
**How to avoid:** Use a single `"fundraising_close"` gate on `launchCampaign()` (not on each `pitchLP()` call). Individual LP pitches are non-gated interactions within the campaign. The gate lifts when the close is available.
**Warning signs:** Player pitches 10 LPs and each one shows "available in 8 months."

### Pitfall 6: Test Suite Existing Failure

**What goes wrong:** Current test run shows 1 failing test: `zombie_fund scenario seeds and completes` — `RangeError: Invalid string length` in `captureSnapshot()`. This is a pre-existing bug unrelated to Phase 4.
**Why it happens:** The zombie_fund scenario generates a very large portfolio that causes `JSON.stringify()` to exceed string length limits.
**How to avoid:** Do not fix this bug in Phase 4 (it's out of scope). New tests for fundraising.ts should use `resetStore()` + `initDefaultFund()` pattern from gameState.test.ts. Phase 4's test count baseline is 201 passing (not 202).
**Warning signs:** Phase 4 tests mistakenly try to fix the zombie_fund failure and introduce regressions.

---

## Code Examples

### Existing Pattern: LP Pitch → Status Transition

The `LPCommitmentStatus` enum already defines the full state machine:

```
prospect → pitched → soft_circle → hard_commit → closed
                                                ↘ declined
```

Each `pitchLP()` call advances status by one step. The transition probability depends on `interestLevel`, `relationshipScore`, and market conditions. Declined is a terminal state for that prospect.

### Existing Pattern: commitmentMod from LP Sentiment

```typescript
// From lpSentiment.ts — getLPEffects() already exists
const effects = getLPEffects(state.lpSentiment);
// effects.commitmentMod: 0.7 to 1.3 based on LP sentiment score
// Apply to LP interestLevel when calculating pitch success probability
const adjustedInterest = prospect.interestLevel * effects.commitmentMod;
```

### Existing Pattern: Slider for Fund Terms (from InvestModal.tsx)

```tsx
// InvestModal.tsx pattern — replicate for fund terms
<Slider
  min={1}
  max={3}
  step={0.25}
  value={[managementFee * 100]}
  onValueChange={([v]) => setManagementFee(v / 100)}
/>
```

### Existing Pattern: Store Action Returning Result Object

```typescript
// From gameState.ts — performLPAction pattern
performLPAction: (actionType, params) => {
  const state = get();
  const effect = calculateLPActionEffect(...);
  if (!effect.canPerform) return { success: false, reason: effect.reason };
  set((s) => ({ /* mutate state */ }));
  return { success: true, sentimentGain: effect.sentimentDelta };
}
```

### Existing Pattern: t() Wrapper for UI Strings

```typescript
// All new user-facing strings must use t()
t("Fundraising.pitch_lp", "Pitch LP");
t("Fundraising.first_close", "First Close");
t("Fundraising.final_close", "Final Close");
t("Fundraising.committed_capital", "Committed Capital");
```

---

## State of the Art

| Old Approach                                  | Current Approach                              | When Changed  | Impact                                                                                             |
| --------------------------------------------- | --------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| rebirth() as only fund progression            | completeFundClose() + rebirth()               | Phase 4 (new) | Rebirth stays as "start over" for lost funds; completeFundClose() is the "success" path to Fund II |
| Fund economics defaults hardcoded in initFund | Configurable via FundTermsConfig before close | Phase 4 (new) | Player decisions affect economics, not just default 2/20                                           |
| activeCampaign: null always                   | activeCampaign populated during fundraising   | Phase 4 (new) | /fundraising page becomes meaningful                                                               |

**Deprecated/outdated:**

- None — Phase 4 adds new surface, does not replace existing features.

---

## Open Questions

1. **completeFundClose() vs rebirth() — are they the same path?**
   - What we know: `rebirth()` currently increments `skillLevel` and `rebirthCount`, wipes state, and goes back to setup. It's used for "end of fund / start a new one."
   - What's unclear: Should `completeFundClose()` replace `rebirth()` for the success path, or be a separate parallel path? If the player closes a new fund mid-game (early fundraising), this differs from end-of-fund rebirth.
   - Recommendation: `completeFundClose()` is a NEW action distinct from `rebirth()`. `rebirth()` is triggered from Results.tsx (end of game). `completeFundClose()` is triggered from /fundraising when the player reaches final close AND is ready to start Fund II. Both eventually reset state and go to setup, but `completeFundClose()` is triggered earlier (can happen before the 10-year fund lifecycle ends).

2. **Fund II TVPI threshold — 2.0x or fund.nextFundUnlockTvpi?**
   - What we know: `fund.nextFundUnlockTvpi` is already on the Fund type with a default of 2.0. This is the right pattern — it's configurable per scenario.
   - What's unclear: STATE.md says thresholds should be set as named constants in fundraising.ts. There's a slight tension between "named constant" and "configurable via nextFundUnlockTvpi."
   - Recommendation: Define `FUND_II_TVPI_THRESHOLD = 2.0` and `FUND_III_TVPI_THRESHOLD = 2.5` as the DEFAULT values used when `initFund()` sets `nextFundUnlockTvpi`. Scenarios can override via `fundOverrides`. The UI always reads `fund.nextFundUnlockTvpi`, never the constant directly.

3. **Does launchCampaign() require fund.gamePhase to be "playing"?**
   - What we know: Fundraising for Fund I happens implicitly (fund starts fully capitalized in the current game). Fundraising for Fund II/III would start before `initFund()` is called for the new fund.
   - What's unclear: The exact timing — does the player launch a campaign while Fund I is still running (years 8-10), or after Fund I closes?
   - Recommendation: `launchCampaign()` can be triggered any time `gamePhase === "playing"` and `activeCampaign === null`. This allows realistic late-fund fundraising. The new fund only STARTS (calls `initFund`) when `completeFundClose()` fires.

---

## Validation Architecture

### Test Framework

| Property           | Value                                        |
| ------------------ | -------------------------------------------- |
| Framework          | Vitest (already configured)                  |
| Config file        | `vite.config.ts` (test block present)        |
| Quick run command  | `npm test -- src/engine/fundraising.test.ts` |
| Full suite command | `npm test`                                   |

### Phase Requirements to Test Map

| Req ID  | Behavior                                                      | Test Type | Automated Command                            | File Exists? |
| ------- | ------------------------------------------------------------- | --------- | -------------------------------------------- | ------------ |
| FUND-01 | pitchLP() advances LPCommitmentStatus correctly               | unit      | `npm test -- src/engine/fundraising.test.ts` | Wave 0       |
| FUND-01 | pitchLP() respects commitmentMod from lpSentiment             | unit      | `npm test -- src/engine/fundraising.test.ts` | Wave 0       |
| FUND-02 | advanceFundClose() transitions FundCloseStatus                | unit      | `npm test -- src/engine/fundraising.test.ts` | Wave 0       |
| FUND-03 | configureFundTerms() updates fund.managementFeeRate           | unit      | `npm test -- src/engine/gameState.test.ts`   | Wave 0       |
| FUND-04 | calculateNegotiatedFundSize() scales with commitmentMod       | unit      | `npm test -- src/engine/fundraising.test.ts` | Wave 0       |
| FUND-05 | canStartNextFund() returns true at TVPI threshold             | unit      | `npm test -- src/engine/fundraising.test.ts` | Wave 0       |
| FUND-06 | completeFundClose() resets economics, preserves playerProfile | unit      | `npm test -- src/engine/gameState.test.ts`   | Wave 0       |
| FUND-07 | /fundraising page renders without error                       | manual    | visual inspection                            | n/a          |

### Sampling Rate

- **Per task commit:** `npm test -- src/engine/fundraising.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green (201+ passing) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/engine/fundraising.test.ts` — covers FUND-01, FUND-02, FUND-03, FUND-04, FUND-05
- [ ] `src/engine/gameState.test.ts` needs new `describe` block for completeFundClose and configureFundTerms — covers FUND-06

_(Note: existing `gameState.test.ts` exists; new tests are additions to it, not replacements)_

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `src/engine/types.ts` — confirmed all fundraising types exist
- Direct code inspection of `src/engine/gameState.ts` — confirmed store shape, initFund, rebirth, captureSnapshot
- Direct code inspection of `src/engine/lpSentiment.ts` — confirmed getLPEffects() commitmentMod
- Direct code inspection of `src/engine/timelineGates.ts` — confirmed lp_close gate duration (6-12 months)
- Direct code inspection of `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`

### Secondary (MEDIUM confidence)

- STATE.md blocker: "Fund II/III TVPI thresholds not yet defined" — design decision noted, proposed 2.0x/2.5x defaults based on Cambridge Associates benchmark data already in benchmarkData.ts

### Tertiary (LOW confidence)

- None — all findings are from direct source inspection

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — zero new dependencies, all libraries verified in package.json
- Architecture: HIGH — all types pre-exist, patterns copied directly from working code
- Pitfalls: HIGH — identified from direct code inspection (captureSnapshot manual list, rebirth pattern, test failures)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable codebase, no fast-moving external dependencies)
