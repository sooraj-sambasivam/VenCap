# VenCap — Complete Claude Code Build Spec

> **What this document is:** A full, copy-paste-ready set of prompts, architecture decisions, and implementation instructions to give to Claude Code to build VenCap from scratch. Each section is a prompt or context block. Feed them sequentially.

---

## Table of Contents

1. [Project Init Prompt](#1-project-init-prompt)
2. [Architecture & Data Model](#2-architecture--data-model)
3. [Simulation Engine Prompts (Core Logic)](#3-simulation-engine-prompts)
4. [UI Page Prompts (One Per Page)](#4-ui-page-prompts)
5. [System Integration Prompts](#5-system-integration-prompts)
6. [Polish & QA Prompts](#6-polish--qa-prompts)
7. [Recommended Build Order](#7-recommended-build-order)
8. [MVP vs Full Feature Scope](#8-mvp-vs-full-feature-scope)

---

## 1. Project Init Prompt

> **Copy-paste this as your first Claude Code prompt.**

```
Create a new React + TypeScript project using Vite for a game called "VenCap" — a single-player venture capital fund management simulator.

Tech stack:
- React 18 + TypeScript + Vite
- Tailwind CSS v4 for styling
- shadcn/ui for component primitives (install with: npx shadcn@latest init)
- Zustand for state management (with persist middleware to localStorage)
- React Router v6 for routing
- Recharts for data visualization (install but don't use yet)
- Lucide React for icons

Project structure:
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui primitives
│   ├── DealCard.tsx
│   ├── InvestModal.tsx
│   ├── PortfolioTable.tsx
│   ├── LPSentimentPill.tsx
│   ├── MarketCycleBadge.tsx
│   ├── FounderStateBadge.tsx
│   ├── PMFBadge.tsx
│   └── AlertsPanel.tsx
├── pages/
│   ├── Index.tsx        # Fund setup wizard
│   ├── Dashboard.tsx
│   ├── Deals.tsx
│   ├── Portfolio.tsx
│   ├── Incubator.tsx
│   ├── Lab.tsx
│   ├── News.tsx
│   ├── Reports.tsx
│   └── Results.tsx
├── engine/              # Pure TypeScript simulation logic (NO React imports)
│   ├── gameState.ts     # Zustand store + advanceTime() core loop
│   ├── mockData.ts      # Startup generation, co-investors, founder states, acquirers
│   ├── dynamicEvents.ts # Monthly random event system
│   ├── lpSentiment.ts   # LP trust score engine (8 factors)
│   ├── talentMarket.ts  # Talent pool + hiring mechanics
│   ├── vcRealism.ts     # Ownership caps, check sizes, buyout rules
│   └── types.ts         # All TypeScript interfaces/types
├── lib/
│   └── utils.ts         # Utility functions
├── App.tsx
└── main.tsx
```

Routes:
- / → Index (Fund Setup)
- /dashboard → Dashboard
- /deals → Deal Flow
- /portfolio → Portfolio
- /incubator → Incubator
- /lab → Venture Lab
- /news → News Feed
- /reports → LP Reports
- /results → End of Fund Results

Set up the project with all dependencies installed, routing configured, and placeholder pages. Use a dark theme with an indigo/slate color palette. The aesthetic should feel like a Bloomberg terminal meets a modern fintech dashboard — data-dense but clean.

Do NOT build any game logic yet — just the skeleton.
```

---

## 2. Architecture & Data Model

> **Feed this as the second prompt. This defines every type the game uses.**

```
Now define all the TypeScript types for VenCap in src/engine/types.ts. This is the single source of truth for the entire game's data model. Every other file imports from here.

Here is the complete type system:

// ============ ENUMS ============

type FundType = 'regional' | 'national' | 'multistage' | 'family_office';
type FundStage = 'pre_seed' | 'seed' | 'series_a' | 'growth';
type MarketCycle = 'bull' | 'normal' | 'cooldown' | 'hard';
type CompanyStatus = 'active' | 'exited' | 'failed';
type CompanyOrigin = 'external' | 'incubator' | 'lab' | 'buyout';
type FounderState = 'focused' | 'distracted' | 'burned_out' | 'overconfident' | 'defensive' | 'coachable';
type AcquirerType = 'faang' | 'enterprise' | 'acquihire' | 'pe' | 'strategic_rival';
type EventSeverity = 'minor' | 'moderate' | 'severe';
type EventSentiment = 'positive' | 'negative' | 'neutral';
type LPSentimentLevel = 'excellent' | 'good' | 'neutral' | 'concerned' | 'critical';
type DiscoverySource = 'inbound' | 'referral' | 'conference' | 'news' | 'cold_outreach';
type TalentRole = 'engineering' | 'sales' | 'product' | 'marketing' | 'operations' | 'executive';
type TalentSeniority = 'junior' | 'mid' | 'senior' | 'leadership';
type NewsType = 'funding_round' | 'exit' | 'market_trend' | 'cycle_change' | 'regulation' | 'scandal';

// ============ CORE ENTITIES ============

interface FounderTraits {
  grit: number;        // 1-10
  clarity: number;     // 1-10
  charisma: number;    // 1-10
  experience: number;  // 1-10
}

interface UnitEconomics {
  cac: number;           // Customer acquisition cost ($)
  ltv: number;           // Lifetime value ($)
  ltvCacRatio: number;   // LTV/CAC
  grossMargin: number;   // 0-100%
  paybackMonths: number; // Months to recoup CAC
}

interface CompanyMetrics {
  mrr: number;           // Monthly recurring revenue ($)
  growthRate: number;     // Monthly growth rate (0-1)
  customers: number;
  churn: number;          // Monthly churn rate (0-1)
  burnRate: number;       // Monthly burn ($)
  runway: number;         // Months of runway remaining
}

interface MarketData {
  tamSize: number;         // Total addressable market ($)
  tamGrowthRate: number;   // Annual TAM growth (0-1)
  competitionLevel: 'low' | 'medium' | 'high' | 'saturated';
}

interface CoInvestor {
  name: string;
  tier: 'tier1' | 'friendly' | 'competitive' | 'strategic';
  failMod: number;     // Multiplier on fail chance (e.g., 0.9 = -10%)
  exitMod: number;     // Multiplier on exit chance
  growthMod: number;   // Multiplier on growth
  reputation: number;  // 0-100
}

interface Startup {
  id: string;
  name: string;
  sector: string;
  stage: FundStage;
  description: string;
  founderName: string;
  founderTraits: FounderTraits;
  teamSize: number;
  unitEconomics: UnitEconomics;
  metrics: CompanyMetrics;
  marketData: MarketData;
  valuation: number;
  strengths: string[];
  risks: string[];
  redFlags: string[];
  ddNotes: string[];
  discoverySource: DiscoverySource;
  founderWillingness: number;  // 0-100
  coInvestors: CoInvestor[];
}

interface PortfolioCompany extends Startup {
  investedAmount: number;
  ownership: number;           // 0-100%
  currentValuation: number;
  multiple: number;             // currentVal / investedAmount
  status: CompanyStatus;
  origin: CompanyOrigin;
  founderState: FounderState;
  pmfScore: number;             // 0-100
  relationship: number;         // 0-100 (your relationship with founder)
  supportScore: number;         // 0-100
  influence: 'observer' | 'advisor' | 'board_seat' | 'majority';
  monthInvested: number;        // Which game month was the investment made
  events: DynamicEvent[];       // History of events
  hiredTalent: TalentCandidate[];
  exitData?: ExitData;
  failureReason?: string;
}

interface DynamicEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: EventSeverity;
  sentiment: EventSentiment;
  effects: {
    mrrMod?: number;
    relationshipMod?: number;
    failChanceMod?: number;
    exitChanceMod?: number;
    growthMod?: number;
    pmfMod?: number;
  };
  month: number;
}

interface ExitData {
  acquirerType: AcquirerType;
  acquirerName: string;
  exitMultiple: number;
  exitValue: number;
  month: number;
}

interface TalentCandidate {
  id: string;
  name: string;
  role: TalentRole;
  seniority: TalentSeniority;
  reputation: number;   // 0-100
  salary: number;        // Annual ($)
  skills: string[];
  isAlumni: boolean;     // From a failed portfolio company
}

// ============ FUND & LP ============

interface Fund {
  name: string;
  type: FundType;
  stage: FundStage;
  targetSize: number;
  currentSize: number;       // Amount raised
  cashAvailable: number;
  deployed: number;          // Total invested so far
  tvpiEstimate: number;
  irrEstimate: number;
  yearStarted: number;
  currentMonth: number;      // 0-119 (10 years)
  skillLevel: number;        // Carries across rebirths
  rebirthCount: number;
}

interface LPSentiment {
  score: number;              // 0-100
  level: LPSentimentLevel;
  factors: {
    portfolioPerformance: number;   // -20 to +20
    eventQuality: number;           // -15 to +15
    valuationMomentum: number;      // -10 to +10
    supportQuality: number;         // -10 to +10
    deploymentPace: number;         // -10 to +10
    labQuality: number;             // -10 to +10
    incubatorOutput: number;        // -10 to +10
    marketAdjustment: number;       // -15 to +15
  };
  pressureReports: LPPressureReport[];
}

interface LPPressureReport {
  year: number;
  deploymentRating: string;
  breakoutCompanies: number;
  redFlagCount: number;
  reservesRating: string;
  studioROI: string;
  overallGrade: string;
}

interface LPReport {
  year: number;
  irr: number;
  tvpi: number;
  highlights: string[];
  topPerformers: string[];
  exits: string[];
  writeOffs: string[];
  concerns: string[];
  marketNotes: string;
  cashPosition: number;
}

// ============ INCUBATOR & LAB ============

interface IncubatorBatch {
  year: number;
  companies: IncubatorCompany[];
  graduated: boolean;
}

interface IncubatorCompany {
  startup: Startup;
  mentoringActions: string[];    // Actions taken
  graduated: boolean;
}

interface LabProject {
  id: string;
  sector: string;
  problemStatement: string;
  visionLevel: 'small' | 'medium' | 'big';
  founder?: TalentCandidate;
  teamBoosts: TalentRole[];       // Max 2
  status: 'idea' | 'matching' | 'assembling' | 'spun_out';
}

// ============ NEWS ============

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  type: NewsType;
  sentiment: EventSentiment;
  month: number;
}

// ============ PENDING DECISIONS ============

interface PendingDecision {
  id: string;
  companyId: string;
  title: string;
  description: string;
  options: {
    label: string;
    effects: Record<string, number>;
  }[];
  deadline: number;  // Month by which you must decide
}

interface SecondaryOffer {
  id: string;
  companyId: string;
  buyerName: string;
  offerPercentage: number;    // % of your stake they want
  offerMultiple: number;       // Multiple on invested amount
  expiresMonth: number;
}

interface FollowOnOpportunity {
  companyId: string;
  roundSize: number;
  preMoneyValuation: number;
  dilutionIfSkip: number;      // % dilution if you don't follow on
}

// ============ GAME STATE (Zustand Store Shape) ============

interface GameState {
  // Core
  fund: Fund | null;
  marketCycle: MarketCycle;
  gamePhase: 'setup' | 'playing' | 'ended';

  // Portfolio
  portfolio: PortfolioCompany[];
  dealPipeline: Startup[];

  // LP
  lpSentiment: LPSentiment;
  lpReports: LPReport[];

  // Incubator & Lab
  incubatorBatches: IncubatorBatch[];
  activeIncubator: IncubatorBatch | null;
  labProjects: LabProject[];

  // Talent & Market
  talentPool: TalentCandidate[];

  // Events & Decisions
  news: NewsItem[];
  pendingDecisions: PendingDecision[];
  secondaryOffers: SecondaryOffer[];
  followOnOpportunities: FollowOnOpportunity[];

  // Stats
  dealsReviewed: number;
  dealsPassed: number;

  // Actions (Zustand methods)
  initFund: (config: Partial<Fund>) => void;
  advanceTime: () => void;
  invest: (startupId: string, amount: number, ownership: number) => void;
  passOnDeal: (startupId: string) => void;
  followOn: (companyId: string, amount: number) => void;
  skipFollowOn: (companyId: string) => void;
  sellSecondary: (offerId: string) => void;
  rejectSecondary: (offerId: string) => void;
  resolveDecision: (decisionId: string, optionIndex: number) => void;
  hireTalent: (companyId: string, talentId: string) => void;
  supportAction: (companyId: string, action: string) => void;
  launchIncubator: () => void;
  mentorIncubatorCompany: (companyId: string, action: string) => void;
  graduateIncubator: () => void;
  createLabProject: (config: Partial<LabProject>) => void;
  assignLabFounder: (projectId: string, founderId: string) => void;
  spinOutLab: (projectId: string) => void;
  rebirth: () => void;
  resetGame: () => void;
}

Export every single type and interface. This file should have ZERO logic — types only.
```

---

## 3. Simulation Engine Prompts

> **Feed these one at a time. Each builds a single engine file.**

### Prompt 3A: VC Realism Rules

```
Build src/engine/vcRealism.ts — the realism constraint system for VenCap.

This file exports pure functions (no state, no side effects) that enforce realistic VC behavior. Import types from ./types.

Functions to implement:

1. getOwnershipLimits(stage: FundStage): { min: number, max: number }
   - pre_seed: 7-20%
   - seed: 5-15%
   - series_a: 3-12%
   - growth: 2-8%

2. getCheckSizeRange(fundType: FundType, fundSize: number, stage: FundStage): { min: number, max: number }
   - Regional funds: 1-5% of fund per check
   - National: 2-8%
   - Multistage: 1-10%
   - Family office: 2-15%
   - Scale by stage (earlier = smaller absolute, bigger % of fund)

3. adjustOwnershipForRelationship(baseOwnership: number, relationship: number): number
   - relationship > 70: allow 25% more than stage max
   - relationship < 30: cap at 8% regardless of stage
   - Between: linear interpolation

4. adjustOwnershipForMarket(ownership: number, market: MarketCycle): number
   - bull: cap at typical range (founders have leverage)
   - normal: no adjustment
   - cooldown: allow 10% more
   - hard: allow 25% more (founders desperate)

5. calculateBuyoutAcceptance(company: Startup, offerPrice: number, relationship: number, market: MarketCycle): { accepted: boolean, probability: number }
   - Base acceptance: 10%
   - +20% if runway < 6 months
   - +15% if relationship > 70
   - +10% if growth rate < 5%
   - +15% if market is 'hard'
   - +10% if offer is >1.5x fair value
   - -20% if founder grit > 7
   - -10% if market is 'bull'
   - Roll against final probability

6. getValuationMultiplier(stage: FundStage, market: MarketCycle): number
   - Base valuations: pre_seed $2-5M, seed $5-15M, series_a $15-50M, growth $50-300M
   - Market multipliers: bull 1.4x, normal 1.0x, cooldown 0.7x, hard 0.5x

7. canInvest(fund: Fund, amount: number, stage: FundStage): { allowed: boolean, reason?: string }
   - Check: enough cash, check size within range, not over-deployed (>80% in first 3 years is aggressive)

All functions should be deterministic given the same inputs (use seeded randomness where needed, or accept a random value as a parameter).
```

### Prompt 3B: Startup Generation

```
Build src/engine/mockData.ts — the procedural content generation system for VenCap.

Import types from ./types. All functions are pure (no side effects).

Implement:

1. generateStartup(stage: FundStage, market: MarketCycle, skillLevel: number): Startup
   - Generate a realistic startup with:
     - Random name from sector-appropriate word combinations (NOT silly — think real YC company names)
     - Sector from: SaaS, Fintech, HealthTech, EdTech, CleanTech, AI/ML, DevTools, MarketPlace, Consumer, DeepTech, Biotech, Cybersecurity, SpaceTech, AgTech, PropTech
     - Founder traits: each 1-10, slightly biased by stage (growth founders have more experience)
     - Unit economics: realistic ranges per stage
       - Pre-seed: no revenue or very early ($0-5K MRR), high burn relative to revenue
       - Seed: $5K-50K MRR, 10-25% monthly growth, 5-15% churn
       - Series A: $50K-500K MRR, 8-15% monthly growth, 3-8% churn
       - Growth: $500K-5M MRR, 5-10% monthly growth, 1-5% churn
     - Market data: TAM $100M-$50B, growth 5-30%, competition varies
     - 2-4 strengths, 1-3 risks, 0-2 red flags (generated from templates)
     - DD notes: 2-4 realistic due diligence observations
     - Discovery source: weighted random
     - Founder willingness: 40-100, affected by market cycle (bull = lower, hard = higher)
     - 0-2 co-investors
   - Higher skill level = slightly better average deal quality (subtle, +5% per level)

2. generateCoInvestor(): CoInvestor
   - 4 tiers with different stat ranges:
     - tier1: -10% fail, +15% exit, +10% growth, reputation 80-100
     - friendly: -5% fail, +5% exit, +5% growth, reputation 50-80
     - competitive: 0% fail, +5% exit, -5% growth (they compete with you), reputation 60-90
     - strategic: -5% fail, +20% exit, 0% growth, reputation 40-70
   - Names from a pool of 30+ realistic VC firm names

3. generateAcquirerName(type: AcquirerType): string
   - FAANG: realistic big tech names
   - Enterprise: realistic enterprise software names
   - PE: realistic PE firm names
   - Strategic rival: generate a competitor name in the same sector
   - Acqui-hire: generate a mid-size tech company name

4. getAcquirerMultipleRange(type: AcquirerType): { min: number, max: number }
   - faang: 10-20x
   - enterprise: 3-7x
   - acquihire: 0.5-2x
   - pe: 2-5x
   - strategic_rival: 4-10x

5. SECTOR_DATA: Record<string, { nameWords: string[][], descriptionTemplates: string[], strengthPool: string[], riskPool: string[], redFlagPool: string[], ddPool: string[] }>
   - At least 8 sectors with 10+ name combinations each
   - 5+ description templates, 8+ strengths, 8+ risks, 5+ red flags, 5+ DD notes per sector

6. COINVESTOR_NAMES: string[] — 30+ realistic VC firm names

Make the generation feel REAL. No joke names. Think Y Combinator demo day, not a comedy sketch.
```

### Prompt 3C: Dynamic Events

```
Build src/engine/dynamicEvents.ts — the monthly event generation system.

Import types from ./types.

Implement:

1. generateMonthlyEvents(company: PortfolioCompany, market: MarketCycle): DynamicEvent[]
   - Each company can get 0-2 events per month
   - Cap total events at 2 per company per month
   - Event types and base probabilities:

   NEGATIVE EVENTS:
   - Founder Conflict: 3% base (+2% if relationship < 30, +1% if founderState is 'defensive')
     Effects: relationship -10 to -20, failChance +5-15%, growth -5-10%
   - Product Setback: 2% base (+1% if pmfScore < 40)
     Effects: mrr -5-15%, pmf -5-10, failChance +5-10%
   - Key Employee Departure: 2.5% base (+2% if supportScore < 20)
     Effects: growth -5-10%, mrr -3-8%
   - New Competitor Enters: 3% base
     Effects: growth -5-15%, mrr -2-5%
   - CEO Burnout: 1.5% base (+2% if founderState is 'burned_out')
     Effects: growth -10-20%, failChance +10-20%, relationship -5-10
   - Press Scandal: 1% base, 30% chance it's severe
     Effects (minor): relationship -5, growth -3%
     Effects (severe): relationship -15, failChance +15%, mrr -10%, pmf -10
   - Market Headwind: 4% base (higher in cooldown/hard markets)
     Effects: growth -5-15%, valuation -5-10%
   - Regulatory Issue: 1% base (+2% for fintech/healthtech)
     Effects: failChance +5-10%, growth -5-10%, burn +10-20%
   - Cash Crunch: 2% base (+3% if runway < 6 months)
     Effects: failChance +10-20%, morale effects on founder state

   POSITIVE EVENTS:
   - Market Tailwind: 4% base (higher in bull markets)
     Effects: growth +5-15%, valuation +5-10%
   - Viral Moment: 1.5% base (+1% if pmfScore > 70)
     Effects: mrr +10-25%, growth +5-10%, customers +20-50%
   - Strategic Partnership: 2% base (+2% if coInvestors include strategic type)
     Effects: growth +5-10%, exitChance +5%, mrr +5-10%
   - Key Hire Lands: 2% base (+2% if supportScore > 50)
     Effects: growth +5-10%, pmf +3-5
   - M&A Interest (Surprise): 1.5% base (only if mrr > $100K and pmfScore > 50)
     Effects: exitChance +15-25%, valuation +10-20%
   - Major Customer Win: 3% base
     Effects: mrr +5-15%, growth +3-5%, pmf +2-3

2. applyEventModifiers(event: DynamicEvent, company: PortfolioCompany): DynamicEvent
   - Lab companies: negative event effects reduced by 40-60%
   - Incubator companies: negative event effects reduced by 20-30%
   - High support score (>50): negative effects reduced by 20%
   - Board seat: negative effects reduced by 15%
   - High relationship (>70): negative effects reduced by 10%

3. Each event should have a unique id (uuid), descriptive title, and 2-3 sentence description that reads like a real board update.

Make event descriptions specific and realistic. Not "Bad thing happened" but "Your CTO and VP Engineering are clashing over the migration to Rust. The engineering team is splitting into factions."
```

### Prompt 3D: LP Sentiment Engine

```
Build src/engine/lpSentiment.ts — the LP trust and accountability system.

Import types from ./types.

Implement:

1. calculateLPSentiment(state: { portfolio, fund, marketCycle, incubatorBatches, labProjects, news }): LPSentiment
   - Compute 8 factors, each with a range:

   a) Portfolio Performance (-20 to +20):
      - Average portfolio multiple > 2x: +10 to +20
      - Average multiple 1-2x: 0 to +10
      - Average multiple < 1: -10 to -20
      - Weight by deployment amount

   b) Event Quality (-15 to +15):
      - Count severe negative events in last 12 months
      - 0 severe: +10-15
      - 1-2 severe: 0 to +5
      - 3+: -10 to -15

   c) Valuation Momentum (-10 to +10):
      - Average valuation change across portfolio last 3 months
      - Positive momentum: +5 to +10
      - Flat: 0
      - Declining: -5 to -10

   d) Support Quality (-10 to +10):
      - Average support score across portfolio
      - >60: +5 to +10
      - 30-60: 0 to +5
      - <30: -5 to -10

   e) Deployment Pace (-10 to +10):
      - Year 1-3: deployed 20-60% of fund = good (+5), <10% = too slow (-5), >70% = too fast (-5)
      - Year 4-7: deployed 50-80% = good
      - Year 8-10: >70% deployed = good, reserves for follow-ons evaluated

   f) Lab Spinout Quality (-10 to +10):
      - If lab used: average lab company performance vs external
      - Better than average: +5 to +10
      - Worse: -5 to -10
      - Not used: 0

   g) Incubator Output (-10 to +10):
      - If incubator used: graduation rate, graduate performance
      - Good: +5 to +10
      - Not used: 0

   h) Market Adjustment (-15 to +15):
      - Bull market: LPs more forgiving (+5 to +15 base)
      - Hard market: LPs more demanding (-5 to -15 base)
      - Adjust based on how well fund is handling the cycle

   Total score = 50 (baseline) + sum of all factors, clamped 0-100
   Level thresholds: 80+ excellent, 60-79 good, 40-59 neutral, 20-39 concerned, <20 critical

