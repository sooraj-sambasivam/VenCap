// ============================================================
// VenCap — LP Trust & Accountability System
// Pure functions. No side effects.
// ============================================================

import type {
  PortfolioCompany,
  Fund,
  MarketCycle,
  IncubatorBatch,
  LabProject,
  NewsItem,
  LPSentiment,
  LPSentimentLevel,
  LPPressureReport,
  LPReport,
  LPActionType,
  LPActionCooldown,
} from "./types";
import { randomBetween, randomInt } from "@/lib/utils";
import { clamp, formatCurrency, getGameYear } from "@/lib/utils";

// ============================================================
// TYPES FOR INPUT STATE
// ============================================================

interface LPCalculationState {
  portfolio: PortfolioCompany[];
  fund: Fund;
  marketCycle: MarketCycle;
  incubatorBatches: IncubatorBatch[];
  labProjects: LabProject[];
  news: NewsItem[];
}

// ============================================================
// 1. CALCULATE LP SENTIMENT
// ============================================================

export function calculateLPSentiment(state: LPCalculationState): LPSentiment {
  const { portfolio, fund, marketCycle, incubatorBatches, labProjects } = state;

  const activeCompanies = portfolio.filter((c) => c.status === "active");

  // ---- Factor A: Portfolio Performance (-20 to +20) ----
  const portfolioPerformance = calculatePortfolioPerformance(portfolio);

  // ---- Factor B: Event Quality (-15 to +15) ----
  const eventQuality = calculateEventQuality(portfolio, fund.currentMonth);

  // ---- Factor C: Valuation Momentum (-10 to +10) ----
  const valuationMomentum = calculateValuationMomentum(activeCompanies);

  // ---- Factor D: Support Quality (-10 to +10) ----
  const supportQuality = calculateSupportQuality(activeCompanies);

  // ---- Factor E: Deployment Pace (-10 to +10) ----
  const deploymentPace = calculateDeploymentPace(fund);

  // ---- Factor F: Lab Spinout Quality (-10 to +10) ----
  const labQuality = calculateLabQuality(portfolio, labProjects);

  // ---- Factor G: Incubator Output (-10 to +10) ----
  const incubatorOutput = calculateIncubatorOutput(portfolio, incubatorBatches);

  // ---- Factor H: Market Adjustment (-15 to +15) ----
  const marketAdjustment = calculateMarketAdjustment(
    marketCycle,
    portfolio,
    fund,
  );

  // Total
  const rawScore =
    50 +
    portfolioPerformance +
    eventQuality +
    valuationMomentum +
    supportQuality +
    deploymentPace +
    labQuality +
    incubatorOutput +
    marketAdjustment;
  const score = clamp(Math.round(rawScore), 0, 100);

  const level = getLevel(score);

  return {
    score,
    level,
    factors: {
      portfolioPerformance: Math.round(portfolioPerformance * 10) / 10,
      eventQuality: Math.round(eventQuality * 10) / 10,
      valuationMomentum: Math.round(valuationMomentum * 10) / 10,
      supportQuality: Math.round(supportQuality * 10) / 10,
      deploymentPace: Math.round(deploymentPace * 10) / 10,
      labQuality: Math.round(labQuality * 10) / 10,
      incubatorOutput: Math.round(incubatorOutput * 10) / 10,
      marketAdjustment: Math.round(marketAdjustment * 10) / 10,
    },
    pressureReports: [],
  };
}

function getLevel(score: number): LPSentimentLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "neutral";
  if (score >= 20) return "concerned";
  return "critical";
}

// ---- Individual Factor Calculations ----

function calculatePortfolioPerformance(portfolio: PortfolioCompany[]): number {
  const invested = portfolio.filter((c) => c.investedAmount > 0);
  if (invested.length === 0) return 0;

  // Weighted average multiple by deployment amount
  const totalInvested = invested.reduce((sum, c) => sum + c.investedAmount, 0);
  const weightedMultiple = invested.reduce((sum, c) => {
    const weight = c.investedAmount / totalInvested;
    return sum + c.multiple * weight;
  }, 0);

  if (weightedMultiple > 2)
    return clamp(10 + (weightedMultiple - 2) * 5, 10, 20);
  if (weightedMultiple >= 1) return clamp((weightedMultiple - 1) * 10, 0, 10);
  return clamp((weightedMultiple - 1) * 20, -20, 0);
}

