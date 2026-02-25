import { describe, it, expect } from 'vitest'
import {
  getOwnershipLimits,
  getCheckSizeRange,
  adjustOwnershipForRelationship,
  adjustOwnershipForMarket,
  calculateBuyoutAcceptance,
  getValuationMultiplier,
  getBaseValuationRange,
  canInvest,
  getInfluenceLevel,
  getInfluenceModifiers,
} from './vcRealism'
import type { Fund, FundStage } from './types'

// ============ Ownership Limits ============

describe('getOwnershipLimits', () => {
  it('returns correct ranges for each stage', () => {
    expect(getOwnershipLimits('pre_seed')).toEqual({ min: 7, max: 20 })
    expect(getOwnershipLimits('seed')).toEqual({ min: 5, max: 15 })
    expect(getOwnershipLimits('series_a')).toEqual({ min: 3, max: 12 })
    expect(getOwnershipLimits('growth')).toEqual({ min: 2, max: 8 })
  })

  it('earlier stages allow higher max ownership', () => {
    const preSeed = getOwnershipLimits('pre_seed')
    const growth = getOwnershipLimits('growth')
    expect(preSeed.max).toBeGreaterThan(growth.max)
  })
})

// ============ Check Size Range ============

describe('getCheckSizeRange', () => {
  it('returns a valid min/max range', () => {
    const range = getCheckSizeRange('national', 100_000_000, 'seed')
    expect(range.min).toBeLessThan(range.max)
    expect(range.min).toBeGreaterThan(0)
  })

  it('scales with fund size', () => {
    const small = getCheckSizeRange('national', 10_000_000, 'seed')
    const large = getCheckSizeRange('national', 100_000_000, 'seed')
    expect(large.max).toBeGreaterThan(small.max)
  })

  it('growth stage yields larger absolute checks than pre_seed', () => {
    const preSeed = getCheckSizeRange('national', 100_000_000, 'pre_seed')
    const growth = getCheckSizeRange('national', 100_000_000, 'growth')
    expect(growth.max).toBeGreaterThan(preSeed.max)
  })

  it('family_office has wider range than regional', () => {
    const regional = getCheckSizeRange('regional', 50_000_000, 'seed')
    const family = getCheckSizeRange('family_office', 50_000_000, 'seed')
    expect(family.max).toBeGreaterThan(regional.max)
  })
})

// ============ Adjust Ownership for Relationship ============

describe('adjustOwnershipForRelationship', () => {
  it('high relationship (>70) gives 1.25x multiplier', () => {
    expect(adjustOwnershipForRelationship(10, 80)).toBe(12.5)
  })

  it('low relationship (<30) caps at 8%', () => {
    expect(adjustOwnershipForRelationship(15, 20)).toBe(8)
  })

  it('low relationship with small base stays unchanged', () => {
    expect(adjustOwnershipForRelationship(5, 20)).toBe(5)
  })

  it('mid relationship (30-70) interpolates linearly', () => {
    const at30 = adjustOwnershipForRelationship(10, 30)
    const at70 = adjustOwnershipForRelationship(10, 70)
    expect(at30).toBe(10) // 1.0x multiplier
    expect(at70).toBe(12.5) // 1.25x multiplier
    // Midpoint at 50
    const at50 = adjustOwnershipForRelationship(10, 50)
    expect(at50).toBeCloseTo(11.25, 2) // 1.125x
  })
})

// ============ Adjust Ownership for Market ============

describe('adjustOwnershipForMarket', () => {
  it('bull and normal markets return ownership unchanged', () => {
    expect(adjustOwnershipForMarket(10, 'bull')).toBe(10)
    expect(adjustOwnershipForMarket(10, 'normal')).toBe(10)
  })

  it('cooldown gives 10% more', () => {
    expect(adjustOwnershipForMarket(10, 'cooldown')).toBeCloseTo(11, 1)
  })

  it('hard gives 25% more', () => {
    expect(adjustOwnershipForMarket(10, 'hard')).toBeCloseTo(12.5, 1)
  })
})

