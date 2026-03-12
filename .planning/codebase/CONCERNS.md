# Codebase Concerns

**Analysis Date:** 2026-03-11

## Tech Debt

**God File — gameState.ts:**

- Issue: Single Zustand store file is 3,232 lines containing the entire game loop, all actions, all helper functions, news generators, board meeting templates, milestone logic, and the persist config. This is far beyond a manageable single-file scope.
- Files: `src/engine/gameState.ts`
- Impact: Any modification risks unintended side effects on unrelated game systems. Hard to test individual slices. Slow TypeScript compilation for this file.
- Fix approach: Split into domain slices — `gameLoop.ts` (advanceTime), `fundActions.ts` (invest/followOn/buyout), `boardActions.ts` (board meetings), and use Zustand slices pattern.

**Large Page Components:**

- Issue: `Portfolio.tsx` (1,610 lines), `Results.tsx` (1,259 lines), `Reports.tsx` (1,179 lines), `Dashboard.tsx` (1,091 lines) each contain embedded sub-components, helpers, constants, and display logic all in a single file.
- Files: `src/pages/Portfolio.tsx`, `src/pages/Results.tsx`, `src/pages/Reports.tsx`, `src/pages/Dashboard.tsx`
- Impact: Difficult to maintain and unit test individual sections (e.g., cap table, board meeting tab, benchmark section). Minor changes require navigating 1000+ line files.
- Fix approach: Extract tab content into separate components: `src/components/portfolio/CapTableTab.tsx`, `src/components/portfolio/BoardMeetingTab.tsx`, etc.

**Duplicate Scenario Win-Check Logic:**

- Issue: The scenario win condition evaluation block (all 7 condition types) is copy-pasted verbatim twice inside `advanceTime()` — once for early-exit detection and once for end-of-month-120 resolution.
- Files: `src/engine/gameState.ts` (lines ~1460-1489 and ~1506-1535, then ~2026-2069 and ~2087-2140)
- Impact: Any new scenario condition type must be added in two places; divergence over time is likely.
- Fix approach: Extract `checkScenarioWinConditions(sc, fund, portfolio, state)` pure helper and call it from both sites.

**Inline import() Type Cast:**

- Issue: `level: newLevel as import("./types").LPSentimentLevel` uses an inline dynamic import for the type cast instead of importing the type at the top of the file.
- Files: `src/engine/gameState.ts` (line 2286)
- Impact: Non-idiomatic; can confuse tooling and future readers.
- Fix approach: Add `LPSentimentLevel` to the existing type import block at the top of `gameState.ts`.

**Unsafe Rebirth State Hack:**

- Issue: `rebirth()` action sets `fund: { skillLevel, rebirthCount } as unknown as Fund` — casting an incomplete object to `Fund` type to communicate values to the setup wizard. This bypasses TypeScript completely.
- Files: `src/engine/gameState.ts` (line 3109)
- Impact: Any code reading `state.fund` after rebirth but before `initFund()` may crash on missing fields (e.g., `fund.cashAvailable`).
- Fix approach: Add dedicated `pendingRebirth: { skillLevel: number; rebirthCount: number } | null` field to `GameState` instead of misusing the `fund` field.

**`next-themes` Unused Dependency:**

- Issue: `next-themes` is listed in `package.json` as a production dependency but no import of it exists anywhere in the codebase (the Sonner toaster was hardcoded to `theme="dark"` instead).
- Files: `package.json`
- Impact: Unnecessary bundle weight (~10KB) and misleading dependency list.
- Fix approach: `npm uninstall next-themes`.

## Known Bugs

**Fund II Offer Fires Every Year After Year 7:**

- Symptoms: A new `fund_ii_offer` fundraising event is pushed unconditionally every time the year-end check runs while `year >= 7 && sentiment.score > 65 && fund.tvpiEstimate > 1.5`. No deduplication guard exists.
- Files: `src/engine/gameState.ts` (lines 1884-1906)
- Trigger: Reach year 7+ with good performance and advance time each month. Year-end triggers every 12 months.
- Workaround: None. The fundraisingEvents list accumulates duplicate Fund II offers at years 7, 8, 9, and 10.
- Fix: Guard with `!state.fundraisingEvents.some(e => e.type === 'fund_ii_offer')` before pushing.

