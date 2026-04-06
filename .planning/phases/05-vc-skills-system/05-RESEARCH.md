# Phase 5: VC Skills System - Research

**Researched:** 2026-04-06
**Domain:** Zustand store extension, Sonner toast integration, TypeScript strict-mode type augmentation
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 19-skill engine with XP calculation, level thresholds (0/100/300/600/1000), career titles — `src/engine/skills.ts` — DO NOT reimplement
- **D-02:** XP awards co-located with all action handlers in `gameState.ts` via `applyXPAwards()` — all 13+ actions already award XP — DO NOT reimplement
- **D-03:** Dedicated `/skills` page with hard/soft tabs, skill cards, progress bars, career title display — `src/pages/Skills.tsx` — DO NOT reimplement
- **D-04:** playerProfile in Zustand store, persisted to localStorage, preserved across fund resets, excluded from GameSnapshot undo — DO NOT reimplement
- **D-05:** Display mechanism: Sonner toast notification — matches existing toast pattern
- **D-06:** Toggle: Boolean `showSkillHints` stored in the Zustand store (persisted). Toggle control on the /skills page. Default: `true` for new games.
- **D-07:** Timing: Hints appear AFTER an action completes (confirmation), not before (preview)
- **D-08:** Content: `"Skills: Deal Sourcing +15, Due Diligence +20, Valuation +15"`. Level-up appended as `"Level up! Due Diligence Lv.3"`
- **D-09:** Hint trigger: A helper function that compares playerProfile before/after an action, extracts the diff, and calls toast if `showSkillHints` is true. Co-located in gameState.ts near existing action handlers.

### Claude's Discretion

- Toast styling (icon, duration, position) — match existing toast patterns
- Whether to batch multiple skill gains into one toast or show one per skill (recommend: one toast per action, listing all skills gained)
- Level-up toast enhancement (e.g., different toast variant for level-ups)

### Deferred Ideas (OUT OF SCOPE)

- Skill-based action unlocks (SKIL-V2-01) — v2
- Skills leaderboard comparing across saved games (SKIL-V2-02) — v2
- Outcome preview showing skill impact BEFORE action (belongs in Phase 6: Interaction Feedback)
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                        | Research Support                                                                                                                                                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SKIL-01 | Skills tracking across 3 categories: hard skills, soft skills, context-specific skills             | COMPLETE — `src/engine/skills.ts` + `src/engine/types.ts`. `SkillRecord.category` is `"hard" \| "soft"`. No action needed.                                                                                                                                                 |
| SKIL-02 | Proficiency levels with career title progression (Analyst → Associate → VP → Partner → MD)         | COMPLETE — `getCareerTitle()`, `CAREER_TITLE_LABELS` in skills.ts. No action needed.                                                                                                                                                                                       |
| SKIL-03 | Skills exercised are co-located with action handlers in gameState.ts (not computed after the fact) | COMPLETE — 13+ `applyXPAwards()` calls verified in gameState.ts at lines 2272, 2417, 2507, 2624, 2680, 2748, 2850, 2957, 3003, 3045, 3105, 3233, 3358, 3412, 3523. No action needed.                                                                                       |
| SKIL-04 | Dedicated skills dashboard page showing all skills, proficiency, and career level                  | COMPLETE — `src/pages/Skills.tsx` verified. No action needed.                                                                                                                                                                                                              |
| SKIL-05 | Contextual hints during decisions showing which skills are being exercised (toggleable)            | **THE ONLY NEW WORK.** Requires: (1) `showSkillHints: boolean` field on GameState + types, (2) `setShowSkillHints()` action, (3) `emitSkillHintToast()` helper in gameState.ts, (4) call that helper at all 13+ applyXPAwards sites, (5) Toggle Switch UI on /skills page. |
| SKIL-06 | Skills persist across sessions via Zustand persist (inside main store, not separate localStorage)  | COMPLETE — `playerProfile` is in partialize spread (not excluded), confirmed at line 3652. No action needed.                                                                                                                                                               |
| SKIL-07 | Cross-fund skill accumulation — skills carry over when starting Fund II/III                        | COMPLETE — `completeFundClose()` explicitly preserves `playerProfile` at line 3566. No action needed.                                                                                                                                                                      |
| SKIL-08 | Skills excluded from `GameSnapshot` so undo never rolls back player progression                    | COMPLETE — `GameSnapshot = Omit<GameState, keyof GameStateActions \| "history" \| "tutorialMode" \| "tutorialStep" \| "playerProfile" \| "reportHistory">` at types.ts line 801. `captureSnapshot()` does not include `playerProfile`. No action needed.                   |

