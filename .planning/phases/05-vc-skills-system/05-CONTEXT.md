# Phase 5: VC Skills System - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add contextual skill hints that appear after player actions, showing which skills were exercised and by how much. This is the only remaining SKIL requirement — the 19-skill engine, career titles, XP awards, store integration, persistence, cross-fund carry-over, snapshot exclusion, and dedicated /skills page are all already implemented.

**Scope: SKIL-05 only.** All other SKIL requirements (01-04, 06-08) are complete.

</domain>

<decisions>
## Implementation Decisions

### Already Complete (DO NOT reimplement)

- **D-01:** 19-skill engine with XP calculation, level thresholds (0/100/300/600/1000), career titles — `src/engine/skills.ts`
- **D-02:** XP awards co-located with all action handlers in `gameState.ts` via `applyXPAwards()` — every invest, follow-on, support, board meeting, decision, LP action, secondary, buyout, hire, incubator, lab spin-out, and fundraising action already awards XP
- **D-03:** Dedicated `/skills` page with hard/soft tabs, skill cards, progress bars, career title display — `src/pages/Skills.tsx`
- **D-04:** playerProfile in Zustand store, persisted to localStorage, preserved across fund resets, excluded from GameSnapshot undo

### Contextual Skill Hints (SKIL-05) — The Only New Work

- **D-05:** Display mechanism: Sonner toast notification — matches existing toast pattern used throughout the app (advance time, investments, etc.). Non-intrusive, auto-dismissing.
- **D-06:** Toggle: Boolean `showSkillHints` stored in the Zustand store (persisted). Toggle control on the /skills page. Default: `true` for new games.
- **D-07:** Timing: Hints appear AFTER an action completes (confirmation), not before (preview). Shows what skills were gained from the action just taken.
- **D-08:** Content: Toast shows skill names + XP amounts gained. Format: "Skills: Deal Sourcing +15, Due Diligence +20, Valuation +15". If a level-up occurred, append "Level up! Due Diligence Lv.3".
- **D-09:** Hint trigger: A helper function that compares playerProfile before/after an action, extracts the diff, and calls toast if `showSkillHints` is true. Co-located in gameState.ts near existing action handlers.

### Claude's Discretion

- Toast styling (icon, duration, position) — match existing toast patterns
- Whether to batch multiple skill gains into one toast or show one per skill (recommend: one toast per action, listing all skills gained)
- Level-up toast enhancement (e.g., different toast variant for level-ups)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Skills Implementation

- `src/engine/skills.ts` — Full XP engine, all award functions, career title logic
- `src/engine/types.ts` — SkillId, PlayerProfile, CareerTitle, SkillRecord, SkillContext types
- `src/engine/gameState.ts` — All action handlers with applyXPAwards() calls, playerProfile state
- `src/pages/Skills.tsx` — Existing skills dashboard page

### Patterns to Follow

- `src/engine/gameState.ts` — Toast usage pattern (search for `toast(` to see existing notification style)
- `.planning/codebase/CONVENTIONS.md` — Naming, import order, module design conventions

### Requirements

- `.planning/REQUIREMENTS.md` §VC Skills System — SKIL-01 through SKIL-08

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `sonner` toast library already integrated — used for advance time notifications, investment confirmations, etc.
- `applyXPAwards()` in `skills.ts` returns a new PlayerProfile — before/after diff is straightforward
- All 12+ XP award functions (getInvestXP, getFollowOnXP, etc.) already exist and return SkillXPAward[]

### Established Patterns

- Toast notifications via `toast()` from sonner — called directly in store actions
- Zustand store with `partialize` for localStorage persistence — new boolean field auto-persists
- Store boolean flags (e.g., `tutorialMode`, `tutorialStep`) — same pattern for `showSkillHints`

### Integration Points

- Every action handler in gameState.ts that calls `applyXPAwards()` is a hint trigger point (13+ locations)
- /skills page (`src/pages/Skills.tsx`) — add toggle switch for hints
- NavBar keyboard shortcuts — 's' already mapped to /skills

</code_context>

<specifics>
## Specific Ideas

- Skills should feel like a character sheet in an RPG — clear progression with tangible levels (from Phase 1 context)
- Hints should feel rewarding, not annoying — toast auto-dismiss keeps them lightweight
- Level-up moments should feel celebratory — slightly different toast treatment

</specifics>

<deferred>
## Deferred Ideas

- Skill-based action unlocks (SKIL-V2-01) — v2
- Skills leaderboard comparing across saved games (SKIL-V2-02) — v2
- Outcome preview showing skill impact BEFORE action (belongs in Phase 6: Interaction Feedback)

</deferred>

---

_Phase: 05-vc-skills-system_
_Context gathered: 2026-04-06_
