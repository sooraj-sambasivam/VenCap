# Testing Patterns

**Analysis Date:** 2026-03-11

## Test Framework

**Unit/Integration Runner:**

- Vitest v4 (configured via `vite.config.ts`)
- Config: `vite.config.ts` — `test.environment: 'node'`, `test.globals: true`, `test.include: ['src/**/*.test.ts']`

**E2E Runner:**

- Playwright — config at `playwright.config.ts`
- Target browser: Chromium (Desktop Chrome)
- Base URL: `http://localhost:5173`

**Assertion Library:**

- Vitest built-in `expect` (for unit tests)
- Playwright built-in `expect` (for E2E tests)

**Run Commands:**

```bash
npm test              # Run all unit/integration tests (vitest run)
npm run test:watch    # Watch mode (vitest)
npx playwright test   # Run E2E tests (requires dev server)
```

## Test File Organization

**Location:**

- Unit/integration tests: co-located with engine source files in `src/engine/`
- E2E tests: separate `e2e/` directory at project root

**Naming:**

- Unit/integration: `{module}.test.ts` — `vcRealism.test.ts`, `gameState.test.ts`, `lpSentiment.test.ts`
- E2E: `{feature}.spec.ts` — `full-lifecycle.spec.ts`

**Structure:**

```
src/engine/
├── gameState.ts
├── gameState.test.ts        # Integration tests for Zustand store
├── vcRealism.ts
├── vcRealism.test.ts        # Unit tests for pure functions
├── lpSentiment.ts
├── lpSentiment.test.ts
├── dynamicEvents.ts
├── dynamicEvents.test.ts
├── mockData.ts
├── mockData.test.ts
├── scenarios.ts
├── scenarios.test.ts
├── benchmarkData.ts
├── benchmarkData.test.ts
├── difficultyScaling.ts
├── difficultyScaling.test.ts
└── talentMarket.ts
    talentMarket.test.ts
e2e/
└── full-lifecycle.spec.ts   # Playwright browser tests
```

## Test Structure

**Suite Organization:**

```typescript
// ============ Section Label ============

describe("functionName", () => {
  it("describes expected behavior in plain English", () => {
    // arrange
    const result = functionName(input);
    // assert
    expect(result.field).toBe(expectedValue);
  });
});
```

Multiple `describe` blocks per file, grouped by function. Each `describe` name matches the exported function being tested. Section divider comments (`// ============ functionName ============`) precede each `describe` block.

**Setup/Teardown:**

- `beforeEach` used only in `gameState.test.ts` to reset Zustand store state before each test
- No `afterEach` or `afterAll` hooks present
- No global setup/teardown files

**Store Reset Pattern (gameState.test.ts only):**

```typescript
function resetStore() {
  useGameStore.setState(useGameStore.getInitialState());
}

describe("Suite Name", () => {
  beforeEach(() => {
    resetStore();
  });
  // ...
});
```

## Mocking

**Framework:** None — no `vi.mock()`, `vi.fn()`, or `vi.spyOn()` used anywhere

**Approach:** All engine functions are pure (no I/O, no network), so no mocking is needed. Zustand store is tested directly by calling `useGameStore.getState()` and `useGameStore.setState()`.

**What is NOT mocked:**

- `Math.random()` — probabilistic tests run many iterations instead (50-5000 loops)
- Zustand store — imported directly and manipulated via `setState`/`getState`
- localStorage — not involved in unit tests (Zustand persist middleware is effectively bypassed by `setState`)

## Fixtures and Factories

**Pattern:** Module-local factory functions named `makeCompany()`, `makeState()`, `makeCandidate()`, `makeEvent()`

**Factory Example:**

```typescript
function makeCompany(
  overrides: Partial<PortfolioCompany> = {},
): PortfolioCompany {
  return {
    id: "c1",
    name: "TestCo",
    sector: "SaaS",
    stage: "seed",
    // ... all required fields with sensible defaults
    ...overrides,
  } as PortfolioCompany;
}
```

**State Factory Example (lpSentiment.test.ts):**

```typescript
function makeState(overrides: Record<string, unknown> = {}) {
  return {
    portfolio: [],
    fund: {
      /* full Fund object with defaults */
    },
    marketCycle: "normal" as const,
    // ...
    ...overrides,
  };
}
```