**Capital Call Fires Every Year After Year 3 Conditions Met:**

- Symptoms: Capital call event (and the associated `fund.cashAvailable += callAmount; fund.currentSize += callAmount;`) triggers unconditionally every single year once `deployed > 70% && sentiment > 55 && year >= 3`. No deduplication.
- Files: `src/engine/gameState.ts` (lines 1813-1841)
- Trigger: Stay well-deployed with good LP sentiment from year 3 onward.
- Impact: Fund size and cash grow unboundedly; TVPI is calculated against inflated `currentSize`, distorting results.
- Fix: Guard with a cap (e.g., max 2 capital calls total) or a per-year flag.

**LP Distribution Fires Every Year After Conditions Met:**

- Symptoms: Same pattern as capital call — the distribution amount is deducted from `cashAvailable` every year-end after `totalExitValue > currentSize * 20% && year >= 4`, with no yearly deduplication.
- Files: `src/engine/gameState.ts` (lines 1844-1881)
- Trigger: Have exits > 20% of fund size from year 4 onward.
- Impact: Repeated distributions can drain `cashAvailable` to zero. Combined with the capital call bug, the net effect is unpredictable.

**Module-Level `_profitableStreak` Map Leaks Between Games:**

- Symptoms: `_profitableStreak` is a `Map<string, number>` at module scope (not inside the store). It persists across `resetGame()` and `rebirth()`, meaning profitable streak counts from a prior game carry over.
- Files: `src/engine/gameState.ts` (line 504)
- Trigger: Complete a game, start a new game, and a company with the same UUID (unlikely but possible) could inherit old streak data; or data simply never gets cleaned up.
- Impact: Low severity (UUIDs are random, no collision expected), but the module-level mutable state is an architectural leak.
- Fix: Move `_profitableStreak` into game state or clear it in `resetGame()` / `rebirth()`.

**eslint-disable Comment Suppresses React Hook Dependency Warning:**

- Symptoms: `// eslint-disable-next-line react-hooks/exhaustive-deps` suppresses a hook dependency warning in `Results.tsx` around the leaderboard submission `useEffect`.
- Files: `src/pages/Results.tsx` (line 197)
- Trigger: The effect fires when `scoreSubmitted` changes but does not include all referenced variables in its dependency array.
- Impact: If the dependencies change, the stale closure might submit incorrect leaderboard data or submit multiple times.

## Security Considerations

**FRED API Key Exposed in Client Bundle:**

- Risk: `VITE_FRED_API_KEY` is embedded in the client-side JavaScript bundle at build time. Anyone can view the key by inspecting the bundle.
- Files: `src/engine/economicData.ts` (line 307-311)
- Current mitigation: The FRED API key has read-only access and limited rate limits; no payment data is involved.
- Recommendations: For a production app, proxy the FRED API through a serverless function so the key never reaches the client. For this game, the risk is low (free API key, no sensitive data).

**Unvalidated `JSON.parse` on `localStorage` Data:**

- Risk: `saveToSlot`, `loadFromSlot`, `getSaveSlots`, `getLeaderboard`, `getCachedLiveData` all call `JSON.parse` on localStorage values. While wrapped in `try/catch`, the parsed result is cast to a typed interface with no runtime validation.
- Files: `src/engine/saveSlots.ts` (lines 14, 50), `src/engine/leaderboard.ts` (line 14), `src/engine/economicData.ts` (line 348)
- Current mitigation: `try/catch` prevents crashes on malformed JSON; Zustand's `merge` function backfills missing fields.
- Recommendations: A lightweight runtime validator (e.g., checking required fields exist and are the right type) before hydrating game state would prevent corrupted saves from causing subtle gameplay bugs.

**`ErrorBoundary.handleResetGame()` Nukes Save Without Confirmation:**

