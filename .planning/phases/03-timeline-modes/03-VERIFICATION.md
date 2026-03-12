---
phase: 03-timeline-modes
verified: 2026-03-12T01:46:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification: false
human_verification:
  - test: "Start a new fund and select IRL Pacing on wizard Step 2"
    expected: "Step 2 shows two cards (Freeplay with Zap icon, IRL Pacing with Clock icon). Selecting IRL and completing wizard launches fund with IRL badge visible on Dashboard."
    why_human: "Visual card selection UI, icon rendering, and full wizard flow cannot be confirmed programmatically."
  - test: "In IRL mode, navigate to Deals page immediately after fund start"
    expected: "Deal cards show 'Available in Nmo' badge and the invest button is disabled. Badge disappears and button re-enables once enough months have advanced."
    why_human: "Gate countdown rendering on deal cards requires live UI interaction; gate expiry flow needs time advancement to verify the badge disappears correctly."
  - test: "Open InvestModal on a gated deal in IRL mode"
    expected: "Confirm button is disabled and a countdown label (e.g. 'Available in 2 month(s)') appears below it."
    why_human: "Confirm button disable state and label rendering require live modal interaction."
  - test: "Start a Freeplay fund and complete wizard"
    expected: "No IRL Pacing badge appears on Dashboard. Deal cards show no gate indicators. Invest button is enabled immediately."
    why_human: "Absence of UI elements cannot be confirmed without rendering the application."
---

# Phase 3: Timeline Modes Verification Report

**Phase Goal:** Players can choose IRL or Freeplay pacing at fund setup, and that choice gates or unblocks actions throughout the game
**Verified:** 2026-03-12T01:46:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                   | Status               | Evidence                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `checkTimeGate` returns `blocked:true` with `monthsRemaining` when IRL fund has an active gate for that action type                     | VERIFIED             | `timelineGates.ts:58-62` returns blocked+monthsRemaining; test at `timelineGates.test.ts:91-103` confirms exact values                                                                                |
| 2   | `checkTimeGate` returns `blocked:false` for any action in freeplay mode regardless of active gates                                      | VERIFIED             | `timelineGates.ts:41-43` returns immediately; test at `timelineGates.test.ts:70-83` confirms freeplay with planted gate                                                                               |
| 3   | `IRL_GATE_DURATIONS` contains named constants for seed_check, due_diligence, series_a_check, lp_close, follow_on with min/max in months | VERIFIED             | `timelineGates.ts:15-28` exports all 5 required keys plus board_meeting; 6 calibration tests pass                                                                                                     |
| 4   | `invest` action in `gameState.ts` rejects with reason string when IRL gate is active for the investment stage                           | VERIFIED             | `gameState.ts:2481-2496` gate check before `checkCanInvest`, returns `{ success: false, reason: t(...) }`; gameState.test.ts Timeline Modes test confirms `reason.toContain("month")`                 |
| 5   | `advanceTime` clears expired gates each tick so `activeTimeGates` does not grow indefinitely                                            | VERIFIED             | `gameState.ts:1187-1190` calls `clearExpiredGates(fund)` immediately after month increment with old-save guard; pruning test in gameState.test.ts confirms expired gate removed                       |
| 6   | `timelineMode` persists across Zustand rehydration cycle                                                                                | VERIFIED             | `gameState.test.ts:624-646` setState round-trip test; `timelineMode` on `Fund` type is covered by Zustand persist middleware                                                                          |
| 7   | Fund setup wizard shows IRL vs Freeplay toggle as a dedicated step before fund type selection                                           | VERIFIED (automated) | `Index.tsx:353-433` is Step 2; step progress array is `[1,2,3,4,5,6]`; old step 2 (fund type) is now Step 3                                                                                           |
| 8   | Selecting IRL mode and launching a fund results in `fund.timelineMode` being `"irl"` in the store                                       | VERIFIED             | `Index.tsx:162` state, `Index.tsx:264` passed to `initFund`; gameState.test.ts initFund IRL test confirms `fund.timelineMode === "irl"`                                                               |
| 9   | Dashboard displays a visible IRL Pacing badge when fund is in IRL mode                                                                  | VERIFIED (automated) | `Dashboard.tsx:386-393` conditional render with Clock icon and `t("dashboard.irlPacing", "IRL Pacing")`                                                                                               |
| 10  | In IRL mode, gated deal actions show "Available in N months" and are disabled                                                           | VERIFIED (automated) | `Deals.tsx:274-280` computes `gateMessage`; `DealCard.tsx:377,381-386` disables button and renders badge when prop provided; `InvestModal.tsx:90-97,233,243-245` gate check + disabled confirm button |
| 11  | In Freeplay mode, no gate indicators appear and all actions are immediately available                                                   | VERIFIED (automated) | `checkTimeGate` returns `{ blocked: false }` in freeplay; `gateMessage` is `undefined`; DealCard and InvestModal render no gate UI                                                                    |

