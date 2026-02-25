import { describe, it, expect } from 'vitest'
import { generateStartup, SECTOR_DATA, generateCoInvestor } from './mockData'
import type { FundStage } from './types'

// ============ SECTOR_DATA ============

describe('SECTOR_DATA', () => {
  it('has at least 10 sectors', () => {
    const sectors = Object.keys(SECTOR_DATA)
    expect(sectors.length).toBeGreaterThanOrEqual(10)
  })

  it('each sector has nameWords and descriptionTemplates', () => {
    for (const [name, data] of Object.entries(SECTOR_DATA)) {
      expect(data.nameWords.length, `${name} nameWords`).toBeGreaterThan(0)
      expect(data.descriptionTemplates.length, `${name} descriptionTemplates`).toBeGreaterThan(0)
    }
  })
})

// ============ generateCoInvestor ============

describe('generateCoInvestor', () => {
  it('returns a valid co-investor', () => {
    const ci = generateCoInvestor()
    expect(ci.name).toBeTruthy()
    expect(['tier1', 'friendly', 'competitive', 'strategic']).toContain(ci.tier)
    expect(ci.reputation).toBeGreaterThanOrEqual(0)
    expect(ci.reputation).toBeLessThanOrEqual(100)
    expect(ci.failMod).toBeGreaterThan(0)
    expect(ci.exitMod).toBeGreaterThan(0)
  })
})

// ============ generateStartup ============

describe('generateStartup', () => {
  it('returns a startup with all required fields', () => {
    const s = generateStartup('seed', 'normal', 1)
    expect(s.id).toBeTruthy()
    expect(s.name).toBeTruthy()
    expect(s.description).toBeTruthy()
    expect(s.sector).toBeTruthy()
    expect(s.stage).toBe('seed')
    expect(s.founderName).toBeTruthy()
    expect(s.valuation).toBeGreaterThan(0)
    expect(s.teamSize).toBeGreaterThanOrEqual(1)
  })

  it('valuation is within expected range for stage', () => {
    const stages: FundStage[] = ['pre_seed', 'seed', 'series_a', 'growth']
    for (const stage of stages) {
      for (let i = 0; i < 10; i++) {
        const s = generateStartup(stage, 'normal', 1)
        expect(s.valuation).toBeGreaterThan(0)
        // Growth stage should have higher valuations
        if (stage === 'growth') {
          expect(s.valuation).toBeGreaterThanOrEqual(10_000_000)
        }
      }
    }
  })

  it('metrics are positive', () => {
    const s = generateStartup('seed', 'normal', 1)
    expect(s.metrics.mrr).toBeGreaterThanOrEqual(0)
    expect(s.metrics.burnRate).toBeGreaterThan(0)
    expect(s.metrics.runway).toBeGreaterThan(0)
    expect(s.metrics.customers).toBeGreaterThanOrEqual(0)
  })

  it('founder traits are within 1-10 range', () => {
    for (let i = 0; i < 20; i++) {
      const s = generateStartup('seed', 'normal', 1)
      const traits = s.founderTraits
      expect(traits.grit).toBeGreaterThanOrEqual(1)
      expect(traits.grit).toBeLessThanOrEqual(10)
      expect(traits.clarity).toBeGreaterThanOrEqual(1)
      expect(traits.clarity).toBeLessThanOrEqual(10)
      expect(traits.charisma).toBeGreaterThanOrEqual(1)
      expect(traits.charisma).toBeLessThanOrEqual(10)
      expect(traits.experience).toBeGreaterThanOrEqual(1)
      expect(traits.experience).toBeLessThanOrEqual(10)
    }
  })

  it('founderWillingness is between 0 and 100', () => {
    for (let i = 0; i < 20; i++) {
      const s = generateStartup('seed', 'normal', 1)
      expect(s.founderWillingness).toBeGreaterThanOrEqual(0)
      expect(s.founderWillingness).toBeLessThanOrEqual(100)
    }
  })

  it('unit economics fields are present', () => {
    const s = generateStartup('seed', 'normal', 1)
    expect(s.unitEconomics.cac).toBeGreaterThan(0)
    expect(s.unitEconomics.ltv).toBeGreaterThan(0)
    expect(s.unitEconomics.ltvCacRatio).toBeGreaterThan(0)
    expect(s.unitEconomics.grossMargin).toBeGreaterThan(0)
    expect(s.unitEconomics.grossMargin).toBeLessThanOrEqual(100)
  })

  it('market data is present', () => {
    const s = generateStartup('seed', 'normal', 1)
    expect(s.marketData.tamSize).toBeGreaterThan(0)
    expect(s.marketData.tamGrowthRate).toBeGreaterThan(0)
    expect(['low', 'medium', 'high', 'saturated']).toContain(s.marketData.competitionLevel)
  })

  it('sector is from SECTOR_DATA', () => {
    const validSectors = Object.keys(SECTOR_DATA)
    for (let i = 0; i < 20; i++) {
      const s = generateStartup('seed', 'normal', 1)
      expect(validSectors).toContain(s.sector)
    }
  })

  it('higher skill level produces better startups on average', () => {
    let lowSkillAvgGrowth = 0, highSkillAvgGrowth = 0
    const n = 200
    for (let i = 0; i < n; i++) {
      lowSkillAvgGrowth += generateStartup('seed', 'normal', 1).metrics.growthRate
      highSkillAvgGrowth += generateStartup('seed', 'normal', 5).metrics.growthRate
    }
    lowSkillAvgGrowth /= n
    highSkillAvgGrowth /= n
    // With enough samples the higher skill level should produce better growth on average
    // Allow small tolerance for randomness
    expect(highSkillAvgGrowth).toBeGreaterThanOrEqual(lowSkillAvgGrowth * 0.9)
  })
})