function calculateEventQuality(
  portfolio: PortfolioCompany[],
  currentMonth: number,
): number {
  const recentEvents = portfolio.flatMap((c) =>
    c.events.filter(
      (e) =>
        e.month >= currentMonth - 12 &&
        e.severity === "severe" &&
        e.sentiment === "negative",
    ),
  );
  const severeCount = recentEvents.length;

  if (severeCount === 0) return 12;
  if (severeCount <= 2) return clamp(5 - severeCount * 2, 0, 5);
  return clamp(-5 - (severeCount - 2) * 3, -15, -5);
}

function calculateValuationMomentum(
  activeCompanies: PortfolioCompany[],
): number {
  if (activeCompanies.length === 0) return 0;

  // Use average multiple as proxy for valuation momentum
  const avgMultiple =
    activeCompanies.reduce((sum, c) => sum + c.multiple, 0) /
    activeCompanies.length;

  if (avgMultiple > 1.5) return clamp(5 + (avgMultiple - 1.5) * 5, 5, 10);
  if (avgMultiple >= 1.0) return clamp((avgMultiple - 1.0) * 10, 0, 5);
  return clamp((avgMultiple - 1.0) * 20, -10, 0);
}

function calculateSupportQuality(activeCompanies: PortfolioCompany[]): number {
  if (activeCompanies.length === 0) return 0;

  const avgSupport =
    activeCompanies.reduce((sum, c) => sum + c.supportScore, 0) /
    activeCompanies.length;

  if (avgSupport > 60) return clamp(5 + (avgSupport - 60) * 0.125, 5, 10);
  if (avgSupport >= 30) return clamp((avgSupport - 30) * 0.167, 0, 5);
  return clamp((avgSupport - 30) * 0.333, -10, 0);
}

function calculateDeploymentPace(fund: Fund): number {
  const year = Math.floor(fund.currentMonth / 12) + 1;
  const deploymentRatio = fund.deployed / fund.currentSize;

  if (year <= 3) {
    if (deploymentRatio >= 0.2 && deploymentRatio <= 0.6) return 5;
    if (deploymentRatio < 0.1) return -5;
    if (deploymentRatio > 0.7) return -5;
    return 0;
  }
  if (year <= 7) {
    if (deploymentRatio >= 0.5 && deploymentRatio <= 0.8) return 5;
    if (deploymentRatio < 0.3) return -5;
    if (deploymentRatio > 0.9) return -3;
    return 0;
  }
  // Years 8-10
  if (deploymentRatio >= 0.7) return 5;
  if (deploymentRatio < 0.5) return -5;
  return 0;
}

function calculateLabQuality(
  portfolio: PortfolioCompany[],
  labProjects: LabProject[],
): number {
  const labCompanies = portfolio.filter((c) => c.origin === "lab");
  const hasUsedLab = labCompanies.length > 0 || labProjects.length > 0;

  if (!hasUsedLab) return 0;
  if (labCompanies.length === 0) return -2; // Lab projects started but nothing spun out yet

  const externalCompanies = portfolio.filter(
    (c) => c.origin === "external" && c.status === "active",
  );
  const avgLabMultiple =
    labCompanies.reduce((s, c) => s + c.multiple, 0) / labCompanies.length;
  const avgExternalMultiple =
    externalCompanies.length > 0
      ? externalCompanies.reduce((s, c) => s + c.multiple, 0) /
        externalCompanies.length
      : 1.0;

  if (avgLabMultiple > avgExternalMultiple) {
    return clamp(5 + (avgLabMultiple - avgExternalMultiple) * 5, 5, 10);
  }
  return clamp((avgLabMultiple - avgExternalMultiple) * 10, -10, -1);
}

