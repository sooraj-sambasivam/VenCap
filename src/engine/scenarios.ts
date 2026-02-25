// ============================================================
// VenCap — Scenario / Challenge Mode Definitions (Feature 3)
// Pure data. No side effects.
// ============================================================

import type { ScenarioConfig, ScenarioId, PortfolioCompany, FounderState, CompanyOrigin } from './types';
import { uuid, randomInt, randomBetween, pickRandom } from '@/lib/utils';

// ============================================================
// SCENARIO DEFINITIONS
// ============================================================

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'sandbox',
    name: 'Sandbox Mode',
    tagline: 'The classic experience — your fund, your rules.',
    description: 'Standard 10-year venture fund lifecycle with no special constraints or win conditions. The original VenCap experience.',
    difficulty: 'normal',
    fundOverrides: {},
    startingMarketCycle: 'normal',
    startingLPSentiment: 50,
    startingMonth: 0,
    winConditions: [],
    bonusScoreMultiplier: 1.0,
    specialRules: ['Standard 10-year fund lifecycle', 'No special win conditions', 'Full feature access'],
  },
  {
    id: 'dotcom_crash',
    name: 'Dot-com Crash',
    tagline: 'Survive the bubble burst. Prove value through the chaos.',
    description: 'You\'ve just raised a $50M fund as the dot-com bubble is popping. Markets are crashing, LP sentiment is pessimistic, and every deal is suspect. Can you find the diamonds in the rubble and deliver a 2x return?',
    difficulty: 'hard',
    fundOverrides: { targetSize: 50_000_000, currentSize: 50_000_000, cashAvailable: 50_000_000 },
    startingMarketCycle: 'hard',
    startingLPSentiment: 30,
    startingMonth: 0,
    winConditions: [
      { type: 'tvpi', threshold: 2.0, byMonth: 120, description: 'Achieve 2.0x TVPI by fund end' },
    ],
    bonusScoreMultiplier: 1.5,
    specialRules: [
      'Starting market cycle: Hard (crash conditions)',
      'LP sentiment begins at 30 (pessimistic)',
      'Must achieve 2.0x TVPI to win',
    ],
  },
  {
    id: 'zirp_party',
    name: 'ZIRP Party',
    tagline: 'Zero interest rates, infinite valuations. Don\'t get caught holding the bag.',
    description: 'It\'s the free-money era — a $200M fund with bull markets and eager LPs. But valuations are insane, and you need to deliver 3x to be considered successful when the music stops.',
    difficulty: 'hard',
    fundOverrides: { targetSize: 200_000_000, currentSize: 200_000_000, cashAvailable: 200_000_000 },
    startingMarketCycle: 'bull',
    startingLPSentiment: 70,
    startingMonth: 0,
    winConditions: [
      { type: 'tvpi', threshold: 3.0, byMonth: 120, description: 'Achieve 3.0x TVPI by fund end' },
    ],
    bonusScoreMultiplier: 1.3,
    specialRules: [
      'Starting market cycle: Bull (ZIRP conditions)',
      'Larger fund size ($200M) with inflated valuations',
      'Must achieve 3.0x TVPI — harder than it sounds at peak valuations',
    ],
  },
  {
    id: 'zombie_fund',
    name: 'Zombie Fund',
    tagline: 'Year 7. Five struggling companies. Can you claw back returns?',
    description: 'You\'ve inherited a troubled fund in its 7th year with 5 pre-built struggling companies. The portfolio is underwater and LPs are restless. You have 3 years left to rescue what you can.',
    difficulty: 'extreme',
    fundOverrides: { targetSize: 100_000_000, currentSize: 100_000_000, cashAvailable: 15_000_000 },
    startingMarketCycle: 'cooldown',
    startingLPSentiment: 35,
    startingMonth: 84,
    winConditions: [
      { type: 'tvpi', threshold: 1.5, byMonth: 120, description: 'Achieve 1.5x TVPI in remaining 3 years' },
    ],
    bonusScoreMultiplier: 2.0,
    specialRules: [
      'Starts at Year 7 with 5 troubled portfolio companies',
      'Only 3 years remain to generate returns',
      'Limited cash reserves ($15M) for new investments',
    ],
  },
  {
    id: 'first_time_fund',
    name: 'First-Time Fund',
    tagline: 'Small fund, big dreams. Prove the model early.',
    description: 'A modest $20M first-time fund with limited brand recognition. You need to get your first exit within 5 years to build credibility for Fund II.',
    difficulty: 'easy',
    fundOverrides: { targetSize: 20_000_000, currentSize: 20_000_000, cashAvailable: 20_000_000 },
    startingMarketCycle: 'normal',
    startingLPSentiment: 55,
    startingMonth: 0,
    winConditions: [
      { type: 'exits', threshold: 1, byMonth: 60, description: 'Achieve at least 1 exit within 5 years' },
    ],
    bonusScoreMultiplier: 1.2,
    specialRules: [
      'Smaller fund size ($20M) limits check sizes',
      'No brand premium — founders may be harder to convince',
      'First exit milestone drives Fund II momentum',
    ],
  },
  {
    id: 'buyout_specialist',
    name: 'Buyout Specialist',
    tagline: 'Take control. Fix what\'s broken. Sell high.',
    description: 'A $150M buyout-focused fund. You favor control positions and operational improvement. Deliver 3x TVPI within 8 years by taking majority stakes and driving value creation.',
    difficulty: 'normal',
    fundOverrides: { targetSize: 150_000_000, currentSize: 150_000_000, cashAvailable: 150_000_000 },
    startingMarketCycle: 'normal',
    startingLPSentiment: 60,
    startingMonth: 0,
    winConditions: [
      { type: 'tvpi', threshold: 3.0, byMonth: 96, description: 'Achieve 3.0x TVPI within 8 years' },
    ],
    bonusScoreMultiplier: 1.4,
    specialRules: [
      'Focused on majority/buyout positions',
      'Tighter 8-year timeline to return capital',
      'Higher multiple threshold reflects control premium',
    ],
  },
  {
    id: 'crisis_manager',
    name: 'Crisis Manager',
    tagline: 'Downmarket. Five struggling companies. Save three.',
    description: 'A tough market and 5 companies in distress. You need to rescue at least 3 of them to exits within 10 years. Triage, prioritize, and find the survivors.',
    difficulty: 'extreme',
    fundOverrides: { targetSize: 80_000_000, currentSize: 80_000_000, cashAvailable: 25_000_000 },
    startingMarketCycle: 'hard',
    startingLPSentiment: 40,
    startingMonth: 0,
    winConditions: [
      { type: 'exits', threshold: 3, byMonth: 120, description: 'Get 3 of the 5 pre-built companies to successful exits' },
    ],
    bonusScoreMultiplier: 1.8,
    specialRules: [
      'Start with 5 pre-built struggling companies',
      'Hard market conditions from day one',
      'Must achieve 3 exits from the starting portfolio',
    ],
  },
  {
    id: 'lp_rescue',
    name: 'LP Rescue',
    tagline: 'LPs are furious. You have 3 years to restore trust.',
    description: 'LP sentiment has collapsed to 15. You have 36 months to restore confidence to 60+ before they pull the plug. Every communication, every deal, every outcome matters.',
    difficulty: 'hard',
    fundOverrides: { targetSize: 75_000_000, currentSize: 75_000_000, cashAvailable: 60_000_000 },
    startingMarketCycle: 'normal',
    startingLPSentiment: 15,
    startingMonth: 0,
    winConditions: [
      { type: 'lp_sentiment', threshold: 60, byMonth: 36, description: 'Raise LP sentiment to 60+ within 3 years' },
    ],
    bonusScoreMultiplier: 1.6,
    specialRules: [
      'LP sentiment starts critically low (15)',
      'Must reach 60+ sentiment within 36 months or lose the fund',
      'Every LP action and portfolio outcome counts double',
    ],
  },
];

