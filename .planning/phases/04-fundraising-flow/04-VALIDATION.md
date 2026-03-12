---
phase: 4
slug: fundraising-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                           |
| ---------------------- | ----------------------------------------------- |
| **Framework**          | Vitest 4.0.18                                   |
| **Config file**        | `vite.config.ts` (test block)                   |
| **Quick run command**  | `npx vitest run src/engine/fundraising.test.ts` |
| **Full suite command** | `npx vitest run`                                |
| **Estimated runtime**  | ~15 seconds                                     |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/engine/fundraising.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement      | Test Type      | Automated Command                               | File Exists | Status     |
| ------- | ---- | ---- | ---------------- | -------------- | ----------------------------------------------- | ----------- | ---------- |
| 4-01-01 | 01   | 1    | FUND-01          | unit           | `npx vitest run src/engine/fundraising.test.ts` | ❌ W0       | ⬜ pending |
| 4-01-02 | 01   | 1    | FUND-02          | unit           | `npx vitest run src/engine/fundraising.test.ts` | ❌ W0       | ⬜ pending |
| 4-01-03 | 01   | 1    | FUND-04          | unit           | `npx vitest run src/engine/fundraising.test.ts` | ❌ W0       | ⬜ pending |
| 4-01-04 | 01   | 1    | FUND-05          | unit           | `npx vitest run src/engine/fundraising.test.ts` | ❌ W0       | ⬜ pending |
| 4-02-01 | 02   | 1    | FUND-03, FUND-06 | unit           | `npx vitest run src/engine/gameState.test.ts`   | ❌ W0       | ⬜ pending |
| 4-03-01 | 03   | 2    | FUND-07          | compile+manual | `npx tsc -b --noEmit && npx vitest run`         | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/engine/fundraising.test.ts` — new file: covers FUND-01 (pitch LP), FUND-02 (close status), FUND-04 (fund size), FUND-05 (TVPI threshold)
- [ ] Extend `src/engine/gameState.test.ts` — add FUND-03 (configureFundTerms), FUND-06 (completeFundClose reset)

_Existing test infrastructure (Vitest) covers all requirements._

---

## Manual-Only Verifications

| Behavior                                                  | Requirement | Why Manual          | Test Instructions                                                        |
| --------------------------------------------------------- | ----------- | ------------------- | ------------------------------------------------------------------------ |
| /fundraising page renders with LP prospects, progress bar | FUND-07     | Visual layout check | Navigate to /fundraising, verify LP list, progress bar, close milestones |
| Pitch button advances LP status visually                  | FUND-01     | UI interaction      | Click pitch on an LP, verify status badge updates                        |
| Fund terms config UI updates economics                    | FUND-03     | UI interaction      | Modify fee %, verify display updates                                     |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
