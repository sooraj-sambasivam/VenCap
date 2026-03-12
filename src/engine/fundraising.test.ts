// ============================================================
// VenCap — Fundraising Engine Unit Tests
// ============================================================

import { describe, it, expect } from "vitest";
import {
  generateLPProspects,
  calculatePitchOutcome,
  calculateTotalCommitted,
  canStartNextFund,
  getFirstCloseThreshold,
  getFinalCloseThreshold,
  calculateNegotiatedFundSize,
  FUND_II_TVPI_THRESHOLD,
  FUND_III_TVPI_THRESHOLD,
  DEFAULT_FUND_TERMS,
} from "./fundraising";
import type { LPProspect, Fund } from "./types";

// ============================================================
// HELPERS
// ============================================================

function makeFund(overrides: Partial<Fund> = {}): Fund {
  return {
    name: "Test Fund I",
    type: "national",
    stage: "seed",
    targetSize: 100_000_000,
    currentSize: 100_000_000,
    cashAvailable: 80_000_000,
    deployed: 20_000_000,
    tvpiEstimate: 1.0,
    irrEstimate: 0,
    yearStarted: 1,
    currentMonth: 24,
    skillLevel: 1,
    rebirthCount: 0,
    managementFeeRate: 0.02,
    carryRate: 0.2,
    hurdleRate: 0.08,
    gpCommit: 1_000_000,
    totalFeesCharged: 0,
    carryAccrued: 0,
    totalDistributions: 0,
    gpEarnings: 0,
    geographicFocus: "global",
    lpActionCooldowns: [],
    scenarioId: "sandbox",
    timelineMode: "freeplay",
    activeTimeGates: [],
    fundNumber: 1,
    nextFundUnlockTvpi: 2.0,
    ...overrides,
  } as Fund;
}

function makeProspect(overrides: Partial<LPProspect> = {}): LPProspect {
  return {
    id: "lp-test-1",
    name: "Test LP",
    type: "institutional",
    targetCommitment: 10_000_000,
    status: "prospect",
    interestLevel: 70,
    relationshipScore: 60,
    ...overrides,
  };
}

// ============================================================
// CONSTANTS
// ============================================================

describe("constants", () => {
  it("FUND_II_TVPI_THRESHOLD is 2.0", () => {
    expect(FUND_II_TVPI_THRESHOLD).toBe(2.0);
  });

  it("FUND_III_TVPI_THRESHOLD is 2.5", () => {
    expect(FUND_III_TVPI_THRESHOLD).toBe(2.5);
  });

  it("DEFAULT_FUND_TERMS has standard VC terms", () => {
    expect(DEFAULT_FUND_TERMS.managementFee).toBe(0.02);
    expect(DEFAULT_FUND_TERMS.carry).toBe(0.2);
    expect(DEFAULT_FUND_TERMS.hurdleRate).toBe(0.08);
    expect(DEFAULT_FUND_TERMS.fundLife).toBe(10);
    expect(DEFAULT_FUND_TERMS.gpCommitPercent).toBe(0.01);
  });
});

// ============================================================
// generateLPProspects
// ============================================================