export function getScenario(id: ScenarioId): ScenarioConfig {
  return SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0];
}

// ============================================================
// SEED STARTING PORTFOLIO (for Zombie Fund + Crisis Manager)
// ============================================================

export function seedStartingPortfolio(_scenario: ScenarioConfig): PortfolioCompany[] {
  const sectors = ['SaaS', 'Fintech', 'HealthTech', 'Marketplace', 'Consumer'];
  const founderNames = ['Alex Chen', 'Jordan Patel', 'Taylor Kim', 'Morgan Singh', 'Casey Williams'];
  const companies: PortfolioCompany[] = [];

  for (let i = 0; i < 5; i++) {
    const investedAmount = randomInt(3_000_000, 12_000_000);
    const currentVal = Math.round(investedAmount * randomBetween(0.3, 0.8)); // underwater

    const company: PortfolioCompany = {
      id: uuid(),
      name: `${pickRandom(['Vertex', 'Atlas', 'Horizon', 'Apex', 'Zenith'])}${pickRandom(['AI', 'Hub', 'Labs', 'Tech', 'Works'])}`,
      sector: sectors[i],
      stage: 'series_a',
      description: 'Portfolio company requiring active management and strategic support.',
      founderName: founderNames[i],
      founderTraits: { grit: randomInt(4, 7), clarity: randomInt(3, 6), charisma: randomInt(3, 6), experience: randomInt(4, 7) },
      teamSize: randomInt(10, 30),
      unitEconomics: { cac: 800, ltv: 2000, ltvCacRatio: 2.5, grossMargin: 55, paybackMonths: 14 },
      metrics: {
        mrr: randomInt(50_000, 200_000),
        growthRate: randomBetween(0.02, 0.06),
        customers: randomInt(50, 300),
        churn: randomBetween(0.06, 0.15),
        burnRate: randomInt(150_000, 400_000),
        runway: randomInt(4, 10),
      },
      marketData: { tamSize: 2_000_000_000, tamGrowthRate: 0.12, competitionLevel: 'high' },
      valuation: currentVal,
      strengths: ['Experienced founding team', 'Defensible niche'],
      risks: ['Cash runway concerns', 'Competitive pressure', 'Slowing growth'],
      redFlags: ['Burn rate elevated', 'Customer churn increasing'],
      ddNotes: ['Portfolio company inherited from distressed position.'],
      discoverySource: 'referral',
      founderWillingness: 60,
      coInvestors: [],
      region: pickRandom(['silicon_valley', 'nyc', 'boston'] as const),
      investedAmount,
      followOnInvested: 0,
      ownership: randomBetween(8, 20),
      currentValuation: currentVal,
      multiple: Math.round((currentVal / investedAmount) * 100) / 100,
      status: 'active',
      origin: 'external' as CompanyOrigin,
      founderState: pickRandom(['distracted', 'defensive', 'burned_out'] as const) as FounderState,
      pmfScore: randomInt(20, 45),
      relationship: randomInt(30, 55),
      supportScore: randomInt(5, 25),
      influence: 'board_seat',
      monthInvested: 0,
      events: [],
      hiredTalent: [],
    };
    companies.push(company);
  }
  return companies;
}