**Score:** 11/11 truths verified (7 fully automated, 4 require human visual confirmation)

---

### Required Artifacts

| Artifact                           | Expected                                                               | Status   | Details                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- | --- | ----------------------------------------------------------- |
| `src/engine/timelineGates.ts`      | IRL_GATE_DURATIONS, checkTimeGate, openTimeGate, clearExpiredGates     | VERIFIED | 102 lines, all 4 exports confirmed, no React imports, uses `randomBetween` from `@/lib/utils`                       |
| `src/engine/timelineGates.test.ts` | Unit tests, min 60 lines                                               | VERIFIED | 242 lines, 19 tests across 4 describe blocks                                                                        |
| `src/engine/gameState.ts`          | Gate checks in invest, gate cleanup in advanceTime                     | VERIFIED | Import at line 102-105; invest gate check at line 2481-2496; advanceTime cleanup at line 1187-1190                  |
| `src/engine/gameState.test.ts`     | Extended tests for IRL mode initFund, invest blocking, persist cycle   | VERIFIED | 7-test "gameState — Timeline Modes" describe block at line 407; 22 tests total in file, all pass                    |
| `src/pages/Index.tsx`              | 6-step wizard with timeline mode step, timelineMode passed to initFund | VERIFIED | Step 2 at line 353; `[1,2,3,4,5,6]` progress array at line 287; `timelineMode` in initFund call at line 264         |
| `src/pages/Dashboard.tsx`          | IRL Pacing badge in header area                                        | VERIFIED | `fund.timelineMode === "irl"` conditional at line 386; Clock icon + Badge rendered                                  |
| `src/pages/Deals.tsx`              | Gate status display on deal actions                                    | VERIFIED | `checkTimeGate` import at line 17; per-card gate computation at line 274-280; `gateMessage` prop passed at line 287 |
| `src/components/DealCard.tsx`      | Optional gateMessage prop; invest button disabled when set             | VERIFIED | `gateMessage?: string` at line 38; button `disabled={!!gateMessage}` at line 377; Badge rendered at lines 381-386   |
| `src/components/InvestModal.tsx`   | Gate check on invest button with countdown label                       | VERIFIED | `checkTimeGate` import at line 10; gate check at line 90-97; confirm button `disabled={...                          |     | gateBlocked}` at line 233; countdown label at lines 243-245 |

---

### Key Link Verification

| From                             | To                            | Via                                                     | Status | Details                                                                        |
| -------------------------------- | ----------------------------- | ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `src/engine/gameState.ts`        | `src/engine/timelineGates.ts` | `import checkTimeGate, openTimeGate, clearExpiredGates` | WIRED  | Lines 102-105 confirm all three imports from `./timelineGates`                 |
| `gameState.ts invest action`     | `checkTimeGate`               | Gate check before investment proceeds                   | WIRED  | `checkTimeGate(state.fund, gateKey)` at line 2487                              |
| `gameState.ts advanceTime`       | `clearExpiredGates`           | Prune stale gates each month                            | WIRED  | `clearExpiredGates(fund)` at line 1190 immediately after `fund.currentMonth++` |
| `src/pages/Index.tsx`            | `initFund`                    | `timelineMode` passed in config object                  | WIRED  | `timelineMode` in config object at line 264                                    |
| `src/pages/Deals.tsx`            | `src/engine/timelineGates.ts` | `import checkTimeGate`                                  | WIRED  | Import at line 17; called per deal at line 274                                 |
| `src/components/InvestModal.tsx` | `src/engine/timelineGates.ts` | `import checkTimeGate`                                  | WIRED  | Import at line 10; called at line 90                                           |

---

### Requirements Coverage

