// ============================================================
// VenCap — Balance Configuration
// All tunable game parameters in one place.
// Import these constants instead of using magic numbers.
// ============================================================

import type { FundStage } from './types';

// ============================================================
// FAIL RATES (per month, by stage)
// ============================================================

/**
 * Base monthly fail probability by company stage.
 * Early-stage companies have significantly higher fail rates.
 *
 * Real-world reference:
 * - Seed: ~60-70% lifetime fail rate over ~7 years => ~1.5-2% per month
 * - Series A: ~40-50% lifetime fail rate => ~0.8-1% per month
 * - Series B+/Growth: ~20-30% lifetime fail rate => ~0.3-0.5% per month
 */
export const BASE_FAIL_RATES: Record<FundStage, number> = {
  pre_seed: 0.025,   // 2.5% per month — highest risk, pre-product
  seed:     0.018,   // 1.8% per month — product risk still high
  series_a: 0.009,   // 0.9% per month — some PMF validation
  growth:   0.004,   // 0.4% per month — scaling risk, not survival risk
};

/** Default fail rate if stage is unknown */
export const DEFAULT_FAIL_RATE = 0.015;

// ============================================================
// EXIT RATES (per month, by stage)
// ============================================================

/**
 * Base monthly exit probability by company stage.
 * Later-stage companies are closer to exit-readiness.
 */
export const BASE_EXIT_RATES: Record<FundStage, number> = {
  pre_seed: 0.002,   // 0.2% per month — very rare, acqui-hires mostly
  seed:     0.004,   // 0.4% per month — occasional early acquisition
  series_a: 0.007,   // 0.7% per month — more acquisition interest
  growth:   0.012,   // 1.2% per month — actively pursued by acquirers
};

/** Default exit rate if stage is unknown */
export const DEFAULT_EXIT_RATE = 0.005;

// ============================================================
// EXIT RATE TIME CURVE
// ============================================================

/**
 * Exit rates increase after a ramp-up period and peak in the sweet spot.
 * This models the J-curve of venture exits.
 *
 * Timeline:
 * - Months 0-36: base rate (companies still building)
 * - Months 37-60: +0.15% per month above 36 (gaining traction, some exits)
 * - Months 61-84: +0.20% per month above 36 (peak exit window)
 * - Months 85+: +0.10% per month above 36 (tapering, but still possible)
 */
export const EXIT_RAMP_START_MONTH = 36;
export const EXIT_PEAK_START_MONTH = 60;
export const EXIT_PEAK_END_MONTH = 84;

/** Per-month exit rate bonus for each month past EXIT_RAMP_START_MONTH */
export const EXIT_RAMP_RATE = 0.0015;      // months 37-60
export const EXIT_PEAK_RATE = 0.0020;       // months 61-84
export const EXIT_TAPER_RATE = 0.0010;      // months 85+

// ============================================================
// TRACTION (PMF) MODIFIERS
// ============================================================

/**
 * Companies with high traction (pmfScore > 70) are less likely to fail.
 * This stacks with the existing pmfScore > 70 fail modifier in advanceTime.
 */
export const HIGH_TRACTION_THRESHOLD = 70;
export const HIGH_TRACTION_FAIL_MULTIPLIER = 0.50;   // 50% lower fail rate

/**
 * Companies with very low traction are more likely to fail.
 */
export const LOW_TRACTION_THRESHOLD = 30;
export const LOW_TRACTION_FAIL_MULTIPLIER = 1.30;     // 30% higher fail rate

// ============================================================
// SURVIVAL BONUS
// ============================================================

/**
 * Companies that survive past a certain month threshold get progressively
 * lower fail rates. This models organizational maturity — companies that
 * have survived early challenges are more likely to continue surviving.
 *
 * Applied as a multiplier to the fail rate:
 *   survivalMultiplier = max(SURVIVAL_FLOOR, 1 - (monthsSurvived - SURVIVAL_START) * SURVIVAL_RATE_PER_MONTH)
 */
export const SURVIVAL_BONUS_START_MONTH = 48;
export const SURVIVAL_BONUS_RATE_PER_MONTH = 0.008;  // 0.8% reduction per month past threshold
export const SURVIVAL_BONUS_FLOOR = 0.30;             // minimum multiplier (never below 30% of base)

// ============================================================
// MARKET CYCLE EXIT MODIFIERS
// ============================================================

/**
 * How market cycles affect exit multiples.
 */
export const MARKET_EXIT_MULTIPLIERS: Record<string, number> = {
  bull: 1.3,
  normal: 1.0,
  cooldown: 0.8,
  hard: 0.6,
};

// ============================================================
// HELPER: Calculate exit rate bonus based on months active
// ============================================================

/**
 * Returns the additional exit rate bonus based on how long a company
 * has been in the portfolio. Models the J-curve of venture exits.
 */
export function getExitTimeBonus(monthsActive: number): number {
  if (monthsActive <= EXIT_RAMP_START_MONTH) return 0;

  const monthsPast = monthsActive - EXIT_RAMP_START_MONTH;

  if (monthsActive <= EXIT_PEAK_START_MONTH) {
    return monthsPast * EXIT_RAMP_RATE;
  } else if (monthsActive <= EXIT_PEAK_END_MONTH) {
    // Ramp portion (months 37-60) + peak portion (months 61-current)
    const rampMonths = EXIT_PEAK_START_MONTH - EXIT_RAMP_START_MONTH;
    const peakMonths = monthsActive - EXIT_PEAK_START_MONTH;
    return rampMonths * EXIT_RAMP_RATE + peakMonths * EXIT_PEAK_RATE;
  } else {
    // Ramp + peak + taper
    const rampMonths = EXIT_PEAK_START_MONTH - EXIT_RAMP_START_MONTH;
    const peakMonths = EXIT_PEAK_END_MONTH - EXIT_PEAK_START_MONTH;
    const taperMonths = monthsActive - EXIT_PEAK_END_MONTH;
    return rampMonths * EXIT_RAMP_RATE + peakMonths * EXIT_PEAK_RATE + taperMonths * EXIT_TAPER_RATE;
  }
}

// ============================================================
// HELPER: Calculate survival bonus multiplier
// ============================================================

/**
 * Returns a fail rate multiplier (0.30 - 1.0) based on how long
 * the company has survived. Longer survival = lower fail chance.
 */
export function getSurvivalMultiplier(monthsActive: number): number {
  if (monthsActive <= SURVIVAL_BONUS_START_MONTH) return 1.0;

  const monthsPast = monthsActive - SURVIVAL_BONUS_START_MONTH;
  const multiplier = 1.0 - monthsPast * SURVIVAL_BONUS_RATE_PER_MONTH;
  return Math.max(SURVIVAL_BONUS_FLOOR, multiplier);
}

// ============================================================
// HELPER: Calculate traction fail modifier
// ============================================================

/**
 * Returns a fail rate multiplier based on the company's PMF score (traction).
 * High-traction companies are much less likely to fail.
 */
export function getTractionFailModifier(pmfScore: number): number {
  if (pmfScore > HIGH_TRACTION_THRESHOLD) return HIGH_TRACTION_FAIL_MULTIPLIER;
  if (pmfScore < LOW_TRACTION_THRESHOLD) return LOW_TRACTION_FAIL_MULTIPLIER;
  return 1.0;
}
