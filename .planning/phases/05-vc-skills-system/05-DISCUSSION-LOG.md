# Phase 5: VC Skills System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 05-vc-skills-system
**Areas discussed:** Hint display mechanism, Toggle location, Hint timing, Hint content depth
**Mode:** --auto (all decisions auto-selected)

---

**Key finding:** 7 of 8 SKIL requirements were already fully implemented from prior work (v1.5 feature pack). Only SKIL-05 (contextual hints) remains.

## Hint Display Mechanism

| Option        | Description                                                           | Selected |
| ------------- | --------------------------------------------------------------------- | -------- |
| Sonner toast  | Matches existing notification pattern, auto-dismissing, non-intrusive | ✓        |
| Inline badge  | Badge near action button showing XP gained                            |          |
| Sidebar panel | Persistent panel showing recent skill activity                        |          |
| Tooltip       | Hover-triggered skill gain display                                    |          |

**User's choice:** [auto] Sonner toast (recommended default — consistent with existing patterns)
**Notes:** App already uses sonner for advance time, investments, and other notifications. Adding skill hints as toasts is zero new infrastructure.

## Toggle Location

| Option                             | Description                                               | Selected |
| ---------------------------------- | --------------------------------------------------------- | -------- |
| Store boolean + skills page toggle | showSkillHints boolean in Zustand, toggle on /skills page | ✓        |
| Settings dialog                    | Separate settings UI                                      |          |
| Per-action inline toggle           | Toggle per action type                                    |          |

**User's choice:** [auto] Store boolean + skills page toggle (recommended default — simple, persistent)
**Notes:** Follows existing pattern of tutorialMode/tutorialStep booleans in store.

## Hint Timing

| Option        | Description                         | Selected |
| ------------- | ----------------------------------- | -------- |
| After action  | Confirmation of what was gained     | ✓        |
| Before action | Preview of what would be gained     |          |
| Both          | Preview before + confirmation after |          |

**User's choice:** [auto] After action (recommended default — confirmation is more natural for RPG progression)
**Notes:** Before-action preview belongs in Phase 6 (Interaction Feedback / outcome previews).

## Hint Content Depth

| Option                   | Description                                                  | Selected |
| ------------------------ | ------------------------------------------------------------ | -------- |
| Skill names + XP amounts | "Deal Sourcing +15, Due Diligence +20" with level-up callout | ✓        |
| Skill names only         | Just names, no numbers                                       |          |
| Full detail              | Names + XP + progress bar + level                            |          |

**User's choice:** [auto] Skill names + XP amounts (recommended default — informative without being cluttered)
**Notes:** Level-up gets special treatment in toast.

## Claude's Discretion

- Toast styling, duration, position
- Single toast per action vs one per skill
- Level-up toast variant

## Deferred Ideas

- Outcome preview before actions (Phase 6)
- Skill-based unlocks (v2)
- Skills leaderboard (v2)