</phase_requirements>

---

## Summary

This phase is almost entirely done. Seven of eight SKIL requirements are fully implemented and verified against the source code. The skill engine (`src/engine/skills.ts`), all XP award functions, the `applyXPAwards()` integration at 13+ action handlers in `gameState.ts`, the `/skills` page (`src/pages/Skills.tsx`), persistence via Zustand persist, cross-fund carry-over in `completeFundClose()`, and undo exclusion via `GameSnapshot` type — all confirmed present and correct.

The single remaining gap is SKIL-05: a `showSkillHints` toggle in the store plus a helper function that fires a Sonner toast after each action's XP is applied. The work is narrow: add one boolean to `GameState` (and `GameSnapshot` Omit if needed — verified `showSkillHints` is NOT currently excluded and will auto-persist correctly), add a `setShowSkillHints` action, write one `emitSkillHintToast(before, after)` helper, call it at every `applyXPAwards` site, and add a toggle Switch to the `/skills` page.

The shadcn `Switch` component is not installed — the UI components dir contains: badge, button, card, dialog, dropdown-menu, input, label, progress, scroll-area, select, separator, sheet, skeleton, slider, sonner, table, tabs, tooltip. The toggle must be built with an available primitive (Button with pressed state, or Checkbox, or a raw `<input type="checkbox">` styled to match the dark theme).

**Primary recommendation:** Add `showSkillHints: boolean` to GameState, implement `emitSkillHintToast()` in gameState.ts, call it after each `applyXPAwards` invocation, and render a toggle on the /skills page using a styled Checkbox or Button — no new shadcn components required.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version   | Purpose                    | Why Standard                                                                                                                |
| ------- | --------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| sonner  | installed | Toast notifications        | Already the app-wide toast system; `toast.success()`, `toast.info()`, `toast.error()` used throughout                       |
| zustand | installed | State + toggle persistence | `showSkillHints` added as a regular boolean field — auto-persisted by existing `partialize` (which excludes only `history`) |

### No New Dependencies

This phase requires zero new npm packages. All primitives are in place.

**Version verification:** No installs needed. `sonner` and `zustand` are already in use.

---

## Architecture Patterns

### Pattern 1: emitSkillHintToast Helper (new function)

**What:** A module-level helper in `gameState.ts` that diffs two `PlayerProfile` objects, formats the gains, and fires a sonner toast if `showSkillHints` is true.

**When to use:** Called immediately after every `applyXPAwards()` call, passing the profile snapshot taken before and the result returned after.

**Pattern:**

