# Phase 1: Types Foundation - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add all new v4.0 type contracts to `src/engine/types.ts` in a single batch and refactor `GameSnapshot` from a manually-defined type to an `Omit<GameState, ...>` alias. No implementation logic — types and interfaces only.

</domain>

<decisions>
## Implementation Decisions

### Skills Type Shape

- Flat `Record<SkillId, SkillRecord>` map keyed by skill ID for O(1) lookup during XP updates in advanceTime()
- `SkillId` is a union type of all 19 skill string literals (11 hard + 8 soft, context-specific skills are tags on existing skills, not a separate category)
- `SkillRecord` has: `id: SkillId`, `name: string`, `category: 'hard' | 'soft'`, `xp: number` (0-1000), `level: number` (1-5 derived from XP thresholds), `contextTags: SkillContext[]` (e.g. 'seed', 'growth')
- `SkillContext` union type: `'seed' | 'growth' | 'buyout' | 'deep_tech' | 'consumer' | 'enterprise'`
- Career title derived from aggregate XP: `CareerTitle = 'analyst' | 'associate' | 'vp' | 'partner' | 'managing_director'`
- `PlayerProfile` interface holds: `skills: Record<SkillId, SkillRecord>`, `careerTitle: CareerTitle`, `totalXP: number`
- Skills excluded from GameSnapshot (undo never rolls back progression per SKIL-08)

### Fundraising Type Contracts

- `LPProspect` interface: `id`, `name`, `type: LPType` ('institutional' | 'family_office' | 'hnw' | 'fund_of_funds'), `targetCommitment: number`, `status: LPCommitmentStatus`, `interestLevel: number` (0-100), `relationshipScore: number` (0-100)
- `LPCommitmentStatus = 'prospect' | 'pitched' | 'soft_circle' | 'hard_commit' | 'closed' | 'declined'`
- `FundCloseStatus = 'pre_marketing' | 'first_close' | 'interim_close' | 'final_close'`
- `FundraisingCampaign` interface: holds LP prospects array, close status, target vs committed amounts, fund terms being negotiated
- Fund II/III unlock: add `fundNumber: number` (1-3) and `nextFundUnlockTvpi: number` fields to Fund type
- `FundTermsConfig` interface: `managementFee: number`, `carry: number`, `hurdleRate: number`, `fundLife: number` (years), `gpCommitPercent: number`

### Timeline Mode Types

- `TimelineMode = 'irl' | 'freeplay'` — stored on Fund, immutable after init
- `TimeGate` interface: `actionType: string`, `availableFromMonth: number`, `reason: string`
- `IRL_GATE_DURATIONS` constant map: action type → min/max months (seed_check: 1-2, due_diligence: 1-3, lp_close: 6-12, etc.)
- Add `timelineMode: TimelineMode` and `activeTimeGates: TimeGate[]` to Fund

### GameSnapshot Omit Strategy

- Refactor `GameSnapshot` to: `type GameSnapshot = Omit<GameState, 'history' | 'tutorialMode' | 'tutorialStep' | 'playerProfile' | keyof GameStateActions>`
- Need a `GameStateActions` interface to separate action methods from data fields
- This means any new field added to GameState automatically appears in snapshots unless explicitly excluded
- Fields explicitly excluded: `history` (circular), `tutorialMode`/`tutorialStep` (UI state), `playerProfile` (skills never undo per SKIL-08), all action methods

### Report Generation Types

- `ReportType = 'portfolio_summary' | 'deal_memo' | 'lp_update' | 'market_analysis'`
- `ReportStatus = 'idle' | 'generating' | 'streaming' | 'complete' | 'error'`
- `ReportGenerationResult` interface: `id: string`, `type: ReportType`, `status: ReportStatus`, `content: string` (accumulated text), `createdAt: number`, `error?: string`
- `ReportRequest` interface: input params per report type (companyId for deal memo, sector for market analysis, etc.)
- `ReportHistory` — array of `ReportGenerationResult` for past reports, stored in GameState (excluded from GameSnapshot)

### Interaction Feedback Types

- `TickSummaryItem` interface: `category: 'portfolio' | 'market' | 'lp' | 'fund'`, `description: string`, `impact: 'positive' | 'negative' | 'neutral'`, `delta?: number`
- `TickSummary` interface: `month: number`, `items: TickSummaryItem[]` — returned by advanceTime for UI consumption
- `ActionPreview` interface: `actionType: string`, `effects: { metric: string, before: number, after: number, direction: 'up' | 'down' | 'neutral' }[]` — for outcome preview tooltips
- These are lightweight types; the actual animation/tooltip implementation is Phase 6

### Claude's Discretion

- Exact XP thresholds for each skill level (1-5)
- Career title threshold values
- Whether to use branded union types or plain strings for action identifiers in TimeGate
- Internal organization/ordering of new sections within types.ts

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `types.ts` already has 40+ interfaces following consistent patterns (PascalCase, inline comments for ranges)
- Existing union type aliases use string literals (e.g., `FundType`, `MarketCycle`)
- `Fund` interface already has fund economics fields — fundraising fields extend naturally

### Established Patterns

- Union types defined at top of file, interfaces below
- Inline comments for value ranges: `grit: number; // 1-10`
- Section headers: `// ============ SECTION NAME ============`
- No JSDoc — inline comments only
- `GameState` mixes data fields and action methods in one interface

### Integration Points

- `GameSnapshot` is referenced in gameState.ts for undo history
- `GameState` is the Zustand store shape — all new state fields go here
- `Fund` type is used across mockData.ts, gameState.ts, vcRealism.ts, scenarios.ts
- Zustand persist `partialize` in gameState.ts excludes `history` — will need to also exclude `playerProfile` and `reportHistory`

</code_context>

<specifics>
## Specific Ideas

- Skills should feel like a character sheet in an RPG — clear progression with tangible levels
- Fundraising states mirror real LP commitment lifecycle (prospect → pitch → soft circle → hard commit → close)
- GameSnapshot Omit pattern prevents the class of bugs where new GameState fields silently break undo

</specifics>

<deferred>
## Deferred Ideas

- LP archetype system with behavioral differences (FUND-V2-01) — v2
- Skill-based action unlocks (SKIL-V2-01) — v2
- Report template customization (REPT-V2-02) — v2

</deferred>

---

_Phase: 01-types-foundation_
_Context gathered: 2026-03-12_
