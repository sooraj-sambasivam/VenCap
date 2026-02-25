// ============================================================
// VenCap — Talent Pool & Hiring Mechanics
// Pure functions. No side effects.
// ============================================================

import type {
  TalentCandidate,
  TalentRole,
  TalentSeniority,
  MarketCycle,
  PortfolioCompany,
} from './types';
import { uuid, randomBetween, randomInt, pickRandom, weightedRandom, clamp } from '@/lib/utils';

// ============================================================
// NAME GENERATION
// ============================================================

const TALENT_FIRST_NAMES = [
  'Sophie', 'Ryan', 'Emma', 'Kevin', 'Maria', 'Ben', 'Anika', 'Trevor',
  'Lin', 'Derek', 'Jasmine', 'Aaron', 'Diana', 'Hassan', 'Grace', 'Vincent',
  'Preeti', 'Tom', 'Camila', 'Julian', 'Serena', 'Kai', 'Rachel', 'Andre',
  'Nora', 'Ian', 'Fatima', 'Rhys', 'Maya', 'Cole', 'Sara', 'Dmitri',
  'Zoe', 'Marco', 'Alicia', 'Jared', 'Leila', 'Patrick', 'Nina', 'Oscar',
];

const TALENT_LAST_NAMES = [
  'Rivera', 'Chandra', 'Okonkwo', 'Blake', 'Yamamoto', 'Fischer', 'Santos',
  'Iyer', 'Novak', 'Reeves', 'Johansson', 'Mahmood', 'Costa', 'Werner',
  'Nakamura', 'Petrov', 'Ellis', 'Kapoor', 'Lombardi', 'Zhao',
  'Murphy', 'Stein', 'Delgado', 'Frost', 'Bowen', 'Choi', 'Barrett',
  'Ivanova', 'Hartman', 'Lim', 'Cruz', 'Ashworth', 'Morales', 'Joshi',
  'Pearson', 'Vega', 'Lindberg', 'Shah', 'Duval', 'Ortiz',
];

// ============================================================
// SKILL POOLS BY ROLE
// ============================================================

const SKILLS_BY_ROLE: Record<TalentRole, string[]> = {
  engineering: [
    'Backend Systems', 'Frontend/React', 'Machine Learning', 'Infrastructure/DevOps',
    'Mobile Development', 'Data Engineering', 'Security Engineering', 'Platform Architecture',
    'Distributed Systems', 'API Design',
  ],
  sales: [
    'Enterprise Sales', 'SMB Sales', 'Channel Partnerships', 'Sales Operations',
    'Account Management', 'Solution Engineering', 'Business Development', 'Revenue Operations',
    'Pipeline Management', 'Contract Negotiation',
  ],
  product: [
    'Product Strategy', 'User Research', 'Growth Product', 'Platform Product',
    'Analytics', 'A/B Testing', 'Product-Led Growth', 'Enterprise Product',
    'Product Operations', 'Roadmap Planning',
  ],
  marketing: [
    'Content Marketing', 'Performance Marketing', 'Brand Strategy', 'SEO/SEM',
    'Community Building', 'Developer Marketing', 'Demand Generation', 'PR & Communications',
    'Event Marketing', 'Marketing Analytics',
  ],
  operations: [
    'Finance/FP&A', 'People Operations', 'Legal/Compliance', 'Customer Success',
    'Supply Chain', 'Process Optimization', 'Risk Management', 'Vendor Management',
    'Office Operations', 'Business Analytics',
  ],
  executive: [
    'CEO Experience', 'COO Experience', 'CFO Experience', 'CTO Experience',
    'VP Engineering', 'VP Sales', 'VP Product', 'Board Experience',
    'Fundraising', 'M&A Experience',
  ],
};

// ============================================================
// SALARY RANGES
// ============================================================

const BASE_SALARY: Record<TalentSeniority, { min: number; max: number }> = {
  junior:     { min: 80_000,  max: 120_000 },
  mid:        { min: 120_000, max: 180_000 },
  senior:     { min: 180_000, max: 280_000 },
  leadership: { min: 280_000, max: 450_000 },
};

// ============================================================
// 1. GENERATE TALENT POOL
// ============================================================

export function generateTalentPool(market: MarketCycle, _month: number): TalentCandidate[] {
  // Market affects pool size and salary multiplier
  const poolConfig: Record<MarketCycle, { minSize: number; maxSize: number; salaryMult: number }> = {
    bull:     { minSize: 6,  maxSize: 10, salaryMult: 1.3 },
    normal:   { minSize: 8,  maxSize: 12, salaryMult: 1.0 },
    cooldown: { minSize: 10, maxSize: 14, salaryMult: 1.0 },
    hard:     { minSize: 12, maxSize: 15, salaryMult: 0.7 },
  };

  const config = poolConfig[market];
  const poolSize = randomInt(config.minSize, config.maxSize);
  const candidates: TalentCandidate[] = [];

  for (let i = 0; i < poolSize; i++) {
    // Seniority distribution: 30% junior, 30% mid, 25% senior, 15% leadership
    const seniority = weightedRandom<TalentSeniority>(
      ['junior', 'mid', 'senior', 'leadership'],
      [30, 30, 25, 15]
    );

    const role = pickRandom<TalentRole>([
      'engineering', 'sales', 'product', 'marketing', 'operations', 'executive',
    ]);

    const salaryRange = BASE_SALARY[seniority];
    const salary = Math.round(randomBetween(salaryRange.min, salaryRange.max) * config.salaryMult);

    // Reputation correlates loosely with seniority
    const repBase: Record<TalentSeniority, { min: number; max: number }> = {
      junior:     { min: 20, max: 50 },
      mid:        { min: 35, max: 65 },
      senior:     { min: 50, max: 85 },
      leadership: { min: 65, max: 100 },
    };
    const rep = repBase[seniority];
    const reputation = randomInt(rep.min, rep.max);

    // Skills: 2-4 from role pool
    const numSkills = randomInt(2, 4);
    const skillPool = SKILLS_BY_ROLE[role];
    const skills = shuffleAndTake(skillPool, numSkills);

    const firstName = pickRandom(TALENT_FIRST_NAMES);
    const lastName = pickRandom(TALENT_LAST_NAMES);

    candidates.push({
      id: uuid(),
      name: `${firstName} ${lastName}`,
      role,
      seniority,
      reputation,
      salary,
      skills,
      isAlumni: false,
    });
  }

  return candidates;
}

