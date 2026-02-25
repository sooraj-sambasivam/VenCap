import { describe, it, expect } from 'vitest'
import { getDifficultyModifiers, applyDifficultyToRate } from './difficultyScaling'

describe('getDifficultyModifiers', () => {
  it('skill level 1 is baseline (all near 1.0)', () => {
    const m = getDifficultyModifiers(1, 0)
    expect(m.failRateMod).toBe(1.0)
    expect(m.exitRateMod).toBe(1.0)
    expect(m.eventFreqMod).toBe(1.0)
    expect(m.valuationMod).toBe(1.0)
    expect(m.dealQualityMod).toBe(1.0)
    expect(m.marketCycleSpeed).toBe(1.0)
  })

  it('higher skill increases difficulty', () => {
    const m = getDifficultyModifiers(3, 1)
    expect(m.failRateMod).toBeGreaterThan(1.0)
    expect(m.exitRateMod).toBeLessThan(1.0)
    expect(m.eventFreqMod).toBeGreaterThan(1.0)
    expect(m.valuationMod).toBeGreaterThan(1.0)
  })

  it('rebirth count boosts deal quality', () => {
    const noRebirth = getDifficultyModifiers(1, 0)
    const twoRebirths = getDifficultyModifiers(1, 2)
    expect(twoRebirths.dealQualityMod).toBeGreaterThan(noRebirth.dealQualityMod)
  })

  it('exit rate has a floor of 0.6', () => {
    const m = getDifficultyModifiers(20, 0)
    expect(m.exitRateMod).toBeGreaterThanOrEqual(0.6)
  })
})

describe('applyDifficultyToRate', () => {
  it('clamps result to [0, 1]', () => {
    expect(applyDifficultyToRate(0.5, 3.0)).toBeLessThanOrEqual(1)
    expect(applyDifficultyToRate(0.5, -1.0)).toBeGreaterThanOrEqual(0)
  })

  it('returns base rate when modifier is 1.0', () => {
    expect(applyDifficultyToRate(0.05, 1.0)).toBe(0.05)
  })

  it('scales rate by modifier', () => {
    expect(applyDifficultyToRate(0.10, 1.5)).toBeCloseTo(0.15)
  })
})