// ============ Buyout Acceptance ============

describe('calculateBuyoutAcceptance', () => {
  const baseStartup = {
    id: 'test',
    name: 'Test Co',
    description: '',
    sector: 'SaaS',
    stage: 'seed' as const,
    founderName: 'Alice',
    founderTraits: { grit: 5, clarity: 5, charisma: 5, experience: 5 },
    teamSize: 5,
    metrics: { mrr: 50000, growthRate: 0.10, churn: 0.02, burnRate: 100000, runway: 12, customers: 50 },
    unitEconomics: { cac: 1000, ltv: 5000, ltvCacRatio: 5, grossMargin: 70, paybackMonths: 6 },
    marketData: { tamSize: 1_000_000_000, tamGrowthRate: 0.15, competitionLevel: 'medium' as const },
    valuation: 10_000_000,
    discoverySource: 'inbound' as const,
    founderWillingness: 70,
    strengths: [],
    risks: [],
    redFlags: [],
    ddNotes: [],
    coInvestors: [],
    region: 'silicon_valley' as const,
  }

  it('returns probability between 0 and 1', () => {
    const result = calculateBuyoutAcceptance(baseStartup, 15_000_000, 50, 'normal')
    expect(result.probability).toBeGreaterThanOrEqual(0)
    expect(result.probability).toBeLessThanOrEqual(1)
  })

  it('low runway increases acceptance probability', () => {
    const lowRunway = { ...baseStartup, metrics: { ...baseStartup.metrics, runway: 3 } }
    const normal = calculateBuyoutAcceptance(baseStartup, 15_000_000, 50, 'normal')
    const desperate = calculateBuyoutAcceptance(lowRunway, 15_000_000, 50, 'normal')
    expect(desperate.probability).toBeGreaterThan(normal.probability)
  })

  it('gritty founder reduces acceptance probability', () => {
    const gritty = { ...baseStartup, founderTraits: { ...baseStartup.founderTraits, grit: 9 } }
    const normal = calculateBuyoutAcceptance(baseStartup, 15_000_000, 50, 'normal')
    const tough = calculateBuyoutAcceptance(gritty, 15_000_000, 50, 'normal')
    expect(tough.probability).toBeLessThan(normal.probability)
  })

  it('hard market increases probability', () => {
    const normalMarket = calculateBuyoutAcceptance(baseStartup, 15_000_000, 50, 'normal')
    const hardMarket = calculateBuyoutAcceptance(baseStartup, 15_000_000, 50, 'hard')
    expect(hardMarket.probability).toBeGreaterThan(normalMarket.probability)
  })
})

// ============ Valuation Multiplier ============

describe('getValuationMultiplier', () => {
  it('bull market is highest', () => {
    expect(getValuationMultiplier('seed', 'bull')).toBe(1.4)
  })

  it('hard market is lowest', () => {
    expect(getValuationMultiplier('seed', 'hard')).toBe(0.5)
  })

  it('ordering: bull > normal > cooldown > hard', () => {
    const bull = getValuationMultiplier('seed', 'bull')
    const normal = getValuationMultiplier('seed', 'normal')
    const cooldown = getValuationMultiplier('seed', 'cooldown')
    const hard = getValuationMultiplier('seed', 'hard')
    expect(bull).toBeGreaterThan(normal)
    expect(normal).toBeGreaterThan(cooldown)
    expect(cooldown).toBeGreaterThan(hard)
  })
})

// ============ Base Valuation Range ============

describe('getBaseValuationRange', () => {
  it('later stages have higher valuations', () => {
    const stages: FundStage[] = ['pre_seed', 'seed', 'series_a', 'growth']
    const maxes = stages.map((s) => getBaseValuationRange(s).max)
    for (let i = 1; i < maxes.length; i++) {
      expect(maxes[i]).toBeGreaterThan(maxes[i - 1])
    }
  })

  it('min is always less than max', () => {
    const stages: FundStage[] = ['pre_seed', 'seed', 'series_a', 'growth']
    for (const s of stages) {
      const r = getBaseValuationRange(s)
      expect(r.min).toBeLessThan(r.max)
    }
  })
})