// ============================================================
// 2. HIRE PROBABILITY
// ============================================================

export function calculateHireProbability(
  candidate: TalentCandidate,
  company: PortfolioCompany,
  market: MarketCycle
): number {
  let probability = 0.50; // 50% base

  // Lab company bonus
  if (company.origin === 'lab') probability += 0.25;

  // Seniority penalty
  if (candidate.seniority === 'leadership') probability -= 0.20;
  else if (candidate.seniority === 'senior') probability -= 0.10;

  // High relationship bonus
  if (company.relationship > 60) probability += 0.10;

  // Market effects
  if (market === 'bull') probability -= 0.15;
  if (market === 'hard') probability += 0.20;

  // High MRR bonus
  if (company.metrics.mrr > 500_000) probability += 0.10;

  return clamp(probability, 0.10, 0.95);
}

// ============================================================
// 3. APPLY HIRE EFFECTS
// ============================================================

export function applyHireEffects(
  candidate: TalentCandidate,
  _company: PortfolioCompany
): Partial<PortfolioCompany> {
  // Seniority multiplier
  const seniorityMult: Record<TalentSeniority, number> = {
    junior: 0.5,
    mid: 0.8,
    senior: 1.0,
    leadership: 1.5,
  };
  const mult = seniorityMult[candidate.seniority];

  // Base effects by role, scaled by seniority
  switch (candidate.role) {
    case 'engineering':
      return {
        pmfScore: randomInt(2, 5) * mult,
        metrics: {
          growthRate: randomBetween(0.03, 0.08) * mult,
        } as PortfolioCompany['metrics'],
      };

    case 'sales':
      return {
        metrics: {
          mrr: randomBetween(0.05, 0.15) * mult, // stored as MRR boost multiplier
          growthRate: randomBetween(0.02, 0.04) * mult,
        } as PortfolioCompany['metrics'],
      };

    case 'product':
      return {
        pmfScore: randomInt(3, 7) * mult,
        metrics: {
          growthRate: randomBetween(0.02, 0.05) * mult,
        } as PortfolioCompany['metrics'],
      };

    case 'marketing':
      return {
        metrics: {
          growthRate: randomBetween(0.03, 0.06) * mult,
          customers: randomBetween(0.05, 0.15) * mult, // customer growth boost
        } as PortfolioCompany['metrics'],
      };

    case 'operations':
      return {
        supportScore: randomInt(3, 6) * mult,
        metrics: {
          burnRate: -Math.min(0.30, randomBetween(0.05, 0.10) * mult), // burn reduction, capped at 30%
        } as PortfolioCompany['metrics'],
      };

    case 'executive':
      return {
        supportScore: randomInt(5, 10) * mult,
        pmfScore: randomInt(1, 3) * mult,
      };

    default:
      return {};
  }
}

// ============================================================
// 4. PROCESS ALUMNI FROM FAILED COMPANIES
// ============================================================

export function processAlumni(failedCompanies: PortfolioCompany[]): TalentCandidate[] {
  const alumni: TalentCandidate[] = [];

  for (const _company of failedCompanies) {
    // 1-3 alumni per failed company
    const numAlumni = randomInt(1, 3);

    for (let i = 0; i < numAlumni; i++) {
      const role = pickRandom<TalentRole>([
        'engineering', 'sales', 'product', 'marketing', 'operations', 'executive',
      ]);

      const seniority = weightedRandom<TalentSeniority>(
        ['mid', 'senior', 'leadership'],
        [40, 40, 20]
      );

      const salaryRange = BASE_SALARY[seniority];
      const salary = Math.round(randomBetween(salaryRange.min, salaryRange.max));

      // Alumni get +10 reputation bonus (experienced from failure)
      const repBase: Record<TalentSeniority, { min: number; max: number }> = {
        junior:     { min: 30, max: 60 },
        mid:        { min: 45, max: 75 },
        senior:     { min: 60, max: 95 },
        leadership: { min: 75, max: 100 },
      };
      const rep = repBase[seniority];
      const reputation = Math.min(100, randomInt(rep.min, rep.max) + 10);

      const numSkills = randomInt(2, 4);
      const skillPool = SKILLS_BY_ROLE[role];
      const skills = shuffleAndTake(skillPool, numSkills);

      const firstName = pickRandom(TALENT_FIRST_NAMES);
      const lastName = pickRandom(TALENT_LAST_NAMES);

      alumni.push({
        id: uuid(),
        name: `${firstName} ${lastName}`,
        role,
        seniority,
        reputation,
        salary,
        skills,
        isAlumni: true,
      });
    }
  }

  return alumni;
}

// ============================================================
// HELPERS
// ============================================================

function shuffleAndTake<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