function calculateIncubatorOutput(
  portfolio: PortfolioCompany[],
  batches: IncubatorBatch[],
): number {
  const graduatedBatches = batches.filter((b) => b.graduated);
  if (graduatedBatches.length === 0) return 0;

  const incubatorCompanies = portfolio.filter((c) => c.origin === "incubator");
  if (incubatorCompanies.length === 0) return -2;

  const totalGrads = graduatedBatches.reduce(
    (s, b) => s + b.companies.filter((c) => c.graduated).length,
    0,
  );
  const totalCompanies = graduatedBatches.reduce(
    (s, b) => s + b.companies.length,
    0,
  );
  const gradRate = totalCompanies > 0 ? totalGrads / totalCompanies : 0;

  const activeIncubators = incubatorCompanies.filter(
    (c) => c.status === "active",
  );
  const avgMultiple =
    activeIncubators.length > 0
      ? activeIncubators.reduce((s, c) => s + c.multiple, 0) /
        activeIncubators.length
      : 0;

  let score = 0;
  if (gradRate > 0.7) score += 3;
  else if (gradRate > 0.4) score += 1;
  else score -= 2;

  if (avgMultiple > 1.5) score += 5;
  else if (avgMultiple > 1.0) score += 2;
  else score -= 3;

  return clamp(score, -10, 10);
}

function calculateMarketAdjustment(
  market: MarketCycle,
  portfolio: PortfolioCompany[],
  fund: Fund,
): number {
  const baseByMarket: Record<MarketCycle, number> = {
    bull: 8,
    normal: 2,
    cooldown: -5,
    hard: -10,
  };

  let base = baseByMarket[market];

  // Adjust based on how well the fund handles the cycle
  const activeCompanies = portfolio.filter((c) => c.status === "active");
  if (activeCompanies.length > 0) {
    const avgGrowth =
      activeCompanies.reduce((s, c) => s + c.metrics.growthRate, 0) /
      activeCompanies.length;

    if (market === "hard" || market === "cooldown") {
      // Outperforming in a bad market = LP trust boost
      if (avgGrowth > 0.08) base += 5;
      if (fund.tvpiEstimate > 1.5) base += 3;
    } else if (market === "bull") {
      // Underperforming in a good market = LP concern
      if (avgGrowth < 0.05) base -= 3;
      if (fund.tvpiEstimate < 1.0) base -= 5;
    }
  }

  return clamp(base, -15, 15);
}

// ============================================================
// 2. LP PRESSURE REPORT
// ============================================================

export function generateLPPressureReport(
  state: LPCalculationState,
): LPPressureReport {
  const { portfolio, fund, incubatorBatches, labProjects } = state;
  const year = getGameYear(fund.currentMonth);
  const activeCompanies = portfolio.filter((c) => c.status === "active");

  // Deployment rating
  const deploymentRatio = fund.deployed / fund.currentSize;
  let deploymentRating: string;
  if (year <= 3) {
    deploymentRating =
      deploymentRatio >= 0.2 && deploymentRatio <= 0.6
        ? "strong"
        : deploymentRatio < 0.1
          ? "concerning"
          : deploymentRatio > 0.8
            ? "critical"
            : "adequate";
  } else {
    deploymentRating =
      deploymentRatio >= 0.5 && deploymentRatio <= 0.85
        ? "strong"
        : deploymentRatio < 0.3
          ? "concerning"
          : "adequate";
  }

  // Breakout companies (>3x multiple)
  const breakoutCompanies = activeCompanies.filter(
    (c) => c.multiple > 3,
  ).length;

  // Red flag count
  const recentSevereEvents = portfolio.flatMap((c) =>
    c.events.filter(
      (e) =>
        e.month >= fund.currentMonth - 12 &&
        e.severity === "severe" &&
        e.sentiment === "negative",
    ),
  ).length;
  const failedThisYear = portfolio.filter(
    (c) =>
      c.status === "failed" &&
      c.events.some((e) => e.month >= fund.currentMonth - 12),
  ).length;
  const redFlagCount = recentSevereEvents + failedThisYear;

  // Reserves rating
  const remainingCashRatio = fund.cashAvailable / fund.currentSize;
  const reservesRating =
    remainingCashRatio > 0.25
      ? "strong"
      : remainingCashRatio > 0.1
        ? "adequate"
        : remainingCashRatio > 0.05
          ? "concerning"
          : "critical";

  // Studio ROI (lab + incubator)
  const labCompanies = portfolio.filter((c) => c.origin === "lab");
  const incubCompanies = portfolio.filter((c) => c.origin === "incubator");
  const studioCount = labCompanies.length + incubCompanies.length;
  const hasStudio =
    studioCount > 0 || labProjects.length > 0 || incubatorBatches.length > 0;
  let studioROI: string;
  if (!hasStudio) {
    studioROI = "N/A";
  } else if (studioCount === 0) {
    studioROI = "concerning";
  } else {
    const avgStudioMultiple =
      [...labCompanies, ...incubCompanies].reduce((s, c) => s + c.multiple, 0) /
      studioCount;
    studioROI =
      avgStudioMultiple > 2
        ? "strong"
        : avgStudioMultiple > 1
          ? "adequate"
          : "concerning";
  }

  // Overall grade
  const ratings = [
    deploymentRating,
    reservesRating,
    studioROI !== "N/A" ? studioROI : "adequate",
  ];
  const ratingScore = (r: string) =>
    r === "strong" ? 4 : r === "adequate" ? 3 : r === "concerning" ? 2 : 1;
  let gradeScore =
    ratings.reduce((s, r) => s + ratingScore(r), 0) / ratings.length;

  // Bonus/penalty
  if (breakoutCompanies >= 2) gradeScore += 0.5;
  if (redFlagCount >= 3) gradeScore -= 0.5;
  if (fund.tvpiEstimate > 2) gradeScore += 0.5;
  if (fund.tvpiEstimate < 0.8) gradeScore -= 0.5;

  const overallGrade =
    gradeScore >= 3.5
      ? "A"
      : gradeScore >= 2.8
        ? "B"
        : gradeScore >= 2.0
          ? "C"
          : gradeScore >= 1.5
            ? "D"
            : "F";

  return {
    year,
    deploymentRating,
    breakoutCompanies,
    redFlagCount,
    reservesRating,
    studioROI,
    overallGrade,
  };
}

