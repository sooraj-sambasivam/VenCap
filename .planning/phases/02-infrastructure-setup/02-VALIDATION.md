---
phase: 2
slug: infrastructure-setup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| **Framework**          | Vitest 4.0.18                                                       |
| **Config file**        | `vite.config.ts` (test block: `globals: true, environment: "node"`) |
| **Quick run command**  | `npx vitest run src/lib/i18n.test.ts`                               |
| **Full suite command** | `npm test`                                                          |
| **Estimated runtime**  | ~15 seconds                                                         |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc -b --noEmit`
- **After every plan wave:** Run `npx tsc -b --noEmit && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type     | Automated Command                     | File Exists | Status     |
| ------- | ---- | ---- | ----------- | ------------- | ------------------------------------- | ----------- | ---------- |
| 2-01-01 | 01   | 1    | FOUND-03    | unit          | `npx vitest run src/lib/i18n.test.ts` | ❌ W0       | ⬜ pending |
| 2-01-02 | 01   | 1    | FOUND-03    | unit          | `npx vitest run src/lib/i18n.test.ts` | ❌ W0       | ⬜ pending |
| 2-01-03 | 01   | 1    | FOUND-03    | compile-check | `npx tsc -b --noEmit`                 | N/A         | ⬜ pending |
| 2-01-04 | 01   | 1    | FOUND-04    | compile-check | `npx tsc -b --noEmit`                 | N/A         | ⬜ pending |
| 2-01-05 | 01   | 1    | FOUND-04    | build-check   | `npm run build`                       | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/lib/i18n.test.ts` — unit tests for `t()` shim (FOUND-03): returns fallback, returns key when no fallback

_Existing test infrastructure (Vitest) covers all other phase requirements via compile-check and build-check._

---

## Manual-Only Verifications

| Behavior                          | Requirement | Why Manual                                                     | Test Instructions                                                      |
| --------------------------------- | ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Speed Insights console log in dev | FOUND-04    | Component renders script tag; data only flows on Vercel deploy | Open DevTools console, verify `[Vercel Speed Insights]` entries appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
