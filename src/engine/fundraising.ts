// ============================================================
// VenCap — Fundraising Engine Module
// Pure functions. No side effects. No React imports.
// ============================================================

import type {
  LPProspect,
  FundraisingCampaign,
  FundTermsConfig,
  LPCommitmentStatus,
  FundCloseStatus,
  Fund,
  LPType,
  MarketCycle,
} from "./types";
import { randomBetween, randomInt, clamp, uuid, pickRandom } from "@/lib/utils";
import { t } from "@/lib/i18n";

// Suppress unused import warning — FundraisingCampaign, FundCloseStatus
// are re-exported as part of the public module surface for consumers.
export type { FundraisingCampaign, FundCloseStatus };

// ============================================================
// CONSTANTS
// ============================================================

/** TVPI threshold to unlock Fund II fundraising */
export const FUND_II_TVPI_THRESHOLD = 2.0;

/** TVPI threshold to unlock Fund III fundraising */
export const FUND_III_TVPI_THRESHOLD = 2.5;

/** Standard 2-and-20 fund terms with 8% hurdle */
export const DEFAULT_FUND_TERMS: FundTermsConfig = {
  managementFee: 0.02,
  carry: 0.2,
  hurdleRate: 0.08,
  fundLife: 10,
  gpCommitPercent: 0.01,
};

// ============================================================
// LP NAME POOLS
// ============================================================

const INSTITUTIONAL_NAMES = [
  "CalPERS Alternatives",
  "Yale Endowment",
  "MIT Investment Management",
  "Harvard Management Company",
  "Stanford Management Company",
  "Ontario Teachers' Pension",
  "Abu Dhabi Investment Authority",
  "GIC Private Limited",
  "Norges Bank Investment",
  "CPP Investments",
  "State of Michigan Retirement",
  "Texas Teachers Retirement",
  "TIAA Ventures",
  "Vanguard Alternatives",
];

const FAMILY_OFFICE_NAMES = [
  "Walton Family Office",
  "Gates Ventures",
  "Koch Capital",
  "Bloomberg Ventures",
  "Bezos Expeditions",
  "Ziff Brothers Investments",
  "Pritzker Group",
  "Emerson Collective",
  "Tully Hill Partners",
  "Brightwood Capital",
];

const HNW_NAMES = [
  "Silicon Valley Angels",
  "Sand Hill Road Partners",
  "Route 128 Capital",
  "Austin Angel Network",
  "Chicago Technology Angels",
  "NYC Seed Alliance",
  "Boston Harbor Investors",
  "Golden Gate Ventures",
];

const FUND_OF_FUNDS_NAMES = [
  "HarbourVest Partners",
  "Fund of Funds Capital",
  "Pathway Capital Management",
  "Horsley Bridge Partners",
  "Adams Street Partners",
  "Portfolio Advisors",
  "Following Seas Capital",
  "Stonehaven FoF",
];

const LP_NAMES_BY_TYPE: Record<LPType, string[]> = {
  institutional: INSTITUTIONAL_NAMES,
  family_office: FAMILY_OFFICE_NAMES,
  hnw: HNW_NAMES,
  fund_of_funds: FUND_OF_FUNDS_NAMES,
};

const LP_TYPES: LPType[] = [
  "institutional",
  "family_office",
  "hnw",
  "fund_of_funds",
];

// ============================================================
// STATUS TRANSITION HELPERS
// ============================================================

const STATUS_SEQUENCE: LPCommitmentStatus[] = [
  "prospect",
  "pitched",
  "soft_circle",
  "hard_commit",
  "closed",
];

/**
 * Base success probability for each transition step.
 * These represent realistic LP conversion rates in VC fundraising.
 */
const BASE_PITCH_PROBABILITY: Record<string, number> = {
  prospect: 0.6, // prospect -> pitched
  pitched: 0.5, // pitched -> soft_circle
  soft_circle: 0.4, // soft_circle -> hard_commit
  hard_commit: 0.7, // hard_commit -> closed (high — already committed in principle)
};

// ============================================================
// MARKET CYCLE MODIFIERS
// ============================================================

const MARKET_CYCLE_MOD: Record<MarketCycle, number> = {
  bull: 1.1,
  normal: 1.0,
  cooldown: 1.0,
  hard: 0.85,
};

// ============================================================
// generateLPProspects
// ============================================================

/**
 * Generate a pool of LP prospects for a fundraising campaign.
 *
 * @param fundNumber - Which fund (1, 2, or 3) — affects LP type weighting
 * @param fundSize - Target fund size in dollars — sets commitment size range
 * @param lpSentimentScore - 0-100 LP sentiment — scales interestLevel
 * @returns 6-12 LPProspect objects, all starting with status "prospect"
 */
