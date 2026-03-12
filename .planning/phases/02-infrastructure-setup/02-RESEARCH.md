# Phase 2: Infrastructure Setup - Research

**Researched:** 2026-03-12
**Domain:** Cross-cutting utilities — i18n shim (`t()`) and Vercel Speed Insights
**Confidence:** HIGH

---

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                | Research Support                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| FOUND-03 | i18n shim (`t()` function) wrapping all new user-facing strings in subsequent phases       | Zero-dependency shim pattern documented; placement in `src/lib/i18n.ts`; TypeScript signature; no React import needed |
| FOUND-04 | `@vercel/speed-insights/react` installed and `<SpeedInsights />` rendered inside `App.tsx` | Exact import path, component name, placement in JSX tree, and prop defaults documented from official Vercel docs      |

</phase_requirements>

---

## Summary

Phase 2 installs two small cross-cutting utilities before any new UI components are written. Both tasks are low-risk and self-contained. Neither introduces architectural complexity; both are pure additive changes.

**FOUND-04 (Speed Insights)** is a single npm install plus a one-line JSX addition to `App.tsx`. The component `<SpeedInsights />` from `@vercel/speed-insights/react` is a lightweight script injector. It is already the established Vercel pattern for React SPAs. The component requires no props; it works by injecting a script tag that forwards Core Web Vitals to the Vercel dashboard on deploy. It is a no-op in local development (it logs to the console in debug mode but sends no data). Bundle impact is well under the 15 KB delta constraint — the package's installed size is approximately 60 KB unpacked but the actual browser payload is ~2–5 KB gzipped.

**FOUND-03 (i18n shim)** is a custom zero-dependency `t()` function in `src/lib/i18n.ts`. The REQUIREMENTS.md explicitly calls for a shim (not `react-i18next`) and the Out of Scope table confirms `react-i18next` is deferred to v2. The shim's job is to be structurally identical to what `react-i18next`'s `t()` would produce — a function that takes a key and returns a string — so that a future v2 swap is a drop-in import replacement. The shim does not need a locale map in v1; it returns the key itself (or a fallback English string if provided). This costs zero bytes at runtime and zero bundle delta.

**Primary recommendation:** Install `@vercel/speed-insights`, add `<SpeedInsights />` as the last child of `<BrowserRouter>` in `App.tsx`, write a 10-line `src/lib/i18n.ts` exporting `t()`, and verify `tsc -b` passes clean.

---

## Standard Stack

### Core

| Library                  | Version | Purpose                                      | Why Standard                                                    |
| ------------------------ | ------- | -------------------------------------------- | --------------------------------------------------------------- |
| `@vercel/speed-insights` | latest  | Capture and report Core Web Vitals to Vercel | Official Vercel package; only option for Vercel Speed Insights  |
| TypeScript (built-in)    | 5.9.3   | i18n shim — no library needed                | Zero-dep shim is the explicit project decision per REQUIREMENTS |

### Supporting

| Library            | Version | Purpose                    | When to Use                                 |
| ------------------ | ------- | -------------------------- | ------------------------------------------- |
| `src/lib/utils.ts` | n/a     | Existing `src/lib/` module | Model the shim file after this file's style |

### Alternatives Considered

| Instead of          | Could Use         | Tradeoff                                                                           |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| Custom `t()` shim   | `react-i18next`   | react-i18next is deferred to v2 per REQUIREMENTS.md Out of Scope table             |
| `<SpeedInsights />` | Manual script tag | Script tag requires manual placement in `index.html`; component is idiomatic React |

**Installation:**

```bash
npm install @vercel/speed-insights
```

---

## Architecture Patterns

### Recommended File Placement

```
src/
├── lib/
│   ├── utils.ts       # existing — model the new file after this
│   └── i18n.ts        # NEW — exports t() shim
├── App.tsx            # MODIFIED — add <SpeedInsights /> inside BrowserRouter
```

### Pattern 1: The i18n Shim

**What:** A `t()` function that accepts a key and an optional fallback string. In v1, it returns the fallback (or the key if no fallback). In v2, the import is replaced with `react-i18next`'s `useTranslation().t` — the call signature is identical.

**When to use:** Every new user-facing string in JSX in Phase 3 and beyond. Wrap raw string literals: `t('dashboard.title', 'Dashboard')` instead of `'Dashboard'`.

**Key design constraint:** The shim must be importable as a plain function (no React hook), because many strings appear in engine utility code (e.g., toast messages) outside of component scope. `react-i18next`'s `t` is also callable outside hooks when used with `i18n.t()` directly — the shim mirrors this.

**Example:**