- Risk: The "Reset Game" button in the error boundary calls `localStorage.removeItem("vencap-game-state")` and redirects immediately, with no confirmation dialog.
- Files: `src/components/ErrorBoundary.tsx` (lines 33-40)
- Current mitigation: Only reachable in an error state.
- Recommendations: Add a confirmation prompt or at minimum rename the button to "Delete Save & Restart" to signal irreversibility.

## Performance Bottlenecks

**Unbounded `dealPipeline` Array Growth:**

- Problem: Each `advanceTime()` appends 1-5 new deals to `dealPipeline` without any cap. After 120 months, the pipeline can contain 180-600 Startup objects that were never reviewed (user sees only current page).
- Files: `src/engine/gameState.ts` (line 2191: `dealPipeline: [...state.dealPipeline, ...newDeals]`)
- Cause: No eviction/cap logic. Deals are only removed when the user invests or passes on them.
- Improvement path: Cap the pipeline to a max of 20-30 items and evict the oldest when appending new ones.

**Unbounded `news` Array Growth:**

- Problem: Each `advanceTime()` appends 3-8 news items. Over 120 months, the news array grows to 360-960 items and is stored in full in localStorage.
- Files: `src/engine/gameState.ts` (line 2193: `news: [...state.news, ...newNews]`)
- Cause: No eviction logic.
- Improvement path: Cap at ~200 recent items: `news: [...state.news, ...newNews].slice(-200)`.

**Deep Clone for Undo History (`JSON.parse(JSON.stringify(...))`):**

- Problem: `captureSnapshot()` serializes the entire game state (portfolio, events, news, pipeline, etc.) via `JSON.parse(JSON.stringify(...))` every single turn, storing up to 3 copies.
- Files: `src/engine/gameState.ts` (lines 441-473)
- Cause: Simple but expensive deep clone. For a large late-game state, the portfolio + events array alone can be several hundred KB.
- Improvement path: Use structured clone (`structuredClone(...)`) which is faster than JSON round-trip, or snapshot only the fields that actually change each turn (fund + portfolio status).

**`advanceTime()` Runs All Computation Synchronously on the Main Thread:**

- Problem: The entire game loop — portfolio iteration (O(n companies) \* O(events)), news generation, achievement checks, economic data calculation — runs synchronously inside a single Zustand `set()` call. With large portfolios in late-game, this can block the UI thread for tens of milliseconds.
- Files: `src/engine/gameState.ts` (lines 749-2211)
- Cause: Single synchronous function with no yielding.
- Improvement path: Move heavy computation to a Web Worker and only `set()` the final computed state.

## Fragile Areas

**Zustand `merge` Function for Save Compatibility:**

- Files: `src/engine/gameState.ts` (lines 2326-2369)
- Why fragile: Every time a new field is added to `GameState` or `Fund`, a manual backfill line must be added to the `merge` function or old saves will have `undefined` values that crash the game. There is no exhaustiveness check.
- Safe modification: Always add a backfill line for every new field added to `Fund` or `GameState`. Pattern: `if (merged.newField === undefined) merged.newField = defaultValue;`
- Test coverage: `gameState.test.ts` does not test `merge` behavior with old-format saved state.

**Market Cycle Transition Logic:**

- Files: `src/engine/gameState.ts` (lines 105-116)
- Why fragile: `getNextCycle()` uses `indexOf` on a hardcoded `CYCLE_ORDER` array. The comment says "Cycle: bull → normal → cooldown → hard → normal → bull" but the code uses `(idx + 1) % CYCLE_ORDER.length` which wraps `hard` (index 3) back to `bull` (index 0), not to `normal`. The special case `if (current === 'hard') return 'normal'` corrects this but is easy to miss when modifying the cycle order.
- Safe modification: Test any changes to `CYCLE_ORDER` with explicit assertions for all transition cases.
- Test coverage: Not directly tested in `gameState.test.ts`.

**Scenario Win Condition Fallthrough Returns `false`:**

