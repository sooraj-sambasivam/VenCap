import { describe, it, expect } from 'vitest'
import { generateMonthlyEvents, applyEventModifiers } from './dynamicEvents'
import type { PortfolioCompany, DynamicEvent } from './types'

// ============ Helpers ============

function makeCompany(overrides: Partial<PortfolioCompany> = {}): PortfolioCompany {
  return {
    id: 'c1',
    name: 'TestCo',
    sector: 'SaaS',
    stage: 'seed',
    founderName: 'Alice',
    founderState: 'focused',
    status: 'active',
    origin: 'external',
    investedAmount: 5_000_000,
    ownership: 10,
    currentValuation: 8_000_000,
    multiple: 1.6,
    pmfScore: 55,
    metrics: { mrr: 80000, growthRate: 0.10, churn: 0.02, burnRate: 80000, runway: 12, customers: 100 },
    unitEconomics: { cac: 1000, ltv: 5000, ltvCacRatio: 5, grossMargin: 70, paybackMonths: 6 },
    events: [],
    hiredTalent: [],
    milestones: [],
    coInvestors: [],
    relationship: 60,
    supportScore: 50,
    influence: 'observer',
    monthInvested: 3,
    ...overrides,
  } as PortfolioCompany
}

function makeEvent(overrides: Partial<DynamicEvent> = {}): DynamicEvent {
  return {
    id: 'e1',
    type: 'product_setback',
    title: 'Major Product Setback',
    description: 'Something broke.',
    severity: 'moderate',
    sentiment: 'negative',
    effects: {
      mrrMod: -0.10,
      pmfMod: -5,
      failChanceMod: 0.08,
      growthMod: -0.05,
    },
    month: 12,
    ...overrides,
  }
}

// ============ generateMonthlyEvents ============

