# Phase 1: Types Foundation - Research

**Researched:** 2026-03-12
**Domain:** TypeScript type definitions — extending `src/engine/types.ts` with five new interface clusters
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Skills Type Shape**

- Flat `Record<SkillId, SkillRecord>` map keyed by skill ID for O(1) lookup during XP updates in advanceTime()
- `SkillId` is a union type of all 19 skill string literals (11 hard + 8 soft, context-specific skills are tags on existing skills, not a separate category)
- `SkillRecord` has: `id: SkillId`, `name: string`, `category: 'hard' | 'soft'`, `xp: number` (0-1000), `level: number` (1-5 derived from XP thresholds), `contextTags: SkillContext[]` (e.g. 'seed', 'growth')
- `SkillContext` union type: `'seed' | 'growth' | 'buyout' | 'deep_tech' | 'consumer' | 'enterprise'`
- Career title derived from aggregate XP: `CareerTitle = 'analyst' | 'associate' | 'vp' | 'partner' | 'managing_director'`
- `PlayerProfile` interface holds: `skills: Record<SkillId, SkillRecord>`, `careerTitle: CareerTitle`, `totalXP: number`
- Skills excluded from GameSnapshot (undo never rolls back progression per SKIL-08)

**Fundraising Type Contracts**

- `LPProspect` interface: `id`, `name`, `type: LPType` ('institutional' | 'family_office' | 'hnw' | 'fund_of_funds'), `targetCommitment: number`, `status: LPCommitmentStatus`, `interestLevel: number` (0-100), `relationshipScore: number` (0-100)
- `LPCommitmentStatus = 'prospect' | 'pitched' | 'soft_circle' | 'hard_commit' | 'closed' | 'declined'`
- `FundCloseStatus = 'pre_marketing' | 'first_close' | 'interim_close' | 'final_close'`
- `FundraisingCampaign` interface: holds LP prospects array, close status, target vs committed amounts, fund terms being negotiated
- Fund II/III unlock: add `fundNumber: number` (1-3) and `nextFundUnlockTvpi: number` fields to Fund type
- `FundTermsConfig` interface: `managementFee: number`, `carry: number`, `hurdleRate: number`, `fundLife: number` (years), `gpCommitPercent: number`

**Timeline Mode Types**

- `TimelineMode = 'irl' | 'freeplay'` — stored on Fund, immutable after init
- `TimeGate` interface: `actionType: string`, `availableFromMonth: number`, `reason: string`
- `IRL_GATE_DURATIONS` constant map: action type → min/max months (seed_check: 1-2, due_diligence: 1-3, lp_close: 6-12, etc.)
- Add `timelineMode: TimelineMode` and `activeTimeGates: TimeGate[]` to Fund

**GameSnapshot Omit Strategy**

- Refactor `GameSnapshot` to: `type GameSnapshot = Omit<GameState, 'history' | 'tutorialMode' | 'tutorialStep' | 'playerProfile' | keyof GameStateActions>`
- Need a `GameStateActions` interface to separate action methods from data fields
- This means any new field added to GameState automatically appears in snapshots unless explicitly excluded
- Fields explicitly excluded: `history` (circular), `tutorialMode`/`tutorialStep` (UI state), `playerProfile` (skills never undo per SKIL-08), all action methods

**Report Generation Types**

- `ReportType = 'portfolio_summary' | 'deal_memo' | 'lp_update' | 'market_analysis'`
- `ReportStatus = 'idle' | 'generating' | 'streaming' | 'complete' | 'error'`
- `ReportGenerationResult` interface: `id: string`, `type: ReportType`, `status: ReportStatus`, `content: string` (accumulated text), `createdAt: number`, `error?: string`
- `ReportRequest` interface: input params per report type (companyId for deal memo, sector for market analysis, etc.)
- `ReportHistory` — array of `ReportGenerationResult` for past reports, stored in GameState (excluded from GameSnapshot)

**Interaction Feedback Types**