2. generateLPPressureReport(state): LPPressureReport
   - Annual evaluation covering deployment pace, breakout companies, red flags, reserves, studio ROI
   - Each gets a rating: 'strong', 'adequate', 'concerning', 'critical'
   - Overall grade: A/B/C/D/F

3. generateLPReport(state): LPReport
   - Annual report with: IRR, TVPI, highlights, top performers, exits, write-offs, concerns, market notes
   - Written in professional LP letter style

4. getLPEffects(sentiment: LPSentiment): { commitmentMod: number, dealflowMod: number, founderTrustMod: number, coInvestorMod: number }
   - These feed back into the game:
     - commitmentMod: ±30% on future fundraising success
     - dealflowMod: ±20% on deal quality (good reputation = better deals)
     - founderTrustMod: ±15 on starting relationship with new investments
     - coInvestorMod: ±25% on co-investor willingness to join
```

### Prompt 3E: Talent Marketplace

```
Build src/engine/talentMarket.ts — the talent pool and hiring system.

Import types from ./types.

Implement:

1. generateTalentPool(market: MarketCycle, month: number): TalentCandidate[]
   - Generate 8-15 candidates per refresh
   - Roles: engineering, sales, product, marketing, operations, executive
   - Seniority distribution: 30% junior, 30% mid, 25% senior, 15% leadership
   - Market affects availability:
     - Bull: fewer candidates (6-10), higher salaries (1.3x)
     - Normal: standard (8-12)
     - Cooldown: more candidates (10-14), normal salaries
     - Hard: abundant (12-15), lower salaries (0.7x)
   - Each candidate has: name, role, seniority, reputation (0-100), salary, 2-4 skills, isAlumni flag
   - Salary ranges by seniority: junior $80-120K, mid $120-180K, senior $180-280K, leadership $280-450K