```typescript
// Co-located with other helpers above the store definition in gameState.ts

function emitSkillHintToast(
  before: PlayerProfile,
  after: PlayerProfile,
  showHints: boolean,
): void {
  if (!showHints) return;

  const gains: { label: string; amount: number; levelUp: boolean }[] = [];

  for (const [id, afterSkill] of Object.entries(after.skills)) {
    const beforeSkill = before.skills[id as SkillId];
    const xpGained = afterSkill.xp - beforeSkill.xp;
    if (xpGained <= 0) continue;
    const levelUp = afterSkill.level > beforeSkill.level;
    gains.push({
      label: SKILL_LABELS[id as SkillId],
      amount: xpGained,
      levelUp,
    });
  }

  if (gains.length === 0) return;

  const skillLine = gains.map((g) => `${g.label} +${g.amount}`).join(", ");

  const levelUps = gains.filter((g) => g.levelUp);
  const levelUpLine =
    levelUps.length > 0
      ? ` — Level up! ${levelUps.map((g) => `${g.label} Lv.${after.skills[g.label as SkillId]?.level ?? "?"}`).join(", ")}`
      : "";

  // Use toast.success for level-ups, toast.info for normal gains
  const toastFn = levelUps.length > 0 ? toast.success : toast.info;
  toastFn(`Skills: ${skillLine}${levelUpLine}`, { duration: 4000 });
}
```

**Note on SKILL_LABELS import:** `SKILL_LABELS` is already imported from `./skills` in `gameState.ts` at line 116-131. Verify it's in the import list; add it if not.

**Note on level-up label lookup:** The `g.label` approach above needs a reverse-lookup. A cleaner approach: iterate by `SkillId` directly (using `Object.keys(after.skills) as SkillId[]`), which avoids the label-as-key inversion.

### Pattern 2: Caller Pattern at Every applyXPAwards Site

**What:** The before-snapshot/after-call pattern — capture profile before, apply XP, emit hint.

**Example (invest action, line ~2621):**

```typescript
// Award skill XP for investing
const investState = get();
const profileBefore = investState.playerProfile;
const profileAfter = applyXPAwards(profileBefore, getInvestXP(startup.stage));
set({ playerProfile: profileAfter });
emitSkillHintToast(profileBefore, profileAfter, get().showSkillHints);
```

**For actions using inline `set()` with state spread**, the before/after pattern must capture the profile before the `set` call. Where `applyXPAwards` is called inline inside `set()`, it must be extracted into a local variable first.

### Pattern 3: showSkillHints in GameState

Add to `GameState` interface in `types.ts`:

```typescript
// v4.0: Skills hints toggle (excluded from snapshot — player preference)
showSkillHints: boolean;
```

Add to `GameSnapshot` Omit type:

```typescript
export type GameSnapshot = Omit<
  GameState,
  | keyof GameStateActions
  | "history"
  | "tutorialMode"
  | "tutorialStep"
  | "playerProfile"
  | "reportHistory"
  | "showSkillHints" // ← add this
>;
```

Initialize in store:

```typescript
showSkillHints: true,  // default on
```

Backfill in `merge()`:

```typescript
if (merged.showSkillHints === undefined) merged.showSkillHints = true;
```

Add action to `GameStateActions`:

```typescript
setShowSkillHints: (enabled: boolean) => void;
```

Implement in store:

```typescript
setShowSkillHints: (enabled) => set({ showSkillHints: enabled }),
```

### Pattern 4: Toggle UI on /skills Page

No `Switch` component is installed. Use one of these approaches:

**Option A (recommended): Checkbox + Label pattern** — use the `label` shadcn component + a raw styled checkbox. Keeps it simple, semantically correct, no new installs.

**Option B:** Style a `Button` with toggle state using `variant="outline"` and conditional class names. Familiar pattern to this codebase.

**Option C:** Install `shadcn add switch` — one command, gives a proper Switch primitive. This is the cleanest approach if the planner allows it.

The CONTEXT.md does not prohibit installing shadcn primitives. Recommend Option C as the cleanest.

### Recommended Project Structure (no new files needed)

All changes are in-place edits:

```
src/
├── engine/
│   ├── types.ts           — add showSkillHints to GameState + GameSnapshot Omit
│   └── gameState.ts       — add emitSkillHintToast helper, showSkillHints field,
│                            setShowSkillHints action, backfill in merge(),
│                            update all 13+ applyXPAwards call sites
└── pages/
    └── Skills.tsx         — add toggle control for showSkillHints
```

### Anti-Patterns to Avoid