// ============================================================
// 3. ANNUAL LP REPORT
// ============================================================

export function generateLPReport(state: LPCalculationState): LPReport {
  const { portfolio, fund, marketCycle } = state;
  const year = getGameYear(fund.currentMonth);
  const activeCompanies = portfolio.filter((c) => c.status === "active");
  const exitedThisYear = portfolio.filter(
    (c) =>
      c.status === "exited" &&
      c.exitData &&
      c.exitData.month >= fund.currentMonth - 12,
  );
  const failedThisYear = portfolio.filter(
    (c) =>
      c.status === "failed" &&
      c.events.some((e) => e.month >= fund.currentMonth - 12),
  );

  // Top performers (active, sorted by multiple)
  const topPerformers = [...activeCompanies]
    .sort((a, b) => b.multiple - a.multiple)
    .slice(0, 3)
    .map(
      (c) =>
        `${c.name} (${c.multiple.toFixed(1)}x, ${formatCurrency(c.currentValuation)} valuation)`,
    );

  // Exits
  const exits = exitedThisYear.map(
    (c) =>
      `${c.name} — acquired by ${c.exitData!.acquirerName} at ${c.exitData!.exitMultiple.toFixed(1)}x (${formatCurrency(c.exitData!.exitValue)} returned)`,
  );

  // Write-offs
  const writeOffs = failedThisYear.map(
    (c) =>
      `${c.name} — ${c.failureReason || "Failed to achieve sustainable growth"} (${formatCurrency(c.investedAmount)} written off)`,
  );

  // Highlights
  const highlights: string[] = [];
  if (exitedThisYear.length > 0) {
    const totalReturned = exitedThisYear.reduce(
      (s, c) => s + (c.exitData?.exitValue || 0),
      0,
    );
    highlights.push(
      `${exitedThisYear.length} successful exit${exitedThisYear.length > 1 ? "s" : ""} returning ${formatCurrency(totalReturned)}`,
    );
  }
  if (topPerformers.length > 0 && activeCompanies[0]?.multiple > 2) {
    highlights.push(
      `${activeCompanies.filter((c) => c.multiple > 2).length} portfolio companies above 2x multiple`,
    );
  }
  highlights.push(`${activeCompanies.length} active portfolio companies`);
  if (fund.tvpiEstimate > 1.5) {
    highlights.push(`Fund TVPI tracking at ${fund.tvpiEstimate.toFixed(2)}x`);
  }

  // Concerns
  const concerns: string[] = [];
  const strugglingCompanies = activeCompanies.filter((c) => c.multiple < 0.5);
  if (strugglingCompanies.length > 0) {
    concerns.push(
      `${strugglingCompanies.length} portfolio companies below 0.5x multiple`,
    );
  }
  const burnoutFounders = activeCompanies.filter(
    (c) => c.founderState === "burned_out" || c.founderState === "defensive",
  );
  if (burnoutFounders.length > 0) {
    concerns.push(
      `${burnoutFounders.length} companies with founder challenges requiring close attention`,
    );
  }
  const lowRunway = activeCompanies.filter((c) => c.metrics.runway < 6);
  if (lowRunway.length > 0) {
    concerns.push(
      `${lowRunway.length} companies with less than 6 months runway`,
    );
  }
  if (failedThisYear.length > 0) {
    concerns.push(
      `${failedThisYear.length} write-off${failedThisYear.length > 1 ? "s" : ""} this year`,
    );
  }
  if (concerns.length === 0) {
    concerns.push("No significant concerns at this time");
  }

  // Market notes
  const marketNotes = generateMarketNotes(marketCycle, fund);

  // Fund economics calculations
  const grossTvpi = fund.tvpiEstimate;
  // Net TVPI = (total value - fees - carry) / fund size
  const netTvpi =
    fund.currentSize > 0
      ? Math.round(
          ((fund.tvpiEstimate * fund.currentSize -
            fund.totalFeesCharged -
            fund.carryAccrued) /
            fund.currentSize) *
            100,
        ) / 100
      : grossTvpi;
  const grossIrr = fund.irrEstimate;
  const yearsElapsed = fund.currentMonth / 12;
  const netIrr =
    yearsElapsed > 0 && netTvpi > 0
      ? Math.round(
          (Math.pow(Math.max(0.01, netTvpi), 1 / yearsElapsed) - 1) * 100 * 100,
        ) / 100
      : 0;

  // Fees charged this year (last 12 months)
  const annualFeeRate = fund.managementFeeRate;
  const feesChargedYtd = Math.round(fund.currentSize * annualFeeRate);

  return {
    year,
    irr: fund.irrEstimate,
    tvpi: fund.tvpiEstimate,
    highlights,
    topPerformers,
    exits,
    writeOffs,
    concerns,
    marketNotes,
    cashPosition: fund.cashAvailable,

    // Fund economics
    grossTvpi,
    netTvpi,
    grossIrr,
    netIrr,
    feesChargedYtd,
    totalFeesCharged: fund.totalFeesCharged,
    carryAccrued: fund.carryAccrued,
    distributionsToDate: fund.totalDistributions,
  };
}