describe('generateMonthlyEvents', () => {
  it('returns an array', () => {
    const events = generateMonthlyEvents(makeCompany(), 'normal')
    expect(Array.isArray(events)).toBe(true)
  })

  it('caps at 2 events per company per month', () => {
    // Run many times to check cap
    for (let i = 0; i < 50; i++) {
      const events = generateMonthlyEvents(makeCompany(), 'normal')
      expect(events.length).toBeLessThanOrEqual(2)
    }
  })

  it('events have required fields', () => {
    // Run until we get at least one event
    let found = false
    for (let i = 0; i < 100; i++) {
      const events = generateMonthlyEvents(makeCompany(), 'normal')
      if (events.length > 0) {
        const e = events[0]
        expect(e.id).toBeTruthy()
        expect(e.type).toBeTruthy()
        expect(e.title).toBeTruthy()
        expect(e.description).toBeTruthy()
        expect(['minor', 'moderate', 'severe']).toContain(e.severity)
        expect(['positive', 'negative']).toContain(e.sentiment)
        expect(e.effects).toBeDefined()
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('generates events over many iterations (not always empty)', () => {
    let totalEvents = 0
    for (let i = 0; i < 100; i++) {
      totalEvents += generateMonthlyEvents(makeCompany(), 'normal').length
    }
    // With ~15 templates each at 1-4% probability, should see some events
    expect(totalEvents).toBeGreaterThan(0)
  })

  it('stressed companies get more negative events over time', () => {
    const healthy = makeCompany({ relationship: 80, supportScore: 80, pmfScore: 80 })
    const stressed = makeCompany({
      relationship: 10, supportScore: 5, pmfScore: 20,
      founderState: 'burned_out',
      metrics: { mrr: 10000, growthRate: 0.02, churn: 0.10, burnRate: 200000, runway: 3, customers: 10 },
    })

    let healthyNeg = 0, stressedNeg = 0
    for (let i = 0; i < 200; i++) {
      healthyNeg += generateMonthlyEvents(healthy, 'normal').filter(e => e.sentiment === 'negative').length
      stressedNeg += generateMonthlyEvents(stressed, 'hard').filter(e => e.sentiment === 'negative').length
    }
    expect(stressedNeg).toBeGreaterThan(healthyNeg)
  })
})

// ============ applyEventModifiers ============

describe('applyEventModifiers', () => {
  it('does not modify positive events', () => {
    const positiveEvent = makeEvent({ sentiment: 'positive', effects: { growthMod: 0.10 } })
    const modified = applyEventModifiers(positiveEvent, makeCompany())
    expect(modified.effects.growthMod).toBe(0.10)
  })

  it('lab origin reduces negative effects', () => {
    const event = makeEvent()
    const labCompany = makeCompany({ origin: 'lab' })
    const modified = applyEventModifiers(event, labCompany)
    // Negative mrrMod should be less negative (closer to 0)
    expect(modified.effects.mrrMod!).toBeGreaterThan(event.effects.mrrMod!)
  })

  it('incubator origin also reduces negative effects but less than lab', () => {
    const event = makeEvent()
    const incubator = makeCompany({ origin: 'incubator' })
    const lab = makeCompany({ origin: 'lab' })
    const incubResult = applyEventModifiers(event, incubator)
    const labResult = applyEventModifiers(event, lab)
    // Lab should have more reduction (mrrMod closer to 0) than incubator
    expect(labResult.effects.mrrMod!).toBeGreaterThan(incubResult.effects.mrrMod!)
  })

  it('high support score reduces negative effects', () => {
    const event = makeEvent()
    const lowSupport = makeCompany({ supportScore: 20 })
    const highSupport = makeCompany({ supportScore: 70 })
    const lowResult = applyEventModifiers(event, lowSupport)
    const highResult = applyEventModifiers(event, highSupport)
    expect(highResult.effects.mrrMod!).toBeGreaterThan(lowResult.effects.mrrMod!)
  })

  it('board_seat influence reduces negative effects', () => {
    const event = makeEvent()
    const observer = makeCompany({ influence: 'observer' })
    const boardSeat = makeCompany({ influence: 'board_seat' })
    const obsResult = applyEventModifiers(event, observer)
    const boardResult = applyEventModifiers(event, boardSeat)
    expect(boardResult.effects.failChanceMod!).toBeLessThan(obsResult.effects.failChanceMod!)
  })

  it('high relationship reduces negative effects', () => {
    const event = makeEvent()
    const lowRel = makeCompany({ relationship: 30 })
    const highRel = makeCompany({ relationship: 80 })
    const lowResult = applyEventModifiers(event, lowRel)
    const highResult = applyEventModifiers(event, highRel)
    expect(highResult.effects.mrrMod!).toBeGreaterThan(lowResult.effects.mrrMod!)
  })

  it('multiple protections stack', () => {
    const event = makeEvent()
    const unprotected = makeCompany({ origin: 'external', supportScore: 20, influence: 'observer', relationship: 30 })
    const maxProtected = makeCompany({ origin: 'lab', supportScore: 80, influence: 'board_seat', relationship: 80 })
    const unprotResult = applyEventModifiers(event, unprotected)
    const protResult = applyEventModifiers(event, maxProtected)
    // Max protection should have significantly reduced effects
    expect(protResult.effects.mrrMod!).toBeGreaterThan(unprotResult.effects.mrrMod!)
    expect(protResult.effects.failChanceMod!).toBeLessThan(unprotResult.effects.failChanceMod!)
  })
})

// ============ Legal / Regulatory Event Sector Filtering (Feature 6) ============

describe('legal event sector filtering', () => {
  function getEventTypes(company: ReturnType<typeof makeCompany>, iterations = 500): Set<string> {
    const types = new Set<string>()
    for (let i = 0; i < iterations; i++) {
      generateMonthlyEvents(company, 'normal').forEach(e => types.add(e.type))
    }
    return types
  }

  it('sec_investigation only fires for Fintech sector', () => {
    const saasCompany = makeCompany({ sector: 'SaaS' })
    const fintechCompany = makeCompany({ sector: 'Fintech' })

    const saasTypes = getEventTypes(saasCompany)
    expect(saasTypes.has('sec_investigation')).toBe(false)

    // Fintech should eventually see it over many iterations
    let seen = false
    for (let i = 0; i < 5000; i++) {
      const events = generateMonthlyEvents(fintechCompany, 'normal')
      if (events.some(e => e.type === 'sec_investigation')) { seen = true; break }
    }
    expect(seen).toBe(true)
  })

  it('sec_investigation never fires for non-Fintech sectors', () => {
    const sectors = ['SaaS', 'HealthTech', 'DeepTech', 'Marketplace', 'Consumer', 'Biotech']
    for (const sector of sectors) {
      const types = getEventTypes(makeCompany({ sector }))
      expect(types.has('sec_investigation')).toBe(false)
    }
  })

  it('gdpr_violation fires for SaaS, Fintech, Consumer but not DeepTech', () => {
    const deepTechTypes = getEventTypes(makeCompany({ sector: 'DeepTech' }))
    expect(deepTechTypes.has('gdpr_violation')).toBe(false)

    // SaaS/Fintech/Consumer can get GDPR violations
    for (const sector of ['SaaS', 'Fintech', 'Consumer']) {
      let seen = false
      for (let i = 0; i < 5000; i++) {
        const events = generateMonthlyEvents(makeCompany({ sector }), 'normal')
        if (events.some(e => e.type === 'gdpr_violation')) { seen = true; break }
      }
      expect(seen).toBe(true)
    }
  })

  it('gdpr_violation never fires for HealthTech, DeepTech, Biotech, Marketplace', () => {
    const excludedSectors = ['HealthTech', 'DeepTech', 'Biotech', 'Marketplace']
    for (const sector of excludedSectors) {
      const types = getEventTypes(makeCompany({ sector }))
      expect(types.has('gdpr_violation')).toBe(false)
    }
  })

  it('patent_dispute only fires for DeepTech and Biotech', () => {
    // Non-eligible sectors should never see it
    const excluded = ['SaaS', 'Fintech', 'Consumer', 'Marketplace', 'HealthTech']
    for (const sector of excluded) {
      const types = getEventTypes(makeCompany({ sector }))
      expect(types.has('patent_dispute')).toBe(false)
    }

    // DeepTech/Biotech should eventually see it
    for (const sector of ['DeepTech', 'Biotech']) {
      let seen = false
      for (let i = 0; i < 5000; i++) {
        const events = generateMonthlyEvents(makeCompany({ sector }), 'normal')
        if (events.some(e => e.type === 'patent_dispute')) { seen = true; break }
      }
      expect(seen).toBe(true)
    }
  })

  it('antitrust_scrutiny only fires for Marketplace/SaaS with MRR > 500K', () => {
    // Low-MRR SaaS should never get it
    const lowMrrSaas = makeCompany({ sector: 'SaaS', metrics: { mrr: 100_000, growthRate: 0.10, churn: 0.02, burnRate: 80000, runway: 12, customers: 100 } })
    const lowTypes = getEventTypes(lowMrrSaas)
    expect(lowTypes.has('antitrust_scrutiny')).toBe(false)

    // Non-eligible sector (HealthTech) should never get it
    const healthTypes = getEventTypes(makeCompany({ sector: 'HealthTech' }))
    expect(healthTypes.has('antitrust_scrutiny')).toBe(false)

    // High-MRR Marketplace should eventually see it
    const highMrrMarketplace = makeCompany({
      sector: 'Marketplace',
      metrics: { mrr: 1_000_000, growthRate: 0.10, churn: 0.02, burnRate: 80000, runway: 12, customers: 500 },
    })
    let seen = false
    for (let i = 0; i < 5000; i++) {
      const events = generateMonthlyEvents(highMrrMarketplace, 'normal')
      if (events.some(e => e.type === 'antitrust_scrutiny')) { seen = true; break }
    }
    expect(seen).toBe(true)
  })

  it('fda_approval positive event only fires for HealthTech and Biotech', () => {
    const excluded = ['SaaS', 'Fintech', 'Consumer', 'DeepTech', 'Marketplace']
    for (const sector of excluded) {
      const types = getEventTypes(makeCompany({ sector }))
      expect(types.has('fda_approval')).toBe(false)
    }
  })

  it('regulatory_approval positive event only fires for Fintech, HealthTech, Biotech', () => {
    const excluded = ['SaaS', 'Consumer', 'DeepTech', 'Marketplace']
    for (const sector of excluded) {
      const types = getEventTypes(makeCompany({ sector }))
      expect(types.has('regulatory_approval')).toBe(false)
    }
  })
})