- `TickSummaryItem` interface: `category: 'portfolio' | 'market' | 'lp' | 'fund'`, `description: string`, `impact: 'positive' | 'negative' | 'neutral'`, `delta?: number`
- `TickSummary` interface: `month: number`, `items: TickSummaryItem[]` — returned by advanceTime for UI consumption
- `ActionPreview` interface: `actionType: string`, `effects: { metric: string, before: number, after: number, direction: 'up' | 'down' | 'neutral' }[]` — for outcome preview tooltips
- These are lightweight types; the actual animation/tooltip implementation is Phase 6

### Claude's Discretion

- Exact XP thresholds for each skill level (1-5)
- Career title threshold values
- Whether to use branded union types or plain strings for action identifiers in TimeGate
- Internal organization/ordering of new sections within types.ts

### Deferred Ideas (OUT OF SCOPE)

- LP archetype system with behavioral differences (FUND-V2-01) — v2
- Skill-based action unlocks (SKIL-V2-01) — v2
- Report template customization (REPT-V2-02) — v2
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                  | Research Support                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| FOUND-01 | All new types added to `src/engine/types.ts` in a single batch (types-first pattern)         | Existing file structure, section patterns, and all five interface clusters are fully documented below              |
| FOUND-02 | `GameSnapshot` refactored to `Omit<GameState, ...>` alias to prevent undo bugs on new fields | `GameStateActions` interface pattern and exact Omit key list documented below; `captureSnapshot()` impact analyzed |

</phase_requirements>

---

## Summary

Phase 1 is a pure types-only edit to a single file: `src/engine/types.ts`. No logic, no React, no store mutation. The work divides into two deliverables: (1) add five new interface clusters covering Skills, Fundraising, Timeline, Reports, and Feedback; (2) refactor the existing hand-written `GameSnapshot` literal type into an `Omit<GameState, ...>` alias that self-updates as `GameState` grows.

The file already has 776 lines of well-structured types using a consistent style (section headers, inline range comments, PascalCase, union types at top). The new additions follow the same patterns and can be inserted into existing or new named sections. The current `GameSnapshot` is a manually-maintained 31-field type that will drift every time `GameState` gains a new data field — the Omit refactor fixes this structurally.

The key complication in FOUND-02 is that `GameState` currently mixes data fields and action methods in one interface. The Omit must exclude all method keys. The cleanest approach is to define a `GameStateActions` interface containing exactly the method signatures, then use `keyof GameStateActions` in the Omit expression. This keeps the exclusion list maintainable and explicit.

**Primary recommendation:** Add all types top-to-bottom in one diff to types.ts following the existing style, then replace the `GameSnapshot` literal with the Omit alias. No other files change in this phase.

---

## Standard Stack

This phase uses only TypeScript language features — no new library dependencies.

### Core

| Feature                | TypeScript Syntax            | Purpose                              | Why This Approach                                                  |
| ---------------------- | ---------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| Union type aliases     | `export type X = 'a' \| 'b'` | Enumerates valid string values       | Matches existing pattern throughout types.ts                       |
| Interface declarations | `export interface X { ... }` | Named object shapes                  | Matches existing pattern                                           |
| Record utility type    | `Record<K, V>`               | O(1) keyed maps                      | Needed for `skills: Record<SkillId, SkillRecord>` on PlayerProfile |
| Omit utility type      | `Omit<T, 'key1' \| 'key2'>`  | Derives snapshot type from GameState | Removes need to manually list ~30 snapshot fields                  |
| keyof operator         | `keyof GameStateActions`     | Generates union of method names      | Lets Omit exclude all action keys without listing each one         |
| Optional fields        | `field?: Type`               | Fields present only in some states   | Used for `error?: string` on ReportGenerationResult                |

### No New Dependencies

This phase requires zero new npm packages. All constructs are native TypeScript 5.x, which is already installed.

---

## Architecture Patterns

### Existing File Structure (must preserve)