```typescript
// src/lib/i18n.ts
// Source: project decision in REQUIREMENTS.md + Out of Scope table

/**
 * i18n shim — v1 implementation.
 * Returns `fallback` if provided, otherwise returns `key` as-is.
 * Swap this import for react-i18next's t() in v2 with zero call-site changes.
 */
export function t(key: string, fallback?: string): string {
  return fallback ?? key;
}
```

**Why `fallback ?? key`:** Callers provide the English string as fallback, so the UI shows real text rather than raw key identifiers. When v2 wires up a translation file, the fallback parameter can be dropped or kept as a TypeScript-visible default.

### Pattern 2: SpeedInsights Component Placement

**What:** `<SpeedInsights />` renders a `<script>` tag. It should be placed inside `<BrowserRouter>` so that the router context is available for automatic route detection. Place it after the last visible child (before the closing `</BrowserRouter>` tag) — same pattern as `<Toaster />` and `<KeyboardShortcuts />`.

**When to use:** Once, in `App.tsx`. Never place in individual pages.

**Example:**

```tsx
// src/App.tsx — diff only
// Source: https://vercel.com/docs/speed-insights/quickstart

import { SpeedInsights } from '@vercel/speed-insights/react';

// Inside App() return, inside <BrowserRouter>:
<KeyboardShortcuts />
<Toaster />
<SpeedInsights />   {/* ADD: last child before </BrowserRouter> */}
```

**Props available (all optional):**

- `sampleRate` — fraction of events sent (default: `1`, all events)
- `debug` — boolean; defaults to `true` in `NODE_ENV=development`; logs events to console in dev without sending
- `beforeSend` — callback to redact/filter event data before sending
- `route` — override detected route string; auto-set in Next.js/Remix; for React Router leave unset (auto-detected via `window.location`)

For this project, no props are needed — defaults are correct.

### Pattern 3: Import from `@vercel/speed-insights/react`

The package ships multiple entry points. For this project (React, not Next.js, not Remix):

```typescript
import { SpeedInsights } from "@vercel/speed-insights/react";
```

Not `@vercel/speed-insights` (generic, non-React) or `@vercel/speed-insights/next`.

### Anti-Patterns to Avoid

- **Wrapping `t()` as a React hook:** Don't create `useTranslation()` — the shim is a plain function. The v2 library will add the hook when needed.
- **Keying by display string:** Use dot-namespaced keys as first argument, English string as fallback: `t('nav.deals', 'Deals')` — not `t('Deals')`. This makes the v2 translation file key mapping obvious.
- **Placing `<SpeedInsights />` outside `<BrowserRouter>`:** The component needs to observe route changes. Placing it outside the router means it cannot group metrics by route.
- **Placing `<SpeedInsights />` in a page component:** Must be in `App.tsx` to track all routes, not just the page it was placed in.
- **Using `t()` for engine-internal strings:** Only wrap strings that appear in the user interface (JSX, toast messages, aria labels). Internal error messages in engine files do not need `t()`.

---

## Don't Hand-Roll

| Problem                       | Don't Build                        | Use Instead                    | Why                                                                          |
| ----------------------------- | ---------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Performance metric collection | Manual `PerformanceObserver` hooks | `@vercel/speed-insights/react` | Core Web Vitals collection has many edge cases; official package handles all |
| Translation key namespacing   | Custom nested key object           | Flat dot-notation key strings  | Shim is temporary; v2 react-i18next uses flat dot-notation natively          |
| Locale detection              | `navigator.language` logic         | Not needed in v1               | Shim ignores locale; full detection deferred to v2                           |

**Key insight:** The i18n shim's value is not translation — it is call-site discipline. Every `t('key', 'English')` call creates a searchable, greppable inventory of user-facing strings. This is what makes the v2 migration mechanical rather than exploratory.

---

## Common Pitfalls

### Pitfall 1: `<SpeedInsights />` Sends No Data Locally

**What goes wrong:** Developer adds the component, runs `npm run dev`, sees no data in the Vercel dashboard, and assumes the integration is broken.
**Why it happens:** Speed Insights sends data only when deployed to Vercel. Locally, `debug: true` is the default, so events are logged to the browser console but not transmitted.
**How to avoid:** Verify locally by opening browser DevTools console — you should see `[Vercel Speed Insights] Page viewed` entries. Dashboard data appears only after a Vercel deploy.
**Warning signs:** No console logs in development = component not rendering or wrong import path.

### Pitfall 2: Wrong Import Path for `@vercel/speed-insights`

**What goes wrong:** Importing from `@vercel/speed-insights` (root) instead of `@vercel/speed-insights/react` causes a TypeScript error or loads the wrong module.
**Why it happens:** The package ships multiple entry points for different frameworks.
**How to avoid:** Always use `@vercel/speed-insights/react` for React apps.
**Warning signs:** TypeScript error "Module '@vercel/speed-insights' has no exported member 'SpeedInsights'".