- **Calling `get()` inside the `set()` callback:** `get()` returns state at call time, not snapshot time. Always capture `before` state before the `set()` call.
- **Emitting toasts from pure engine functions:** `emitSkillHintToast` must live in `gameState.ts` (the only stateful module), not in `skills.ts`. Engine files are pure; no toast calls there.
- **Adding `showSkillHints` to captureSnapshot:** It should be excluded from undo just like `tutorialMode` — player preferences should not roll back. Already handled by adding it to the `GameSnapshot` Omit.
- **Importing `toast` at engine level:** `toast` from sonner is a side effect. Keep it inside `gameState.ts`'s helper, not in pure `skills.ts`.
- **Level-up label inversion:** Do not use `SKILL_LABELS[gain.label]` — labels are not keys. Iterate with `SkillId` values.

---

## Don't Hand-Roll

| Problem           | Don't Build                   | Use Instead                                     | Why                                                                          |
| ----------------- | ----------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Before/after diff | Custom deep-compare           | Simple per-SkillId XP subtraction               | Skills are flat records; field-by-field is O(19), readable, zero deps        |
| Toast display     | Custom notification component | `sonner` (already installed)                    | Already the app standard; Toaster is in App.tsx                              |
| Toggle UI         | Custom checkbox component     | shadcn `switch` (install) or styled label+input | One command install; do not reinvent form controls                           |
| Persistence       | Manual localStorage.setItem   | Zustand persist (already in place)              | `showSkillHints` auto-persists with existing partialize — nothing new needed |

**Key insight:** The infrastructure is entirely in place. This phase is glue code: wire the existing before/after profile pattern into a toast emission.

---

## Common Pitfalls

### Pitfall 1: applyXPAwards Inline Inside set()

**What goes wrong:** Several action handlers call `applyXPAwards` directly inside the `set()` object literal, like:

```typescript
set({ playerProfile: applyXPAwards(state.playerProfile, getFollowOnXP()) });
```

There is no `before` reference available to diff against.

**Why it happens:** The inline pattern is compact but makes before/after comparison impossible without refactoring.

**How to avoid:** Extract `before` and `after` before the `set()` call:

```typescript
const profileBefore = state.playerProfile; // or get().playerProfile
const profileAfter = applyXPAwards(profileBefore, getFollowOnXP());
set({ playerProfile: profileAfter });
emitSkillHintToast(profileBefore, profileAfter, get().showSkillHints);
```

**Warning signs:** If a `set()` call contains `applyXPAwards` inline, it needs refactoring before the hint can be emitted.

### Pitfall 2: Toasts from advanceTime() Monthly Passive XP

**What goes wrong:** `getMonthlyPassiveXP()` awards tiny amounts (2-5 XP) each month. If skill hints fire on every advance, the user gets a hint toast for +2 market_intuition every single month — extremely noisy.

**Why it happens:** `advanceTime()` calls `applyXPAwards` for passive XP at line 2272. Treating it identically to explicit actions floods the UI.

**How to avoid:** Skip hint emission for passive XP. Pass a `silent: true` flag or simply do not call `emitSkillHintToast` in the `advanceTime` passive XP path. The function signature can accept an optional `silent` override, or the call site simply omits the toast call.

**Recommendation:** `emitSkillHintToast` should not be called in `advanceTime()`'s passive XP block — only at explicit player action sites.

### Pitfall 3: showSkillHints Missing from Initial State of Reset Actions

**What goes wrong:** Several actions reset large chunks of state — `completeFundClose()`, `rebirth()`, `resetGame()`. If they spread partial state objects without preserving `showSkillHints`, the toggle resets to the default every fund cycle.

**Why it happens:** Reset actions do partial state reconstruction. New fields not explicitly carried forward are lost.

**How to avoid:** In each reset action that spreads state, explicitly preserve `showSkillHints`:

```typescript
showSkillHints: state.showSkillHints ?? true,
```