export function generateLPProspects(
  fundNumber: number,
  fundSize: number,
  lpSentimentScore: number,
): LPProspect[] {
  const count = randomInt(6, 12);
  const prospects: LPProspect[] = [];

  // Sentiment scaling: 0-100 sentiment maps interest to 30-90 range
  // At sentiment 50 (neutral), interest is centered at 60
  // Higher sentiment pushes the distribution higher, lower pushes it lower
  const sentimentOffset = (lpSentimentScore - 50) * 0.3; // -15 to +15 offset

  for (let i = 0; i < count; i++) {
    const lpType = pickRandom(LP_TYPES);
    const namePool = LP_NAMES_BY_TYPE[lpType];
    const usedNames = prospects.map((p) => p.name);
    const availableNames = namePool.filter((n) => !usedNames.includes(n));
    const name =
      availableNames.length > 0
        ? pickRandom(availableNames)
        : `${lpType.replace("_", " ")} Investor ${i + 1}`;

    // Commitment: 5-20% of fund size
    const commitmentPct = randomBetween(0.05, 0.2);
    const targetCommitment = Math.round(fundSize * commitmentPct);

    // Interest level: 30-90, scaled by LP sentiment
    const baseInterest = randomBetween(30, 90);
    const interestLevel = Math.round(
      clamp(baseInterest + sentimentOffset, 30, 90),
    );

    // Relationship score: 20-80 (independent of sentiment — represents network)
    // Later funds have better established relationships
    const relationshipBase = randomBetween(20, 80);
    const relationshipBonus = (fundNumber - 1) * 5; // Fund II/III get +5/+10 avg bonus
    const relationshipScore = Math.round(
      clamp(relationshipBase + relationshipBonus, 20, 80),
    );

    prospects.push({
      id: uuid(),
      name,
      type: lpType,
      targetCommitment,
      status: "prospect",
      interestLevel,
      relationshipScore,
    });
  }

  return prospects;
}

// ============================================================
// calculatePitchOutcome
// ============================================================

export interface PitchOutcome {
  newStatus: LPCommitmentStatus;
  message: string;
}

/**
 * Attempt to advance an LP prospect's commitment status by one step.
 *
 * Probability formula:
 *   baseProbability * (interestLevel / 100) * (relationshipScore / 100) * commitmentMod
 *
 * Where commitmentMod = clamp(lpSentimentScore / 50, 0.7, 1.3)
 *
 * A failed pitch may result in "declined" status.
 *
 * @param prospect - The LP to pitch
 * @param lpSentimentScore - 0-100 overall LP sentiment score
 * @param marketCycle - Current market environment
 * @returns { newStatus, message }
 */
export function calculatePitchOutcome(
  prospect: LPProspect,
  lpSentimentScore: number,
  marketCycle: MarketCycle,
): PitchOutcome {
  // Terminal states — already declined or already closed
  if (prospect.status === "declined") {
    return {
      newStatus: "declined",
      message: t(
        "fundraising.pitch.alreadyDeclined",
        "This LP has already declined to invest.",
      ),
    };
  }

  if (prospect.status === "closed") {
    return {
      newStatus: "closed",
      message: t(
        "fundraising.pitch.alreadyClosed",
        "This LP's commitment is already closed.",
      ),
    };
  }

  // Compute probability components
  const baseProbability = BASE_PITCH_PROBABILITY[prospect.status] ?? 0.5;
  const interestFactor = prospect.interestLevel / 100;
  const relationshipFactor = prospect.relationshipScore / 100;
  const commitmentMod = clamp(lpSentimentScore / 50, 0.7, 1.3);
  const marketMod = MARKET_CYCLE_MOD[marketCycle];

  const probability =
    baseProbability *
    interestFactor *
    relationshipFactor *
    commitmentMod *
    marketMod;

  const roll = Math.random();
  const success = roll <= probability;

  if (success) {
    // Advance to next status in sequence
    const currentIndex = STATUS_SEQUENCE.indexOf(prospect.status);
    const nextStatus: LPCommitmentStatus =
      currentIndex >= 0 && currentIndex < STATUS_SEQUENCE.length - 1
        ? STATUS_SEQUENCE[currentIndex + 1]
        : prospect.status;

    const messages: Record<LPCommitmentStatus, string> = {
      pitched: t(
        "fundraising.pitch.successPitched",
        "Strong interest — they want to learn more.",
      ),
      soft_circle: t(
        "fundraising.pitch.successSoftCircle",
        "Soft circle confirmed — they're in tentatively.",
      ),
      hard_commit: t(
        "fundraising.pitch.successHardCommit",
        "Hard commit secured — subject to final docs.",
      ),
      closed: t(
        "fundraising.pitch.successClosed",
        "Commitment closed — subscription documents signed.",
      ),
      prospect: t(
        "fundraising.pitch.successProspect",
        "Interested in learning more.",
      ),
      declined: t("fundraising.pitch.declined", "LP has declined."),
    };

    return {
      newStatus: nextStatus,
      message:
        messages[nextStatus] ??
        t("fundraising.pitch.success", "Pitch successful."),
    };
  } else {
    // Failed pitch — chance of decline proportional to how bad the outcome is
    // Higher failure margin → higher decline probability
    const declineProbability = 0.3 * (1 - probability);
    const declined = Math.random() <= declineProbability;

    if (declined) {
      return {
        newStatus: "declined",
        message: t(
          "fundraising.pitch.declined",
          "LP passed — not a fit for this fund.",
        ),
      };
    }

    return {
      newStatus: prospect.status, // Stay at current status
      message: t(
        "fundraising.pitch.notYet",
        "Not ready to move forward yet — follow up next month.",
      ),
    };
  }
}