function generateMarketNotes(market: MarketCycle, fund: Fund): string {
  const yearStr = `Year ${getGameYear(fund.currentMonth)}`;
  switch (market) {
    case "bull":
      return `${yearStr} benefited from strong market conditions. Valuations are elevated across the portfolio, and exit opportunities are abundant. We remain disciplined in deployment pace despite the favorable environment.`;
    case "normal":
      return `${yearStr} saw stable market conditions. Deal flow quality remained consistent, and we continue to selectively deploy capital into high-conviction opportunities.`;
    case "cooldown":
      return `${yearStr} was characterized by a market correction. While near-term valuations have compressed, we believe this creates opportunity for disciplined investors. Our portfolio companies are focused on extending runway and reaching profitability.`;
    case "hard":
      return `${yearStr} was a challenging year for venture markets broadly. We have worked closely with portfolio companies to reduce burn, focus on unit economics, and build resilient businesses. We believe the strongest companies emerge from downturns.`;
  }
}

// ============================================================
// 4. LP EFFECTS — Feedback Into Game
// ============================================================

export function getLPEffects(sentiment: LPSentiment): {
  commitmentMod: number;
  dealflowMod: number;
  founderTrustMod: number;
  coInvestorMod: number;
} {
  const score = sentiment.score;

  // Map score (0-100) to modifier ranges
  // 50 = neutral (1.0), 100 = best, 0 = worst

  // commitmentMod: ±30% on future fundraising
  const commitmentMod = 0.7 + (score / 100) * 0.6; // 0.7 to 1.3

  // dealflowMod: ±20% on deal quality
  const dealflowMod = 0.8 + (score / 100) * 0.4; // 0.8 to 1.2

  // founderTrustMod: ±15 on starting relationship
  const founderTrustMod = -15 + (score / 100) * 30; // -15 to +15

  // coInvestorMod: ±25% on co-investor willingness
  const coInvestorMod = 0.75 + (score / 100) * 0.5; // 0.75 to 1.25

  return {
    commitmentMod: Math.round(commitmentMod * 100) / 100,
    dealflowMod: Math.round(dealflowMod * 100) / 100,
    founderTrustMod: Math.round(founderTrustMod),
    coInvestorMod: Math.round(coInvestorMod * 100) / 100,
  };
}