- Files: `src/engine/gameState.ts` (lines 1488, 2068, 2139)
- Why fragile: Each `winConditions.every(cond => {...})` block ends with `return false` for any unrecognized condition type. Adding a new scenario with a new condition type without updating all three evaluation sites will cause the win condition to silently never be satisfied.
- Safe modification: When adding a new `ScenarioWinCondition` type, search for all three evaluation sites and add the handler to each.

**`saveToSlot` Strips Actions via Runtime Type Check:**

- Files: `src/engine/gameState.ts` (lines 3156-3162), `src/engine/saveSlots.ts`
- Why fragile: Actions are stripped from the saved state by iterating `Object.entries(state)` and filtering out function-valued keys. If a state field is ever named with an ambiguous type (e.g., a field storing a function reference for game purposes), it would be silently dropped from saves.
- Safe modification: Use explicit allowlist of fields to save rather than denylisting functions.

## Scaling Limits

**localStorage Quota (~5-10MB):**

- Current capacity: A late-game save (120 months) with many portfolio companies and full news history can exceed 2-3MB. Save slots add up to 3 additional copies. FRED cache adds another entry.
- Limit: Browser localStorage quota is typically 5-10MB per origin. With 3 save slots + main game state + leaderboard + FRED cache, the combined size can approach the limit.
- Scaling path: Implement news eviction (cap at 200 items), cap deal pipeline (20 items max), and compress event history per company.

## Dependencies at Risk

**`next-themes` (Unused):**

- Risk: Listed in production `dependencies` but never imported. Wastes bundle budget and can cause confusion.
- Impact: Negligible runtime impact (tree-shaken by Vite), but misrepresents the project's actual dependencies.
- Migration plan: `npm uninstall next-themes`.

## Missing Critical Features

**No Persistence Migration Version:**

- Problem: The Zustand `persist` config has no `version` field or `migrate` function. As the game evolves and fields change shape (not just addition/removal), there is no structured migration path for old saves. The `merge` function handles missing fields but cannot handle field renames or type changes.
- Blocks: Safe evolution of `Fund`, `PortfolioCompany`, and `GameState` interfaces without potentially corrupting existing player saves.

**No Cap on `company.events` Array:**

- Problem: Each `PortfolioCompany` accumulates `DynamicEvent` objects every month via `company.events = [...company.events, ...appliedEvents]`. Over 120 months, a company active from month 0 can have 120+ event objects stored in state (and localStorage).
- Files: `src/engine/gameState.ts` (line 939: `company.events = [...company.events, ...appliedEvents]`)
- Blocks: Controlled localStorage footprint. Also impacts the undo snapshot size since all events are deep-cloned per snapshot.

## Test Coverage Gaps

**`advanceTime()` Fund II/Capital Call/Distribution Repeat Bug:**

- What's not tested: The yearly fundraising event generation (capital call, distribution, fund_ii_offer) has no test asserting these fire at most once or deduplicating correctly.
- Files: `src/engine/gameState.test.ts`, `src/engine/gameState.ts`
- Risk: The known repeat-fire bugs described above go undetected by the test suite.
- Priority: High

**Save/Load Slot Roundtrip:**

- What's not tested: `saveToSlot` / `loadFromSlot` cycle is not tested. The `merge` function with old-format state (missing fields) is not tested.
- Files: `src/engine/gameState.test.ts`, `src/engine/saveSlots.ts`
- Risk: Format changes can silently corrupt saves without test failures.
- Priority: High

**`_profitableStreak` Module-Level State Reset:**

- What's not tested: No test verifies that `resetGame()` or `rebirth()` clears the `_profitableStreak` map.
- Files: `src/engine/gameState.ts` (line 504)
- Risk: The milestone 'profitable' could fire incorrectly across game sessions.
- Priority: Low

**Scenario Win/Fail Condition Evaluation:**

- What's not tested: Individual scenario win condition logic is not unit tested. `scenarios.test.ts` covers scenario definitions but not the actual evaluation logic embedded in `advanceTime()`.
- Files: `src/engine/gameState.test.ts`
- Risk: Adding a new condition type or refactoring existing ones could break scenario completion without detection.
- Priority: Medium

---

_Concerns audit: 2026-03-11_