**Affected actions:** `completeFundClose` (line ~3273), `rebirth` (line ~3314), `resetGame` (line ~3273). Verify each one.

### Pitfall 4: Switch Component Not Installed

**What goes wrong:** The plan calls for a toggle UI and assumes `@/components/ui/switch` exists. It does not — verified by listing `src/components/ui/`. Import will fail at build time.

**Why it happens:** shadcn components are installed individually; not all components are present.

**How to avoid:** Either install switch (`npx shadcn@latest add switch`) before building the toggle, or use an alternative (styled checkbox or Button). The planner must include a Wave 0 task for this.

### Pitfall 5: TypeScript Strict Mode — Unused Parameter Prefix

**What goes wrong:** The `emitSkillHintToast` helper may have parameters that are conditionally used. TypeScript strict mode requires unused params to start with `_`.

**How to avoid:** Design the helper so all parameters are used on all code paths, or prefix optional ones with `_`.

---

## Code Examples

### Example 1: Complete emitSkillHintToast implementation

```typescript
// In gameState.ts, above the store definition
// Requires: import { SKILL_LABELS } from './skills' (already imported)
// Requires: import { toast } from 'sonner' (NOT currently imported in gameState.ts — must be added)

function emitSkillHintToast(
  before: PlayerProfile,
  after: PlayerProfile,
  showHints: boolean,
): void {
  if (!showHints) return;

  const skillIds = Object.keys(after.skills) as SkillId[];
  const gains: {
    id: SkillId;
    amount: number;
    levelUp: boolean;
    newLevel: number;
  }[] = [];

  for (const id of skillIds) {
    const xpGained = after.skills[id].xp - before.skills[id].xp;
    if (xpGained <= 0) continue;
    gains.push({
      id,
      amount: xpGained,
      levelUp: after.skills[id].level > before.skills[id].level,
      newLevel: after.skills[id].level,
    });
  }

  if (gains.length === 0) return;

  const skillLine = gains
    .map((g) => `${SKILL_LABELS[g.id]} +${g.amount}`)
    .join(", ");

  const levelUps = gains.filter((g) => g.levelUp);
  const levelUpLine =
    levelUps.length > 0
      ? ` — Level up! ${levelUps.map((g) => `${SKILL_LABELS[g.id]} Lv.${g.newLevel}`).join(", ")}`
      : "";

  if (levelUps.length > 0) {
    toast.success(`Skills: ${skillLine}${levelUpLine}`, { duration: 4000 });
  } else {
    toast.info(`Skills: ${skillLine}`, { duration: 3000 });
  }
}
```

**Critical:** `toast` from `sonner` is not currently imported in `gameState.ts` (confirmed — no `import.*sonner` match). This import must be added:

```typescript
import { toast } from "sonner";
```

### Example 2: Caller pattern (invest action)

```typescript
// Before (current code at ~line 2621):
const investState = get();
set({
  playerProfile: applyXPAwards(
    investState.playerProfile,
    getInvestXP(startup.stage),
  ),
});

// After:
const investState = get();
const profileBefore = investState.playerProfile;
const profileAfter = applyXPAwards(profileBefore, getInvestXP(startup.stage));
set({ playerProfile: profileAfter });
emitSkillHintToast(profileBefore, profileAfter, get().showSkillHints);
```

### Example 3: Toggle on Skills.tsx

```tsx
// If shadcn Switch is installed:
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const showSkillHints = useGameStore((s) => s.showSkillHints);
const setShowSkillHints = useGameStore((s) => s.setShowSkillHints);

// In JSX (add to existing Skills page, below CareerCard):
<div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-4">
  <Switch
    id="skill-hints"
    checked={showSkillHints}
    onCheckedChange={setShowSkillHints}
  />
  <Label htmlFor="skill-hints" className="cursor-pointer">
    <span className="text-sm font-medium">Skill Hints</span>
    <p className="text-xs text-muted-foreground">
      Show which skills you exercised after each action
    </p>
  </Label>
</div>;
```