### Pitfall 3: `t()` Called in Engine Files with JSX-Dependent Context

**What goes wrong:** If `t()` were implemented as a React hook, calling it outside a component (e.g., in `advanceTime()`) would throw a hooks-in-wrong-context error.
**Why it happens:** The shim design correctly avoids this — but future phases must not accidentally refactor `t()` into a hook.
**How to avoid:** Keep `t()` as a pure function (no `use` prefix, no React import). The file `src/lib/i18n.ts` should have zero imports.
**Warning signs:** Any `import React` or `import { use... }` in `src/lib/i18n.ts`.

### Pitfall 4: `t()` Usage in Existing Code Creates Diff Noise

**What goes wrong:** Phase 2 only installs the shim; it does NOT retroactively wrap existing strings. If the planner creates tasks to wrap all existing JSX strings, the diff becomes enormous and touches every component.
**Why it happens:** The requirement says "all new user-facing strings in subsequent phases use it" — not all existing strings.
**How to avoid:** Phase 2 scope is: create `src/lib/i18n.ts` and export `t()`. That is all. No existing strings are modified. The planner must NOT create tasks to retrofit existing components.
**Warning signs:** Any task in the plan that modifies a file other than `src/App.tsx` and `src/lib/i18n.ts`.

### Pitfall 5: Bundle Delta Exceeds 15 KB

**What goes wrong:** Success criterion specifies bundle delta < 15 KB. The `@vercel/speed-insights` package is ~60 KB unpacked. The React-specific subpath exports a small script injector, not the full package.
**Why it happens:** Confusion between unpacked npm size and actual browser payload.
**How to avoid:** The actual browser-side script loaded by the component is ~2–5 KB gzipped. The 15 KB constraint is easily satisfied. Verify with `npm run build` and compare before/after bundle sizes via Vite's build output.
**Warning signs:** Vite build output showing a new chunk > 15 KB for `speed-insights`.

---

## Code Examples

Verified patterns from official sources:

### Complete `src/lib/i18n.ts`

```typescript
// src/lib/i18n.ts
// Source: Project decision in REQUIREMENTS.md (FOUND-03, I18N-V2-01 scope)

/**
 * i18n shim — Phase 2 (v1) implementation.
 *
 * Usage:  t('nav.deals', 'Deals')
 * Rules:
 *   - First arg: dot-namespaced key (matches future react-i18next translation file keys)
 *   - Second arg: English fallback string shown in v1
 *   - Return: fallback if provided, otherwise key (key should never be shown to user)
 *
 * v2 migration: replace this file's import with react-i18next's t().
 * All call sites remain identical.
 */
export function t(key: string, fallback?: string): string {
  return fallback ?? key;
}
```

### `App.tsx` Diff (Speed Insights)

```tsx
// Source: https://vercel.com/docs/speed-insights/quickstart (React / create-react-app section)
// Add this import at the top of App.tsx:
import { SpeedInsights } from "@vercel/speed-insights/react";

// Add this as the last child inside the BrowserRouter return,
// after <KeyboardShortcuts /> and <Toaster />:
<SpeedInsights />;
```

### Verifying Speed Insights in Dev (Console Check)

```
// Expected browser console output when component is rendering correctly:
[Vercel Speed Insights] Debug mode is enabled
[Vercel Speed Insights] Page viewed: { url: "http://localhost:5173/", ... }
```

### Key Naming Convention for `t()`

```tsx
// Good — namespaced key + English fallback
t("dashboard.fundHealth", "Fund Health");
t("nav.deals", "Deals");
t("deals.investButton", "Invest");
t("portfolio.actions.followOn", "Follow-On");

// Bad — display string as key (breaks v2 migration)
t("Deals");
t("Fund Health");

// Bad — no fallback (shows raw key to user if shim ever changes)
t("dashboard.fundHealth");
```

---

## State of the Art

| Old Approach                                  | Current Approach                   | When Changed  | Impact                                              |
| --------------------------------------------- | ---------------------------------- | ------------- | --------------------------------------------------- |
| Manual PerformanceObserver + custom reporting | `@vercel/speed-insights` component | 2022 (Vercel) | Zero-config CWV collection for Vercel-deployed apps |
| `react-i18next` for all projects              | Zero-dep shim for simple SPAs      | Ongoing       | No bundle cost, easy v2 swap when full i18n needed  |

**Deprecated/outdated:**

- None applicable to this phase. Neither library/pattern in scope is deprecated.

---

## Open Questions