// ============ canInvest ============

describe('canInvest', () => {
  const baseFund: Fund = {
    name: 'Test Fund',
    type: 'national',
    stage: 'seed',
    currentSize: 100_000_000,
    targetSize: 100_000_000,
    cashAvailable: 80_000_000,
    deployed: 20_000_000,
    currentMonth: 6,
    irrEstimate: 0,
    tvpiEstimate: 1.0,
    skillLevel: 1,
    rebirthCount: 0,
    yearStarted: 2024,
    managementFeeRate: 0.02,
    carryRate: 0.20,
    hurdleRate: 0.08,
    gpCommit: 1_000_000,
    totalFeesCharged: 0,
    carryAccrued: 0,
    totalDistributions: 0,
    gpEarnings: 0,
    geographicFocus: 'global' as const,
    lpActionCooldowns: [],
    scenarioId: 'sandbox' as const,
  }

  it('allows valid investments', () => {
    const result = canInvest(baseFund, 5_000_000, 'seed')
    expect(result.allowed).toBe(true)
  })

  it('rejects when insufficient cash', () => {
    const broke = { ...baseFund, cashAvailable: 1_000_000 }
    const result = canInvest(broke, 5_000_000, 'seed')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Insufficient cash')
  })

  it('rejects check below minimum', () => {
    const result = canInvest(baseFund, 100, 'seed')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('too small')
  })

  it('rejects check above maximum', () => {
    const result = canInvest(baseFund, 50_000_000, 'seed')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('too large')
  })

  it('rejects over-deployment in early years', () => {
    const heavilyDeployed = { ...baseFund, deployed: 76_000_000, currentMonth: 6 }
    const result = canInvest(heavilyDeployed, 5_000_000, 'seed')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Over-deploying')
  })

  it('allows high deployment in later years', () => {
    const lateGame = { ...baseFund, deployed: 75_000_000, currentMonth: 48 }
    const result = canInvest(lateGame, 3_000_000, 'seed')
    expect(result.allowed).toBe(true)
  })
})

// ============ Influence Level ============

describe('getInfluenceLevel', () => {
  it('low ownership is observer', () => {
    expect(getInfluenceLevel(5)).toBe('observer')
    expect(getInfluenceLevel(15)).toBe('observer')
    expect(getInfluenceLevel(24)).toBe('observer')
  })

  it('25-49% is advisor', () => {
    expect(getInfluenceLevel(30)).toBe('advisor')
    expect(getInfluenceLevel(49)).toBe('advisor')
  })

  it('50-74% is board_seat', () => {
    expect(getInfluenceLevel(50)).toBe('board_seat')
    expect(getInfluenceLevel(74)).toBe('board_seat')
  })

  it('75%+ is majority', () => {
    expect(getInfluenceLevel(75)).toBe('majority')
    expect(getInfluenceLevel(100)).toBe('majority')
  })
})

// ============ Influence Modifiers ============

describe('getInfluenceModifiers', () => {
  it('low ownership has no modifiers', () => {
    const m = getInfluenceModifiers(5)
    expect(m.failMod).toBe(1.0)
    expect(m.exitMod).toBe(1.0)
  })

  it('higher ownership reduces fail chance', () => {
    const low = getInfluenceModifiers(5)
    const high = getInfluenceModifiers(60)
    expect(high.failMod).toBeLessThan(low.failMod)
  })

  it('higher ownership increases exit chance', () => {
    const low = getInfluenceModifiers(5)
    const high = getInfluenceModifiers(60)
    expect(high.exitMod).toBeGreaterThan(low.exitMod)
  })

  it('majority ownership has strongest modifiers', () => {
    const m = getInfluenceModifiers(80)
    expect(m.failMod).toBe(0.60)
    expect(m.exitMod).toBe(1.20)
  })
})