### Example 4: GameSnapshot Omit update

```typescript
// types.ts — add "showSkillHints" to the Omit list
export type GameSnapshot = Omit<
  GameState,
  | keyof GameStateActions
  | "history"
  | "tutorialMode"
  | "tutorialStep"
  | "playerProfile"
  | "reportHistory"
  | "showSkillHints"
>;
```

---

## Implementation Map — 13 applyXPAwards Call Sites

All sites that need the before/after refactor + `emitSkillHintToast` call:

| Line (approx) | Action                        | XP Function                | Passive?        |
| ------------- | ----------------------------- | -------------------------- | --------------- |
| 2272          | advanceTime() monthly passive | getMonthlyPassiveXP        | YES — skip hint |
| 2417          | performLPAction               | getLPActionXP              | no              |
| 2507          | resolveBoardMeeting           | getBoardMeetingXP          | no              |
| 2624          | invest                        | getInvestXP                | no              |
| 2680          | followOn                      | getFollowOnXP              | no              |
| 2748          | acceptSecondary               | getSecondaryXP             | no              |
| 2850          | acceptBuyout                  | getBuyoutXP                | no              |
| 2957          | resolveDecision               | getDecisionXP              | no              |
| 3003          | hireTalent                    | getHireTalentXP            | no              |
| 3045          | supportPortfolioCompany       | getSupportActionXP         | no              |
| 3105          | performIncubatorAction        | getIncubatorXP             | no              |
| 3233          | spinOutLabProject             | getLabSpinOutXP            | no              |
| 3358          | launchFundraisingCampaign     | getFundraisingXP("launch") | no              |
| 3412          | pitchToLP                     | getFundraisingXP("pitch")  | no              |
| 3523          | completeFundClose             | getFundraisingXP("close")  | no              |

**Total call sites requiring refactor:** 14 (excluding passive at line 2272 = 13 for hints, 1 skipped).

Note: `completeFundClose` is unique — it constructs a local `playerProfile` variable rather than calling `set()` directly. The before/after diff must be handled against `state.playerProfile` before the variable is computed.

---

## Validation Architecture

### Test Framework

| Property           | Value                                      |
| ------------------ | ------------------------------------------ |
| Framework          | Vitest 4.0.18                              |
| Config file        | `vite.config.ts` (vitest block)            |
| Quick run command  | `npx vitest run src/engine/skills.test.ts` |
| Full suite command | `npx vitest run`                           |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                             | Test Type   | Automated Command                             | File Exists?                                    |
| ------- | -------------------------------------------------------------------- | ----------- | --------------------------------------------- | ----------------------------------------------- |
| SKIL-01 | 19 skills tracked with correct category                              | unit        | `npx vitest run src/engine/skills.test.ts`    | ❌ Wave 0                                       |
| SKIL-02 | Career title advances at correct XP thresholds                       | unit        | `npx vitest run src/engine/skills.test.ts`    | ❌ Wave 0                                       |
| SKIL-03 | invest/followOn/etc. actions increase playerProfile XP               | integration | `npx vitest run src/engine/gameState.test.ts` | ✅ (partial — investState XP tested indirectly) |
| SKIL-04 | /skills page renders without crash                                   | smoke       | manual / Playwright                           | ❌ no page test                                 |
| SKIL-05 | emitSkillHintToast fires when showSkillHints=true, silent when false | unit        | `npx vitest run src/engine/skills.test.ts`    | ❌ Wave 0                                       |
| SKIL-05 | No toast emitted on monthly passive XP (advanceTime)                 | integration | `npx vitest run src/engine/gameState.test.ts` | ❌ Wave 0                                       |
| SKIL-06 | playerProfile survives store rehydration                             | integration | `npx vitest run src/engine/gameState.test.ts` | ✅ (implied by persist test)                    |
| SKIL-07 | playerProfile.totalXP preserved after completeFundClose              | integration | `npx vitest run src/engine/gameState.test.ts` | ✅ (line 777-791 in gameState.test.ts)          |
| SKIL-08 | playerProfile absent from captureSnapshot output                     | unit        | `npx vitest run src/engine/gameState.test.ts` | ❌ Wave 0                                       |

