import { describe, it, expect } from "vitest";
import {
  calculateLPSentiment,
  generateLPPressureReport,
  generateLPReport,
  getLPEffects,
  calculateLPActionEffect,
} from "./lpSentiment";
import type { LPSentiment, Fund } from "./types";

// ============ Helpers ============

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    portfolio: [],
    fund: {
      name: "Test Fund",
      type: "national" as const,
      stage: "seed" as const,
      currentSize: 100_000_000,
      targetSize: 100_000_000,
      cashAvailable: 60_000_000,
      deployed: 40_000_000,
      currentMonth: 24,
      irrEstimate: 0.12,
      tvpiEstimate: 1.5,
      skillLevel: 1,
      rebirthCount: 0,
      yearStarted: 2024,
      managementFeeRate: 0.02,
      carryRate: 0.2,
      hurdleRate: 0.08,
      gpCommit: 1_000_000,
      totalFeesCharged: 0,
      carryAccrued: 0,
      totalDistributions: 0,
      gpEarnings: 0,
      geographicFocus: "global" as const,
      lpActionCooldowns: [],
      scenarioId: "sandbox" as const,
      timelineMode: "freeplay" as const,
      activeTimeGates: [],
      fundNumber: 1,
      nextFundUnlockTvpi: 2.0,
    },
    marketCycle: "normal" as const,
    incubatorBatches: [],
    labProjects: [],
    news: [],
    ...overrides,
  };
}

function makeCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    name: "TestCo",
    sector: "SaaS",
    stage: "seed",
    founderName: "Alice",
    founderState: "focused",
    status: "active",
    origin: "external",
    investedAmount: 5_000_000,
    ownership: 10,
    currentValuation: 8_000_000,
    multiple: 1.6,
    pmfScore: 55,
    metrics: {
      mrr: 80000,
      growthRate: 0.1,
      churn: 0.02,
      burnRate: 80000,
      runway: 12,
      customers: 100,
    },
    events: [],
    hiredTalent: [],
    milestones: [],
    coInvestors: [],
    relationship: 60,
    supportScore: 50,
    influence: "observer",
    monthInvested: 3,
    ...overrides,
  } as unknown;
}

// ============ calculateLPSentiment ============