**Location:** Defined at the top of each test file, not shared across files. Each test file defines its own factories independently. There is no shared fixtures directory.

**Fund Initialization Helper (gameState.test.ts):**

```typescript
function initDefaultFund() {
  useGameStore.getState().initFund({
    name: "Test Fund I",
    type: "national",
    stage: "seed",
    targetSize: 100_000_000,
    currentSize: 100_000_000,
    skillLevel: 1,
    rebirthCount: 0,
    scenarioId: "sandbox",
  });
}
```

## Coverage

**Requirements:** None enforced — no coverage thresholds configured

**View Coverage:**

```bash
npx vitest run --coverage   # (not configured by default; add @vitest/coverage-v8 if needed)
```

**Coverage scope:** Only engine modules have tests. React pages and components have no unit tests — covered only by Playwright E2E.

## Test Types

**Unit Tests (`src/engine/*.test.ts`):**

- Scope: individual pure functions in engine modules
- Approach: call function with controlled inputs, assert on output shape/values
- Examples: `getOwnershipLimits('seed')`, `adjustOwnershipForRelationship(10, 80)`, `getBenchmarkForFund(...)`

**Integration Tests (`src/engine/gameState.test.ts`):**

- Scope: full Zustand store including `advanceTime()` game loop across all 120 months
- Two describe suites: `Full Lifecycle Integration Tests` and `Edge Case Tests`
- Tests run the full game loop end-to-end: init fund → advance months → verify final state
- Tests verify undo, LP actions, board meetings, scenario win conditions, and zero-cash edge cases

**E2E Tests (`e2e/full-lifecycle.spec.ts`):**

- Framework: Playwright (Chromium)
- Scope: browser-rendered UI interactions — fund setup wizard, navigation, time advancement, empty states
- Approach: each test clears localStorage, completes the wizard, then performs one interaction
- State setup via UI only (no API seeding) — wizard steps are repeated in each test

## Common Patterns

**Probabilistic Testing (for random functions):**

```typescript
it("generates events over many iterations (not always empty)", () => {
  let totalEvents = 0;
  for (let i = 0; i < 100; i++) {
    totalEvents += generateMonthlyEvents(makeCompany(), "normal").length;
  }
  expect(totalEvents).toBeGreaterThan(0);
});
```

Probabilistic tests use 50–5000 iterations. The `dynamicEvents.test.ts` sector filtering tests use up to 5000 iterations to confirm rare events (1-4% probability) fire for eligible sectors and never fire for ineligible ones.

**Range Assertions:**

```typescript
expect(result.probability).toBeGreaterThanOrEqual(0);
expect(result.probability).toBeLessThanOrEqual(1);
expect(result.sentimentDelta).toBeGreaterThanOrEqual(3);
expect(result.sentimentDelta).toBeLessThanOrEqual(5);
```

**Comparative Assertions (testing relative behavior):**

```typescript
it("higher multiples improve portfolio performance", () => {
  const low = calculateLPSentiment(
    makeState({ portfolio: [makeCompany({ multiple: 0.5 })] }),
  );
  const high = calculateLPSentiment(
    makeState({ portfolio: [makeCompany({ multiple: 3.0 })] }),
  );
  expect(high.score).toBeGreaterThan(low.score);
});
```

**Crash Prevention Tests:**

```typescript
it("completes 120 months without throwing", () => {
  initDefaultFund();
  for (let i = 0; i < 120; i++) {
    const s = useGameStore.getState();
    if (s.gamePhase === "ended") break;
    expect(() => s.advanceTime()).not.toThrow();
  }
  expect(finalState.gamePhase).toBe("ended");
});
```

**Shape Validation:**

```typescript
it("returns expected shape", () => {
  const report = generateLPPressureReport(makeState());
  expect(report).toHaveProperty("year");
  expect(report).toHaveProperty("deploymentRating");
  expect(report).toHaveProperty("overallGrade");
});
```

**Async Testing:**

- No async tests in unit suite (all engine code is synchronous)
- Playwright tests use `async/await` throughout with `page.goto()`, `page.getByRole()`, `expect(page).toHaveURL()`

**E2E State Cleanup:**

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("vencap-game-state"));
  await page.reload();
});
```

---

_Testing analysis: 2026-03-11_