// ============================================================
// calculateTotalCommitted
// ============================================================

/**
 * Sum the targetCommitment of all prospects at or beyond soft_circle status.
 * Prospects and pitched LPs are not counted — only confirmed commitments.
 *
 * Counted statuses: "soft_circle", "hard_commit", "closed"
 * Excluded statuses: "prospect", "pitched", "declined"
 */
export function calculateTotalCommitted(prospects: LPProspect[]): number {
  const COMMITTED_STATUSES = new Set<LPCommitmentStatus>([
    "soft_circle",
    "hard_commit",
    "closed",
  ]);

  return prospects.reduce((sum, p) => {
    if (COMMITTED_STATUSES.has(p.status)) {
      return sum + p.targetCommitment;
    }
    return sum;
  }, 0);
}

// ============================================================
// canStartNextFund
// ============================================================

/**
 * Determine whether the GP is eligible to begin fundraising for the next fund.
 *
 * Conditions:
 *   1. fund.tvpiEstimate >= fund.nextFundUnlockTvpi
 *   2. fund.fundNumber < 3 (max 3 funds per career)
 *
 * @param fund - The current fund state
 * @returns true if eligible to raise next fund
 */
export function canStartNextFund(
  fund: Pick<Fund, "tvpiEstimate" | "nextFundUnlockTvpi" | "fundNumber">,
): boolean {
  if (fund.fundNumber >= 3) return false;
  return fund.tvpiEstimate >= fund.nextFundUnlockTvpi;
}

// ============================================================
// getFirstCloseThreshold / getFinalCloseThreshold
// ============================================================

/**
 * Returns the target committed amount required to declare a first close.
 * First close triggers at 50% of the target fund size.
 */
export function getFirstCloseThreshold(targetAmount: number): number {
  return targetAmount * 0.5;
}

/**
 * Returns the target committed amount required to declare a final close.
 * Final close triggers at 100% of the target fund size.
 */
export function getFinalCloseThreshold(targetAmount: number): number {
  return targetAmount;
}

// ============================================================
// calculateNegotiatedFundSize
// ============================================================

/**
 * Calculate the final negotiated fund size based on LP commitments,
 * current market conditions, and LP sentiment.
 *
 * Formula:
 *   totalCommitted * marketMod * sentimentMod
 *
 * Where:
 *   - marketMod: bull=1.1, hard=0.85, all others=1.0
 *   - sentimentMod: clamp(lpSentimentScore / 50, 0.7, 1.3)
 *
 * @param prospects - All LP prospects in the campaign
 * @param marketCycle - Current market environment
 * @param lpSentimentScore - 0-100 overall LP sentiment
 * @returns Negotiated fund size in dollars
 */
export function calculateNegotiatedFundSize(
  prospects: LPProspect[],
  marketCycle: MarketCycle,
  lpSentimentScore: number,
): number {
  const totalCommitted = calculateTotalCommitted(prospects);
  if (totalCommitted === 0) return 0;

  const marketMod = MARKET_CYCLE_MOD[marketCycle];
  const sentimentMod = clamp(lpSentimentScore / 50, 0.7, 1.3);

  return totalCommitted * marketMod * sentimentMod;
}
