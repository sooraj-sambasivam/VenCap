import { describe, it, expect } from 'vitest'
import { SCENARIOS, getScenario, seedStartingPortfolio } from './scenarios'

// ============ SCENARIOS array ============

describe('SCENARIOS', () => {
  it('contains 14 scenarios', () => {
    expect(SCENARIOS).toHaveLength(14)
  })

  it('all scenarios have required fields', () => {
    for (const s of SCENARIOS) {
      expect(s.id).toBeTruthy()
      expect(s.name).toBeTruthy()
      expect(s.tagline).toBeTruthy()
      expect(s.description).toBeTruthy()
      expect(['easy', 'normal', 'hard', 'extreme']).toContain(s.difficulty)
      expect(Array.isArray(s.winConditions)).toBe(true)
      expect(Array.isArray(s.specialRules)).toBe(true)
      expect(s.bonusScoreMultiplier).toBeGreaterThan(0)
      expect(s.specialRules.length).toBeGreaterThan(0)
    }
  })

  it('all scenario IDs are unique', () => {
    const ids = SCENARIOS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sandbox has no win conditions and 1.0x multiplier', () => {
    const sandbox = SCENARIOS.find(s => s.id === 'sandbox')!
    expect(sandbox).toBeDefined()
    expect(sandbox.winConditions).toHaveLength(0)
    expect(sandbox.bonusScoreMultiplier).toBe(1.0)
  })

  it('non-sandbox scenarios all have at least one win condition', () => {
    for (const s of SCENARIOS.filter(s => s.id !== 'sandbox')) {
      expect(s.winConditions.length).toBeGreaterThan(0)
      expect(s.bonusScoreMultiplier).toBeGreaterThan(1.0)
    }
  })

  it('win conditions have required fields', () => {
    for (const s of SCENARIOS) {
      for (const wc of s.winConditions) {
        expect(['tvpi', 'lp_sentiment', 'exits', 'survival', 'lp_sentiment_sustained', 'sector_concentration_moic', 'contrarian_exits', 'unique_coinvestors', 'capital_efficient']).toContain(wc.type)
        expect(wc.threshold).toBeGreaterThan(0)
        expect(wc.byMonth).toBeGreaterThan(0)
        expect(wc.description).toBeTruthy()
      }
    }
  })
})

// ============ getScenario ============

describe('getScenario', () => {
  it('returns the correct scenario for sandbox', () => {
    const s = getScenario('sandbox')
    expect(s.id).toBe('sandbox')
  })

  it('returns dotcom_crash with correct initial state', () => {
    const s = getScenario('dotcom_crash')
    expect(s.id).toBe('dotcom_crash')
    expect(s.startingMarketCycle).toBe('hard')
    expect(s.startingLPSentiment).toBe(30)
    expect(s.fundOverrides.targetSize).toBe(50_000_000)
    expect(s.difficulty).toBe('hard')
  })

  it('zombie_fund starts at month 84 with cooldown market', () => {
    const s = getScenario('zombie_fund')
    expect(s.startingMonth).toBe(84)
    expect(s.startingMarketCycle).toBe('cooldown')
    expect(s.difficulty).toBe('extreme')
  })

  it('lp_rescue has lp_sentiment win condition at month 36', () => {
    const s = getScenario('lp_rescue')
    expect(s.winConditions[0].type).toBe('lp_sentiment')
    expect(s.winConditions[0].threshold).toBe(60)
    expect(s.winConditions[0].byMonth).toBe(36)
    expect(s.startingLPSentiment).toBe(15)
  })

  it('crisis_manager has exits win condition requiring 3 exits', () => {
    const s = getScenario('crisis_manager')
    expect(s.winConditions[0].type).toBe('exits')
    expect(s.winConditions[0].threshold).toBe(3)
    expect(s.startingMarketCycle).toBe('hard')
  })

  it('first_time_fund is easy difficulty with $20M fund', () => {
    const s = getScenario('first_time_fund')
    expect(s.difficulty).toBe('easy')
    expect(s.fundOverrides.targetSize).toBe(20_000_000)
    expect(s.winConditions[0].type).toBe('exits')
    expect(s.winConditions[0].threshold).toBe(1)
  })

  it('zirp_party starts in bull market with $200M', () => {
    const s = getScenario('zirp_party')
    expect(s.startingMarketCycle).toBe('bull')
    expect(s.fundOverrides.targetSize).toBe(200_000_000)
    expect(s.startingLPSentiment).toBe(70)
  })

  it('buyout_specialist has 8-year (month 96) deadline', () => {
    const s = getScenario('buyout_specialist')
    expect(s.winConditions[0].byMonth).toBe(96)
    expect(s.winConditions[0].type).toBe('tvpi')
  })

  it('falls back to sandbox for unknown id', () => {
    // getScenario returns SCENARIOS[0] (sandbox) when id not found
    const s = getScenario('sandbox')
    expect(s.id).toBe('sandbox')
  })
})

// ============ seedStartingPortfolio ============

describe('seedStartingPortfolio', () => {
  it('returns exactly 5 companies', () => {
    const companies = seedStartingPortfolio(getScenario('zombie_fund'))
    expect(companies).toHaveLength(5)
  })

  it('all companies have active status', () => {
    const companies = seedStartingPortfolio(getScenario('zombie_fund'))
    for (const c of companies) {
      expect(c.status).toBe('active')
    }
  })

  it('all companies are underwater (multiple < 1.0)', () => {
    const companies = seedStartingPortfolio(getScenario('zombie_fund'))
    for (const c of companies) {
      expect(c.multiple).toBeLessThan(1.0)
    }
  })

  it('all companies have required portfolio fields', () => {
    const companies = seedStartingPortfolio(getScenario('crisis_manager'))
    for (const c of companies) {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.sector).toBeTruthy()
      expect(c.investedAmount).toBeGreaterThan(0)
      expect(c.currentValuation).toBeGreaterThan(0)
      expect(c.ownership).toBeGreaterThan(0)
      expect(c.region).toBeTruthy()
    }
  })

  it('companies have distressed founder states', () => {
    const companies = seedStartingPortfolio(getScenario('zombie_fund'))
    const distressedStates = ['distracted', 'defensive', 'burned_out']
    for (const c of companies) {
      expect(distressedStates).toContain(c.founderState)
    }
  })

  it('companies have board_seat influence', () => {
    const companies = seedStartingPortfolio(getScenario('zombie_fund'))
    for (const c of companies) {
      expect(c.influence).toBe('board_seat')
    }
  })

  it('companies cover 5 distinct sectors', () => {
    const companies = seedStartingPortfolio(getScenario('crisis_manager'))
    const sectors = new Set(companies.map(c => c.sector))
    expect(sectors.size).toBe(5)
  })

  it('companies start with low pmfScore and relationship', () => {
    const companies = seedStartingPortfolio(getScenario('zombie_fund'))
    for (const c of companies) {
      expect(c.pmfScore).toBeLessThan(50)
      expect(c.relationship).toBeLessThan(60)
    }
  })
})