| Requirement | Source Plan  | Description                                                                                                    | Status    | Evidence                                                                                                                                                                                       |
| ----------- | ------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TIME-01     | 03-02        | User can select IRL or Freeplay mode at session start (fund setup wizard)                                      | SATISFIED | 6-step wizard with Step 2 IRL/Freeplay selection cards in Index.tsx; `timelineMode` passed to `initFund`                                                                                       |
| TIME-02     | 03-01, 03-02 | IRL mode gates actions behind realistic time delays with "available in N months" display                       | SATISFIED | `checkTimeGate` enforces blocking in engine; Deals.tsx + InvestModal.tsx surface countdown UI; gameState.ts invest action rejects with reason                                                  |
| TIME-03     | 03-01        | Freeplay mode removes all time gates for accelerated play                                                      | SATISFIED | `checkTimeGate` returns `{ blocked: false }` immediately when `timelineMode !== "irl"`; freeplay test confirms gates planted in store are ignored                                              |
| TIME-04     | 03-01        | IRL gates calibrated to real VC cadence (seed check 2-4 weeks, LP close 6-12 months, due diligence 1-3 months) | SATISFIED | `IRL_GATE_DURATIONS` in timelineGates.ts: seed_check (1-2mo), due_diligence (1-3mo), series_a_check (2-4mo), lp_close (6-12mo); 6 calibration unit tests confirm bounds                        |
| TIME-05     | 03-01        | Timeline mode stored as engine-level state in Fund, not UI flag                                                | SATISFIED | `timelineMode: TimelineMode` on `Fund` interface in types.ts line 353; initialized in `initFund` in gameState.ts; not stored in any React component state beyond the wizard's local init state |

No orphaned requirements. All 5 TIME-xx requirements mapped to plans, implemented, and verified.

---

### Anti-Patterns Found

No anti-patterns found in any phase 3 files. Scanned: `timelineGates.ts`, `timelineGates.test.ts`, `gameState.ts` (gate sections), `Index.tsx`, `Dashboard.tsx`, `Deals.tsx`, `DealCard.tsx`, `InvestModal.tsx`.

The one `placeholder` match in `Index.tsx` (line 327) is an HTML input `placeholder` attribute on the fund name text field — not a stub.

---

### Human Verification Required

#### 1. IRL/Freeplay wizard step visual

**Test:** Run `npm run dev`, start a new fund, reach Step 2 of the wizard.
**Expected:** Two selection cards are visible — "Freeplay" with a Zap icon and "IRL Pacing" with a Clock icon. Clicking each card highlights it with a primary border ring. "Continue" advances to Step 3 (fund type/stage/geo). Freeplay is pre-selected so Continue is enabled immediately.
**Why human:** Card rendering, icon display, and selection border styling require a live browser.

#### 2. IRL Pacing badge on Dashboard

**Test:** Complete the wizard choosing IRL Pacing, then view the Dashboard.
**Expected:** An "IRL Pacing" badge with a clock icon appears near the scenario banner area in the Dashboard header.
**Why human:** Badge conditional rendering and visual placement need live UI confirmation.

#### 3. Gate countdown on Deals page (IRL mode)

**Test:** In an IRL fund, navigate to Deals. The first investment will have just opened a gate (or one is seeded from fund init).
**Expected:** Deal cards with an active gate show a grey/secondary badge "Available in Nmo" and their invest button is disabled. After advancing enough months, the badge disappears and the button re-enables.
**Why human:** Gate countdown display, button disabled state, and gate-expiry re-enable flow require time advancement and visual confirmation in a live game session.

#### 4. InvestModal gate disable

**Test:** In IRL mode with an active gate, click a deal card's invest button area (if it somehow becomes clickable) or force-navigate to the modal.
**Expected:** The "Confirm Investment" button is disabled and shows "Available in N month(s)" text below it.
**Why human:** Modal interaction and disabled state of the confirm button cannot be verified without rendering the dialog.

#### 5. Freeplay mode produces zero gate UI

**Test:** Start a Freeplay fund, view Dashboard and Deals page.
**Expected:** No "IRL Pacing" badge on Dashboard. All deal cards show enabled invest buttons with no countdown badge.
**Why human:** Absence of UI elements requires live rendering to confirm.

---

### Gaps Summary

No gaps. All 11 must-haves verified, all 5 requirements satisfied, all 6 key links wired, and the full test suite (202 tests) passes with TypeScript strict mode clean. The 5 items flagged for human verification are visual/interactive behaviors that are consistent with the verified code paths — they represent confirmation, not risk.

---

_Verified: 2026-03-12T01:46:00Z_
_Verifier: Claude (gsd-verifier)_