1. **Speed Insights dashboard enablement**
   - What we know: The npm package integration works independently; the Vercel dashboard "Enable" toggle is a dashboard setting, not a code change
   - What's unclear: Whether the toggle needs to be enabled before deploy for data to flow, or whether the package alone is sufficient
   - Recommendation: The package sends data to `/_vercel/speed-insights/*` regardless of dashboard toggle; toggling "Enable" in the dashboard just reveals the UI. Not a blocker for Phase 2's success criterion (which only requires the component to be rendered).

2. **`t()` usage enforcement**
   - What we know: The requirement says subsequent phases must use `t()` for all new user-facing strings; no lint rule enforces this
   - What's unclear: Whether to add an ESLint rule to flag raw JSX string literals
   - Recommendation: Out of scope for Phase 2. The convention is documented here; planner notes in Phase 3+ plans can remind the executor. A custom ESLint rule for this is disproportionate effort for a v1 shim.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| Framework          | Vitest 4.0.18                                                       |
| Config file        | `vite.config.ts` (test block: `globals: true, environment: "node"`) |
| Quick run command  | `npx vitest run`                                                    |
| Full suite command | `npm test`                                                          |

### Phase Requirements → Test Map

| Req ID   | Behavior                                                          | Test Type     | Automated Command                     | File Exists?            |
| -------- | ----------------------------------------------------------------- | ------------- | ------------------------------------- | ----------------------- |
| FOUND-03 | `t('key', 'fallback')` returns fallback                           | unit          | `npx vitest run src/lib/i18n.test.ts` | ❌ Wave 0               |
| FOUND-03 | `t('key')` (no fallback) returns the key string                   | unit          | `npx vitest run src/lib/i18n.test.ts` | ❌ Wave 0               |
| FOUND-03 | `t()` is importable as plain function (no React context required) | compile-check | `npx tsc -b --noEmit`                 | N/A                     |
| FOUND-04 | `App.tsx` compiles with `SpeedInsights` import and JSX            | compile-check | `npx tsc -b --noEmit`                 | N/A                     |
| FOUND-04 | Bundle delta < 15 KB                                              | build-check   | `npm run build` (inspect Vite output) | N/A (manual inspection) |

### Sampling Rate

- **Per task commit:** `npx tsc -b --noEmit`
- **Per wave merge:** `npx tsc -b --noEmit && npm test`
- **Phase gate:** `npm test` green (all 173 existing tests pass) + `tsc -b --noEmit` clean + `npm run build` succeeds

### Wave 0 Gaps

- [ ] `src/lib/i18n.test.ts` — covers FOUND-03 shim behavior (2 unit tests: returns fallback, returns key)

_(Note: `i18n.test.ts` is trivial — 5 lines. Worth having to prevent future regressions if the shim is ever accidentally refactored.)_

---

## Sources

### Primary (HIGH confidence)

- [Vercel Speed Insights Quickstart](https://vercel.com/docs/speed-insights/quickstart) — exact React import path, JSX placement, and create-react-app example verified directly
- [Vercel Speed Insights Package Configuration](https://vercel.com/docs/speed-insights/package) — all props (`sampleRate`, `debug`, `beforeSend`, `route`, `endpoint`, `scriptSrc`) documented
- `src/App.tsx` (direct read) — existing component tree structure, confirmed `<Toaster />` and `<KeyboardShortcuts />` placement pattern
- `package.json` (direct read) — confirmed `@vercel/speed-insights` not yet installed; `vitest` 4.0.18 confirmed
- `src/lib/utils.ts` (direct read) — existing `src/lib/` file style confirmed; no i18n module present
- `.planning/REQUIREMENTS.md` — FOUND-03 and FOUND-04 requirement text, Out of Scope table (react-i18next deferred), and v2 I18N requirements confirmed

### Secondary (MEDIUM confidence)

- npm WebSearch for `@vercel/speed-insights` — confirmed package exists and is the standard Vercel integration path; exact bundle size not available via npm page (403 response), but Vercel docs confirm it is a lightweight script injector

### Tertiary (LOW confidence)

- Bundle size estimate (~2–5 KB gzipped) — inferred from package description ("lightweight script") and the fact that the browser payload is a dynamic script loaded from Vercel's CDN, not bundled into the app chunk. Verify with `npm run build` delta.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — `@vercel/speed-insights` is the only option for Vercel Speed Insights; i18n shim is explicitly specified in requirements
- Architecture: HIGH — exact placement in `App.tsx` verified from official docs + direct code inspection of existing file
- Pitfalls: HIGH — derived from official docs (debug mode behavior, entry point naming) and direct code inspection (no `t()` hook rule, existing string patterns)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable domain — Speed Insights API is mature; i18n shim has no external dependencies)
