import { describe, it, expect } from 'vitest'
import { generateTalentPool, calculateHireProbability, applyHireEffects, processAlumni } from './talentMarket'
import type { PortfolioCompany, TalentCandidate } from './types'

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

function makeCandidate(overrides: Partial<TalentCandidate> = {}): TalentCandidate {
  return {
    id: 't1',
    name: 'Bob Smith',
    role: 'engineering',
    seniority: 'senior',
    reputation: 70,
    salary: 200_000,
    skills: ['Backend Systems', 'Infrastructure/DevOps'],
    isAlumni: false,
    ...overrides,
  }
}

// ============ generateTalentPool ============

describe('generateTalentPool', () => {
  it('returns an array of candidates', () => {
    const pool = generateTalentPool('normal', 12)
    expect(Array.isArray(pool)).toBe(true)
    expect(pool.length).toBeGreaterThan(0)
  })

  it('pool size varies by market cycle', () => {
    // Run multiple times and check ranges
    const sizes = { bull: [] as number[], hard: [] as number[] }
    for (let i = 0; i < 20; i++) {
      sizes.bull.push(generateTalentPool('bull', i).length)
      sizes.hard.push(generateTalentPool('hard', i).length)
    }
    const avgBull = sizes.bull.reduce((a, b) => a + b, 0) / sizes.bull.length
    const avgHard = sizes.hard.reduce((a, b) => a + b, 0) / sizes.hard.length
    // Hard market should generally produce larger pools
    expect(avgHard).toBeGreaterThan(avgBull)
  })

  it('each candidate has required fields', () => {
    const pool = generateTalentPool('normal', 6)
    for (const c of pool) {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.role).toBeTruthy()
      expect(c.seniority).toBeTruthy()
      expect(c.reputation).toBeGreaterThanOrEqual(0)
      expect(c.salary).toBeGreaterThan(0)
      expect(c.skills.length).toBeGreaterThanOrEqual(2)
      expect(c.isAlumni).toBe(false)
    }
  })

  it('hard market salaries are lower than bull market', () => {
    let hardTotal = 0, bullTotal = 0, hardCount = 0, bullCount = 0
    for (let i = 0; i < 10; i++) {
      const hardPool = generateTalentPool('hard', i)
      const bullPool = generateTalentPool('bull', i)
      hardPool.forEach(c => { hardTotal += c.salary; hardCount++ })
      bullPool.forEach(c => { bullTotal += c.salary; bullCount++ })
    }
    expect(hardTotal / hardCount).toBeLessThan(bullTotal / bullCount)
  })
})

// ============ calculateHireProbability ============

describe('calculateHireProbability', () => {
  it('returns value between 0.1 and 0.95', () => {
    const p = calculateHireProbability(makeCandidate(), makeCompany(), 'normal')
    expect(p).toBeGreaterThanOrEqual(0.1)
    expect(p).toBeLessThanOrEqual(0.95)
  })

  it('lab company bonus increases probability', () => {
    const external = calculateHireProbability(makeCandidate(), makeCompany({ origin: 'external' }), 'normal')
    const lab = calculateHireProbability(makeCandidate(), makeCompany({ origin: 'lab' }), 'normal')
    expect(lab).toBeGreaterThan(external)
  })

  it('leadership seniority reduces probability', () => {
    const senior = calculateHireProbability(makeCandidate({ seniority: 'senior' }), makeCompany(), 'normal')
    const leader = calculateHireProbability(makeCandidate({ seniority: 'leadership' }), makeCompany(), 'normal')
    expect(leader).toBeLessThan(senior)
  })

  it('bull market reduces probability', () => {
    const normal = calculateHireProbability(makeCandidate(), makeCompany(), 'normal')
    const bull = calculateHireProbability(makeCandidate(), makeCompany(), 'bull')
    expect(bull).toBeLessThan(normal)
  })

  it('hard market increases probability', () => {
    const normal = calculateHireProbability(makeCandidate(), makeCompany(), 'normal')
    const hard = calculateHireProbability(makeCandidate(), makeCompany(), 'hard')
    expect(hard).toBeGreaterThan(normal)
  })

  it('high relationship increases probability', () => {
    const low = calculateHireProbability(makeCandidate(), makeCompany({ relationship: 30 }), 'normal')
    const high = calculateHireProbability(makeCandidate(), makeCompany({ relationship: 80 }), 'normal')
    expect(high).toBeGreaterThan(low)
  })
})

// ============ applyHireEffects ============

describe('applyHireEffects', () => {
  it('engineering hire returns pmfScore and growth effects', () => {
    const effects = applyHireEffects(makeCandidate({ role: 'engineering' }), makeCompany())
    expect(effects.pmfScore).toBeDefined()
    expect(effects.metrics).toBeDefined()
  })

  it('sales hire returns mrr and growth effects', () => {
    const effects = applyHireEffects(makeCandidate({ role: 'sales' }), makeCompany())
    expect(effects.metrics).toBeDefined()
  })

  it('executive hire returns supportScore and pmfScore', () => {
    const effects = applyHireEffects(makeCandidate({ role: 'executive' }), makeCompany())
    expect(effects.supportScore).toBeDefined()
    expect(effects.pmfScore).toBeDefined()
  })

  it('leadership seniority amplifies effects', () => {
    const senior = applyHireEffects(makeCandidate({ seniority: 'senior', role: 'executive' }), makeCompany())
    const leader = applyHireEffects(makeCandidate({ seniority: 'leadership', role: 'executive' }), makeCompany())
    // Leadership should have higher support score boost on average
    expect(leader.supportScore!).toBeGreaterThanOrEqual(senior.supportScore!)
  })
})

// ============ processAlumni ============

describe('processAlumni', () => {
  it('returns empty array for no failed companies', () => {
    expect(processAlumni([])).toEqual([])
  })

  it('generates 1-3 alumni per failed company', () => {
    const failed = [makeCompany({ status: 'failed' })]
    const alumni = processAlumni(failed)
    expect(alumni.length).toBeGreaterThanOrEqual(1)
    expect(alumni.length).toBeLessThanOrEqual(3)
  })

  it('alumni are marked as isAlumni', () => {
    const failed = [makeCompany({ status: 'failed' })]
    const alumni = processAlumni(failed)
    for (const a of alumni) {
      expect(a.isAlumni).toBe(true)
    }
  })

  it('alumni are mid, senior, or leadership seniority (no juniors)', () => {
    const failed = Array.from({ length: 5 }, (_, i) => makeCompany({ id: `f${i}`, status: 'failed' }))
    const alumni = processAlumni(failed)
    for (const a of alumni) {
      expect(['mid', 'senior', 'leadership']).toContain(a.seniority)
    }
  })

  it('generates alumni from multiple failed companies', () => {
    const failed = [
      makeCompany({ id: 'f1', status: 'failed' }),
      makeCompany({ id: 'f2', status: 'failed' }),
      makeCompany({ id: 'f3', status: 'failed' }),
    ]
    const alumni = processAlumni(failed)
    expect(alumni.length).toBeGreaterThanOrEqual(3) // at least 1 per company
    expect(alumni.length).toBeLessThanOrEqual(9) // at most 3 per company
  })
})
