// ============================================================
// VenCap — VC Realism Constraint System
// Pure functions only. No state, no side effects.
// ============================================================

import type { FundStage, FundType, MarketCycle, Fund, Startup } from './types';

// ============ 1. OWNERSHIP LIMITS ============

export function getOwnershipLimits(stage: FundStage): { min: number; max: number } {
  switch (stage) {
    case 'pre_seed': return { min: 7, max: 20 };
    case 'seed':     return { min: 5, max: 15 };
    case 'series_a': return { min: 3, max: 12 };
    case 'growth':   return { min: 2, max: 8 };
  }
}

// ============ 2. CHECK SIZE RANGE ============

export function getCheckSizeRange(
  fundType: FundType,
  fundSize: number,
  stage: FundStage
): { min: number; max: number } {
  // Base % of fund per check by fund type
  const baseRanges: Record<FundType, { min: number; max: number }> = {
    regional:      { min: 0.01, max: 0.05 },
    national:      { min: 0.02, max: 0.08 },
    multistage:    { min: 0.01, max: 0.10 },
    family_office: { min: 0.02, max: 0.15 },
  };

  // Stage scalar: earlier = smaller absolute check
  const stageScalar: Record<FundStage, number> = {
    pre_seed: 0.4,
    seed:     0.65,
    series_a: 1.0,
    growth:   1.6,
  };

  const range = baseRanges[fundType];
  const scalar = stageScalar[stage];

  return {
    min: Math.round(fundSize * range.min * scalar),
    max: Math.round(fundSize * range.max * scalar),
  };
}

// ============ 3. ADJUST OWNERSHIP FOR RELATIONSHIP ============

export function adjustOwnershipForRelationship(
  baseOwnership: number,
  relationship: number
): number {
  if (relationship > 70) {
    // High relationship: allow 25% above stage max
    return baseOwnership * 1.25;
  }
  if (relationship < 30) {
    // Low relationship: hard cap at 8%
    return Math.min(baseOwnership, 8);
  }
  // Linear interpolation between 30 and 70
  const t = (relationship - 30) / 40; // 0 at rel=30, 1 at rel=70
  const multiplier = 1 + t * 0.25;    // 1.0x at rel=30, 1.25x at rel=70
  return baseOwnership * multiplier;
}

// ============ 4. ADJUST OWNERSHIP FOR MARKET CYCLE ============

export function adjustOwnershipForMarket(
  ownership: number,
  market: MarketCycle
): number {
  switch (market) {
    case 'bull':
      // Founders have leverage — no upward adjustment, cap at normal range
      return ownership;
    case 'normal':
      return ownership;
    case 'cooldown':
      // Allow 10% more ownership
      return ownership * 1.10;
    case 'hard':
      // Founders desperate — allow 25% more
      return ownership * 1.25;
  }
}

// ============ 5. BUYOUT ACCEPTANCE ============

export function calculateBuyoutAcceptance(
  company: Startup,
  offerPrice: number,
  relationship: number,
  market: MarketCycle
): { accepted: boolean; probability: number } {
  let probability = 0.10; // 10% base

  // Runway boost
  if (company.metrics.runway < 6) probability += 0.20;

  // Relationship boost
  if (relationship > 70) probability += 0.15;

  // Low growth boost
  if (company.metrics.growthRate < 0.05) probability += 0.10;

  // Hard market boost
  if (market === 'hard') probability += 0.15;

  // Generous offer boost: >1.5x fair value (valuation)
  if (offerPrice > company.valuation * 1.5) probability += 0.10;

  // Gritty founder penalty
  if (company.founderTraits.grit > 7) probability -= 0.20;

  // Bull market penalty (founders have options)
  if (market === 'bull') probability -= 0.10;

  // Clamp to [0, 1]
  probability = Math.min(Math.max(probability, 0), 1);

  const accepted = Math.random() < probability;

  return { accepted, probability };
}

// ============ 6. VALUATION MULTIPLIER ============

export function getValuationMultiplier(
  _stage: FundStage,
  market: MarketCycle
): number {
  // Base valuation ranges (midpoint used for multiplier anchor)
  // pre_seed $2-5M → mid $3.5M
  // seed $5-15M → mid $10M
  // series_a $15-50M → mid $32.5M
  // growth $50-300M → mid $175M

  const marketMultiplier: Record<MarketCycle, number> = {
    bull:     1.4,
    normal:   1.0,
    cooldown: 0.7,
    hard:     0.5,
  };

  return marketMultiplier[market];
}

export function getBaseValuationRange(stage: FundStage): { min: number; max: number } {
  switch (stage) {
    case 'pre_seed': return { min: 2_000_000,   max: 5_000_000 };
    case 'seed':     return { min: 5_000_000,   max: 15_000_000 };
    case 'series_a': return { min: 15_000_000,  max: 50_000_000 };
    case 'growth':   return { min: 50_000_000,  max: 300_000_000 };
  }
}

// ============ 7. CAN INVEST CHECK ============

export function canInvest(
  fund: Fund,
  amount: number,
  stage: FundStage
): { allowed: boolean; reason?: string } {
  // Check 1: enough cash
  if (amount > fund.cashAvailable) {
    return {
      allowed: false,
      reason: `Insufficient cash. Available: $${(fund.cashAvailable / 1_000_000).toFixed(1)}M, needed: $${(amount / 1_000_000).toFixed(1)}M`,
    };
  }

  // Check 2: check size within fund-appropriate range
  const checkRange = getCheckSizeRange(fund.type, fund.currentSize, stage);
  if (amount < checkRange.min) {
    return {
      allowed: false,
      reason: `Check too small for a ${fund.type} fund. Minimum: $${(checkRange.min / 1_000).toFixed(0)}K`,
    };
  }
  if (amount > checkRange.max) {
    return {
      allowed: false,
      reason: `Check too large for a ${fund.type} fund. Maximum: $${(checkRange.max / 1_000_000).toFixed(1)}M`,
    };
  }

  // Check 3: deployment pace guard
  // Over-deployed >80% in first 3 years is flagged as aggressive
  const currentYear = Math.floor(fund.currentMonth / 12) + 1;
  const deploymentRatio = (fund.deployed + amount) / fund.currentSize;

  if (currentYear <= 3 && deploymentRatio > 0.80) {
    return {
      allowed: false,
      reason: `Over-deploying too early. Deploying >80% of fund in years 1-3 leaves no reserves for follow-ons. Current: ${(deploymentRatio * 100).toFixed(0)}%`,
    };
  }

  return { allowed: true };
}

// ============ 8. INFLUENCE LEVEL FROM OWNERSHIP ============

export function getInfluenceLevel(ownership: number): 'observer' | 'advisor' | 'board_seat' | 'majority' {
  if (ownership < 25)  return 'observer';
  if (ownership < 50)  return 'advisor';
  if (ownership < 75)  return 'board_seat';
  return 'majority';
}

// ============ 9. FAIL/EXIT MODIFIERS FROM INFLUENCE ============

export function getInfluenceModifiers(ownership: number): { failMod: number; exitMod: number } {
  if (ownership < 10)  return { failMod: 1.0,  exitMod: 1.0  };
  if (ownership < 25)  return { failMod: 0.90, exitMod: 1.0  }; // -10% fail
  if (ownership < 50)  return { failMod: 0.80, exitMod: 1.10 }; // -20% fail, +10% exit
  if (ownership < 75)  return { failMod: 0.70, exitMod: 1.15 }; // -30% fail, +15% exit
  return                      { failMod: 0.60, exitMod: 1.20 }; // -40% fail, +20% exit (majority)
}