```
src/engine/types.ts
├── // ============ ENUMS ============         (union type aliases)
├── // ============ CORE ENTITIES ============
├── // ============ FUND & LP ============
├── // ============ INCUBATOR & LAB ============
├── // ============ NEWS ============
├── // ============ PENDING DECISIONS ============
├── // ============ ANALYTICS ============
│   └── GameSnapshot (currently a literal type — becomes Omit alias)
├── // ============ GAME STATE (Zustand Store Shape) ============
│   └── GameState interface
└── // ============ REAL ECONOMY ============
    // ============ SAVE SLOTS ============
    // ============ LEADERBOARD ============
```

New sections to insert (locations matter for readability):

- `// ============ SKILLS ============` — after `// ============ FUND & LP ============`
- `// ============ FUNDRAISING ============` — after SKILLS section
- `// ============ TIMELINE ============` — after FUNDRAISING section
- `// ============ REPORTS ============` — after ANALYTICS section (near GameSnapshot)
- `// ============ FEEDBACK ============` — after REPORTS section
- `GameStateActions` interface — immediately before `GameState` interface

### Pattern 1: Union Type at Top, Interface Below

**What:** New string-literal union types (e.g., `SkillId`, `LPCommitmentStatus`) go in the `// ============ ENUMS ============` block at the top of the file. The corresponding interfaces (`SkillRecord`, `LPProspect`) go in the dedicated section further down.
**When to use:** Every new type in this file.
**Example:**

```typescript
// In ENUMS block:
export type SkillId =
  | "deal_sourcing"
  | "due_diligence"
  | "valuation"
  | "portfolio_support"
  | "board_governance"
  | "fundraising_gp"
  | "risk_management"
  | "thesis_development"
  | "network_building"
  | "exit_strategy"
  | "financial_modeling"
  | "founder_coaching"
  | "conflict_resolution"
  | "strategic_comms"
  | "team_dynamics"
  | "pattern_recognition"
  | "market_intuition"
  | "relationship_building"
  | "negotiation";

export type CareerTitle =
  | "analyst"
  | "associate"
  | "vp"
  | "partner"
  | "managing_director";

export type SkillContext =
  | "seed"
  | "growth"
  | "buyout"
  | "deep_tech"
  | "consumer"
  | "enterprise";

// In SKILLS section:
export interface SkillRecord {
  id: SkillId;
  name: string;
  category: "hard" | "soft";
  xp: number; // 0-1000
  level: number; // 1-5 derived from XP thresholds
  contextTags: SkillContext[];
}

export interface PlayerProfile {
  skills: Record<SkillId, SkillRecord>;
  careerTitle: CareerTitle;
  totalXP: number;
}
```

### Pattern 2: Omit + GameStateActions for GameSnapshot

**What:** Extract all Zustand action methods into a `GameStateActions` interface, then define `GameSnapshot` as `Omit<GameState, 'history' | 'tutorialMode' | 'tutorialStep' | 'playerProfile' | 'reportHistory' | keyof GameStateActions>`.
**When to use:** Required for FOUND-02. Solves the structural drift problem.
**Example:**

```typescript
// Immediately before GameState interface:
export interface GameStateActions {
  initFund: GameState["initFund"];
  advanceTime: GameState["advanceTime"];
  undoAdvance: GameState["undoAdvance"];
  setTutorialStep: GameState["setTutorialStep"];
  completeTutorial: GameState["completeTutorial"];
  invest: GameState["invest"];
  passOnDeal: GameState["passOnDeal"];
  followOn: GameState["followOn"];
  skipFollowOn: GameState["skipFollowOn"];
  sellSecondary: GameState["sellSecondary"];
  rejectSecondary: GameState["rejectSecondary"];
  acceptBuyout: GameState["acceptBuyout"];
  rejectBuyout: GameState["rejectBuyout"];
  resolveDecision: GameState["resolveDecision"];
  performLPAction: GameState["performLPAction"];
  resolveBoardMeeting: GameState["resolveBoardMeeting"];
  hireTalent: GameState["hireTalent"];
  supportAction: GameState["supportAction"];
  launchIncubator: GameState["launchIncubator"];
  mentorIncubatorCompany: GameState["mentorIncubatorCompany"];
  graduateIncubator: GameState["graduateIncubator"];
  createLabProject: GameState["createLabProject"];
  assignLabFounder: GameState["assignLabFounder"];
  spinOutLab: GameState["spinOutLab"];
  rebirth: GameState["rebirth"];
  resetGame: GameState["resetGame"];
  setMarketEra: GameState["setMarketEra"];
  fetchLiveMarketData: GameState["fetchLiveMarketData"];
  saveToSlot: GameState["saveToSlot"];
  loadFromSlot: GameState["loadFromSlot"];
}

// Replace the existing GameSnapshot literal type with:
export type GameSnapshot = Omit<
  GameState,
  | "history"
  | "tutorialMode"
  | "tutorialStep"
  | "playerProfile"
  | "reportHistory"
  | keyof GameStateActions
>;
```