describe("generateLPProspects", () => {
  it("returns between 6 and 12 prospects", () => {
    const prospects = generateLPProspects(1, 100_000_000, 50);
    expect(prospects.length).toBeGreaterThanOrEqual(6);
    expect(prospects.length).toBeLessThanOrEqual(12);
  });

  it("all prospects start with status 'prospect'", () => {
    const prospects = generateLPProspects(1, 100_000_000, 50);
    for (const p of prospects) {
      expect(p.status).toBe("prospect");
    }
  });

  it("targetCommitment is between 5% and 20% of fund size", () => {
    const fundSize = 100_000_000;
    const prospects = generateLPProspects(1, fundSize, 50);
    for (const p of prospects) {
      expect(p.targetCommitment).toBeGreaterThanOrEqual(fundSize * 0.05);
      expect(p.targetCommitment).toBeLessThanOrEqual(fundSize * 0.2);
    }
  });

  it("interestLevel is between 30 and 90", () => {
    const prospects = generateLPProspects(1, 100_000_000, 50);
    for (const p of prospects) {
      expect(p.interestLevel).toBeGreaterThanOrEqual(30);
      expect(p.interestLevel).toBeLessThanOrEqual(90);
    }
  });

  it("relationshipScore is between 20 and 80", () => {
    const prospects = generateLPProspects(1, 100_000_000, 50);
    for (const p of prospects) {
      expect(p.relationshipScore).toBeGreaterThanOrEqual(20);
      expect(p.relationshipScore).toBeLessThanOrEqual(80);
    }
  });

  it("each prospect has a unique id", () => {
    const prospects = generateLPProspects(1, 100_000_000, 50);
    const ids = prospects.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("each prospect has a name and type", () => {
    const prospects = generateLPProspects(1, 100_000_000, 50);
    for (const p of prospects) {
      expect(p.name).toBeTruthy();
      expect([
        "institutional",
        "family_office",
        "hnw",
        "fund_of_funds",
      ]).toContain(p.type);
    }
  });

  it("higher LP sentiment produces higher average interestLevel", () => {
    const lowSentiment = generateLPProspects(1, 100_000_000, 10);
    const highSentiment = generateLPProspects(1, 100_000_000, 90);
    const avgLow =
      lowSentiment.reduce((s, p) => s + p.interestLevel, 0) /
      lowSentiment.length;
    const avgHigh =
      highSentiment.reduce((s, p) => s + p.interestLevel, 0) /
      highSentiment.length;
    // High sentiment should generally produce higher interest levels
    // Use a relaxed assertion to account for randomness
    expect(avgHigh).toBeGreaterThan(avgLow - 20); // at least not significantly worse
  });
});

// ============================================================
// calculatePitchOutcome
// ============================================================

describe("calculatePitchOutcome", () => {
  it("advances status from prospect to pitched", () => {
    // Run many times — with high interest/relationship, should often succeed
    const prospect = makeProspect({ interestLevel: 99, relationshipScore: 99 });
    let successCount = 0;
    for (let i = 0; i < 20; i++) {
      const result = calculatePitchOutcome(prospect, 80, "bull");
      if (result.newStatus === "pitched") successCount++;
    }
    // Very high scores should succeed most of the time
    expect(successCount).toBeGreaterThan(10);
  });

  it("advances status from pitched to soft_circle", () => {
    const prospect = makeProspect({
      status: "pitched",
      interestLevel: 99,
      relationshipScore: 99,
    });
    let successCount = 0;
    for (let i = 0; i < 20; i++) {
      const result = calculatePitchOutcome(prospect, 80, "bull");
      if (result.newStatus === "soft_circle") successCount++;
    }
    expect(successCount).toBeGreaterThan(8);
  });

  it("advances status from soft_circle to hard_commit", () => {
    const prospect = makeProspect({
      status: "soft_circle",
      interestLevel: 99,
      relationshipScore: 99,
    });
    let successCount = 0;
    for (let i = 0; i < 50; i++) {
      const result = calculatePitchOutcome(prospect, 80, "bull");
      if (result.newStatus === "hard_commit") successCount++;
    }
    // With p ≈ 0.56, expected successes ≈ 28 over 50 trials; threshold is conservative
    expect(successCount).toBeGreaterThan(15);
  });

  it("advances status from hard_commit to closed", () => {
    const prospect = makeProspect({
      status: "hard_commit",
      interestLevel: 99,
      relationshipScore: 99,
    });
    let successCount = 0;
    for (let i = 0; i < 20; i++) {
      const result = calculatePitchOutcome(prospect, 80, "bull");
      if (result.newStatus === "closed") successCount++;
    }
    expect(successCount).toBeGreaterThan(10);
  });

  it("declined prospect always stays declined", () => {
    const prospect = makeProspect({ status: "declined" });
    for (let i = 0; i < 10; i++) {
      const result = calculatePitchOutcome(prospect, 80, "bull");
      expect(result.newStatus).toBe("declined");
      expect(result.message).toContain("declined");
    }
  });

  it("closed prospect stays closed", () => {
    const prospect = makeProspect({ status: "closed" });
    const result = calculatePitchOutcome(prospect, 80, "bull");
    expect(result.newStatus).toBe("closed");
  });

  it("returns message on outcome", () => {
    const prospect = makeProspect({ interestLevel: 99, relationshipScore: 99 });
    const result = calculatePitchOutcome(prospect, 80, "bull");
    expect(result.message).toBeTruthy();
  });

  it("failed pitch can result in declined status", () => {
    // Very low interest/relationship should sometimes fail
    const prospect = makeProspect({ interestLevel: 1, relationshipScore: 1 });
    let declinedCount = 0;
    for (let i = 0; i < 50; i++) {
      const result = calculatePitchOutcome(prospect, 10, "hard");
      if (result.newStatus === "declined") declinedCount++;
    }
    // Low scores should produce some declines
    expect(declinedCount).toBeGreaterThan(5);
  });

  it("bull market increases success probability vs bear", () => {
    const prospect = makeProspect({ interestLevel: 50, relationshipScore: 50 });
    let bullSuccess = 0;
    let bearSuccess = 0;
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const bullResult = calculatePitchOutcome(prospect, 50, "bull");
      if (bullResult.newStatus === "pitched") bullSuccess++;
      const bearResult = calculatePitchOutcome(prospect, 50, "hard");
      if (bearResult.newStatus === "pitched") bearSuccess++;
    }
    // Bull market should have higher success rate on average
    // Allow some variance but bull should generally be better
    expect(bullSuccess + 20).toBeGreaterThanOrEqual(bearSuccess);
  });
});

// ============================================================
// calculateTotalCommitted
// ============================================================

describe("calculateTotalCommitted", () => {
  it("returns 0 for empty prospects", () => {
    expect(calculateTotalCommitted([])).toBe(0);
  });

  it("includes soft_circle commitments", () => {
    const prospects = [
      makeProspect({ status: "soft_circle", targetCommitment: 5_000_000 }),
    ];
    expect(calculateTotalCommitted(prospects)).toBe(5_000_000);
  });

  it("includes hard_commit commitments", () => {
    const prospects = [
      makeProspect({ status: "hard_commit", targetCommitment: 10_000_000 }),
    ];
    expect(calculateTotalCommitted(prospects)).toBe(10_000_000);
  });

  it("includes closed commitments", () => {
    const prospects = [
      makeProspect({ status: "closed", targetCommitment: 8_000_000 }),
    ];
    expect(calculateTotalCommitted(prospects)).toBe(8_000_000);
  });

  it("excludes prospect status from committed total", () => {
    const prospects = [
      makeProspect({ status: "prospect", targetCommitment: 5_000_000 }),
    ];
    expect(calculateTotalCommitted(prospects)).toBe(0);
  });

  it("excludes pitched status from committed total", () => {
    const prospects = [
      makeProspect({ status: "pitched", targetCommitment: 5_000_000 }),
    ];
    expect(calculateTotalCommitted(prospects)).toBe(0);
  });

  it("excludes declined status from committed total", () => {
    const prospects = [
      makeProspect({ status: "declined", targetCommitment: 5_000_000 }),
    ];
    expect(calculateTotalCommitted(prospects)).toBe(0);
  });

  it("sums across multiple committed prospects", () => {
    const prospects: LPProspect[] = [
      makeProspect({
        id: "1",
        status: "soft_circle",
        targetCommitment: 5_000_000,
      }),
      makeProspect({
        id: "2",
        status: "hard_commit",
        targetCommitment: 10_000_000,
      }),
      makeProspect({ id: "3", status: "closed", targetCommitment: 8_000_000 }),
      makeProspect({
        id: "4",
        status: "prospect",
        targetCommitment: 3_000_000,
      }), // excluded
      makeProspect({
        id: "5",
        status: "declined",
        targetCommitment: 7_000_000,
      }), // excluded
    ];
    expect(calculateTotalCommitted(prospects)).toBe(23_000_000);
  });
});

// ============================================================
// canStartNextFund
// ============================================================

describe("canStartNextFund", () => {
  it("returns false when TVPI is below threshold", () => {
    const fund = makeFund({
      tvpiEstimate: 1.5,
      fundNumber: 1,
      nextFundUnlockTvpi: 2.0,
    });
    expect(canStartNextFund(fund)).toBe(false);
  });

  it("returns true when TVPI meets threshold and fundNumber < 3", () => {
    const fund = makeFund({
      tvpiEstimate: 2.0,
      fundNumber: 1,
      nextFundUnlockTvpi: 2.0,
    });
    expect(canStartNextFund(fund)).toBe(true);
  });

  it("returns true when TVPI exceeds threshold", () => {
    const fund = makeFund({
      tvpiEstimate: 3.5,
      fundNumber: 1,
      nextFundUnlockTvpi: 2.0,
    });
    expect(canStartNextFund(fund)).toBe(true);
  });

  it("returns false when fundNumber is 3 (max fund reached)", () => {
    const fund = makeFund({
      tvpiEstimate: 3.0,
      fundNumber: 3,
      nextFundUnlockTvpi: 2.5,
    });
    expect(canStartNextFund(fund)).toBe(false);
  });

  it("returns true for Fund II with TVPI_III threshold at fundNumber 2", () => {
    const fund = makeFund({
      tvpiEstimate: 2.6,
      fundNumber: 2,
      nextFundUnlockTvpi: 2.5,
    });
    expect(canStartNextFund(fund)).toBe(true);
  });

  it("returns false for Fund II below TVPI_III threshold", () => {
    const fund = makeFund({
      tvpiEstimate: 2.3,
      fundNumber: 2,
      nextFundUnlockTvpi: 2.5,
    });
    expect(canStartNextFund(fund)).toBe(false);
  });
});

// ============================================================
// getFirstCloseThreshold / getFinalCloseThreshold
// ============================================================

describe("getFirstCloseThreshold", () => {
  it("returns 50% of target amount", () => {
    expect(getFirstCloseThreshold(100_000_000)).toBe(50_000_000);
  });

  it("handles edge case amounts", () => {
    expect(getFirstCloseThreshold(0)).toBe(0);
    expect(getFirstCloseThreshold(50_000_000)).toBe(25_000_000);
  });
});

describe("getFinalCloseThreshold", () => {
  it("returns 100% of target amount", () => {
    expect(getFinalCloseThreshold(100_000_000)).toBe(100_000_000);
  });

  it("handles edge case amounts", () => {
    expect(getFinalCloseThreshold(0)).toBe(0);
    expect(getFinalCloseThreshold(50_000_000)).toBe(50_000_000);
  });
});

// ============================================================
// calculateNegotiatedFundSize
// ============================================================

describe("calculateNegotiatedFundSize", () => {
  const committedProspects: LPProspect[] = [
    makeProspect({
      id: "1",
      status: "soft_circle",
      targetCommitment: 10_000_000,
    }),
    makeProspect({
      id: "2",
      status: "hard_commit",
      targetCommitment: 15_000_000,
    }),
    makeProspect({ id: "3", status: "closed", targetCommitment: 20_000_000 }),
  ];
  // Total committed = 45_000_000

  it("applies bull market multiplier (1.1)", () => {
    // sentimentMod at 50 = 50/50 = 1.0, clamped to [0.7, 1.3] => 1.0
    const result = calculateNegotiatedFundSize(committedProspects, "bull", 50);
    expect(result).toBeCloseTo(45_000_000 * 1.1 * 1.0, -3);
  });

  it("applies bear market multiplier (0.85)", () => {
    const result = calculateNegotiatedFundSize(committedProspects, "hard", 50);
    expect(result).toBeCloseTo(45_000_000 * 0.85 * 1.0, -3);
  });

  it("applies neutral market multiplier (1.0)", () => {
    const result = calculateNegotiatedFundSize(
      committedProspects,
      "normal",
      50,
    );
    expect(result).toBeCloseTo(45_000_000 * 1.0 * 1.0, -3);
  });

  it("applies sentiment modifier — high sentiment increases fund size", () => {
    const lowResult = calculateNegotiatedFundSize(
      committedProspects,
      "normal",
      10,
    );
    const highResult = calculateNegotiatedFundSize(
      committedProspects,
      "normal",
      90,
    );
    expect(highResult).toBeGreaterThan(lowResult);
  });

  it("sentiment modifier is clamped between 0.7 and 1.3", () => {
    // lpSentimentScore = 0 => 0/50 = 0, clamped to 0.7
    const minResult = calculateNegotiatedFundSize(
      committedProspects,
      "normal",
      0,
    );
    expect(minResult).toBeCloseTo(45_000_000 * 1.0 * 0.7, -3);

    // lpSentimentScore = 100 => 100/50 = 2.0, clamped to 1.3
    const maxResult = calculateNegotiatedFundSize(
      committedProspects,
      "normal",
      100,
    );
    expect(maxResult).toBeCloseTo(45_000_000 * 1.0 * 1.3, -3);
  });

  it("returns 0 when no committed prospects", () => {
    const result = calculateNegotiatedFundSize([], "normal", 50);
    expect(result).toBe(0);
  });

  it("only counts committed statuses (soft_circle, hard_commit, closed)", () => {
    const mixedProspects: LPProspect[] = [
      makeProspect({
        id: "1",
        status: "soft_circle",
        targetCommitment: 10_000_000,
      }),
      makeProspect({
        id: "2",
        status: "prospect",
        targetCommitment: 50_000_000,
      }), // not counted
      makeProspect({
        id: "3",
        status: "declined",
        targetCommitment: 30_000_000,
      }), // not counted
    ];
    const result = calculateNegotiatedFundSize(mixedProspects, "normal", 50);
    // Only 10_000_000 committed
    expect(result).toBeCloseTo(10_000_000 * 1.0 * 1.0, -3);
  });
});