describe("calculateLPSentiment", () => {
  it("returns a score between 0 and 100", () => {
    const result = calculateLPSentiment(makeState());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns correct level for score ranges", () => {
    // Empty portfolio → base score near 50 (neutral territory)
    const result = calculateLPSentiment(makeState());
    expect(["excellent", "good", "neutral", "concerned", "critical"]).toContain(
      result.level,
    );
  });

  it("has all 8 factors", () => {
    const result = calculateLPSentiment(makeState());
    expect(result.factors).toHaveProperty("portfolioPerformance");
    expect(result.factors).toHaveProperty("eventQuality");
    expect(result.factors).toHaveProperty("valuationMomentum");
    expect(result.factors).toHaveProperty("supportQuality");
    expect(result.factors).toHaveProperty("deploymentPace");
    expect(result.factors).toHaveProperty("labQuality");
    expect(result.factors).toHaveProperty("incubatorOutput");
    expect(result.factors).toHaveProperty("marketAdjustment");
  });

  it("higher multiples improve portfolio performance", () => {
    const low = calculateLPSentiment(
      makeState({
        portfolio: [makeCompany({ multiple: 0.5 })],
      }),
    );
    const high = calculateLPSentiment(
      makeState({
        portfolio: [makeCompany({ multiple: 3.0 })],
      }),
    );
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("bull market boosts sentiment", () => {
    const bear = calculateLPSentiment(makeState({ marketCycle: "hard" }));
    const bull = calculateLPSentiment(makeState({ marketCycle: "bull" }));
    expect(bull.score).toBeGreaterThan(bear.score);
  });

  it("clamped to [0, 100] even with extreme inputs", () => {
    // Many severely negative events
    const company = makeCompany({
      multiple: 0.1,
      supportScore: 0,
      metrics: {
        mrr: 1000,
        growthRate: -0.1,
        churn: 0.2,
        burnRate: 500000,
        runway: 1,
        customers: 2,
      },
      events: Array.from({ length: 10 }, (_, i) => ({
        id: `e${i}`,
        type: "cash_crunch",
        title: "Bad",
        description: "Bad",
        severity: "severe",
        sentiment: "negative",
        effects: {},
        month: 20,
      })),
    });
    const result = calculateLPSentiment(
      makeState({
        portfolio: [company],
        marketCycle: "hard",
        fund: { ...makeState().fund, tvpiEstimate: 0.3 },
      }),
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ============ generateLPPressureReport ============

describe("generateLPPressureReport", () => {
  it("returns expected shape", () => {
    const report = generateLPPressureReport(makeState());
    expect(report).toHaveProperty("year");
    expect(report).toHaveProperty("deploymentRating");
    expect(report).toHaveProperty("breakoutCompanies");
    expect(report).toHaveProperty("redFlagCount");
    expect(report).toHaveProperty("reservesRating");
    expect(report).toHaveProperty("studioROI");
    expect(report).toHaveProperty("overallGrade");
  });

  it("grade is A-F", () => {
    const report = generateLPPressureReport(makeState());
    expect(["A", "B", "C", "D", "F"]).toContain(report.overallGrade);
  });

  it("good fund stats yield strong ratings", () => {
    const report = generateLPPressureReport(
      makeState({
        fund: {
          ...makeState().fund,
          deployed: 40_000_000,
          cashAvailable: 60_000_000,
          tvpiEstimate: 2.5,
        },
      }),
    );
    expect(report.reservesRating).toBe("strong");
  });

  it("counts breakout companies", () => {
    const companies = [
      makeCompany({ id: "a", multiple: 4.0 }),
      makeCompany({ id: "b", multiple: 5.0 }),
      makeCompany({ id: "c", multiple: 1.0 }),
    ];
    const report = generateLPPressureReport(
      makeState({ portfolio: companies }),
    );
    expect(report.breakoutCompanies).toBe(2);
  });
});

// ============ generateLPReport ============

describe("generateLPReport", () => {
  it("returns expected shape", () => {
    const report = generateLPReport(makeState());
    expect(report).toHaveProperty("year");
    expect(report).toHaveProperty("irr");
    expect(report).toHaveProperty("tvpi");
    expect(report).toHaveProperty("highlights");
    expect(report).toHaveProperty("topPerformers");
    expect(report).toHaveProperty("exits");
    expect(report).toHaveProperty("writeOffs");
    expect(report).toHaveProperty("concerns");
    expect(report).toHaveProperty("marketNotes");
    expect(report).toHaveProperty("cashPosition");
    expect(Array.isArray(report.highlights)).toBe(true);
  });

  it("includes active company count in highlights", () => {
    const companies = [makeCompany({ id: "a" }), makeCompany({ id: "b" })];
    const report = generateLPReport(makeState({ portfolio: companies }));
    expect(report.highlights.some((h: string) => h.includes("2 active"))).toBe(
      true,
    );
  });

  it("market notes vary by cycle", () => {
    const bull = generateLPReport(makeState({ marketCycle: "bull" }));
    const hard = generateLPReport(makeState({ marketCycle: "hard" }));
    expect(bull.marketNotes).not.toBe(hard.marketNotes);
  });
});

// ============ getLPEffects ============

describe("getLPEffects", () => {
  it("neutral score (50) returns near-1.0 modifiers", () => {
    const sentiment: LPSentiment = {
      score: 50,
      level: "neutral",
      factors: {
        portfolioPerformance: 0,
        eventQuality: 0,
        valuationMomentum: 0,
        supportQuality: 0,
        deploymentPace: 0,
        labQuality: 0,
        incubatorOutput: 0,
        marketAdjustment: 0,
      },
      pressureReports: [],
    };
    const effects = getLPEffects(sentiment);
    expect(effects.commitmentMod).toBe(1.0);
    expect(effects.dealflowMod).toBe(1.0);
    expect(effects.founderTrustMod).toBe(0);
    expect(effects.coInvestorMod).toBe(1.0);
  });

  it("high score (100) returns max positive modifiers", () => {
    const sentiment: LPSentiment = {
      score: 100,
      level: "excellent",
      factors: {
        portfolioPerformance: 20,
        eventQuality: 15,
        valuationMomentum: 10,
        supportQuality: 10,
        deploymentPace: 10,
        labQuality: 10,
        incubatorOutput: 10,
        marketAdjustment: 15,
      },
      pressureReports: [],
    };
    const effects = getLPEffects(sentiment);
    expect(effects.commitmentMod).toBe(1.3);
    expect(effects.dealflowMod).toBe(1.2);
    expect(effects.founderTrustMod).toBe(15);
    expect(effects.coInvestorMod).toBe(1.25);
  });

  it("low score (0) returns min negative modifiers", () => {
    const sentiment: LPSentiment = {
      score: 0,
      level: "critical",
      factors: {
        portfolioPerformance: -20,
        eventQuality: -15,
        valuationMomentum: -10,
        supportQuality: -10,
        deploymentPace: -10,
        labQuality: -10,
        incubatorOutput: -10,
        marketAdjustment: -15,
      },
      pressureReports: [],
    };
    const effects = getLPEffects(sentiment);
    expect(effects.commitmentMod).toBe(0.7);
    expect(effects.dealflowMod).toBe(0.8);
    expect(effects.founderTrustMod).toBe(-15);
    expect(effects.coInvestorMod).toBe(0.75);
  });
});

// ============ calculateLPActionEffect ============

describe("calculateLPActionEffect", () => {
  const fund = makeState().fund as Fund;

  it("quarterly_update: always available, no cost, 3-month cooldown", () => {
    const result = calculateLPActionEffect("quarterly_update", 50, fund, []);
    expect(result.canPerform).toBe(true);
    expect(result.cashCost).toBe(0);
    expect(result.cooldownMonths).toBe(3);
    expect(result.sentimentDelta).toBeGreaterThanOrEqual(3);
    expect(result.sentimentDelta).toBeLessThanOrEqual(5);
  });

  it("oneonone_call: always available, no cost, 1-month cooldown", () => {
    const result = calculateLPActionEffect("oneonone_call", 50, fund, []);
    expect(result.canPerform).toBe(true);
    expect(result.cashCost).toBe(0);
    expect(result.cooldownMonths).toBe(1);
    expect(result.sentimentDelta).toBeGreaterThanOrEqual(2);
    expect(result.sentimentDelta).toBeLessThanOrEqual(3);
  });

  it("lp_day: blocked when sentiment < 30", () => {
    const result = calculateLPActionEffect("lp_day", 25, fund, []);
    expect(result.canPerform).toBe(false);
    expect(result.reason).toContain("30");
  });

  it("lp_day: succeeds when sentiment >= 30, incurs cost, 12-month cooldown", () => {
    const result = calculateLPActionEffect("lp_day", 50, fund, []);
    expect(result.canPerform).toBe(true);
    expect(result.cashCost).toBeGreaterThan(0);
    expect(result.cooldownMonths).toBe(12);
    expect(result.sentimentDelta).toBeGreaterThanOrEqual(8);
    expect(result.sentimentDelta).toBeLessThanOrEqual(12);
  });

  it("lp_day: blocked when cash is insufficient", () => {
    const brokeFund = { ...fund, cashAvailable: 0 };
    const result = calculateLPActionEffect("lp_day", 50, brokeFund, []);
    expect(result.canPerform).toBe(false);
    expect(result.reason).toContain("cash");
  });

  it("coinvest_opportunity: blocked with empty portfolio", () => {
    const result = calculateLPActionEffect(
      "coinvest_opportunity",
      50,
      fund,
      [],
    );
    expect(result.canPerform).toBe(false);
  });

  it("coinvest_opportunity: blocked when no company has multiple > 1.5", () => {
    const portfolio = [makeCompany({ multiple: 1.2 })] as ReturnType<
      typeof makeCompany
    >[];
    const result = calculateLPActionEffect(
      "coinvest_opportunity",
      50,
      fund,
      portfolio as never,
    );
    expect(result.canPerform).toBe(false);
  });

  it("coinvest_opportunity: succeeds with active company multiple > 1.5", () => {
    const portfolio = [
      makeCompany({ multiple: 2.0, status: "active" }),
    ] as ReturnType<typeof makeCompany>[];
    const result = calculateLPActionEffect(
      "coinvest_opportunity",
      50,
      fund,
      portfolio as never,
    );
    expect(result.canPerform).toBe(true);
    expect(result.cooldownMonths).toBe(6);
    expect(result.sentimentDelta).toBeGreaterThanOrEqual(5);
    expect(result.sentimentDelta).toBeLessThanOrEqual(8);
  });

  it("early_distribution: blocked before year 3 (month < 24)", () => {
    const earlyFund = { ...fund, currentMonth: 12 };
    const result = calculateLPActionEffect(
      "early_distribution",
      50,
      earlyFund,
      [],
      { amount: 1_000_000 },
    );
    expect(result.canPerform).toBe(false);
    expect(result.reason).toContain("Year 3");
  });

  it("early_distribution: blocked without amount specified", () => {
    const lateFund = { ...fund, currentMonth: 36 };
    const result = calculateLPActionEffect(
      "early_distribution",
      50,
      lateFund,
      [],
    );
    expect(result.canPerform).toBe(false);
    expect(result.reason).toContain("amount");
  });

  it("early_distribution: blocked when amount exceeds cash", () => {
    const lateFund = { ...fund, currentMonth: 36, cashAvailable: 100_000 };
    const result = calculateLPActionEffect(
      "early_distribution",
      50,
      lateFund,
      [],
      { amount: 5_000_000 },
    );
    expect(result.canPerform).toBe(false);
    expect(result.reason).toContain("cash");
  });

  it("early_distribution: succeeds in year 3+, scales sentiment with amount", () => {
    const lateFund = { ...fund, currentMonth: 36 };
    const small = calculateLPActionEffect(
      "early_distribution",
      50,
      lateFund,
      [],
      { amount: 100_000 },
    );
    const large = calculateLPActionEffect(
      "early_distribution",
      50,
      lateFund,
      [],
      { amount: 10_000_000 },
    );
    expect(small.canPerform).toBe(true);
    expect(large.canPerform).toBe(true);
    expect(large.sentimentDelta).toBeGreaterThanOrEqual(small.sentimentDelta);
    expect(small.cooldownMonths).toBe(6);
  });

  it("returns canPerform: false when action is on cooldown", () => {
    const fundOnCooldown = {
      ...fund,
      lpActionCooldowns: [
        { actionType: "quarterly_update" as const, availableFromMonth: 99 },
      ],
    };
    const result = calculateLPActionEffect(
      "quarterly_update",
      50,
      fundOnCooldown,
      [],
    );
    expect(result.canPerform).toBe(false);
    expect(result.reason).toContain("Available");
  });

  it("ignores expired cooldowns", () => {
    const fundExpiredCooldown = {
      ...fund,
      currentMonth: 30,
      lpActionCooldowns: [
        { actionType: "quarterly_update" as const, availableFromMonth: 10 },
      ],
    };
    const result = calculateLPActionEffect(
      "quarterly_update",
      50,
      fundExpiredCooldown,
      [],
    );
    expect(result.canPerform).toBe(true);
  });
});
