---
phase: 5
slug: vc-skills-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                               |
| ---------------------- | ----------------------------------- |
| **Framework**          | vitest                              |
| **Config file**        | vite.config.ts (vitest section)     |
| **Quick run command**  | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime**  | ~15 seconds                         |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type   | Automated Command                             | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ----------- | --------------------------------------------- | ----------- | ---------- |
| 05-01-01 | 01   | 1    | SKIL-05     | unit        | `npx vitest run src/engine/skills.test.ts`    | ❌ W0       | ⬜ pending |
| 05-01-02 | 01   | 1    | SKIL-05     | integration | `npx vitest run src/engine/gameState.test.ts` | ✅          | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/engine/skills.test.ts` — unit tests for emitSkillHintToast helper
- [ ] shadcn Switch component — `npx shadcn@latest add switch` if toggle uses Switch

_Existing test infrastructure covers all other phase requirements._

---

## Manual-Only Verifications

| Behavior                      | Requirement | Why Manual               | Test Instructions                                                                                                         |
| ----------------------------- | ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Toast appears after action    | SKIL-05     | Visual toast rendering   | 1. Invest in a startup 2. Observe toast with skill names + XP 3. Toggle off on /skills 4. Invest again 5. Verify no toast |
| Toggle persists across reload | SKIL-05     | localStorage persistence | 1. Toggle off 2. Reload page 3. Verify still off                                                                          |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