**Critical note:** `GameStateActions` must reference `GameState`'s existing method signatures using indexed access (`GameState["methodName"]`), not redefine them. This avoids circular drift between the two.

**Impact on captureSnapshot():** The `captureSnapshot()` function in gameState.ts currently returns `GameSnapshot` by building an explicit object literal. After the Omit refactor, `GameSnapshot` is a derived type — `captureSnapshot()` can return a deep-clone of the full state minus the excluded keys. The implementation in gameState.ts does NOT change in Phase 1; only the type definition changes. The function will continue to compile because the object it returns is assignable to the new `GameSnapshot` type (it already excludes actions, history, tutorial fields).

### Pattern 3: Inline Range Comments

**What:** All numeric fields with constrained ranges get an inline comment documenting the range.
**When to use:** Every numeric field that has a meaningful domain.
**Example:**

```typescript
export interface SkillRecord {
  xp: number; // 0-1000
  level: number; // 1-5
}

export interface LPProspect {
  interestLevel: number; // 0-100
  relationshipScore: number; // 0-100
}
```

### Anti-Patterns to Avoid

- **Redefining method signatures in GameStateActions:** Copy method types from GameState using indexed access, never rewrite them. Rewriting creates a second source of truth that drifts.
- **Adding logic to types.ts:** File comment says "NO logic in this file." Constants like `IRL_GATE_DURATIONS` are data (not behavior) — if stored here, keep them as typed constant objects, not functions. Alternatively, move constants to their implementation file in Phase 3.
- **Putting new enums in the interface section:** All union type aliases belong in the ENUMS block at the top, even if added alongside a new interface section below.
- **Making GameSnapshot a class or interface:** It must remain a `type` alias (not `interface`) to support the Omit utility type syntax.

---

## Don't Hand-Roll

| Problem                           | Don't Build               | Use Instead                                  | Why                                                             |
| --------------------------------- | ------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| Excluding multiple GameState keys | Manual list of 30+ fields | `keyof GameStateActions` in Omit expression  | Manual list drifts silently when new actions are added          |
| Constraining numeric ranges       | Custom guard types        | Inline comments + validation in engine logic | TypeScript nominal typing adds friction with no runtime benefit |
| Discriminated unions for status   | String comparisons        | Literal union types assigned to fields       | TypeScript already narrows literals in `if`/`switch`            |

---

## Common Pitfalls

### Pitfall 1: GameStateActions Circular Reference Risk

**What goes wrong:** `GameStateActions` references `GameState` method signatures, and `GameState` currently embeds those methods. If you define `GameStateActions` after `GameState`, the indexed access works. If you define it before, you get a forward-reference error.
**Why it happens:** TypeScript interfaces can forward-reference in most cases, but indexed access types (`GameState["method"]`) require the referenced type to be resolvable at the point of use in some complex scenarios.
**How to avoid:** Define `GameStateActions` immediately before `GameState` (not after). Use `GameState["methodName"]` indexed access rather than copying signatures.
**Warning signs:** TypeScript error "Type 'X' is referenced before it is declared" or "Property 'Y' does not exist on type 'GameState'".

### Pitfall 2: noUnusedLocals With New Types