// ============================================================
// 5. LP COMMUNICATION ACTIONS (Feature 2)
// ============================================================

export interface LPActionEffect {
  sentimentDelta: number;
  cashCost: number;
  cooldownMonths: number;
  canPerform: boolean;
  reason?: string;
}

export function calculateLPActionEffect(
  actionType: LPActionType,
  currentSentiment: number,
  fund: Fund,
  portfolio: PortfolioCompany[],
  params?: { amount?: number; companyId?: string },
): LPActionEffect {
  // Check existing cooldown
  const cooldowns: LPActionCooldown[] = fund.lpActionCooldowns || [];
  const existingCooldown = cooldowns.find((c) => c.actionType === actionType);
  if (
    existingCooldown &&
    existingCooldown.availableFromMonth > fund.currentMonth
  ) {
    const monthsLeft = existingCooldown.availableFromMonth - fund.currentMonth;
    return {
      sentimentDelta: 0,
      cashCost: 0,
      cooldownMonths: 0,
      canPerform: false,
      reason: `Available in ${monthsLeft} month${monthsLeft > 1 ? "s" : ""}.`,
    };
  }

  switch (actionType) {
    case "quarterly_update": {
      return {
        sentimentDelta: randomInt(3, 5),
        cashCost: 0,
        cooldownMonths: 3,
        canPerform: true,
      };
    }
    case "lp_day": {
      if (currentSentiment < 30) {
        return {
          sentimentDelta: 0,
          cashCost: 0,
          cooldownMonths: 0,
          canPerform: false,
          reason: "LP sentiment too low (need ≥ 30) to hold LP Day.",
        };
      }
      const cost = Math.round(fund.currentSize * randomBetween(0.001, 0.005));
      if (cost > fund.cashAvailable) {
        return {
          sentimentDelta: 0,
          cashCost: 0,
          cooldownMonths: 0,
          canPerform: false,
          reason: "Insufficient cash for LP Day.",
        };
      }
      return {
        sentimentDelta: randomInt(8, 12),
        cashCost: cost,
        cooldownMonths: 12,
        canPerform: true,
      };
    }
    case "oneonone_call": {
      return {
        sentimentDelta: randomInt(2, 3),
        cashCost: 0,
        cooldownMonths: 1,
        canPerform: true,
      };
    }
    case "coinvest_opportunity": {
      const eligibleCompany = portfolio.find(
        (c) =>
          c.status === "active" &&
          c.multiple > 1.5 &&
          (params?.companyId ? c.id === params.companyId : true),
      );
      if (!eligibleCompany) {
        return {
          sentimentDelta: 0,
          cashCost: 0,
          cooldownMonths: 0,
          canPerform: false,
          reason: "No active company with multiple > 1.5x available.",
        };
      }
      return {
        sentimentDelta: randomInt(5, 8),
        cashCost: 0,
        cooldownMonths: 6,
        canPerform: true,
      };
    }
    case "early_distribution": {
      const year = Math.floor(fund.currentMonth / 12) + 1;
      if (year < 3) {
        return {
          sentimentDelta: 0,
          cashCost: 0,
          cooldownMonths: 0,
          canPerform: false,
          reason: "Early distributions not available until Year 3.",
        };
      }
      const amount = params?.amount ?? 0;
      if (amount <= 0) {
        return {
          sentimentDelta: 0,
          cashCost: 0,
          cooldownMonths: 0,
          canPerform: false,
          reason: "Specify a distribution amount.",
        };
      }
      if (amount > fund.cashAvailable) {
        return {
          sentimentDelta: 0,
          cashCost: 0,
          cooldownMonths: 0,
          canPerform: false,
          reason: "Insufficient cash for distribution.",
        };
      }
      // Sentiment gain scales with distribution size (as % of fund)
      const pct = amount / fund.currentSize;
      const sentimentDelta = Math.round(clamp(5 + pct * 200, 5, 15));
      return {
        sentimentDelta,
        cashCost: amount,
        cooldownMonths: 6,
        canPerform: true,
      };
    }
  }
}