### Sampling Rate

- **Per task commit:** `npx vitest run src/engine/skills.test.ts src/engine/gameState.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/engine/skills.test.ts` — new file covering SKIL-01, SKIL-02, SKIL-05 (getLevelFromXP, getCareerTitle, applyXPAwards, emitSkillHintToast behavior)
- [ ] Additional tests in `src/engine/gameState.test.ts` for SKIL-05 (passive XP silence), SKIL-08 (snapshot exclusion)
- [ ] `shadcn add switch` — if using Switch component for toggle UI

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No external services, databases, or CLI tools beyond the project's existing dev toolchain.

---

## State of the Art

| Old Approach                                     | Current Approach                                                      | Impact                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Compute skills from event history retroactively  | XP co-located with each action handler                                | Already implemented; no recomputation cost at render time                                   |
| Single global toast queue without classification | `toast.success` / `toast.info` / `toast.error` with description field | Sonner already differentiates; use toast.success for level-ups, toast.info for normal gains |

---

## Open Questions

1. **shadcn Switch — install or alternative?**
   - What we know: `Switch` is not installed. `Label` and `Checkbox` are not installed either (not in the ui/ dir). `Button` is installed.
   - What's unclear: Whether the planner budget allows a `npx shadcn@latest add switch` step.
   - Recommendation: Include the install as a Wave 0 task. One command, one file added, no bundle impact worth worrying about. The alternative (styled Button) is more code for worse UX.

2. **completeFundClose toast timing**
   - What we know: `completeFundClose` constructs `playerProfile` locally before `set()`, so the pattern is slightly different from other sites.
   - What's unclear: Whether the hint should fire for fund close (arguably the most significant skill event).
   - Recommendation: Yes, emit the hint for fund close — it's a high-stakes player action (D-07 says "after an action completes"). Capture `state.playerProfile` before the `applyXPAwards` call, then call `emitSkillHintToast` after the `set()`.

3. **showSkillHints in reset actions**
   - What we know: `rebirth()` and `resetGame()` spread partial state objects. `completeFundClose` does a full state reset.
   - What's unclear: Whether these actions should reset the hint toggle.
   - Recommendation: Preserve `showSkillHints` across all resets (it is a player preference, not game state). Explicitly carry it through each reset action.

---

## Sources

### Primary (HIGH confidence)

- Source code verified directly: `src/engine/skills.ts`, `src/engine/gameState.ts`, `src/engine/types.ts`, `src/pages/Skills.tsx`, `src/components/ui/sonner.tsx`
- `.planning/phases/05-vc-skills-system/05-CONTEXT.md` — locked decisions
- `.planning/codebase/CONVENTIONS.md` — naming and module rules

### Secondary (MEDIUM confidence)

- Sonner API (`toast.success`, `toast.info`, `duration` option) — verified by existing call sites in the codebase (`src/pages/Dashboard.tsx`, `src/components/InvestModal.tsx`, etc.)

### Tertiary (LOW confidence)

- None — all findings are from direct source code inspection.

---

## Metadata

**Confidence breakdown:**

- SKIL-01 through SKIL-04, SKIL-06 through SKIL-08 completeness: HIGH — verified in source files
- SKIL-05 implementation approach: HIGH — all primitives confirmed present, pattern established from existing code
- Switch component absence: HIGH — confirmed by directory listing
- applyXPAwards call site count: HIGH — verified by grep (15 matches, 1 passive)
- Toast import in gameState.ts: HIGH — grep confirmed no sonner import in gameState.ts

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable codebase — all findings from local source)
