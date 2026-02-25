// ============================================================
// VenCap — Dynamic Difficulty Scaling
// Adjusts game parameters based on skillLevel and rebirthCount
// ============================================================

import type { DifficultyModifiers } from './types';

/**
 * Returns difficulty modifiers scaled by player skill level.
 * Higher skill = harder game (more fails, fewer exits, tougher events).
 * First playthrough (skillLevel=1) is the baseline.
 */
export function getDifficultyModifiers(skillLevel: number, rebirthCount: number): DifficultyModifiers {
  // Each rebirth adds difficulty. First playthrough is easiest.
  const level = Math.max(1, skillLevel);

  // Fail rates increase 8% per skill level beyond 1
  const failRateMod = 1.0 + (level - 1) * 0.08;

  // Exit rates decrease 5% per skill level (harder to get exits)
  const exitRateMod = Math.max(0.6, 1.0 - (level - 1) * 0.05);

  // Negative events become more frequent
  const eventFreqMod = 1.0 + (level - 1) * 0.10;

  // Valuations inflate (higher prices = lower returns)
  const valuationMod = 1.0 + (level - 1) * 0.06;

  // Deal quality improves with both skill level and rebirth experience
  const dealQualityMod = 1.0 + (level - 1) * 0.02 + rebirthCount * 0.03;

  // Market cycles move faster at higher levels
  const marketCycleSpeed = 1.0 + (level - 1) * 0.05;

  return {
    failRateMod,
    exitRateMod,
    eventFreqMod,
    valuationMod,
    dealQualityMod,
    marketCycleSpeed,
  };
}

/**
 * Adjusts a base probability by the difficulty modifier.
 * Clamps result to [0, 1].
 */
export function applyDifficultyToRate(baseRate: number, modifier: number): number {
  return Math.min(1, Math.max(0, baseRate * modifier));
}
