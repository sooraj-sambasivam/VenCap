---
phase: 3
slug: timeline-modes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                             |
| ---------------------- | ------------------------------------------------- |
| **Framework**          | Vitest 4.0.18                                     |
| **Config file**        | `vite.config.ts` (test block)                     |
| **Quick run command**  | `npx vitest run src/engine/timelineGates.test.ts` |
| **Full suite command** | `npx vitest run`                                  |
| **Estimated runtime**  | ~15 seconds                                       |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/engine/timelineGates.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command                                 | File Exists | Status     |
| ------- | ---- | ---- | ----------- | --------- | ------------------------------------------------- | ----------- | ---------- |
| 3-01-01 | 01   | 1    | TIME-01     | unit      | `npx vitest run src/engine/gameState.test.ts`     | ✅ (extend) | ⬜ pending |
| 3-01-02 | 01   | 1    | TIME-02     | unit      | `npx vitest run src/engine/timelineGates.test.ts` | ❌ W0       | ⬜ pending |
| 3-01-03 | 01   | 1    | TIME-02     | unit      | `npx vitest run src/engine/gameState.test.ts`     | ❌ W0       | ⬜ pending |
| 3-01-04 | 01   | 1    | TIME-03     | unit      | `npx vitest run src/engine/timelineGates.test.ts` | ❌ W0       | ⬜ pending |
| 3-01-05 | 01   | 1    | TIME-04     | unit      | `npx vitest run src/engine/timelineGates.test.ts` | ❌ W0       | ⬜ pending |
| 3-01-06 | 01   | 1    | TIME-05     | unit      | `npx vitest run src/engine/gameState.test.ts`     | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/engine/timelineGates.test.ts` — new file: covers TIME-02 (gate blocking in IRL), TIME-03 (no blocking in freeplay), TIME-04 (calibration constants)
- [ ] Extend `src/engine/gameState.test.ts` — add TIME-01 (initFund timelineMode), TIME-02 (invest blocking), TIME-05 (persist/rehydrate)

_Existing test infrastructure (Vitest) covers all requirements via unit tests._

---

## Manual-Only Verifications

| Behavior                                   | Requirement | Why Manual               | Test Instructions                                            |
| ------------------------------------------ | ----------- | ------------------------ | ------------------------------------------------------------ |
| Mode toggle visible in wizard UI           | TIME-01     | Visual/interaction check | Run dev server, start new fund, verify toggle on wizard step |
| Mode badge visible on Dashboard            | TIME-01     | Visual check             | Select IRL mode, verify badge appears on Dashboard           |
| Gated actions show "available in N months" | TIME-02     | UI text rendering        | Start IRL fund, attempt invest, verify blocking message      |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