2. calculateHireProbability(candidate: TalentCandidate, company: PortfolioCompany, market: MarketCycle): number
   - Base: 50%
   - Lab company: +25%
   - Seniority penalty: leadership -20%, senior -10%
   - Relationship > 60: +10%
   - Bull market: -15% (everyone has offers)
   - Hard market: +20%
   - High company MRR (>$500K): +10%
   - Cap at 95%, floor at 10%

3. applyHireEffects(candidate: TalentCandidate, company: PortfolioCompany): Partial<PortfolioCompany>
   - Returns the modifications to the company:
     - Engineering hire: +2-5 PMF, +3-8% growth boost
     - Sales hire: +5-15% MRR boost, +2-4% growth
     - Product hire: +3-7 PMF, +2-5% growth
     - Executive hire: +5-10 support score, -5% fail chance
     - Leadership: 1.5x the effects of their role
     - Seniority multiplier: junior 0.5x, mid 0.8x, senior 1.0x, leadership 1.5x

4. processAlumni(failedCompanies: PortfolioCompany[]): TalentCandidate[]
   - When companies fail, generate 1-3 alumni candidates from the team
   - Alumni get +10 reputation bonus (experienced), isAlumni = true
   - They enter the talent pool next month

Generate realistic names. Mix of common and diverse names reflecting the actual tech workforce.
```

### Prompt 3F: The Core Game Loop

```
Build src/engine/gameState.ts — the Zustand store and the advanceTime() core loop. This is the HEART of VenCap.

