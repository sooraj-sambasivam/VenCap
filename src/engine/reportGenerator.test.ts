import { describe, it, expect } from "vitest";
import { buildReport, streamReport } from "./reportGenerator";
import type { ReportContext } from "./reportGenerator";
import type { Fund, PortfolioCompany, LPSentiment } from "./types";

// ---------- minimal fixtures ----------

function makeFund(overrides: Partial<Fund> = {}): Fund {
  return {
    name: "Test Fund I",
    type: "national",
    stage: "seed",
    targetSize: 100_000_000,
    currentSize: 100_000_000,
    cashAvailable: 60_000_000,
    deployed: 40_000_000,
    tvpiEstimate: 1.8,
    irrEstimate: 0.15,
    yearStarted: 2024,
    currentMonth: 36,
    skillLevel: 1,
    rebirthCount: 0,
    managementFeeRate: 0.02,
    carryRate: 0.2,
    hurdleRate: 0.08,
    gpCommit: 1_000_000,
    totalFeesCharged: 6_000_000,
    carryAccrued: 2_000_000,
    totalDistributions: 5_000_000,
    gpEarnings: 0,
    geographicFocus: "global",
    lpActionCooldowns: [],
    scenarioId: "sandbox",
    ...overrides,
  } as Fund;
}

function makeCompany(
  overrides: Partial<PortfolioCompany> = {},
): PortfolioCompany {
  return {
    id: "co-1",
    name: "TestCo",
    sector: "SaaS",
    stage: "seed",
    description: "A test company",
    founderName: "Alice",
    founderTraits: { grit: 8, clarity: 7, charisma: 6, experience: 5 },
    teamSize: 10,
    unitEconomics: {
      cac: 100,
      ltv: 1000,
      ltvCacRatio: 10,
      grossMargin: 80,
      paybackMonths: 3,
    },
    metrics: {
      mrr: 50000,
      growthRate: 0.1,
      customers: 100,
      churn: 0.02,
      burnRate: 80000,
      runway: 18,
    },
    marketData: {
      tamSize: 1_000_000_000,
      tamGrowthRate: 0.15,
      competitionLevel: "medium",
    },
    valuation: 5_000_000,
    strengths: ["Strong team", "Growing market"],
    risks: ["High burn rate"],
    redFlags: [],
    ddNotes: [],
    discoverySource: "referral",
    founderWillingness: 80,
    coInvestors: [],
    region: "silicon_valley",
    investedAmount: 2_000_000,
    followOnInvested: 500_000,
    ownership: 15,
    currentValuation: 10_000_000,
    multiple: 5.0,
    status: "active",
    origin: "external",
    founderState: "focused",
    pmfScore: 72,
    relationship: 80,
    supportScore: 65,
    influence: "board_seat",
    monthInvested: 6,
    events: [
      {
        id: "ev-1",
        type: "tech",
        title: "Product Launch",
        description: "Shipped v2",
        severity: "minor",
        sentiment: "positive",
        effects: {},
        month: 24,
      },
    ],
    milestones: ["first_revenue"],
    hiredTalent: [],
    ...overrides,
  } as PortfolioCompany;
}

const baseSentiment: LPSentiment = {
  score: 65,
  level: "good",
  factors: {
    portfolioPerformance: 10,
    eventQuality: 5,
    valuationMomentum: 8,
    supportQuality: 5,
    deploymentPace: 3,
    labQuality: 0,
    incubatorOutput: 0,
    marketAdjustment: 0,
  },
  pressureReports: [],
};

function makeCtx(overrides: Partial<ReportContext> = {}): ReportContext {
  return {
    fund: makeFund(),
    portfolio: [makeCompany()],
    lpSentiment: baseSentiment,
    marketCycle: "normal",
    ...overrides,
  };
}

// ---------- tests ----------

describe("reportGenerator — buildReport", () => {
  it("generates portfolio_summary with fund name", () => {
    const text = buildReport({ type: "portfolio_summary" }, makeCtx());
    expect(text).toContain("# Portfolio Summary — Test Fund I");
    expect(text).toContain("1.8x");
    expect(text).toContain("TestCo");
  });

  it("generates deal_memo for specific company", () => {
    const text = buildReport(
      { type: "deal_memo", companyId: "co-1" },
      makeCtx(),
    );
    expect(text).toContain("# Deal Memo — TestCo");
    expect(text).toContain("seed stage");
    expect(text).toContain("Alice");
    expect(text).toContain("## Recommendation");
  });

  it("deal_memo for unknown company shows error", () => {
    const text = buildReport(
      { type: "deal_memo", companyId: "nope" },
      makeCtx(),
    );
    expect(text).toContain("No company found");
  });

  it("generates lp_update with quarter info", () => {
    const text = buildReport({ type: "lp_update" }, makeCtx());
    expect(text).toContain("# LP Quarterly Update");
    expect(text).toContain("Dear Limited Partners");
    expect(text).toContain("Net TVPI");
  });

  it("generates market_analysis with sector data", () => {
    const text = buildReport(
      { type: "market_analysis", sector: "SaaS" },
      makeCtx(),
    );
    expect(text).toContain("# Market Analysis — SaaS");
    expect(text).toContain("TestCo");
    expect(text).toContain("Deployment Outlook");
  });

  it("market_analysis without sector uses General", () => {
    const text = buildReport({ type: "market_analysis" }, makeCtx());
    expect(text).toContain("# Market Analysis — General");
  });

  it("portfolio_summary handles empty portfolio", () => {
    const text = buildReport(
      { type: "portfolio_summary" },
      makeCtx({ portfolio: [] }),
    );
    expect(text).toContain("0 active companies");
  });

  it("deal_memo recommendation varies with performance", () => {
    // Weak company
    const weak = makeCompany({
      multiple: 0.5,
      pmfScore: 20,
      metrics: { ...makeCompany().metrics, runway: 3 },
    });
    const text = buildReport(
      { type: "deal_memo", companyId: "co-1" },
      makeCtx({ portfolio: [weak] }),
    );
    expect(text).toContain("at risk");
  });
});

describe("reportGenerator — streamReport", () => {
  it("streams the full text in chunks", async () => {
    const ctx = makeCtx();
    let accumulated = "";
    for await (const chunk of streamReport(
      { type: "portfolio_summary" },
      ctx,
    )) {
      accumulated += chunk;
    }
    // Should contain key sections (can't exact-match due to pickRandom)
    expect(accumulated).toContain("# Portfolio Summary — Test Fund I");
    expect(accumulated).toContain("## Overview");
    expect(accumulated).toContain("## Outlook");
    expect(accumulated.trim().length).toBeGreaterThan(200);
  });

  it("respects abort signal", async () => {
    const abort = new AbortController();
    const ctx = makeCtx();
    let chunks = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of streamReport(
        { type: "lp_update" },
        ctx,
        abort.signal,
      )) {
        chunks++;
        if (chunks >= 3) abort.abort();
      }
    } catch (err) {
      // AbortError is expected
      expect((err as Error).name).toBe("AbortError");
    }

    expect(chunks).toBeGreaterThanOrEqual(3);
    expect(chunks).toBeLessThan(500); // Didn't stream everything
  });
});