**What goes wrong:** Adding new type aliases (e.g., `SkillId`, `LPCommitmentStatus`) that are not yet imported anywhere causes `noUnusedLocals`-equivalent errors at the consumer level, but in types.ts itself they are only exported — so they won't cause errors in Phase 1 as long as they are `export`ed.
**Why it happens:** `strict: true` + `noUnusedLocals: true` in tsconfig.app.json.
**How to avoid:** Export every new type. Types used only in later phases (e.g., `TickSummary` used in Phase 6) are fine — they're exported definitions, not unused locals.
**Warning signs:** Any `tsc -b` error referencing "is declared but never used" in types.ts (should not happen if all are exported).

### Pitfall 3: GameSnapshot Field List vs. Omit Derivation Mismatch

**What goes wrong:** The existing `captureSnapshot()` function in gameState.ts explicitly builds an object literal with 31 named fields. After switching `GameSnapshot` to an Omit alias, if `GameState` gains new data fields (e.g., `playerProfile`, `reportHistory`), `captureSnapshot()` won't include them unless explicitly added — the type change alone doesn't fix the runtime behavior.
**Why it happens:** The Omit change fixes the type contract (Phase 1's goal), but `captureSnapshot()` is an implementation concern (later phases update this as they add fields).
**How to avoid:** Phase 1 only changes the type. The planner should note that each subsequent phase that adds a GameState data field must also update `captureSnapshot()` to include it (unless excluded).
**Warning signs:** Runtime undo restoring a `null` or stale value for a new field.

### Pitfall 4: IRL_GATE_DURATIONS Constant Placement

**What goes wrong:** CONTEXT.md mentions `IRL_GATE_DURATIONS` as a "constant map" in the Timeline types. If placed in types.ts, it is value-level code (a const object), not a type. The file banner says "NO logic in this file. Types and interfaces only."
**Why it happens:** Confusion between type-level and value-level constructs.
**How to avoid:** Keep `IRL_GATE_DURATIONS` out of types.ts. Only define the `TimeGate` interface and `TimelineMode` union here. The constant itself belongs in the Phase 3 implementation file (e.g., `timelineGates.ts`). The type for the constant can be defined in types.ts: `export type IrlGateDurations = Record<string, { min: number; max: number }>`.
**Warning signs:** TypeScript treating a `const` declaration in types.ts as a type-checking anomaly; no runtime error but violates project convention.

### Pitfall 5: FundraisingCampaign on Fund vs. as Separate GameState Field

**What goes wrong:** If `FundraisingCampaign` is embedded inside `Fund`, it becomes part of every snapshot and persist cycle. But fundraising state is campaign-scoped — it resets when a new fund starts.
**Why it happens:** Natural to put fundraising data "on the fund" because it's fund-related.
**How to avoid:** Define `FundraisingCampaign` as a top-level `GameState` field (`activeCampaign: FundraisingCampaign | null`), not nested in `Fund`. Fund gets `fundNumber` and `nextFundUnlockTvpi` as simple scalar fields per CONTEXT.md decisions.
**Warning signs:** Unclear ownership — if you see `fund.campaign.prospects`, refactor before proceeding.

---

## Code Examples

Verified patterns from the existing codebase:

### Fundraising Types

```typescript
// Source: CONTEXT.md decisions (verified against existing LPActionType pattern in types.ts)

export type LPType =
  | "institutional"
  | "family_office"
  | "hnw"
  | "fund_of_funds";

export type LPCommitmentStatus =
  | "prospect"
  | "pitched"
  | "soft_circle"
  | "hard_commit"
  | "closed"
  | "declined";

export type FundCloseStatus =
  | "pre_marketing"
  | "first_close"
  | "interim_close"
  | "final_close";

export interface LPProspect {
  id: string;
  name: string;
  type: LPType;
  targetCommitment: number;
  status: LPCommitmentStatus;
  interestLevel: number; // 0-100
  relationshipScore: number; // 0-100
}

export interface FundTermsConfig {
  managementFee: number; // e.g. 0.02 = 2%
  carry: number; // e.g. 0.20 = 20%
  hurdleRate: number; // e.g. 0.08 = 8%
  fundLife: number; // years (e.g. 10)
  gpCommitPercent: number; // e.g. 0.01 = 1%
}

export interface FundraisingCampaign {
  id: string;
  fundNumber: number; // 1-3
  prospects: LPProspect[];
  closeStatus: FundCloseStatus;
  targetAmount: number;
  committedAmount: number;
  calledAmount: number;
  terms: FundTermsConfig;
  launchedMonth: number;
  closedMonth?: number;
}
```

### Timeline Types

```typescript
// Source: CONTEXT.md decisions

export type TimelineMode = "irl" | "freeplay";

export interface TimeGate {
  actionType: string; // e.g. "seed_check", "due_diligence"
  availableFromMonth: number; // absolute game month when gate lifts
  reason: string; // human-readable delay explanation
}

// Note: IRL_GATE_DURATIONS constant belongs in Phase 3 implementation files,
// not here. Only the type belongs here:
export type IrlGateDuration = { min: number; max: number };
export type IrlGateDurations = Record<string, IrlGateDuration>;
```

### Report Types

```typescript
// Source: CONTEXT.md decisions

export type ReportType =
  | "portfolio_summary"
  | "deal_memo"
  | "lp_update"
  | "market_analysis";

export type ReportStatus =
  | "idle"
  | "generating"
  | "streaming"
  | "complete"
  | "error";

export interface ReportGenerationResult {
  id: string;
  type: ReportType;
  status: ReportStatus;
  content: string; // accumulated text (empty until complete)
  createdAt: number; // Unix timestamp ms
  error?: string; // set only on status === 'error'
}

export interface ReportRequest {
  type: ReportType;
  companyId?: string; // for deal_memo
  sector?: string; // for market_analysis
}
```

### Feedback Types

```typescript
// Source: CONTEXT.md decisions

export interface TickSummaryItem {
  category: "portfolio" | "market" | "lp" | "fund";
  description: string;
  impact: "positive" | "negative" | "neutral";
  delta?: number; // optional numeric change for display
}

export interface TickSummary {
  month: number;
  items: TickSummaryItem[];
}

export interface ActionPreviewEffect {
  metric: string;
  before: number;
  after: number;
  direction: "up" | "down" | "neutral";
}

export interface ActionPreview {
  actionType: string;
  effects: ActionPreviewEffect[];
}
```

### GameState New Fields to Add

```typescript
// These additions to GameState interface are required to make the new types usable:
// (add inside GameState interface in the GAME STATE section)

// Skills
playerProfile: PlayerProfile;

// Fundraising
activeCampaign: FundraisingCampaign | null;

// Reports
reportHistory: ReportGenerationResult[];

// (activeTimeGates lives on Fund, not GameState directly)
```

### Fund Interface New Fields to Add

```typescript
// Add to existing Fund interface:

// Timeline Mode (v4.0)
timelineMode: TimelineMode;
activeTimeGates: TimeGate[];

// Fund Series (v4.0)
fundNumber: number;               // 1-3
nextFundUnlockTvpi: number;       // TVPI threshold to unlock next fund
```

---

## State of the Art

| Old Approach                                       | Current Approach                           | Impact                                                                           |
| -------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| Manual `GameSnapshot` listing 31 fields explicitly | `Omit<GameState, excluded keys>` alias     | New GameState fields auto-appear in snapshots; zero maintenance                  |
| `GameState` mixing data + action methods           | `GameStateActions` interface + data fields | `keyof GameStateActions` enables the Omit; also documents the action API surface |

**Deprecated/outdated in this phase:**

- The hand-written `GameSnapshot` type literal at line 546-576 of types.ts. Replaced by the Omit alias.

---

## Open Questions

1. **XP thresholds for skill levels 1-5**
   - What we know: `xp: number` field is 0-1000; `level: number` is 1-5 (derived)
   - What's unclear: The exact XP breakpoints (e.g., level 1 = 0-199, level 2 = 200-399, etc.)
   - Recommendation: This is Claude's discretion. Use a simple linear 200-XP-per-level scheme (0, 200, 400, 600, 800 = levels 1-5). Document as named constants in Phase 5 implementation. Phase 1 does not need the constants — only the types.

2. **Career title XP thresholds**
   - What we know: `CareerTitle` progresses analyst → associate → vp → partner → managing_director; driven by `totalXP` on `PlayerProfile`
   - What's unclear: Numeric thresholds
   - Recommendation: This is Claude's discretion. Use milestone thresholds that feel earnable in one playthrough (e.g., MD requires ~4000 total XP = roughly 20 major actions over 120 months). Phase 1 needs only the type; thresholds defined as constants in Phase 5.

3. **actionType field type in TimeGate**
   - What we know: CONTEXT.md says "whether to use branded union types or plain strings" is Claude's discretion
   - Recommendation: Use plain `string` for `actionType` in `TimeGate`. The gate durations map is keyed by strings and the gating logic in Phase 3 will use string matching. Branded types add marginal safety for no practical benefit in this domain.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| Framework          | Vitest 4.0.18                                                       |
| Config file        | `vite.config.ts` (test block: `globals: true, environment: "node"`) |
| Quick run command  | `npx vitest run src/engine/gameState.test.ts`                       |
| Full suite command | `npm test`                                                          |

### Phase Requirements → Test Map

| Req ID   | Behavior                                                                         | Test Type     | Automated Command                                           | File Exists?          |
| -------- | -------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------- | --------------------- |
| FOUND-01 | All new types compile without errors                                             | compile-check | `npx tsc -b --noEmit`                                       | N/A (not a test file) |
| FOUND-02 | `GameSnapshot` is an Omit alias; new GameState fields appear in it automatically | type-check    | `npx tsc -b --noEmit`                                       | N/A                   |
| FOUND-02 | `captureSnapshot()` return type still assignable to `GameSnapshot`               | compile-check | `npx tsc -b --noEmit` (catches type errors in gameState.ts) | ✅ existing file      |

**Note:** Phase 1 is entirely type-level. All correctness verification is via `tsc -b --noEmit`. No behavioral tests are needed — types cannot be tested with unit tests; they are verified by the compiler.

The existing `src/engine/gameState.test.ts` covers runtime behavior of the store and will catch if the `GameSnapshot` Omit refactor accidentally breaks the `undoAdvance` action (which depends on `GameSnapshot`). Run `npm test` as the phase gate.

### Sampling Rate

- **Per task commit:** `npx tsc -b --noEmit`
- **Per wave merge:** `npx tsc -b --noEmit && npm test`
- **Phase gate:** `npm test` green (all 173+ existing tests pass) + `tsc -b --noEmit` clean

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. Phase 1 adds no new functions requiring behavioral tests; compiler is the test harness.

---

## Sources

### Primary (HIGH confidence)

- `src/engine/types.ts` — Complete read of existing 776-line file; all patterns, section headers, existing GameSnapshot literal, and GameState interface verified directly
- `src/engine/gameState.ts` — `captureSnapshot()` function at line 656-690, `partialize` at line 3178, all 30 action method signatures verified
- `tsconfig.app.json` — `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` confirmed
- `.planning/phases/01-types-foundation/01-CONTEXT.md` — All locked decisions verified verbatim
- `vite.config.ts` — Vitest configuration (globals, environment, include pattern) confirmed

### Secondary (MEDIUM confidence)

- TypeScript Handbook utility types documentation — `Omit<T, K>` and `keyof` operator behavior is stable and well-documented for TypeScript 5.x

### Tertiary (LOW confidence)

- None — all findings in this research are based on direct code inspection or stable TypeScript language features

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — pure TypeScript type syntax, verified against existing codebase patterns
- Architecture: HIGH — all patterns reverse-engineered from existing 776-line types.ts file
- Pitfalls: HIGH — identified from direct code inspection of gameState.ts captureSnapshot(), tsconfig, and project conventions

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable domain — TypeScript utility types don't change; project conventions don't change unless refactored)