Import from all other engine files and types.

Use Zustand with persist middleware (localStorage key: 'vencap-game-state').

The store shape matches the GameState interface from types.ts.

Implement advanceTime() — the most complex function in the entire game:

Each call progresses one month (fund.currentMonth++). Here's the exact sequence:

STEP 1: Market Cycle Check
- Every 12-24 months, chance of cycle change
- 60% chance: advance to next phase (bull→normal→cooldown→hard→normal→bull)
- 30% chance: stay in current phase
- 10% chance: skip one phase
- Generate cycle change news item if changed

STEP 2: For Each Active Portfolio Company
  2a. Calculate all modifiers:
    - Source modifiers: Lab origin = -20% fail, +15% exit. Incubator = -15% fail, +10% exit
    - Support modifiers: score >30 = -40% fail, +15% growth
    - Relationship modifiers: <30 = +50% fail; >70 = -25% fail
    - Ownership modifiers (influence tier):
      - <10%: no bonus
      - 10-25%: -10% fail (observer)
      - 25-50%: -20% fail, +10% exit (advisor)
      - 50-75%: -30% fail, +15% exit (board seat)
      - >75%: -40% fail, +20% exit (majority)
    - Board seat modifiers: -20% fail, +15% exit
    - Co-investor effects: sum all coInvestor mods
    - Founder state effects:
      - focused: +10% growth
      - distracted: -5% growth, +5% fail
      - burned_out: -15% growth, +25% fail
      - overconfident: +5% growth, +10% fail (risky moves)
      - defensive: -10% growth, +10% fail
      - coachable: +5% growth, -10% fail
    - PMF effects:
      - >70: 2x growth multiplier, -20% fail
      - 40-70: 1x growth, no mod
      - <40: 0.5x growth, +20% fail

  2b. Generate dynamic events (0-2 per company)
    - Apply event modifiers for Lab/Incubator/support/board seat

  2c. Failure check
    - Base fail chance per month: pre_seed 3%, seed 2%, series_a 1.5%, growth 1%
    - Final chance = base * product_of_all_fail_modifiers
    - if Math.random() < finalChance → company fails
    - Set status = 'failed', generate failure reason

  2d. Exit check (only if didn't fail)
    - Base exit chance per month: pre_seed 0.3%, seed 0.5%, series_a 0.8%, growth 1.2%
    - Increases after month 48 (+0.1% per month)
    - Final chance = base * product_of_all_exit_modifiers
    - if Math.random() < finalChance → company exits
    - Generate acquirer type based on: PMF (high = FAANG/strategic), team strength, revenue, co-investors
    - Calculate exit multiple from acquirer range, modified by: market cycle, PMF, team strength, relationship, co-investors
    - Exit value = investedAmount * exitMultiple * (1 + supportScore * 0.005)
    - Cash returned = exitValue * (ownership / 100)
    - Add cash back to fund

  2e. Growth calculation (if still active)
    - Base monthly growth multiplier: random 0.9-1.2
    - Final = base * marketCycleMod * allGrowthMods * eventGrowthEffects
    - Market cycle mods: bull 1.15, normal 1.0, cooldown 0.85, hard 0.7
    - Apply to: MRR, customers, valuation
    - Update company metrics

  2f. Follow-on generation
    - If company months > 6 AND valuation > 2x invested AND relationship > 40
    - Generate a FollowOnOpportunity

  2g. Decision generation
    - 25% chance if player has board seat
    - Generate a PendingDecision with 2-3 options and tradeoffs

  2h. Secondary offer generation
    - If company multiple > 3x, 10% chance per month
    - Generate SecondaryOffer with realistic terms

  2i. Relationship decay
    - Default: -1 per month
    - Lab/Incubator: -0.5 per month
    - High ownership (>50%): -0.5 per month
    - Board seat: no decay
    - Floor at 10

  2j. Update PMF score
    - Hired talent: +5 per engineering/product hire
    - Support actions: +2-4 per action taken
    - Bad events: -8 per severe event
    - Market drift: ±2-3 random
    - Clamp 0-100

  2k. Update founder state
    - Based on composite of: growth trend, relationship, support score, event history
    - High growth + high relationship → focused/coachable
    - Low growth + low relationship → defensive/burned_out
    - High growth + low support → overconfident
    - Medium everything → distracted
    - Transition probability: 20% chance to change state each month

STEP 3: Process exit cash returns (add to fund.cashAvailable)

STEP 4: Year-end checks (every 12 months)
  - Generate LP report
  - Generate LP pressure report
  - Update LP sentiment
  - Graduate incubator batch (if active)

STEP 5: Refresh talent pool

STEP 6: Generate new deals (3 startups per month)

STEP 7: Check game end (month >= 120)
  - If ended: calculate final TVPI, IRR estimate, set gamePhase = 'ended'

Also implement all the action methods:
- invest(): enforce vcRealism rules, deduct cash, create PortfolioCompany, add co-investors
- passOnDeal(): increment dealsPassed, remove from pipeline
- followOn(): add to existing investment, recalculate ownership
- skipFollowOn(): apply dilution
- sellSecondary(): reduce ownership, add cash
- rejectSecondary(): remove offer
- resolveDecision(): apply chosen option's effects
- hireTalent(): roll hire probability, if success add to company, apply effects
- supportAction(): increment support score based on action type
- launchIncubator(): deduct 1% of fund, generate 2-4 high-quality startups
- mentorIncubatorCompany(): apply mentoring boost
- graduateIncubator(): move to portfolio with 2% equity grant
- createLabProject(): initialize a lab project
- assignLabFounder(): assign from generated candidates
- spinOutLab(): create portfolio company with 5-10% equity, 40-80% ownership, lab bonuses
- rebirth(): save skill level, reset everything else, increment rebirthCount
- resetGame(): clear entire state

This is the most complex file. Take your time, get the math right, and make sure every modifier compounds multiplicatively (not additively) for fail/exit/growth checks.
```

---

## 4. UI Page Prompts

> **Feed these one at a time after the engine is built.**

### Prompt 4A: Fund Setup (Index Page)

```
Build the Fund Setup page (src/pages/Index.tsx) — the onboarding wizard for VenCap.

This is a 4-step wizard:

Step 1: Name Your Fund
- Text input for fund name
- Brief flavor text: "Every great fund starts with a name."
- Validation: 3-50 characters

Step 2: Choose Fund Type
- 4 cards to select from:
  - Regional ($10-50M): "Deep local networks, focused portfolio"
  - National ($50-200M): "Broader reach, competitive positioning"
  - Multi-stage ($100-500M): "Follow winners from seed to growth"
  - Family Office ($20-100M): "Patient capital, unique access"
- Each shows fund size range and a brief description

Step 3: Choose Stage Focus
- 4 cards:
  - Pre-seed: "The earliest bets. High risk, high reward."
  - Seed: "Product-market fit hunters."
  - Series A: "Scaling proven winners."
  - Growth: "Category leaders only."
- Show typical check size and ownership range for each

Step 4: Raise From LPs (or Skip)
- Option A: Full LP fundraising flow
  - Show target fund size based on type selection
  - Slider to set actual raise target (within type range)
  - "Start Fundraising" button → animated fundraising sequence
  - Show LP commitments rolling in with names and amounts
  - Final raised amount (80-120% of target based on skill level)
- Option B: "Skip to Investing" button
  - Auto-sets fund to midpoint of type range
  - Skips LP drama, gets right to deals

After completion: redirect to /dashboard with fund initialized.

If this is a rebirth (rebirthCount > 0), show a banner: "Welcome back. Your reputation precedes you. (Skill Level: X)"

Design: dark background, large cards with hover effects, progress indicator at top, smooth transitions between steps. Use shadcn Card, Button, Input, Slider components.
```

### Prompt 4B: Dashboard

```
Build the Dashboard page (src/pages/Dashboard.tsx) — the command center.

Layout (top to bottom):

ROW 1: Fund Header
- Fund name + type badge + stage badge
- Market Cycle Badge component (bull=green, normal=blue, cooldown=yellow, hard=red) with pulse animation
- LP Sentiment Pill component (excellent=green to critical=red)
- Current month display: "Year X, Month Y"

ROW 2: Key Metrics (4 cards in a grid)
- Fund Size: $XXM raised
- Cash Available: $XXM (with % of fund)
- TVPI: X.Xx (color coded: >2x green, 1-2x yellow, <1 red)
- Deployed: XX% of fund

ROW 3: Portfolio Summary (3 cards)
- Active Investments: X companies
- Exits: X (total return $XXM)
- Write-offs: X (total lost $XXM)
- Deals Reviewed: X | Passed: X

ROW 4: Alerts Panel
- Styled as a notification feed
- Types: follow-on opportunities (blue), pending decisions (yellow), secondary offers (green), warnings (red)
- Each alert is clickable → navigates to relevant page/section
- Show count badges

ROW 5: Portfolio Event Summary
- "This Year: X severe events, Y positive events"
- Quick list of most recent 3 events across portfolio

ROW 6: Latest LP Report Preview
- Show most recent LP report headline and grade
- "View Full Report →" link to /reports

ROW 7: Quick Actions (4 buttons)
- "Review Deals" → /deals
- "Manage Portfolio" → /portfolio
- "Incubator" → /incubator
- "Venture Lab" → /lab

ROW 8: Advance Time Button
- Large, prominent button: "Advance to [Month Name] Year X"
- Shows brief preview of what will happen: "3 active companies, 2 pending decisions"
- On click: run advanceTime(), show brief results toast/animation
- Disable if gamePhase === 'ended' (show "View Results" button instead)

Also include:
- Fundraising modal (triggered by button if fund hasn't reached target or for raising Fund II/III)
- Quick stats footer: skill level, rebirth count

The dashboard should feel information-dense but organized. Use a grid layout. All data reads from the Zustand store reactively.
```

### Prompt 4C: Deal Flow

```
Build the Deal Flow page (src/pages/Deals.tsx) with DealCard and InvestModal components.

DEAL PIPELINE (main area):
- Show 3+ startup cards from dealPipeline
- "Refresh Deals" button to generate new batch
- Sort/filter by: sector, stage, valuation, growth rate

DEAL CARD (src/components/DealCard.tsx):
- Header: Company name, sector badge, stage badge, discovery source icon
- Founder section: Name, traits displayed as mini bar charts (grit/clarity/charisma/experience out of 10)
- Team: "X person team"
- Key Metrics grid:
  - MRR: $XXK (with growth arrow)
  - Growth: XX%/mo
  - Churn: XX%/mo
  - Burn: $XXK/mo
  - Runway: XX months
- Unit Economics row:
  - CAC: $XXX | LTV: $X,XXX | LTV/CAC: X.Xx | Gross Margin: XX%
- Market: TAM $XB, growing XX%/yr, [competition level] competition
- Valuation: $XXM (with market cycle context)
- Signals section:
  - Strengths (green pills)
  - Risks (yellow pills)
  - Red Flags (red pills)
- DD Notes (expandable section)
- Co-investors listed with tier badges
- Founder Willingness bar (color-coded)
- Two action buttons: "Pass" and "Invest →"

INVEST MODAL (src/components/InvestModal.tsx):
- Triggered by "Invest" button on any deal card
- Shows: company name, valuation, your fund's available cash
- Investment amount slider:
  - Min/max from vcRealism.getCheckSizeRange()
  - Shows as both $ and % of fund
- Ownership calculator:
  - Based on amount / valuation
  - Shows stage-appropriate range from vcRealism
  - Red warning if outside normal range
  - Adjusted for relationship and market cycle
- Founder control warning:
  - If ownership would exceed founder comfort: "⚠️ Founder may resist this level of control"
- Co-investor preview:
  - List who's co-investing and their effects
- Buyout toggle:
  - Only available for seed/pre-seed stage
  - Shows acceptance probability from vcRealism.calculateBuyoutAcceptance()
  - If selected: ownership becomes 50-80%, different pricing
- Confirm button: "Invest $X for Y% ownership"
- Shows: projected influence level based on ownership tier

After investing: show success toast, remove from pipeline, add to portfolio. If founder rejects (low willingness + bad relationship): show rejection message.
```

### Prompt 4D: Portfolio

```
Build the Portfolio page (src/pages/Portfolio.tsx) — the active investment management center.

MAIN TABLE:
- Columns: Company Name, Origin Badge, Invested, Ownership %, Influence, Current Value, Multiple, Status, Founder State, PMF Score
- Origin badges: External (gray), Incubator Grad (blue), Lab Spinout (purple), Buyout (orange)
- Founder State badges with colors: focused (green), coachable (teal), distracted (yellow), overconfident (orange), defensive (red), burned_out (dark red)
- PMF score as colored number: >70 green, 40-70 yellow, <40 red
- Multiple color coded: >3x green, 1-3x yellow, <1x red
- Status: Active (blue), Exited (green), Failed (red)
- Sortable by any column
- Filter by: status, origin, stage

COMPANY DETAIL (expandable row or side panel on click):

Section: Events Timeline
- Chronological list of all DynamicEvents for this company
- Color coded by sentiment
- Shows month and severity

Section: Actions (3 tiers based on influence level)

BASIC (always available):
- "Connect Talent" → opens talent hiring modal for this company
- "Make Intros" → +5 relationship, +2 support
- "Give Advice" → +3 support, +2 PMF

ADVANCED (advisor+ influence):
- "Hire Executive" → hire from talent pool with leadership filter
- "Force Focus" → if founder is distracted/overconfident: chance to shift to focused (+20% success if relationship > 60)
- "Restructure Burn" → reduce burn rate by 15-25%, -3 relationship
- "Replace GTM Strategy" → risk/reward: 40% chance of +15% growth, 30% chance of -10% growth, 30% no effect
- "Founder Intervention" → if founder is burned_out/defensive: attempt to coach. Requires relationship > 50. 30% success → coachable, 30% no change, 40% relationship -10

STUDIO (lab/buyout origin only):
- "Engineering Sprint" → +5-10 PMF, costs $50-200K from fund
- "GTM Sprint" → +10-20% MRR growth next month, costs $100-300K
- "Product Sprint" → +3-5 PMF, +5% growth, costs $75-250K
- "Capital Injection" → add $X to company runway, deducted from fund

Section: Follow-On
- If FollowOnOpportunity exists: show round details
- Slider for follow-on amount
- Show: new ownership after follow-on vs dilution if skip
- Two buttons: "Follow On" and "Skip (Accept X% Dilution)"

Section: Secondary Offers
- If SecondaryOffer exists: show buyer name, offer %, offer multiple
- "Sell" or "Reject" buttons
- Show: cash received if sell, reduced ownership

Section: Pending Decisions
- If PendingDecision exists: show title, description, options
- Each option shows expected effects
- Select and confirm

Section: Team
- List of all hired talent for this company
- Show: name, role, seniority, reputation, salary
- Net effect summary on company metrics

Design: use shadcn Table with expandable rows. The expanded section uses Tabs for the different sections. Dense but scannable.
```

### Prompt 4E: Incubator

```
Build the Incubator page (src/pages/Incubator.tsx).

HEADER:
- "Incubator Program" title
- Status: Active batch / No active batch
- Cost: 1% of fund size per year
- "Launch New Batch" button (disabled if one is active or insufficient funds)

ACTIVE BATCH (if exists):
- Shows 2-4 incubator companies in card layout
- Each card shows:
  - Company name, sector, founder traits (mini bars)
  - Current metrics (MRR, growth, team size)
  - Mentoring actions available:
    - "Refine Pitch" → +5 charisma effective, +3 clarity, adds strength
    - "Intro Advisors" → +10 relationship, +5 support, adds co-investor chance
    - "GTM Plan" → +5-10% growth, +3 PMF
  - Each action can only be used once per company per batch
  - Actions taken shown with checkmarks
  - Graduation status: "Ready to Graduate" if all 3 actions used, or "Needs Mentoring"

GRADUATION:
- "Graduate Batch" button (available at year end or when all mentored)
- Graduating = each company joins portfolio with:
  - 2% equity grant (free ownership)
  - Starting relationship: 80 (high, they trust you)
  - Incubator origin badge
  - -15% fail rate modifier permanently
  - Follow-on available immediately

PAST BATCHES:
- Expandable list of previous year batches
- Shows: year, companies, how many graduated, how many are still active/exited/failed in portfolio
- Brief performance summary per batch

Design: warm, educational feel. Cards should feel like "company profiles in a program" rather than deal cards.
```

### Prompt 4F: Venture Lab

```
Build the Venture Lab page (src/pages/Lab.tsx).

This is a 4-step creation flow:

Step 1: Choose Sector
- Grid of sector cards (same sectors as deal generation)
- Each shows: sector name, brief description, current market sentiment for that sector

Step 2: Define the Problem
- Text area: "What problem will this company solve?"
- Vision level selector (3 options):
  - Small: "Niche solution, focused market" (lower risk, lower ceiling)
  - Medium: "Growing market, strong potential" (balanced)
  - Big: "Category-defining opportunity" (higher risk, higher ceiling)
- Show: how vision level affects potential outcomes

Step 3: Match with a Founder
- Generate 4 founder candidates (using talent generation logic)
- Each shows: name, traits (grit/clarity/charisma/experience), background summary, strengths
- Select one founder
- Show compatibility score based on sector + vision level

Step 4: Assemble Team
- Optional: add up to 2 team boosts from talent pool
- Options: engineering boost, sales boost, product boost
- Each costs $ from fund
- Show projected team composition

SPIN OUT:
- Summary of the lab company: name, sector, founder, team, vision
- Projected metrics:
  - Starting equity: 5-10% (based on capital injected)
  - Starting ownership: 40-80%
  - Lab bonuses: -20% fail rate, +15% exit odds, higher founder loyalty
- "Spin Out" button → creates portfolio company with lab origin

ACTIVE LAB PROJECTS:
- Show any in-progress lab projects (not yet spun out)
- Show status: idea → matching → assembling → ready to spin out

PAST LAB SPINOUTS:
- List of all lab companies now in portfolio
- Performance summary

Design: creative/workshop feel. Use step indicators. Each step should feel like you're building something.
```

### Prompt 4G: News Feed

```
Build the News page (src/pages/News.tsx).

A chronological feed of news items, newest first.

Each news item card shows:
- Type badge: Funding Round (green), Exit (blue), Market Trend (purple), Cycle Change (orange), Regulation (gray), Scandal (red)
- Headline (bold, one line)
- Summary (2-3 sentences)
- Sentiment indicator: positive (green dot), negative (red dot), neutral (gray dot)
- Month/Year timestamp
- Some news items are about YOUR portfolio companies (highlight with "Your Portfolio" badge)

Filters:
- By type (multi-select checkboxes)
- By sentiment
- By "My Portfolio Only" toggle
- Date range (month/year selector)

The feed should generate news items during advanceTime():
- 1-3 general market news per month
- 1 news item per major portfolio event (exit, failure, large funding round)
- Cycle change announcements
- General ecosystem news (competitor raises, market trends, regulatory changes)

News generation logic (add to gameState advanceTime or a helper):
- Market trend news: generic headlines about sector performance, hiring trends, etc.
- Portfolio-related: when your company hits a milestone, exits, or fails
- Cycle changes: "Markets Shift to [cycle]" with explanation

Design: clean feed layout like a Bloomberg terminal news ticker. Use Card components with minimal padding. Infinite scroll or "Load More" pattern.
```

### Prompt 4H: LP Reports

```
Build the Reports page (src/pages/Reports.tsx).

REPORT LIST:
- Chronological list of all annual LP reports
- Each shows: Year, TVPI at time, Grade badge, brief one-line summary
- Click to expand or view full report

FULL REPORT VIEW:
A formatted document-style report with sections:

1. Letter from the GP (auto-generated)
   - "Dear Limited Partners, [Year X] was a [characterization] year for [Fund Name]..."
   - Tone adjusts based on performance: confident if good, measured if mediocre, candid if bad
   - 2-3 paragraphs summarizing the year

2. Key Metrics Box
   - TVPI: X.Xx
   - Estimated IRR: XX%
   - Cash Deployed: $XM of $YM
   - Cash Returned: $XM
   - Active Investments: X
   - Exits This Year: X
   - Write-offs This Year: X

3. Top Performers
   - Table of best-performing active companies
   - Shows: name, invested, current value, multiple, PMF score

4. Exits
   - Details of any exits that year
   - Acquirer, multiple, return

5. Write-offs
   - Companies that failed this year
   - Brief post-mortem (failure reason)

6. Areas of Concern
   - Auto-generated based on: struggling companies, high burn, low PMF, founder issues

7. Market Commentary
   - Current cycle analysis
   - How the fund is positioned

8. Cash Position
   - Remaining cash
   - Reserves for follow-ons
   - Deployment pace assessment

9. LP Pressure Report (separate section)
   - The LPPressureReport grades
   - Deployment rating, breakout companies, red flags, reserves, studio ROI, overall grade

Design: make it look like an actual LP report document. Use a white/cream background section on the dark page. Professional formatting with clear sections. Print-friendly styling (even though this is a game).
```

### Prompt 4I: Results Page

```
Build the Results page (src/pages/Results.tsx) — the end-of-fund scorecard.

Only accessible when gamePhase === 'ended'. Redirect to /dashboard otherwise.

LAYOUT:

HERO SECTION:
- Large fund name
- "10-Year Fund Lifecycle Complete"
- Performance Grade (A+ to D) displayed prominently
  - A+ = TVPI > 5x
  - A = TVPI > 3x
  - B+ = TVPI > 2x
  - B = TVPI > 1.5x
  - C = TVPI > 1x
  - D = TVPI < 1x
- Grade determines hero color scheme (gold for A+, green for A/B, yellow for C, red for D)

KEY METRICS (4 large stat cards):
- Final TVPI: X.Xx
- Estimated IRR: XX%
- Total Investments Made: X
- Successful Exits: X of Y

FUND SUMMARY:
- Total raised: $XM
- Total deployed: $XM
- Total returned: $XM
- Cash remaining: $XM
- Companies funded: X
- Companies exited: X
- Companies failed: X
- Best exit: [name] at X.Xx multiple
- Worst investment: [name]

PORTFOLIO BREAKDOWN:
- List every company with final status
- Show: name, origin, invested, final value, multiple, status

SKILL ASSESSMENT:
- Current skill level
- Points earned this fund:
  - Good picks: +1 each for companies that returned >1x
  - Hype traps avoided: +1 for each passed deal that would have failed (track this!)
  - Successful exits: +2 each
- "Your pattern recognition has improved."

REBIRTH SECTION:
- "Start a New Fund" button
- Shows what carries over: skill level, LP reputation
- "Your LPs remember you. [Returning LP bonus description]."
- Clicking starts the rebirth flow → Index page with rebirth bonuses applied

SHARE SECTION:
- "Share Your Results" button (generates a shareable summary card)
- For MVP: copy-to-clipboard with formatted text summary
- Future: generate image or link

Design: celebratory if good performance, somber but encouraging if bad. Use confetti animation for A+ grades. Make the player feel like they completed something meaningful.
```

---

## 5. System Integration Prompts

### Prompt 5A: News Generation

```
Add a news generation system to the advanceTime() loop.

Create a function generateMonthlyNews(state: GameState): NewsItem[] that produces 1-4 news items per month:

1. Market news (always 1):
   - Templates based on current market cycle
   - Bull: "VC funding hits record highs", "Valuations soar across tech sectors"
   - Normal: "Steady deal flow continues", "LPs cautiously optimistic"
   - Cooldown: "Fundraising pace slows", "Down rounds becoming more common"
   - Hard: "Multiple unicorns cut valuations", "Mass layoffs across startups"

2. Portfolio news (0-1, triggered by events):
   - When a company exits: "[Company] acquired by [Acquirer] for $XM"
   - When a company fails: "[Company] shuts down after X months"
   - When a company hits milestone: "[Company] crosses $XM ARR"

3. Ecosystem news (0-2):
   - Random competitor raises: "[Random Company] raises $XM Series [X]"
   - Sector trends: "[Sector] seeing increased investor interest"
   - Regulatory: "New regulations proposed for [sector]"

Each news item needs: id, headline, summary (2-3 sentences), type, sentiment, month.

News should reference the current game state to feel contextual. If the player is in AI/ML sector, more AI news appears.
```

### Prompt 5B: Charts & Analytics

```
Add Recharts-based visualizations to the Dashboard and Portfolio pages.

Dashboard charts (add below the main metrics):

1. Portfolio Value Over Time (Line Chart)
   - X-axis: months
   - Y-axis: total portfolio value ($)
   - Track this by adding a monthlySnapshots array to GameState
   - Each month, record: { month, totalValue, cashAvailable, tvpi, activeCompanies }

2. Deployment Pace (Area Chart)
   - X-axis: months
   - Y-axis: cumulative deployed ($)
   - Overlay: "ideal pace" line (linear from 0 to fund size over ~60 months)

3. LP Sentiment Trend (Line Chart)
   - X-axis: months
   - Y-axis: LP score (0-100)
   - Color zones: green (60+), yellow (40-60), red (<40)

Portfolio page charts:

4. Sector Allocation (Pie Chart)
   - Slice per sector
   - Size = amount invested in that sector

5. Company Performance Scatter
   - X-axis: months since investment
   - Y-axis: current multiple
   - Dot size = investment amount
   - Color = status (active/exited/failed)

Use Recharts with the existing dark theme. Colors: indigo for primary, emerald for positive, rose for negative, amber for warnings.

Store the monthly snapshots in the Zustand store (persisted). Add snapshot recording to advanceTime().
```

---

## 6. Polish & QA Prompts

### Prompt 6A: Onboarding & Tooltips

```
Add an onboarding tutorial and tooltip system to VenCap.

TUTORIAL (first-time players):
- Detect if this is first game (no fund in state)
- After fund setup, show a guided tour using a simple step-through modal:
  1. "Welcome to [Fund Name]! You're now managing a $XM fund."
  2. "This is your Dashboard — your command center. Watch your metrics here."
  3. "Click 'Review Deals' to see startups looking for funding."
  4. "Each month, click 'Advance Time' to progress. Events will happen!"
  5. "Your goal: maximize returns for your LPs over 10 years. Good luck!"
- "Don't show again" checkbox
- Store tutorial completion in localStorage

TOOLTIPS (VC term glossary):
- Add tooltip triggers on key terms throughout the UI:
  - TVPI: "Total Value to Paid-In. Total portfolio value / total invested. >2x is good."
  - IRR: "Internal Rate of Return. Time-weighted annual return percentage."
  - MRR: "Monthly Recurring Revenue. Monthly subscription income."
  - PMF: "Product-Market Fit. How well the product matches market demand."
  - LP: "Limited Partner. The investors in your fund."
  - GP: "General Partner. You — the fund manager."
  - Carry: "Carried Interest. The GP's share of profits (typically 20%)."
  - DPI: "Distributions to Paid-In. Cash actually returned to LPs vs invested."
  - Ownership caps, follow-on dilution, secondary markets — explain each inline

Use shadcn Tooltip component. Style consistently — small, dark tooltips with brief explanations.
```

### Prompt 6B: Dark/Light Mode & Responsive

```
Add dark/light mode toggle and improve responsive layout.

DARK/LIGHT MODE:
- Use next-themes (already installed) or Tailwind's dark mode
- Default: dark
- Toggle button in top-right nav area (sun/moon icon)
- Persist preference in localStorage
- All components should work in both themes
- Dark: slate-900 background, indigo accents
- Light: white background, indigo-600 accents

RESPONSIVE LAYOUT:
- Dashboard: stack metric cards vertically on mobile, 2-col on tablet, 4-col on desktop
- Deal cards: full-width stack on mobile
- Portfolio table: horizontal scroll on mobile, or switch to card layout
- Modals: full-screen on mobile
- Navigation: hamburger menu on mobile
- Fund setup wizard: single column on mobile
- Charts: reduce to key charts on mobile, full set on desktop
- Minimum supported width: 320px (iPhone SE)
- Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)

Add a simple top navigation bar:
- Logo/name on left
- Nav links: Dashboard, Deals, Portfolio, Incubator, Lab, News, Reports
- On mobile: hamburger → slide-out drawer
- Dark mode toggle on right
- Current month/year display
```

### Prompt 6C: Loading States & Feedback

```
Add loading states, animations, and user feedback throughout VenCap.

ADVANCE TIME:
- When clicking "Advance Time", show a brief processing overlay (0.5-1s):
  - "Processing month..." with spinning animation
  - Brief summary of what happened: "2 events occurred, 1 follow-on available"
  - Auto-dismiss after 2 seconds

TOAST NOTIFICATIONS (use shadcn Toast):
- Investment made: "Invested $XM in [Company] for Y% ownership"
- Investment rejected: "[Founder] declined your offer"
- Company exited: "🎉 [Company] acquired! $XM returned"
- Company failed: "[Company] has shut down"
- Hire successful/failed
- Follow-on completed
- Decision resolved
- Any error states

SKELETON LOADING:
- Add skeleton screens for:
  - Deal cards while generating
  - Portfolio table while computing
  - Charts while rendering data

ANIMATIONS:
- Page transitions: subtle fade-in
- Card hover: slight lift shadow
- Badge appearances: gentle scale-in
- Number changes: counting animation for key metrics
- Market cycle change: brief flash/pulse on the badge

EMPTY STATES:
- No deals: "No deals in pipeline. Advance time or check back later."
- No portfolio: "No investments yet. Head to Deals to find your first winner."
- No news: "All quiet on the market front."
- No LP reports: "Your first LP report will be generated at year end."
```

---

## 7. Recommended Build Order

Feed the prompts to Claude Code in this exact order:

| Step | Prompt | What It Does | Est. Complexity |
|------|--------|-------------|-----------------|
| 1 | ✅ Project Init (#1) | Scaffold project, install deps, routing | Low |
| 2 | ✅ Types (#2) | Define all data models | Low |
| 3 | ✅ VC Realism (#3A) | Ownership caps, check sizes, buyout rules | Medium |
| 4 | ✅ Startup Gen (#3B) | Procedural company generation | High |
| 5 | ✅ Dynamic Events (#3C) | Monthly event system | High |
| 6 | ✅ LP Sentiment (#3D) | LP trust engine | Medium |
| 7 | ✅ Talent Market (#3E) | Hiring mechanics | Medium |
| 8 | ✅ Core Game Loop (#3F) | advanceTime() + all actions | **Very High** |
| 9 | ✅ Fund Setup (#4A) | Onboarding wizard UI | Medium |
| 10 | ✅ Dashboard (#4B) | Command center UI | Medium |
| 11 | ✅ Deal Flow (#4C) | Deal cards + invest modal | High |
| 12 | ✅ Portfolio (#4D) | Investment management UI | **Very High** |
| 13 | ✅ Incubator (#4E) | Incubator program UI | Medium |
| 14 | ✅ Venture Lab (#4F) | Lab creation flow UI | Medium |
| 15 | ✅ News (#4G) | News feed UI | Low |
| 16 | ✅ LP Reports (#4H) | Report document UI | Medium |
| 17 | ✅ Results (#4I) | End-of-fund scorecard | Medium |
| 18 | ✅ News Gen (#5A) | Wire news into game loop | Low |
| 19 | ✅ Charts (#5B) | Recharts visualizations | Medium |
| 20 | ✅ Onboarding (#6A) | Tutorial + tooltips | Low |
| 21 | ✅ Theme + Responsive (#6B) | Dark/light + mobile | Medium |
| 22 | ✅ Polish (#6C) | Loading, toasts, animations | Low |

**Total: ~22 prompts in sequence. Budget ~2-4 hours for Claude Code to execute all of them with review.**

---

## 8. MVP vs Full Feature Scope

### What's In This Spec (MVP)

- ✅ Full fund lifecycle simulation (10 years, monthly ticks)
- ✅ Deal sourcing with realistic startup generation
- ✅ Investment with VC realism constraints
- ✅ Portfolio management with support actions
- ✅ Dynamic events affecting companies monthly
- ✅ LP sentiment system with annual reports
- ✅ Incubator program
- ✅ Venture Lab (build your own startup)
- ✅ Talent marketplace and hiring
- ✅ Follow-on rounds, secondaries, pending decisions
- ✅ Market cycle system
- ✅ News feed
- ✅ End-of-fund scoring with rebirth
- ✅ Charts and analytics
- ✅ Dark/light mode
- ✅ Responsive layout
- ✅ Onboarding tutorial
- ✅ LocalStorage persistence

### What's NOT In This Spec (Post-MVP)

- ❌ Backend/database persistence (Supabase auth + save/load)
- ❌ Fund economics (management fees, carry, GP commit)
- ❌ Board meeting simulation
- ❌ Cap table visualization
- ❌ LP communication actions
- ❌ Scenario/challenge modes
- ❌ Leaderboards
- ❌ Multiplayer/competitive
- ❌ Vintage year benchmarking
- ❌ Geographic market considerations
- ❌ Legal/regulatory events (beyond basic)
- ❌ Undo/redo system
- ❌ Keyboard shortcuts
- ❌ Shareable links (just copy-to-clipboard for now)

### Post-MVP Prompt (when ready)

```
Phase 2: Add Supabase backend to VenCap.

1. Set up Supabase tables:
   - users (auth)
   - game_saves (user_id, game_state JSON, save_name, created_at, updated_at)
   - leaderboard (user_id, fund_name, tvpi, irr, grade, completed_at)

2. Add authentication:
   - Login/signup with email or Google OAuth
   - Protect game routes (redirect to login if not authenticated)

3. Save/Load system:
   - Auto-save every advance time
   - Manual save button
   - Load game selector (support multiple saves per user)
   - "New Game" always available

4. Leaderboard:
   - Submit results on game completion
   - View global leaderboard: best TVPI, best IRR, most exits
   - Filter by fund type, stage focus

5. Share Results:
   - Generate a shareable URL with game results
   - OG meta tags for social media previews
```

---

## Tips for Using This With Claude Code

1. **Feed prompts sequentially.** Don't dump everything at once. Let Claude Code complete each step before moving to the next.

2. **Test after each engine prompt.** After building each engine file (3A-3F), ask Claude Code to write a quick test or console.log to verify the logic works.

3. **The core game loop (3F) is the hardest part.** If Claude Code struggles, break it into sub-prompts: "First implement just the failure/exit checks" → "Now add growth calculation" → "Now add all the side systems."

4. **UI pages reference engine functions.** Make sure all engine files compile before starting UI prompts.

5. **If you hit context limits**, start a new Claude Code session and say: "Continue building VenCap. The project is at [path]. I've completed steps 1-X. Now build step Y." Then paste just that step's prompt.

6. **For debugging**, add a DevDebugPanel component that shows raw game state — LP sentiment internals, modifier calculations, random rolls. This helps you tune the simulation.
