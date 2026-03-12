// ============================================================
// VenCap — Zustand Store & advanceTime() Core Game Loop
// THE HEART OF THE GAME
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GameState,
  Fund,
  MarketCycle,
  PortfolioCompany,
  Startup,
  FounderState,
  CompanyOrigin,
  CompanyMilestone,
  LabProject,
  LPSentiment,
  DynamicEvent,
  NewsItem,
  PendingDecision,
  SecondaryOffer,
  BuyoutOffer,
  FundraisingEvent,
  FollowOnOpportunity,
  MonthlySnapshot,
  GameSnapshot,
  BoardMeeting,
  BoardMeetingAgendaItem,
  LPActionType,
  ScenarioId,
  ScenarioConfig,
  DecisionRecord,
  SyndicateRelationship,
  PlayerProfile,
  FundraisingCampaign,
  ReportGenerationResult,
} from "./types";
import {
  generateStartup,
  generateAcquirerName,
  getAcquirerMultipleRange,
} from "./mockData";
import { generateMonthlyEvents, applyEventModifiers } from "./dynamicEvents";
import {
  calculateLPSentiment,
  generateLPPressureReport,
  generateLPReport,
  getLPEffects,
  calculateLPActionEffect,
} from "./lpSentiment";
import { getScenario, seedStartingPortfolio } from "./scenarios";
import { checkAchievements } from "./achievements";
import { REGION_MODIFIERS } from "./mockData";
import {
  generateTalentPool,
  calculateHireProbability,
  applyHireEffects,
  processAlumni,
} from "./talentMarket";
import {
  getInfluenceLevel,
  getInfluenceModifiers,
  canInvest as checkCanInvest,
  calculateBuyoutAcceptance,
} from "./vcRealism";
import {
  getDifficultyModifiers,
  applyDifficultyToRate,
} from "./difficultyScaling";
import {
  saveToSlot as saveSlotToStorage,
  loadFromSlot as loadSlotFromStorage,
} from "./saveSlots";
import {
  getSnapshotForGameMonth,
  getLatestHistoricalSnapshot,
  fetchLiveEconomicData,
} from "./economicData";
import { calculateMarketConditions, describeChanges } from "./marketEngine";
import type { MarketEra, EconomicSnapshot, MarketConditions } from "./types";
import {
  BASE_FAIL_RATES,
  DEFAULT_FAIL_RATE,
  BASE_EXIT_RATES,
  DEFAULT_EXIT_RATE,
  MARKET_EXIT_MULTIPLIERS,
  getExitTimeBonus,
  getSurvivalMultiplier,
  getTractionFailModifier,
} from "./balanceConfig";
import {
  uuid,
  randomBetween,
  randomInt,
  pickRandom,
  clamp,
  weightedRandom,
  getGameYear,
} from "@/lib/utils";
import {
  checkTimeGate,
  openTimeGate,
  clearExpiredGates,
} from "./timelineGates";
import { t } from "@/lib/i18n";
import {
  generateLPProspects,
  calculatePitchOutcome,
  calculateTotalCommitted,
  getFirstCloseThreshold,
  getFinalCloseThreshold,
  DEFAULT_FUND_TERMS,
} from "./fundraising";
import type { FundTermsConfig } from "./types";

// ============================================================
// INITIAL STATE
// ============================================================

const initialLPSentiment: LPSentiment = {
  score: 50,
  level: "neutral",
  factors: {
    portfolioPerformance: 0,
    eventQuality: 0,
    valuationMomentum: 0,
    supportQuality: 0,
    deploymentPace: 0,
    labQuality: 0,
    incubatorOutput: 0,
    marketAdjustment: 0,
  },
  pressureReports: [],
};

// v4.0: Default player profile with all 19 skills at level 1
const SKILL_DEFINITIONS: {
  id: import("./types").SkillId;
  name: string;
  category: "hard" | "soft";
}[] = [
  { id: "deal_sourcing", name: "Deal Sourcing", category: "hard" },
  { id: "due_diligence", name: "Due Diligence", category: "hard" },
  { id: "valuation", name: "Valuation", category: "hard" },
  { id: "portfolio_support", name: "Portfolio Support", category: "hard" },
  { id: "board_governance", name: "Board Governance", category: "hard" },
  { id: "fundraising_gp", name: "Fundraising (GP)", category: "hard" },
  { id: "risk_management", name: "Risk Management", category: "hard" },
  { id: "thesis_development", name: "Thesis Development", category: "hard" },
  { id: "network_building", name: "Network Building", category: "hard" },
  { id: "exit_strategy", name: "Exit Strategy", category: "hard" },
  { id: "financial_modeling", name: "Financial Modeling", category: "hard" },
  { id: "founder_coaching", name: "Founder Coaching", category: "soft" },
  { id: "conflict_resolution", name: "Conflict Resolution", category: "soft" },
  { id: "strategic_comms", name: "Strategic Communication", category: "soft" },
  { id: "team_dynamics", name: "Team Dynamics", category: "soft" },
  { id: "pattern_recognition", name: "Pattern Recognition", category: "soft" },
  { id: "market_intuition", name: "Market Intuition", category: "soft" },
  {
    id: "relationship_building",
    name: "Relationship Building",
    category: "soft",
  },
  { id: "negotiation", name: "Negotiation", category: "soft" },
];

function createInitialPlayerProfile(): PlayerProfile {
  const skills = {} as Record<
    import("./types").SkillId,
    import("./types").SkillRecord
  >;
  for (const def of SKILL_DEFINITIONS) {
    skills[def.id] = {
      id: def.id,
      name: def.name,
      category: def.category,
      xp: 0,
      level: 1,
      contextTags: [],
    };
  }
  return { skills, careerTitle: "analyst", totalXP: 0 };
}

// ============================================================
// HELPER: MARKET CYCLE TRANSITIONS
// ============================================================

const CYCLE_ORDER: MarketCycle[] = ["bull", "normal", "cooldown", "hard"];

function getNextCycle(current: MarketCycle): MarketCycle {
  const idx = CYCLE_ORDER.indexOf(current);
  // Cycle: bull → normal → cooldown → hard → normal → bull
  if (current === "hard") return "normal";
  return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
}

function skipCycle(current: MarketCycle): MarketCycle {
  return getNextCycle(getNextCycle(current));
}

// ============================================================
// HELPER: NEWS GENERATION
// ============================================================

function generateMarketNews(market: MarketCycle, month: number): NewsItem {
  const templates: Record<
    MarketCycle,
    { headlines: string[]; summaries: string[] }
  > = {
    bull: {
      headlines: [
        "VC Funding Hits Record Highs",
        "Valuations Soar Across Tech Sectors",
        "Unicorn Minting Pace Accelerates",
        "LP Appetite for Venture at All-Time High",
      ],
      summaries: [
        "Venture capital deployment continues at a historic pace, with mega-rounds becoming the norm. LPs are increasing allocations to venture as public markets fuel optimism.",
        "Tech valuations are climbing across all stages. Seed deals that would have been $3M pre-money are now closing at $8M+. Competition for the best deals is fierce.",
      ],
    },
    normal: {
      headlines: [
        "Steady Deal Flow Continues in Venture",
        "LPs Cautiously Optimistic on Venture Returns",
        "Venture Market Finds Equilibrium",
        "Founders and VCs Find Common Ground on Valuations",
      ],
      summaries: [
        "The venture market is operating at a healthy pace with reasonable valuations and solid deal flow. Quality companies continue to attract competitive rounds.",
        "After recent volatility, the venture ecosystem appears to be finding balance. Deployment pace is measured, and LPs are reporting stable portfolio performance.",
      ],
    },
    cooldown: {
      headlines: [
        "Fundraising Pace Slows Across Venture",
        "Down Rounds Becoming More Common",
        "VCs Tighten Investment Criteria",
        "Bridge Rounds Surge as Series Funding Delays",
      ],
      summaries: [
        "Venture deployment has slowed meaningfully. Companies that raised at peak valuations are facing the reality of flat or down rounds as investors demand stronger fundamentals.",
        "The fundraising environment has cooled. Multiple later-stage companies are accepting bridge financing or extensions to avoid down rounds, while VCs extend diligence timelines.",
      ],
    },
    hard: {
      headlines: [
        "Multiple Unicorns Cut Valuations by 50%+",
        "Mass Layoffs Sweep Through Startups",
        "Venture Funding Drops to Multi-Year Lows",
        "LPs Pull Back Commitments to New Funds",
      ],
      summaries: [
        "The venture market is in its toughest stretch in years. Layoffs are widespread, runway is the primary concern, and many companies are struggling to raise at any valuation.",
        "Capital scarcity is forcing difficult decisions across the ecosystem. Companies are cutting burn aggressively, and VCs are focused on portfolio triage over new investments.",
      ],
    },
  };

  const t = templates[market];
  return {
    id: uuid(),
    headline: pickRandom(t.headlines),
    summary: pickRandom(t.summaries),
    type: "market_trend",
    sentiment:
      market === "bull"
        ? "positive"
        : market === "hard"
          ? "negative"
          : "neutral",
    month,
  };
}

// ============================================================
// HELPER: ECOSYSTEM NEWS GENERATION
// ============================================================

const SECTORS = [
  "SaaS",
  "Fintech",
  "HealthTech",
  "AI/ML",
  "DevTools",
  "Marketplace",
  "Consumer",
  "CleanTech",
  "EdTech",
  "Cybersecurity",
  "DeepTech",
  "Biotech",
  "SpaceTech",
  "AgTech",
  "PropTech",
];
const FAKE_COMPANIES = [
  "NovaTech",
  "Lumina AI",
  "VertexHQ",
  "Cloudform",
  "Datawise",
  "Streamline",
  "Greenpath",
  "Finova",
  "MediSync",
  "BuildLayer",
  "AstraCore",
  "NexGen",
  "Prism Labs",
  "Scalepoint",
  "Vaultix",
];
const SERIES = ["Seed", "A", "B", "C", "D"];

function generateEcosystemNews(
  month: number,
  playerSectors: string[],
): NewsItem[] {
  const items: NewsItem[] = [];

  // 50% chance of a competitor funding round
  if (Math.random() < 0.5) {
    const company = pickRandom(FAKE_COMPANIES);
    const series = pickRandom(SERIES);
    const amount =
      series === "Seed"
        ? randomInt(2, 8)
        : series === "A"
          ? randomInt(10, 30)
          : randomInt(30, 200);
    // Bias toward player's sectors
    const sector =
      playerSectors.length > 0 && Math.random() < 0.4
        ? pickRandom(playerSectors)
        : pickRandom(SECTORS);
    items.push({
      id: uuid(),
      headline: `${company} Raises $${amount}M Series ${series}`,
      summary: `${sector} startup ${company} has closed a $${amount}M Series ${series} round. The company plans to accelerate hiring and expand into new markets.`,
      type: "funding_round",
      sentiment: "neutral",
      month,
    });
  }

  // 30% chance of sector trend news
  if (Math.random() < 0.3) {
    const sector =
      playerSectors.length > 0 && Math.random() < 0.5
        ? pickRandom(playerSectors)
        : pickRandom(SECTORS);
    const trends = [
      {
        headline: `${sector} Seeing Increased Investor Interest`,
        summary: `Multiple funds have announced dedicated ${sector} practices. Deal competition in the space is heating up as more capital flows in.`,
        sentiment: "positive" as const,
      },
      {
        headline: `${sector} Consolidation Wave Begins`,
        summary: `Several ${sector} companies have merged or been acquired in recent months, signaling market maturity and potential opportunities for remaining players.`,
        sentiment: "neutral" as const,
      },
      {
        headline: `${sector} Headcount Growth Surges`,
        summary: `${sector} companies are hiring aggressively, with engineering roles up 40% quarter-over-quarter. Talent competition is intensifying across the sector.`,
        sentiment: "positive" as const,
      },
    ];
    const trend = pickRandom(trends);
    items.push({
      id: uuid(),
      headline: trend.headline,
      summary: trend.summary,
      type: "market_trend",
      sentiment: trend.sentiment,
      month,
    });
  }

  // 15% chance of regulatory news
  if (Math.random() < 0.15) {
    const sector = pickRandom(SECTORS);
    const regs = [
      {
        headline: `New Regulations Proposed for ${sector}`,
        summary: `Government officials are proposing new compliance requirements for ${sector} companies. The impact on startups remains unclear, but larger players may benefit from increased barriers to entry.`,
        sentiment: "negative" as const,
      },
      {
        headline: `${sector} Gets Regulatory Clarity`,
        summary: `New regulatory guidelines have been issued for ${sector}, providing clearer rules of engagement. Industry groups are calling this a positive development for innovation.`,
        sentiment: "positive" as const,
      },
    ];
    const reg = pickRandom(regs);
    items.push({
      id: uuid(),
      headline: reg.headline,
      summary: reg.summary,
      type: "regulation",
      sentiment: reg.sentiment,
      month,
    });
  }

  return items;
}

// ============================================================
// HELPER: DECISION GENERATION
// ============================================================

function generateDecision(
  company: PortfolioCompany,
  month: number,
): PendingDecision {
  type DecisionTemplate = {
    title: string;
    description: string;
    options: { label: string; effects: Record<string, number> }[];
  };
  const decisions: DecisionTemplate[] = [
    {
      title: `${company.name}: Pivot Product Direction?`,
      description: `${company.founderName} wants to pivot the product toward a new market segment. This could unlock growth but risks alienating existing customers.`,
      options: [
        {
          label: "Support the pivot",
          effects: { growthRate: 0.05, churn: 0.03, pmfScore: -10 },
        },
        {
          label: "Stay the course",
          effects: { growthRate: -0.02, relationship: -5 },
        },
        {
          label: "Propose a middle ground",
          effects: { growthRate: 0.02, relationship: 5, pmfScore: -3 },
        },
      ],
    },
    {
      title: `${company.name}: Aggressive Hiring Plan`,
      description: `The team wants to double headcount over the next quarter. This accelerates growth but significantly increases burn rate.`,
      options: [
        {
          label: "Approve full plan",
          effects: { growthRate: 0.08, burnRate: 0.5, runway: -6 },
        },
        {
          label: "Approve half",
          effects: { growthRate: 0.04, burnRate: 0.25, runway: -3 },
        },
        {
          label: "Deny — focus on efficiency",
          effects: { relationship: -8, burnRate: -0.1 },
        },
      ],
    },
    {
      title: `${company.name}: Enter New Market?`,
      description: `An opportunity to expand into an adjacent market has emerged. It requires significant investment but could double the TAM.`,
      options: [
        {
          label: "Go for it",
          effects: { growthRate: 0.06, burnRate: 0.3, pmfScore: -8 },
        },
        { label: "Wait 6 months", effects: { relationship: -3 } },
      ],
    },
    {
      title: `${company.name}: Pricing Overhaul`,
      description: `${company.founderName} believes a pricing increase could boost margins but may cause churn in price-sensitive segments.`,
      options: [
        {
          label: "Increase prices 30%",
          effects: { mrr: 0.15, churn: 0.02, growthRate: -0.03 },
        },
        { label: "Modest 10% increase", effects: { mrr: 0.05, churn: 0.005 } },
        {
          label: "Keep prices, add premium tier",
          effects: { mrr: 0.08, growthRate: 0.02 },
        },
      ],
    },
    {
      title: `${company.name}: Acquisition Opportunity`,
      description: `A smaller competitor is struggling and could be acquired for a reasonable price. It would add customers but also technical debt.`,
      options: [
        {
          label: "Acquire them",
          effects: { customers: 0.3, burnRate: 0.2, pmfScore: -5 },
        },
        { label: "Pass", effects: {} },
      ],
    },
  ];

  const d = pickRandom(decisions);
  return {
    id: uuid(),
    companyId: company.id,
    title: d.title,
    description: d.description,
    options: d.options,
    deadline: month + 3,
  };
}

// ============================================================
// HELPER: FAILURE REASONS
// ============================================================

function generateFailureReason(company: PortfolioCompany): string {
  const reasons = [
    `Ran out of runway after failing to close Series ${company.stage === "seed" ? "A" : "B"} financing.`,
    `Product-market fit never materialized despite ${Math.floor(randomBetween(12, 24))} months of iteration.`,
    `Key customer churn accelerated to unsustainable levels. Revenue declined 40% in two months.`,
    `Founder burnout led to leadership paralysis. The team fragmented and key engineers departed.`,
    `Competitive pressure from well-funded rivals eroded market position beyond recovery.`,
    `Regulatory changes rendered the core business model non-viable.`,
    `Internal conflict between co-founders resulted in a messy split and loss of institutional knowledge.`,
    `Failed to adapt to market cycle downturn. Burn rate couldn't be reduced fast enough.`,
  ];

  // Pick one influenced by company state
  if (company.founderState === "burned_out") return reasons[3];
  if (company.metrics.runway < 3) return reasons[0];
  if (company.pmfScore < 25) return reasons[1];
  if (company.metrics.churn > 0.1) return reasons[2];
  return pickRandom(reasons);
}

// ============================================================
// BOARD MEETING TEMPLATES (Feature 1)
// ============================================================

const BOARD_AGENDA_TEMPLATES: Omit<
  BoardMeetingAgendaItem,
  "id" | "resolved" | "chosenOptionIndex"
>[] = [
  {
    type: "budget_approval",
    title: "Budget Approval",
    description:
      "Review and approve the quarterly budget. The team needs clarity on resource allocation.",
    options: [
      {
        label: "Approve aggressive budget",
        description: "Full headcount + tools. High burn, high growth.",
        effects: { burnRate: 0.2, growthRate: 0.08 },
      },
      {
        label: "Approve conservative budget",
        description: "Controlled spending. Extends runway.",
        effects: { burnRate: -0.1, growthRate: -0.03 },
      },
      {
        label: "Send back for revision",
        description: "Request cleaner assumptions.",
        effects: { relationship: -5 },
      },
    ],
  },
  {
    type: "pivot_evaluation",
    title: "Pivot Evaluation",
    description:
      "The team has identified a potentially more attractive market. Evaluate whether to pivot.",
    options: [
      {
        label: "Approve the pivot",
        description: "New direction. Risky but could unlock growth.",
        effects: { pmfScore: -15, growthRate: 0.1 },
      },
      {
        label: "Stay the course",
        description: "Double down on current strategy.",
        effects: { pmfScore: 5, growthRate: -0.02 },
      },
      {
        label: "Run a 60-day experiment",
        description: "Test before committing.",
        effects: { pmfScore: -3, relationship: 5 },
      },
    ],
  },
  {
    type: "hiring_plan",
    title: "Hiring Plan Review",
    description:
      "Management wants to double engineering headcount. Weigh growth vs. burn.",
    options: [
      {
        label: "Approve full plan",
        description: "10+ new hires. Significant burn increase.",
        effects: { burnRate: 0.35, growthRate: 0.07 },
      },
      {
        label: "Approve half the plan",
        description: "5 hires. Balanced approach.",
        effects: { burnRate: 0.15, growthRate: 0.04 },
      },
      {
        label: "Freeze hiring",
        description: "Preserve cash.",
        effects: { burnRate: -0.05, relationship: -8 },
      },
    ],
  },
  {
    type: "pricing_strategy",
    title: "Pricing Strategy",
    description:
      "The team wants to restructure pricing. Could improve margins or drive growth.",
    options: [
      {
        label: "Premium tier model",
        description: "Higher prices for enterprise. Better margins.",
        effects: { mrr: 0.2, churn: 0.02 },
      },
      {
        label: "Volume pricing",
        description: "Lower price, higher volume target.",
        effects: { mrr: -0.05, growthRate: 0.08 },
      },
      {
        label: "Keep existing pricing",
        description: "Avoid disruption.",
        effects: { relationship: 3 },
      },
    ],
  },
  {
    type: "expansion_plan",
    title: "Market Expansion",
    description:
      "The company wants to enter a new geographic or vertical market.",
    options: [
      {
        label: "Approve expansion",
        description: "New market entry. Dilutes focus.",
        effects: { growthRate: 0.06, burnRate: 0.25, pmfScore: -8 },
      },
      {
        label: "Defer 6 months",
        description: "Wait until core market is stronger.",
        effects: { relationship: -3 },
      },
    ],
  },
  {
    type: "ma_review",
    title: "Acquisition Opportunity Review",
    description:
      "A competitor is struggling and might be acquired. Board approval needed.",
    options: [
      {
        label: "Approve the acquisition",
        description: "Buy the competitor. Customers + debt.",
        effects: { mrr: 0.25, burnRate: 0.3, pmfScore: -5 },
      },
      {
        label: "Pass on acquisition",
        description: "Stay focused on organic growth.",
        effects: {},
      },
    ],
  },
  {
    type: "product_roadmap",
    title: "Product Roadmap Approval",
    description: "Review and sign off on the next 12-month product roadmap.",
    options: [
      {
        label: "Approve as submitted",
        description: "Full scope. Ambitious timeline.",
        effects: { pmfScore: 5, growthRate: 0.04 },
      },
      {
        label: "Narrow scope",
        description: "Focus on must-haves only.",
        effects: { pmfScore: 8, burnRate: -0.1 },
      },
      {
        label: "Request customer validation first",
        description: "De-risk before committing engineering.",
        effects: { pmfScore: 3, relationship: 5 },
      },
    ],
  },
];

function generateBoardMeeting(
  company: PortfolioCompany,
  currentMonth: number,
): BoardMeeting {
  const numItems = randomInt(1, 3);
  const shuffled = [...BOARD_AGENDA_TEMPLATES]
    .sort(() => Math.random() - 0.5)
    .slice(0, numItems);
  const agendaItems: BoardMeetingAgendaItem[] = shuffled.map((template) => ({
    ...template,
    id: uuid(),
    resolved: false,
  }));

  return {
    id: uuid(),
    companyId: company.id,
    scheduledMonth: currentMonth,
    agendaItems,
    attended: false,
  };
}

// ============================================================
// HELPER: CAPTURE GAME SNAPSHOT (Feature 7)
// ============================================================

function captureSnapshot(state: GameState): GameSnapshot {
  return JSON.parse(
    JSON.stringify({
      fund: state.fund,
      portfolio: state.portfolio,
      dealPipeline: state.dealPipeline,
      lpSentiment: state.lpSentiment,
      lpReports: state.lpReports,
      incubatorBatches: state.incubatorBatches,
      activeIncubator: state.activeIncubator,
      labProjects: state.labProjects,
      talentPool: state.talentPool,
      news: state.news,
      pendingDecisions: state.pendingDecisions,
      secondaryOffers: state.secondaryOffers,
      buyoutOffers: state.buyoutOffers,
      fundraisingEvents: state.fundraisingEvents,
      followOnOpportunities: state.followOnOpportunities,
      monthlySnapshots: state.monthlySnapshots,
      marketCycle: state.marketCycle,
      gamePhase: state.gamePhase,
      dealsReviewed: state.dealsReviewed,
      dealsPassed: state.dealsPassed,
      boardMeetings: state.boardMeetings,
      activeScenario: state.activeScenario,
      decisionHistory: state.decisionHistory || [],
      scenarioWon: state.scenarioWon ?? null,
      unlockedAchievements: state.unlockedAchievements || [],
      syndicatePartners: state.syndicatePartners || [],
      marketEra: state.marketEra ?? null,
      currentEconomicSnapshot: state.currentEconomicSnapshot ?? null,
      currentMarketConditions: state.currentMarketConditions ?? null,
      activeCampaign: state.activeCampaign ?? null,
    }),
  );
}

// ============================================================
// HELPER: MILESTONE GENERATION
// ============================================================

interface MilestoneNarrative {
  milestone: CompanyMilestone;
  title: string;
  description: (company: PortfolioCompany) => string;
}

const MILESTONE_NARRATIVES: MilestoneNarrative[] = [
  {
    milestone: "first_revenue",
    title: "First Revenue Generated",
    description: (c) =>
      `${c.name} has generated its first revenue — a critical milestone for any ${c.sector} startup. ${c.founderName} and the team are celebrating, but the real work of scaling begins now.`,
  },
  {
    milestone: "100_customers",
    title: "100 Customers Reached",
    description: (c) =>
      `${c.name} has crossed the 100-customer mark in ${c.sector}. This validates the product and gives the team confidence to invest in scaling go-to-market efforts.`,
  },
  {
    milestone: "1000_customers",
    title: "1,000 Customers Milestone",
    description: (c) =>
      `${c.name} now serves over 1,000 customers. The ${c.sector} company has achieved meaningful scale, and ${c.founderName} is building out customer success infrastructure.`,
  },
  {
    milestone: "breakeven",
    title: "Breakeven Achieved",
    description: (c) =>
      `${c.name} has reached breakeven — monthly revenue now covers monthly burn. This gives ${c.founderName} strategic optionality.`,
  },
  {
    milestone: "profitable",
    title: "Sustained Profitability",
    description: (c) =>
      `${c.name} has been profitable for three consecutive months. In ${c.sector}, this discipline positions the company as an attractive acquisition target or IPO candidate.`,
  },
  {
    milestone: "series_b_ready",
    title: "Series B Ready",
    description: (c) =>
      `${c.name} has achieved the metrics needed for a Series B raise. With a PMF score above 65, the ${c.sector} company is attracting growth-stage investors.`,
  },
  {
    milestone: "team_50",
    title: "Team Grows Past 50",
    description: (c) =>
      `${c.name} has grown beyond 50 team members. ${c.founderName} is navigating the transition from startup to scale-up.`,
  },
  {
    milestone: "first_enterprise_deal",
    title: "First Enterprise Deal Closed",
    description: (c) =>
      `${c.name} closed its first major enterprise contract. This validates the ${c.sector} product for large organizations.`,
  },
  {
    milestone: "international_expansion",
    title: "International Expansion Begins",
    description: (c) =>
      `${c.name} has expanded beyond its home market. The ${c.sector} company is now serving customers internationally.`,
  },
  {
    milestone: "key_partnership",
    title: "Key Strategic Partnership Formed",
    description: (c) =>
      `${c.name} signed a landmark partnership that significantly expands distribution in ${c.sector}.`,
  },
  {
    milestone: "product_launch",
    title: "Major Product Launch",
    description: (c) =>
      `${c.name} launched a significant new product offering. ${c.founderName}'s vision for expanding the ${c.sector} platform is taking shape.`,
  },
  {
    milestone: "pivot_successful",
    title: "Pivot Successfully Executed",
    description: (c) =>
      `${c.name} completed a strategic pivot that is already showing results. ${c.founderName} made the difficult call to change direction, and the ${c.sector} market is responding positively.`,
  },
];

function getMilestoneNarrative(
  milestone: CompanyMilestone,
): MilestoneNarrative | undefined {
  return MILESTONE_NARRATIVES.find((n) => n.milestone === milestone);
}

const _profitableStreak = new Map<string, number>();

function checkAndGenerateMilestones(
  company: PortfolioCompany,
  previousMrr: number,
  currentMonth: number,
): { newMilestones: CompanyMilestone[]; events: DynamicEvent[] } {
  const milestones = company.milestones ?? [];
  const newMilestones: CompanyMilestone[] = [];
  const events: DynamicEvent[] = [];

  function tryAdd(m: CompanyMilestone) {
    if (milestones.includes(m) || newMilestones.includes(m)) return;
    newMilestones.push(m);
    const narrative = getMilestoneNarrative(m);
    if (narrative) {
      events.push({
        id: uuid(),
        type: `milestone_${m}`,
        title: narrative.title,
        description: narrative.description(company),
        severity: "moderate",
        sentiment: "positive",
        effects: {},
        month: currentMonth,
      });
    }
  }

  if (company.metrics.mrr > 0 && previousMrr <= 0) tryAdd("first_revenue");
  if (company.metrics.customers > 100) tryAdd("100_customers");
  if (company.metrics.customers > 1000) tryAdd("1000_customers");
  if (
    company.metrics.mrr > company.metrics.burnRate &&
    company.metrics.burnRate > 0
  )
    tryAdd("breakeven");

  const companyId = company.id;
  if (
    company.metrics.mrr > company.metrics.burnRate * 1.2 &&
    company.metrics.burnRate > 0
  ) {
    const streak = (_profitableStreak.get(companyId) ?? 0) + 1;
    _profitableStreak.set(companyId, streak);
    if (streak >= 3) tryAdd("profitable");
  } else {
    _profitableStreak.set(companyId, 0);
  }

  if (company.pmfScore > 65 && company.stage === "series_a")
    tryAdd("series_b_ready");
  if (company.teamSize > 50) tryAdd("team_50");
  if (company.metrics.mrr > 50000) tryAdd("first_enterprise_deal");
  if (company.metrics.mrr > 200000 && company.metrics.customers > 500)
    tryAdd("international_expansion");
  if (
    company.supportScore > 60 &&
    company.coInvestors.some((ci) => ci.tier === "strategic")
  )
    tryAdd("key_partnership");
  if (company.pmfScore > 55 && company.metrics.growthRate > 0.1)
    tryAdd("product_launch");
  if (
    (company.founderState === "focused" ||
      company.founderState === "coachable") &&
    company.pmfScore > 50 &&
    company.metrics.growthRate > 0.05
  )
    tryAdd("pivot_successful");

  return { newMilestones, events };
}

// ============================================================
// ZUSTAND STORE
// ============================================================

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // ---- Initial State ----
      fund: null,
      marketCycle: "normal" as MarketCycle,
      gamePhase: "setup",
      portfolio: [],
      dealPipeline: [],
      lpSentiment: initialLPSentiment,
      lpReports: [],
      incubatorBatches: [],
      activeIncubator: null,
      labProjects: [],
      talentPool: [],
      news: [],
      pendingDecisions: [],
      secondaryOffers: [],
      buyoutOffers: [],
      fundraisingEvents: [],
      followOnOpportunities: [],
      monthlySnapshots: [],
      dealsReviewed: 0,
      dealsPassed: 0,
      history: [] as GameSnapshot[],
      boardMeetings: [] as BoardMeeting[],
      activeScenario: null as ScenarioConfig | null,
      decisionHistory: [] as DecisionRecord[],
      scenarioWon: null as boolean | null,
      unlockedAchievements: [] as string[],
      syndicatePartners: [] as SyndicateRelationship[],
      tutorialMode: false,
      tutorialStep: 0,
      marketEra: null as MarketEra | null,
      currentEconomicSnapshot: null as EconomicSnapshot | null,
      currentMarketConditions: null as MarketConditions | null,

      // v4.0: Skills
      playerProfile: createInitialPlayerProfile(),

      // v4.0: Fundraising
      activeCampaign: null as FundraisingCampaign | null,

      // v4.0: Reports
      reportHistory: [] as ReportGenerationResult[],

      // ============================================================
      // INIT FUND
      // ============================================================
      initFund: (config) => {
        // Feature 3: Scenario support
        const scenarioId: ScenarioId =
          (config as { scenarioId?: ScenarioId }).scenarioId ?? "sandbox";
        const marketEra: MarketEra =
          (config as { marketEra?: MarketEra }).marketEra ?? "current";
        const scenario =
          scenarioId !== "sandbox" ? getScenario(scenarioId) : null;
        const scenarioOverrides = scenario?.fundOverrides ?? {};

        const mergedConfig = { ...config, ...scenarioOverrides };
        const currentSize =
          mergedConfig.currentSize || mergedConfig.targetSize || 100_000_000;

        const fund: Fund = {
          name: mergedConfig.name || "Unnamed Fund",
          type: mergedConfig.type || "national",
          stage: mergedConfig.stage || "seed",
          targetSize: mergedConfig.targetSize || 100_000_000,
          currentSize,
          cashAvailable: currentSize,
          deployed: 0,
          tvpiEstimate: 1.0,
          irrEstimate: 0,
          yearStarted: new Date().getFullYear(),
          currentMonth: scenario?.startingMonth ?? 0,
          skillLevel: mergedConfig.skillLevel || 1,
          rebirthCount: mergedConfig.rebirthCount || 0,
          // Fund economics defaults: 2% mgmt fee, 20% carry, 8% hurdle, 1% GP commit
          managementFeeRate: mergedConfig.managementFeeRate ?? 0.02,
          carryRate: mergedConfig.carryRate ?? 0.2,
          hurdleRate: mergedConfig.hurdleRate ?? 0.08,
          gpCommit: mergedConfig.gpCommit ?? Math.round(currentSize * 0.01),
          totalFeesCharged: 0,
          carryAccrued: 0,
          totalDistributions: 0,
          gpEarnings: 0,
          geographicFocus: mergedConfig.geographicFocus ?? "global",
          lpActionCooldowns: [],
          scenarioId,
          // v4.0: Timeline & Fund Series
          timelineMode: mergedConfig.timelineMode ?? "freeplay",
          activeTimeGates: [],
          fundNumber: mergedConfig.fundNumber ?? 1,
          nextFundUnlockTvpi: mergedConfig.nextFundUnlockTvpi ?? 2.0,
        };

        const startingMarketCycle: MarketCycle =
          scenario?.startingMarketCycle ?? "normal";
        const startingLPScore = scenario?.startingLPSentiment ?? 50;

        const lpSentimentInit: LPSentiment = {
          ...initialLPSentiment,
          score: startingLPScore,
          level:
            startingLPScore >= 80
              ? "excellent"
              : startingLPScore >= 60
                ? "good"
                : startingLPScore >= 40
                  ? "neutral"
                  : startingLPScore >= 20
                    ? "concerned"
                    : "critical",
        };

        // Generate initial deal pipeline and talent pool
        const pipeline: Startup[] = [];
        for (let i = 0; i < 3; i++) {
          pipeline.push(
            generateStartup(
              fund.stage,
              startingMarketCycle,
              fund.skillLevel,
              fund.geographicFocus,
            ),
          );
        }

        const talentPool = generateTalentPool(startingMarketCycle, 0);

        // Feature 3: Seed portfolio for Zombie Fund and Crisis Manager
        const seedPortfolio: PortfolioCompany[] =
          scenario &&
          (scenarioId === "zombie_fund" || scenarioId === "crisis_manager")
            ? seedStartingPortfolio(scenario)
            : [];

        // Initialize economic snapshot from era
        const initialEconomicSnapshot =
          marketEra === "current"
            ? getLatestHistoricalSnapshot()
            : getSnapshotForGameMonth(marketEra, scenario?.startingMonth ?? 0);
        const initialMarketConditions = calculateMarketConditions(
          initialEconomicSnapshot,
        );

        set({
          fund,
          gamePhase: "playing",
          dealPipeline: pipeline,
          talentPool,
          marketCycle: startingMarketCycle,
          portfolio: seedPortfolio,
          lpSentiment: lpSentimentInit,
          lpReports: [],
          incubatorBatches: [],
          activeIncubator: null,
          labProjects: [],
          news: [],
          pendingDecisions: [],
          secondaryOffers: [],
          buyoutOffers: [],
          fundraisingEvents: [],
          followOnOpportunities: [],
          monthlySnapshots: [],
          dealsReviewed: 0,
          dealsPassed: 0,
          history: [],
          boardMeetings: [],
          activeScenario: scenario,
          decisionHistory: [],
          scenarioWon: null,
          unlockedAchievements: get().unlockedAchievements || [],
          syndicatePartners: [],
          // Start tutorial for first-time players (rebirthCount === 0) if not already completed
          tutorialMode:
            (mergedConfig.rebirthCount || 0) === 0 &&
            (() => {
              try {
                return !localStorage.getItem("vencap-tutorial-v3-done");
              } catch {
                return true;
              }
            })(),
          tutorialStep: 0,
          // Real economy
          marketEra,
          currentEconomicSnapshot: initialEconomicSnapshot,
          currentMarketConditions: initialMarketConditions,
        });
      },

      // ============================================================
      // TUTORIAL ACTIONS
      // ============================================================
      setTutorialStep: (step: number) => {
        set({ tutorialStep: step });
      },
      completeTutorial: () => {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("vencap-tutorial-v3-done", "true");
        }
        set({ tutorialMode: false, tutorialStep: 0 });
      },

      // ============================================================
      // REAL ECONOMY ACTIONS
      // ============================================================
      setMarketEra: (era: MarketEra) => {
        const snapshot =
          era === "current"
            ? getLatestHistoricalSnapshot()
            : getSnapshotForGameMonth(era, get().fund?.currentMonth ?? 0);
        const conditions = calculateMarketConditions(snapshot);
        set({
          marketEra: era,
          currentEconomicSnapshot: snapshot,
          currentMarketConditions: conditions,
        });
      },

      fetchLiveMarketData: async () => {
        const liveData = await fetchLiveEconomicData();
        if (liveData) {
          const conditions = calculateMarketConditions(liveData);
          set({
            currentEconomicSnapshot: liveData,
            currentMarketConditions: conditions,
          });
        }
      },

      // ============================================================
      // ADVANCE TIME — THE CORE GAME LOOP
      // ============================================================
      advanceTime: () => {
        const state = get();
        if (!state.fund || state.gamePhase !== "playing") return;

        // Feature 7: Capture snapshot before advancing (max 3 entries)
        const snapshot = captureSnapshot(state);
        const newHistory = [...state.history, snapshot].slice(-3);

        const fund = { ...state.fund };
        let { marketCycle } = state;
        const portfolio = state.portfolio.map((c) => ({ ...c }));
        const newNews: NewsItem[] = [];
        const newDecisions: PendingDecision[] = [...state.pendingDecisions];
        const newSecondaries: SecondaryOffer[] = [...state.secondaryOffers];
        const newBuyouts: BuyoutOffer[] = [...state.buyoutOffers];
        const newFundraisingEvents: FundraisingEvent[] = [
          ...state.fundraisingEvents,
        ];
        const newFollowOns: FollowOnOpportunity[] = [
          ...state.followOnOpportunities,
        ];
        let exitCashReturned = 0;
        const newBoardMeetings: BoardMeeting[] = [...state.boardMeetings];

        // Difficulty scaling
        const difficulty = getDifficultyModifiers(
          fund.skillLevel,
          fund.rebirthCount,
        );

        fund.currentMonth++;

        // ==== STEP 0.1: Clear expired time gates ====
        // Guard for old saves that may not have this field
        if (!fund.activeTimeGates) fund.activeTimeGates = [];
        fund.activeTimeGates = clearExpiredGates(fund);

        // ==== STEP 0.25: Update Economic Snapshot ====
        const prevEconSnapshot = state.currentEconomicSnapshot;
        const currentEra = state.marketEra ?? "current";
        const econSnapshot =
          currentEra === "current"
            ? (state.currentEconomicSnapshot ?? getLatestHistoricalSnapshot())
            : getSnapshotForGameMonth(currentEra, fund.currentMonth);
        const mktConditions = calculateMarketConditions(econSnapshot);

        // Generate news about economic changes (every quarter)
        if (fund.currentMonth % 3 === 0 && prevEconSnapshot) {
          const econChanges = describeChanges(prevEconSnapshot, econSnapshot);
          for (const change of econChanges) {
            newNews.push({
              id: uuid(),
              headline: change,
              summary: mktConditions.narrative,
              type: "market_trend" as const,
              sentiment:
                mktConditions.lpSentimentModifier > 0
                  ? ("positive" as const)
                  : mktConditions.lpSentimentModifier < -5
                    ? ("negative" as const)
                    : ("neutral" as const),
              month: fund.currentMonth,
            });
          }
        }

        // ==== STEP 0.5: Deduct Monthly Management Fee ====
        // Management fee is charged on committed capital (currentSize), monthly
        // Guard for old saves missing fund economics fields
        if (fund.managementFeeRate === undefined) fund.managementFeeRate = 0.02;
        if (fund.carryRate === undefined) fund.carryRate = 0.2;
        if (fund.hurdleRate === undefined) fund.hurdleRate = 0.08;
        if (fund.totalFeesCharged === undefined) fund.totalFeesCharged = 0;
        if (fund.carryAccrued === undefined) fund.carryAccrued = 0;
        if (fund.totalDistributions === undefined) fund.totalDistributions = 0;
        if (fund.gpEarnings === undefined) fund.gpEarnings = 0;
        if (fund.gpCommit === undefined)
          fund.gpCommit = Math.round(fund.currentSize * 0.01);

        const monthlyFee = Math.round(
          (fund.currentSize * fund.managementFeeRate) / 12,
        );
        if (fund.cashAvailable >= monthlyFee) {
          fund.cashAvailable -= monthlyFee;
          fund.totalFeesCharged += monthlyFee;
          fund.gpEarnings += monthlyFee;
        } else {
          // Charge whatever cash is available
          const actualFee = fund.cashAvailable;
          fund.cashAvailable = 0;
          fund.totalFeesCharged += actualFee;
          fund.gpEarnings += actualFee;
        }

        // ==== STEP 1: Market Cycle Check ====
        // Check every 18 months (deterministic), with difficulty scaling
        const cycleInterval = Math.max(
          12,
          Math.round(18 / difficulty.marketCycleSpeed),
        );
        const monthsSinceStart = fund.currentMonth;
        if (monthsSinceStart > 0 && monthsSinceStart % cycleInterval === 0) {
          const roll = Math.random();
          let newCycle = marketCycle;
          if (roll < 0.6) {
            newCycle = getNextCycle(marketCycle);
          } else if (roll < 0.9) {
            newCycle = marketCycle; // stay
          } else {
            newCycle = skipCycle(marketCycle);
          }

          if (newCycle !== marketCycle) {
            marketCycle = newCycle;
            newNews.push({
              id: uuid(),
              headline: `Markets Shift to ${marketCycle.charAt(0).toUpperCase() + marketCycle.slice(1)} Cycle`,
              summary: `The venture market has entered a ${marketCycle} phase. Fund managers are adjusting strategies accordingly.`,
              type: "cycle_change",
              sentiment:
                marketCycle === "bull"
                  ? "positive"
                  : marketCycle === "hard"
                    ? "negative"
                    : "neutral",
              month: fund.currentMonth,
            });
          }
        }

        // ==== STEP 2: Process Each Active Portfolio Company ====
        const newlyFailed: PortfolioCompany[] = [];

        for (let i = 0; i < portfolio.length; i++) {
          const company = portfolio[i];
          if (company.status !== "active") continue;

          // Capture pre-update MRR for milestone detection
          const previousMrr = company.metrics.mrr;
          // Ensure milestones array exists (backfill for older companies)
          if (!company.milestones) company.milestones = [];

          // ---- 2a: Calculate All Modifiers ----
          let failMod = 1.0;
          let exitMod = 1.0;
          let growthMod = 1.0;

          // Source modifiers
          if (company.origin === "lab") {
            failMod *= 0.8;
            exitMod *= 1.15;
          }
          if (company.origin === "incubator") {
            failMod *= 0.85;
            exitMod *= 1.1;
          }

          // Support modifiers
          if (company.supportScore > 30) {
            failMod *= 0.6;
            growthMod *= 1.15;
          }

          // Relationship modifiers
          if (company.relationship < 30) {
            failMod *= 1.5;
          } else if (company.relationship > 70) {
            failMod *= 0.75;
          }

          // Ownership / influence modifiers
          const influenceMods = getInfluenceModifiers(company.ownership);
          failMod *= influenceMods.failMod;
          exitMod *= influenceMods.exitMod;

          // Board seat modifiers (additional)
          if (
            company.influence === "board_seat" ||
            company.influence === "majority"
          ) {
            failMod *= 0.8;
            exitMod *= 1.15;
          }

          // Co-investor effects
          for (const ci of company.coInvestors) {
            failMod *= ci.failMod;
            exitMod *= ci.exitMod;
            growthMod *= ci.growthMod;
          }

          // Founder state effects
          const founderEffects: Record<
            FounderState,
            { growthMod: number; failMod: number }
          > = {
            focused: { growthMod: 1.1, failMod: 1.0 },
            distracted: { growthMod: 0.95, failMod: 1.05 },
            burned_out: { growthMod: 0.85, failMod: 1.25 },
            overconfident: { growthMod: 1.05, failMod: 1.1 },
            defensive: { growthMod: 0.9, failMod: 1.1 },
            coachable: { growthMod: 1.05, failMod: 0.9 },
          };
          const fEffect = founderEffects[company.founderState];
          growthMod *= fEffect.growthMod;
          failMod *= fEffect.failMod;

          // PMF effects
          if (company.pmfScore > 70) {
            growthMod *= 2.0;
            failMod *= 0.8;
          } else if (company.pmfScore < 40) {
            growthMod *= 0.5;
            failMod *= 1.2;
          }

          // ---- 2b: Generate Dynamic Events ----
          const events = generateMonthlyEvents(
            company,
            marketCycle,
            company.region,
          );
          const appliedEvents: DynamicEvent[] = [];

          for (const event of events) {
            const modified = applyEventModifiers(
              { ...event, month: fund.currentMonth },
              company,
            );
            appliedEvents.push(modified);

            // Apply event effects to modifiers
            if (modified.effects.failChanceMod)
              failMod *= 1 + modified.effects.failChanceMod;
            if (modified.effects.exitChanceMod)
              exitMod *= 1 + modified.effects.exitChanceMod;
            if (modified.effects.growthMod)
              growthMod *= 1 + modified.effects.growthMod;
            if (modified.effects.relationshipMod) {
              company.relationship = clamp(
                company.relationship + modified.effects.relationshipMod,
                0,
                100,
              );
            }
            if (modified.effects.pmfMod) {
              company.pmfScore = clamp(
                company.pmfScore + modified.effects.pmfMod,
                0,
                100,
              );
            }
            if (modified.effects.mrrMod) {
              company.metrics = {
                ...company.metrics,
                mrr: Math.max(
                  0,
                  company.metrics.mrr * (1 + modified.effects.mrrMod),
                ),
              };
            }
          }

          company.events = [...company.events, ...appliedEvents];

          // ---- 2c: Failure Check (difficulty-scaled, with traction + survival bonus + market conditions) ----
          const monthsActive = fund.currentMonth - company.monthInvested;
          const tractionMod = getTractionFailModifier(company.pmfScore);
          const survivalMod = getSurvivalMultiplier(monthsActive);
          // Apply real-economy market conditions: recessions increase failures
          const marketFailMod = mktConditions.failRateMultiplier;
          // Apply sector-specific heat map (hotter sectors fail less)
          const sectorHeat = mktConditions.sectorHeatMap[company.sector] ?? 1.0;
          const sectorFailMod = 1.0 + (1.0 - sectorHeat) * 0.5; // Inverse: hot sector = lower fail
          const finalFailChance = applyDifficultyToRate(
            (BASE_FAIL_RATES[company.stage] || DEFAULT_FAIL_RATE) *
              failMod *
              tractionMod *
              survivalMod *
              marketFailMod *
              sectorFailMod,
            difficulty.failRateMod,
          );

          if (Math.random() < finalFailChance) {
            company.status = "failed";
            company.failureReason = generateFailureReason(company);
            company.multiple = 0;
            company.currentValuation = 0;
            newlyFailed.push(company);

            newNews.push({
              id: uuid(),
              headline: `${company.name} Shuts Down`,
              summary: `${company.name} has ceased operations. ${company.failureReason}`,
              type: "exit",
              sentiment: "negative",
              month: fund.currentMonth,
              portfolioRelated: true,
              companyId: company.id,
            });

            portfolio[i] = company;
            continue;
          }

          // ---- 2d: Exit Check (difficulty-scaled, with J-curve time bonus + market conditions) ----
          // Apply real-economy market conditions: bull markets = more exits
          const marketExitMod = mktConditions.exitProbabilityMultiplier;
          let exitChance = applyDifficultyToRate(
            (BASE_EXIT_RATES[company.stage] || DEFAULT_EXIT_RATE) *
              exitMod *
              marketExitMod,
            difficulty.exitRateMod,
          );

          // J-curve: exit rate increases after month 36, peaks months 60-84
          exitChance += getExitTimeBonus(monthsActive);

          if (Math.random() < exitChance) {
            // Determine acquirer type
            const acquirerType =
              company.pmfScore > 70 && company.metrics.mrr > 200000
                ? weightedRandom(
                    ["faang", "strategic_rival", "enterprise", "pe"] as const,
                    [30, 30, 25, 15],
                  )
                : weightedRandom(
                    [
                      "enterprise",
                      "acquihire",
                      "pe",
                      "strategic_rival",
                    ] as const,
                    [30, 30, 25, 15],
                  );

            const multipleRange = getAcquirerMultipleRange(acquirerType);
            let exitMultiple = randomBetween(
              multipleRange.min,
              multipleRange.max,
            );

            // Modify by market, PMF, relationship, co-investors
            exitMultiple *= MARKET_EXIT_MULTIPLIERS[marketCycle] || 1.0;
            // Real economy: valuation conditions affect exit multiples
            exitMultiple *= mktConditions.valuationMultiplier;
            if (company.pmfScore > 60) exitMultiple *= 1.2;
            if (company.relationship > 70) exitMultiple *= 1.1;
            exitMultiple *= 1 + company.supportScore * 0.005;
            // Feature 5: Region exit multiple modifier
            if (company.region) {
              exitMultiple *= REGION_MODIFIERS[company.region].exitMultipleMod;
            }

            // Use currentValuation as base when investedAmount is 0 (incubator graduates)
            const exitBase =
              company.investedAmount > 0
                ? company.investedAmount
                : company.currentValuation;
            const exitValue = exitBase * exitMultiple;
            const cashReturned = exitValue * (company.ownership / 100);

            company.status = "exited";
            company.exitData = {
              acquirerType,
              acquirerName: generateAcquirerName(acquirerType, company.sector),
              exitMultiple: Math.round(exitMultiple * 100) / 100,
              exitValue: Math.round(exitValue),
              month: fund.currentMonth,
            };
            company.currentValuation = Math.round(exitValue);
            company.multiple = Math.round(exitMultiple * 100) / 100;

            exitCashReturned += cashReturned;

            newNews.push({
              id: uuid(),
              headline: `${company.name} Acquired by ${company.exitData.acquirerName}`,
              summary: `${company.name} has been acquired for ${exitMultiple.toFixed(1)}x return. The fund receives $${(cashReturned / 1_000_000).toFixed(1)}M.`,
              type: "exit",
              sentiment: "positive",
              month: fund.currentMonth,
              portfolioRelated: true,
              companyId: company.id,
            });

            portfolio[i] = company;
            continue;
          }

          // ---- 2e: Growth Calculation ----
          const baseGrowth = randomBetween(0.9, 1.2);
          const marketCycleMod: Record<MarketCycle, number> = {
            bull: 1.15,
            normal: 1.0,
            cooldown: 0.85,
            hard: 0.7,
          };
          const finalGrowth =
            baseGrowth * marketCycleMod[marketCycle] * growthMod;

          company.metrics = {
            ...company.metrics,
            mrr: Math.max(0, Math.round(company.metrics.mrr * finalGrowth)),
            customers: Math.max(
              0,
              Math.round(
                company.metrics.customers * (1 + (finalGrowth - 1) * 0.5),
              ),
            ),
            growthRate: clamp(
              company.metrics.growthRate * (0.95 + Math.random() * 0.1),
              0,
              1,
            ),
          };

          // Update valuation based on MRR growth
          company.currentValuation = Math.round(
            company.currentValuation * finalGrowth,
          );
          company.multiple =
            company.investedAmount > 0
              ? Math.round(
                  (company.currentValuation / company.investedAmount) * 100,
                ) / 100
              : 0;

          // Update runway
          if (company.metrics.burnRate > 0) {
            const netBurn = company.metrics.burnRate - company.metrics.mrr;
            company.metrics.runway =
              netBurn > 1000
                ? Math.min(
                    36,
                    Math.max(
                      0,
                      Math.round((company.currentValuation * 0.1) / netBurn),
                    ),
                  )
                : 36; // break-even or profitable = max runway
          }

          // ---- 2e2: Milestone Check ----
          const milestoneResult = checkAndGenerateMilestones(
            company,
            previousMrr,
            fund.currentMonth,
          );
          if (milestoneResult.newMilestones.length > 0) {
            company.milestones = [
              ...(company.milestones ?? []),
              ...milestoneResult.newMilestones,
            ];
            company.events = [...company.events, ...milestoneResult.events];
            for (const mEvt of milestoneResult.events) {
              newNews.push({
                id: uuid(),
                headline: `${company.name}: ${mEvt.title}`,
                summary: mEvt.description,
                type: "market_trend",
                sentiment: "positive",
                month: fund.currentMonth,
                portfolioRelated: true,
                companyId: company.id,
              });
            }
          }

          // ---- 2f: Follow-On Generation ----
          if (
            monthsActive > 6 &&
            company.multiple > 2 &&
            company.relationship > 40 &&
            !newFollowOns.some((f) => f.companyId === company.id)
          ) {
            newFollowOns.push({
              companyId: company.id,
              roundSize: Math.round(
                company.currentValuation * randomBetween(0.15, 0.3),
              ),
              preMoneyValuation: company.currentValuation,
              dilutionIfSkip: randomBetween(5, 15),
            });
          }

          // ---- 2g: Decision Generation ----
          if (
            (company.influence === "board_seat" ||
              company.influence === "majority") &&
            Math.random() < 0.25 &&
            !newDecisions.some((d) => d.companyId === company.id)
          ) {
            newDecisions.push(generateDecision(company, fund.currentMonth));
          }

          // ---- 2g2: Board Meeting Generation (Feature 1) ----
          const monthsActive2 = fund.currentMonth - company.monthInvested;
          const hasPendingMeeting = newBoardMeetings.some(
            (m) => m.companyId === company.id && !m.attended,
          );
          if (!hasPendingMeeting && monthsActive2 > 0) {
            if (company.influence === "board_seat" && monthsActive2 % 6 === 0) {
              newBoardMeetings.push(
                generateBoardMeeting(company, fund.currentMonth),
              );
            } else if (
              company.influence === "majority" &&
              monthsActive2 % 12 === 0
            ) {
              newBoardMeetings.push(
                generateBoardMeeting(company, fund.currentMonth),
              );
            }
          }

          // ---- 2h: Secondary Offer Generation ----
          if (
            company.multiple > 3 &&
            Math.random() < 0.1 &&
            !newSecondaries.some((s) => s.companyId === company.id)
          ) {
            newSecondaries.push({
              id: uuid(),
              companyId: company.id,
              buyerName: pickRandom([
                "Lexington Partners",
                "Blackstone Secondaries",
                "Coller Capital",
                "HarbourVest",
                "Adams Street Partners",
              ]),
              offerPercentage: randomBetween(20, 50),
              offerMultiple: company.multiple * randomBetween(0.7, 0.95),
              expiresMonth: fund.currentMonth + 3,
            });
          }

          // ---- 2i-bis: Buyout Offer Generation ----
          if (
            company.multiple > 2.5 &&
            monthsActive > 24 &&
            Math.random() < 0.04 * difficulty.eventFreqMod &&
            !newBuyouts.some((b) => b.companyId === company.id)
          ) {
            const buyerType = weightedRandom(
              ["pe", "strategic", "rival_fund"] as const,
              [40, 35, 25],
            );
            const buyerNames: Record<string, string[]> = {
              pe: [
                "Summit Equity",
                "Horizon Capital Partners",
                "Apex Growth Fund",
                "Meridian PE",
              ],
              strategic: [
                "TechCorp Global",
                "Innovate Holdings",
                "Atlas Enterprises",
                "Nexus Group",
              ],
              rival_fund: [
                "Benchmark Capital",
                "Lighthouse Ventures",
                "Pinnacle Partners",
                "Vista Growth",
              ],
            };
            const premium = randomBetween(1.1, 1.8);
            const offerPrice = Math.round(company.currentValuation * premium);

            // Use shared buyout acceptance calculation
            const acceptance = calculateBuyoutAcceptance(
              company,
              offerPrice,
              company.relationship,
              marketCycle,
            );
            const founderAcceptance = acceptance.probability;

            newBuyouts.push({
              id: uuid(),
              companyId: company.id,
              offerPrice,
              offerPremium: Math.round(premium * 100) / 100,
              buyerName: pickRandom(buyerNames[buyerType]),
              buyerType,
              expiresMonth: fund.currentMonth + 3,
              founderAcceptance,
            });
          }

          // ---- 2i: Relationship Decay ----
          let decayRate = 1;
          if (company.origin === "lab" || company.origin === "incubator")
            decayRate = 0.5;
          if (company.ownership > 50) decayRate = 0.5;
          if (
            company.influence === "board_seat" ||
            company.influence === "majority"
          )
            decayRate = 0;

          company.relationship = Math.max(10, company.relationship - decayRate);

          // ---- 2j: Update PMF Score ----
          company.pmfScore = clamp(
            company.pmfScore + randomBetween(-3, 3),
            0,
            100,
          );

          // ---- 2k: Update Founder State ----
          if (Math.random() < 0.2) {
            const growthTrend = company.metrics.growthRate;
            const rel = company.relationship;
            const support = company.supportScore;

            let newState: FounderState;
            if (growthTrend > 0.1 && rel > 60) {
              newState = weightedRandom(
                ["focused", "coachable"] as const,
                [60, 40],
              );
            } else if (growthTrend < 0.03 && rel < 40) {
              newState = weightedRandom(
                ["defensive", "burned_out"] as const,
                [50, 50],
              );
            } else if (growthTrend > 0.08 && support < 30) {
              newState = "overconfident";
            } else {
              newState = weightedRandom(
                ["focused", "distracted", "coachable"] as const,
                [40, 40, 20],
              );
            }
            company.founderState = newState;
          }

          // Update influence level
          company.influence = getInfluenceLevel(company.ownership);

          portfolio[i] = company;
        }

        // ==== STEP 2-CLEANUP: Missed Board Meetings (Feature 1) ====
        // For meetings that were not attended and are from a previous month, apply relationship penalty
        const cleanedBoardMeetings: BoardMeeting[] = newBoardMeetings.filter(
          (m) => {
            if (!m.attended && m.scheduledMonth < fund.currentMonth) {
              // Apply relationship penalty and push missed event
              const compIdx = portfolio.findIndex((c) => c.id === m.companyId);
              if (compIdx >= 0) {
                portfolio[compIdx] = {
                  ...portfolio[compIdx],
                  relationship: Math.max(
                    0,
                    portfolio[compIdx].relationship - 5,
                  ),
                  events: [
                    ...portfolio[compIdx].events,
                    {
                      id: uuid(),
                      type: "board_meeting_missed",
                      title: "Board Meeting Missed",
                      description: `You missed a board meeting with ${m.agendaItems.length} agenda item${m.agendaItems.length !== 1 ? "s" : ""}. Relationship decreased by 5.`,
                      severity: "moderate" as const,
                      sentiment: "negative" as const,
                      effects: { relationshipMod: -5 },
                      month: fund.currentMonth,
                    },
                  ],
                };
              }
              return false; // Remove from list
            }
            return true;
          },
        );

        // ==== STEP 3: Process Exit Cash Returns (with carry calculation) ====
        // Calculate carry: GP gets carryRate% of profits above hurdle
        // hurdle = invested capital * (1 + hurdleRate)^years
        if (exitCashReturned > 0) {
          const yearsElapsed = fund.currentMonth / 12;
          const hurdleMultiple = Math.pow(1 + fund.hurdleRate, yearsElapsed);
          const hurdleBasis = fund.deployed * hurdleMultiple;
          const totalReturnedSoFar = fund.totalDistributions + exitCashReturned;

          // Only charge carry on profits above the hurdle
          if (totalReturnedSoFar > hurdleBasis && fund.deployed > 0) {
            const profitAboveHurdle = totalReturnedSoFar - hurdleBasis;
            const newCarry = Math.round(profitAboveHurdle * fund.carryRate);
            // Only accrue the incremental carry (not re-accrue what's already been accrued)
            const incrementalCarry = Math.max(0, newCarry - fund.carryAccrued);
            fund.carryAccrued = newCarry;
            fund.gpEarnings += incrementalCarry;
          }
        }
        fund.cashAvailable += exitCashReturned;

        // ==== STEP 4: Year-End Checks ====
        if (fund.currentMonth > 0 && fund.currentMonth % 12 === 0) {
          const lpState = {
            portfolio,
            fund,
            marketCycle,
            incubatorBatches: state.incubatorBatches,
            labProjects: state.labProjects,
            news: [...state.news, ...newNews],
          };

          const sentiment = calculateLPSentiment(lpState);
          const pressureReport = generateLPPressureReport(lpState);
          sentiment.pressureReports = [
            ...state.lpSentiment.pressureReports,
            pressureReport,
          ];

          const lpReport = generateLPReport(lpState);

          // Graduate active incubator batch
          let activeIncubator = state.activeIncubator;
          const incubatorBatches = [...state.incubatorBatches];
          if (activeIncubator && !activeIncubator.graduated) {
            activeIncubator = { ...activeIncubator, graduated: true };
            incubatorBatches.push(activeIncubator);
            activeIncubator = null;
          }

          // LP Fundraising Events based on sentiment and fund performance
          const year = getGameYear(fund.currentMonth);

          // Capital call: if fund deployed > 70% and LP sentiment > 50, LPs may commit more
          if (
            fund.deployed / fund.currentSize > 0.7 &&
            sentiment.score > 55 &&
            year >= 3
          ) {
            const callAmount = Math.round(
              fund.currentSize * randomBetween(0.05, 0.15),
            );
            newFundraisingEvents.push({
              id: uuid(),
              type: "capital_call",
              title: `Year ${year} Capital Call — Additional $${(callAmount / 1_000_000).toFixed(0)}M`,
              description: `LPs are willing to deploy additional capital based on strong fund performance. Your LP sentiment score of ${Math.round(sentiment.score)} has unlocked this opportunity.`,
              amount: callAmount,
              month: fund.currentMonth,
              resolved: false,
            });
            // Auto-resolve: add to cash available
            fund.cashAvailable += callAmount;
            fund.currentSize += callAmount;
            newNews.push({
              id: uuid(),
              headline: `${fund.name} Raises Additional $${(callAmount / 1_000_000).toFixed(0)}M from LPs`,
              summary: `Strong portfolio performance convinced existing LPs to increase their commitment.`,
              type: "funding_round",
              sentiment: "positive",
              month: fund.currentMonth,
            });
          }

          // Distribution: return capital to LPs from exits (if total exits > 20% of fund)
          const totalExitValue = portfolio
            .filter((c) => c.status === "exited")
            .reduce(
              (sum, c) =>
                sum + (c.exitData?.exitValue || 0) * (c.ownership / 100),
              0,
            );
          if (totalExitValue > fund.currentSize * 0.2 && year >= 4) {
            const distributionAmount = Math.round(
              totalExitValue * randomBetween(0.1, 0.3),
            );
            if (
              distributionAmount > 0 &&
              fund.cashAvailable >= distributionAmount
            ) {
              newFundraisingEvents.push({
                id: uuid(),
                type: "distribution",
                title: `Year ${year} LP Distribution — $${(distributionAmount / 1_000_000).toFixed(0)}M Returned`,
                description: `Strong exits allow distributing $${(distributionAmount / 1_000_000).toFixed(0)}M back to LPs. This improves sentiment but reduces available capital.`,
                amount: distributionAmount,
                month: fund.currentMonth,
                resolved: false,
              });
              fund.cashAvailable -= distributionAmount;
              fund.totalDistributions += distributionAmount;
              newNews.push({
                id: uuid(),
                headline: `${fund.name} Distributes $${(distributionAmount / 1_000_000).toFixed(0)}M to LPs`,
                summary: `Portfolio exits enabled a meaningful distribution to limited partners, boosting confidence in the fund.`,
                type: "funding_round",
                sentiment: "positive",
                month: fund.currentMonth,
              });
              // Boost LP sentiment for distributions
              sentiment.score = Math.min(100, sentiment.score + 5);
            }
          }

          // Fund II offer: if year >= 7, good performance, high LP sentiment
          if (year >= 7 && sentiment.score > 65 && fund.tvpiEstimate > 1.5) {
            const fund2Size = Math.round(
              fund.currentSize * randomBetween(1.2, 2.0),
            );
            newFundraisingEvents.push({
              id: uuid(),
              type: "fund_ii_offer",
              title: `Fund II Opportunity — $${(fund2Size / 1_000_000).toFixed(0)}M Target`,
              description: `Your track record has attracted LP interest in a successor fund. This reflects on your legacy as a fund manager.`,
              amount: fund2Size,
              month: fund.currentMonth,
              resolved: false,
            });
            newNews.push({
              id: uuid(),
              headline: `${fund.name} Begins Fundraising for Fund II`,
              summary: `Strong returns and LP confidence have opened the door to a $${(fund2Size / 1_000_000).toFixed(0)}M successor fund.`,
              type: "funding_round",
              sentiment: "positive",
              month: fund.currentMonth,
            });
          }

          // LP pressure consequence: critical sentiment penalizes dealflow
          if (sentiment.score < 25) {
            newNews.push({
              id: uuid(),
              headline: `LPs Express Concern Over ${fund.name} Performance`,
              summary: `Limited partners are questioning the fund's strategy. Future fundraising and deal quality may be impacted.`,
              type: "market_trend",
              sentiment: "negative",
              month: fund.currentMonth,
            });
          }

          set({
            lpSentiment: sentiment,
            lpReports: [...state.lpReports, lpReport],
            activeIncubator,
            incubatorBatches,
          });
        }

        // ==== STEP 5: Refresh Talent Pool ====
        const newAlumni = processAlumni(newlyFailed);
        const freshTalent = generateTalentPool(marketCycle, fund.currentMonth);
        const talentPool = [...freshTalent, ...newAlumni];

        // ==== STEP 6: Generate New Deals ====
        const lpEffects = getLPEffects(state.lpSentiment);
        const newDeals: Startup[] = [];
        // Real economy: deal flow quantity varies with market conditions
        const baseDealCount = 3;
        const dealCount = Math.max(
          1,
          Math.min(
            5,
            Math.round(baseDealCount * mktConditions.dealFlowMultiplier),
          ),
        );
        for (let i = 0; i < dealCount; i++) {
          const deal = generateStartup(
            fund.stage,
            marketCycle,
            fund.skillLevel,
            fund.geographicFocus,
          );
          // Apply LP dealflow modifier: better reputation = slightly better deals
          if (lpEffects.dealflowMod > 1.05) {
            deal.founderTraits.grit = Math.min(10, deal.founderTraits.grit + 1);
            deal.founderTraits.clarity = Math.min(
              10,
              deal.founderTraits.clarity + 1,
            );
          }
          // Apply difficulty scaling: higher levels = inflated valuations
          deal.valuation = Math.round(deal.valuation * difficulty.valuationMod);
          // Real economy: market conditions affect startup valuations
          deal.valuation = Math.round(
            deal.valuation * mktConditions.valuationMultiplier,
          );
          // Real economy: sector-specific heat affects individual deal valuations
          const dealSectorHeat =
            mktConditions.sectorHeatMap[deal.sector] ?? 1.0;
          deal.valuation = Math.round(deal.valuation * dealSectorHeat);
          newDeals.push(deal);
        }

        // Update TVPI estimate (gross — before fees/carry)
        const totalValue = portfolio.reduce((sum, c) => {
          if (c.status === "exited")
            return sum + (c.exitData?.exitValue || 0) * (c.ownership / 100);
          if (c.status === "active")
            return sum + c.currentValuation * (c.ownership / 100);
          return sum;
        }, fund.cashAvailable + fund.totalFeesCharged); // Add fees back for gross calculation
        fund.tvpiEstimate =
          fund.currentSize > 0
            ? Math.round((totalValue / fund.currentSize) * 100) / 100
            : 1.0;

        // Rough IRR estimate (gross)
        const years = fund.currentMonth / 12;
        if (years > 0 && fund.tvpiEstimate > 0) {
          fund.irrEstimate =
            Math.round(
              (Math.pow(fund.tvpiEstimate, 1 / years) - 1) * 100 * 100,
            ) / 100;
        }

        // Monthly snapshot
        const monthlySnapshot: MonthlySnapshot = {
          month: fund.currentMonth,
          totalPortfolioValue: totalValue,
          cashAvailable: fund.cashAvailable,
          tvpi: fund.tvpiEstimate,
          activeCompanies: portfolio.filter((c) => c.status === "active")
            .length,
          deployed: fund.deployed,
          lpScore: state.lpSentiment.score,
        };

        // ==== STEP 7: Check Game End ====
        let gamePhase: GameState["gamePhase"] = state.gamePhase;
        let scenarioWon: boolean | null = state.scenarioWon ?? null;
        if (fund.currentMonth >= 120) {
          gamePhase = "ended";
        }

        // Feature 3: Scenario win/fail conditions
        if (
          gamePhase === "playing" &&
          state.activeScenario &&
          state.activeScenario.id !== "sandbox"
        ) {
          const sc = state.activeScenario;
          const exitsCount = portfolio.filter(
            (c) => c.status === "exited",
          ).length;

          // Check each win condition
          const allMet =
            sc.winConditions.length > 0 &&
            sc.winConditions.every((cond) => {
              if (cond.type === "tvpi")
                return fund.tvpiEstimate >= cond.threshold;
              if (cond.type === "lp_sentiment")
                return state.lpSentiment.score >= cond.threshold;
              if (cond.type === "exits") return exitsCount >= cond.threshold;
              if (cond.type === "lp_sentiment_sustained") {
                const snaps = state.monthlySnapshots;
                if (snaps.length === 0) return false;
                const monthsAbove = snaps.filter(
                  (s) => s.lpScore >= cond.threshold,
                ).length;
                return monthsAbove / snaps.length >= 0.8;
              }
              if (cond.type === "sector_concentration_moic") {
                const sectors = new Set(portfolio.map((c) => c.sector));
                if (sectors.size > 2) return false;
                return fund.tvpiEstimate >= cond.threshold;
              }
              if (cond.type === "contrarian_exits") {
                const contrarian = portfolio.filter((c) => c.pmfScore <= 30);
                const contrarianExits = contrarian.filter(
                  (c) => c.status === "exited",
                ).length;
                return (
                  contrarian.length >= 5 && contrarianExits >= cond.threshold
                );
              }
              if (cond.type === "unique_coinvestors") {
                const uniquePartners = new Set(
                  (state.syndicatePartners || []).map((s) => s.investorName),
                );
                return uniquePartners.size >= cond.threshold;
              }
              if (cond.type === "capital_efficient") {
                const deploymentRatio = fund.deployed / fund.currentSize;
                return (
                  fund.tvpiEstimate >= cond.threshold && deploymentRatio < 0.6
                );
              }
              return false;
            });
          if (allMet) {
            gamePhase = "ended";
            scenarioWon = true;
          }

          // Check fail conditions (LP Rescue: if month 36 passes without meeting sentiment threshold)
          if (
            sc.id === "lp_rescue" &&
            fund.currentMonth >= 36 &&
            state.lpSentiment.score < 60
          ) {
            gamePhase = "ended";
            scenarioWon = false;
          }
        }

        // If game ended by month limit with a scenario, determine win/fail
        if (
          gamePhase === "ended" &&
          scenarioWon === null &&
          state.activeScenario &&
          state.activeScenario.id !== "sandbox"
        ) {
          const sc = state.activeScenario;
          const exitsCount = portfolio.filter(
            (c) => c.status === "exited",
          ).length;
          scenarioWon =
            sc.winConditions.length > 0 &&
            sc.winConditions.every((cond) => {
              if (cond.type === "tvpi")
                return fund.tvpiEstimate >= cond.threshold;
              if (cond.type === "lp_sentiment")
                return state.lpSentiment.score >= cond.threshold;
              if (cond.type === "exits") return exitsCount >= cond.threshold;
              if (cond.type === "lp_sentiment_sustained") {
                const snaps = state.monthlySnapshots;
                if (snaps.length === 0) return false;
                const monthsAbove = snaps.filter(
                  (s) => s.lpScore >= cond.threshold,
                ).length;
                return monthsAbove / snaps.length >= 0.8;
              }
              if (cond.type === "sector_concentration_moic") {
                const sectors = new Set(portfolio.map((c) => c.sector));
                if (sectors.size > 2) return false;
                return fund.tvpiEstimate >= cond.threshold;
              }
              if (cond.type === "contrarian_exits") {
                const contrarian = portfolio.filter((c) => c.pmfScore <= 30);
                const contrarianExits = contrarian.filter(
                  (c) => c.status === "exited",
                ).length;
                return (
                  contrarian.length >= 5 && contrarianExits >= cond.threshold
                );
              }
              if (cond.type === "unique_coinvestors") {
                const uniquePartners = new Set(
                  (state.syndicatePartners || []).map((s) => s.investorName),
                );
                return uniquePartners.size >= cond.threshold;
              }
              if (cond.type === "capital_efficient") {
                const deploymentRatio = fund.deployed / fund.currentSize;
                return (
                  fund.tvpiEstimate >= cond.threshold && deploymentRatio < 0.6
                );
              }
              return false;
            });
        }

        // Add market news
        newNews.push(generateMarketNews(marketCycle, fund.currentMonth));

        // Add ecosystem news (competitor raises, sector trends, regulatory)
        const playerSectors = portfolio
          .filter((c) => c.status === "active")
          .map((c) => c.sector);
        const ecoNews = generateEcosystemNews(fund.currentMonth, playerSectors);
        newNews.push(...ecoNews);

        // Remove expired decisions, secondaries, buyouts, follow-ons
        const validDecisions = newDecisions.filter(
          (d) => d.deadline >= fund.currentMonth,
        );
        const validSecondaries = newSecondaries.filter(
          (s) => s.expiresMonth >= fund.currentMonth,
        );
        const validBuyouts = newBuyouts.filter(
          (b) => b.expiresMonth >= fund.currentMonth,
        );

        // ==== STEP 8: Check Achievements ====
        const achievementCtx = fund
          ? {
              fund,
              portfolio,
              lpSentiment: state.lpSentiment,
              boardMeetings: cleanedBoardMeetings,
              labProjects: state.labProjects,
              incubatorBatches: state.incubatorBatches,
              scenarioWon,
              activeScenario: state.activeScenario,
              monthlySnapshots: [...state.monthlySnapshots, monthlySnapshot],
            }
          : null;
        const newAchievements = achievementCtx
          ? checkAchievements(achievementCtx, state.unlockedAchievements || [])
          : [];
        const allAchievements = [
          ...(state.unlockedAchievements || []),
          ...newAchievements,
        ];

        set({
          fund,
          marketCycle,
          gamePhase,
          portfolio,
          dealPipeline: [...state.dealPipeline, ...newDeals],
          talentPool,
          news: [...state.news, ...newNews],
          pendingDecisions: validDecisions,
          secondaryOffers: validSecondaries,
          buyoutOffers: validBuyouts,
          fundraisingEvents: [
            ...state.fundraisingEvents,
            ...newFundraisingEvents,
          ],
          followOnOpportunities: newFollowOns,
          monthlySnapshots: [...state.monthlySnapshots, monthlySnapshot],
          dealsReviewed: state.dealsReviewed + newDeals.length,
          history: newHistory,
          boardMeetings: cleanedBoardMeetings,
          scenarioWon,
          unlockedAchievements: allAchievements,
          // Real economy
          currentEconomicSnapshot: econSnapshot,
          currentMarketConditions: mktConditions,
        });
      },

      // ============================================================
      // UNDO ADVANCE (Feature 7)
      // ============================================================
      undoAdvance: () => {
        const state = get();
        if (state.history.length === 0) return;
        const newHistory = [...state.history];
        const previous = newHistory.pop()!;
        set({ ...previous, history: newHistory });
      },

      // ============================================================
      // PERFORM LP ACTION (Feature 2)
      // ============================================================
      performLPAction: (actionType: LPActionType, params?) => {
        const state = get();
        if (!state.fund) return { success: false, reason: "No active fund." };

        const effect = calculateLPActionEffect(
          actionType,
          state.lpSentiment.score,
          state.fund,
          state.portfolio,
          params,
        );
        if (!effect.canPerform)
          return { success: false, reason: effect.reason };

        const newScore = clamp(
          state.lpSentiment.score + effect.sentimentDelta,
          0,
          100,
        );
        const newLevel =
          newScore >= 80
            ? "excellent"
            : newScore >= 60
              ? "good"
              : newScore >= 40
                ? "neutral"
                : newScore >= 20
                  ? "concerned"
                  : "critical";

        // Update cooldowns
        const existingCooldowns = (state.fund.lpActionCooldowns || []).filter(
          (c) => c.actionType !== actionType,
        );
        const newCooldown = {
          actionType,
          availableFromMonth: state.fund.currentMonth + effect.cooldownMonths,
        };

        // Update latest monthly snapshot's LP score if one exists
        const updatedSnapshots = [...state.monthlySnapshots];
        if (updatedSnapshots.length > 0) {
          const last = updatedSnapshots[updatedSnapshots.length - 1];
          updatedSnapshots[updatedSnapshots.length - 1] = {
            ...last,
            lpScore: newScore,
          };
        }

        set({
          fund: {
            ...state.fund,
            cashAvailable: state.fund.cashAvailable - effect.cashCost,
            lpActionCooldowns: [...existingCooldowns, newCooldown],
          },
          lpSentiment: {
            ...state.lpSentiment,
            score: newScore,
            level: newLevel as import("./types").LPSentimentLevel,
          },
          monthlySnapshots: updatedSnapshots,
          news: [
            ...state.news,
            {
              id: uuid(),
              headline: `LP Communication: ${actionType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
              summary: `LP sentiment improved by ${effect.sentimentDelta} points.`,
              type: "market_trend" as const,
              sentiment: "positive" as const,
              month: state.fund.currentMonth,
            },
          ],
        });

        return { success: true, sentimentGain: effect.sentimentDelta };
      },

      // ============================================================
      // RESOLVE BOARD MEETING (Feature 1)
      // ============================================================
      resolveBoardMeeting: (
        meetingId: string,
        choicesByItemId: Record<string, number>,
      ) => {
        const state = get();
        const meeting = state.boardMeetings.find((m) => m.id === meetingId);
        if (!meeting) return;

        set({
          portfolio: state.portfolio.map((c) => {
            if (c.id !== meeting.companyId) return c;
            const updated = { ...c };

            for (const item of meeting.agendaItems) {
              const chosenIdx = choicesByItemId[item.id];
              if (chosenIdx === undefined) continue;
              const option = item.options[chosenIdx];
              if (!option) continue;
              const effects = option.effects;

              if (effects.growthRate)
                updated.metrics = {
                  ...updated.metrics,
                  growthRate: clamp(
                    updated.metrics.growthRate + effects.growthRate,
                    0,
                    1,
                  ),
                };
              if (effects.churn)
                updated.metrics = {
                  ...updated.metrics,
                  churn: clamp(updated.metrics.churn + effects.churn, 0, 1),
                };
              if (effects.burnRate)
                updated.metrics = {
                  ...updated.metrics,
                  burnRate: Math.max(
                    0,
                    updated.metrics.burnRate * (1 + effects.burnRate),
                  ),
                };
              if (effects.runway)
                updated.metrics = {
                  ...updated.metrics,
                  runway: Math.max(0, updated.metrics.runway + effects.runway),
                };
              if (effects.mrr)
                updated.metrics = {
                  ...updated.metrics,
                  mrr: Math.max(0, updated.metrics.mrr * (1 + effects.mrr)),
                };
              if (effects.relationship)
                updated.relationship = clamp(
                  updated.relationship + effects.relationship,
                  0,
                  100,
                );
              if (effects.pmfScore)
                updated.pmfScore = clamp(
                  updated.pmfScore + effects.pmfScore,
                  0,
                  100,
                );
            }
            return updated;
          }),
          boardMeetings: state.boardMeetings.map((m) =>
            m.id === meetingId
              ? {
                  ...m,
                  attended: true,
                  agendaItems: m.agendaItems.map((item) => {
                    const idx = choicesByItemId[item.id];
                    return idx !== undefined
                      ? { ...item, resolved: true, chosenOptionIndex: idx }
                      : item;
                  }),
                }
              : m,
          ),
        });
      },

      // ============================================================
      // INVEST
      // ============================================================
      invest: (startupId, amount, ownership) => {
        const state = get();
        if (!state.fund) return { success: false, reason: "No active fund." };

        const startup = state.dealPipeline.find((s) => s.id === startupId);
        if (!startup)
          return { success: false, reason: "Deal no longer available." };

        // IRL timeline gate check — determine gate key by startup stage
        // Checked before checkCanInvest: if you're in DD cooldown, deal can't proceed
        const gateKey =
          startup.stage === "pre_seed" || startup.stage === "seed"
            ? "seed_check"
            : "due_diligence";
        const gate = checkTimeGate(state.fund, gateKey);
        if (gate.blocked) {
          return {
            success: false,
            reason: t(
              "timeGate.blocked",
              `Due diligence in progress — available in ${gate.monthsRemaining} month(s).`,
            ),
          };
        }

        const check = checkCanInvest(state.fund, amount, startup.stage);
        if (!check.allowed) return { success: false, reason: check.reason };

        // Check founder willingness
        if (Math.random() * 100 > startup.founderWillingness) {
          return {
            success: false,
            reason: `${startup.founderName} declined your investment offer.`,
          };
        }

        const lpEffects = getLPEffects(state.lpSentiment);

        const portfolioCompany: PortfolioCompany = {
          ...startup,
          investedAmount: amount,
          followOnInvested: 0,
          ownership,
          currentValuation: startup.valuation,
          multiple:
            amount > 0
              ? Math.round((startup.valuation / amount) * 100) / 100
              : 0,
          status: "active",
          origin: "external",
          founderState: "focused",
          pmfScore: randomInt(30, 60),
          relationship: clamp(50 + lpEffects.founderTrustMod, 20, 90),
          supportScore: 10,
          influence: getInfluenceLevel(ownership),
          monthInvested: state.fund.currentMonth,
          events: [],
          hiredTalent: [],
          milestones: [],
          region: startup.region ?? "silicon_valley",
        };

        // Open a new time gate for the next investment (IRL mode only)
        const newGate =
          state.fund.timelineMode === "irl"
            ? openTimeGate(state.fund, gateKey, "Due diligence queue")
            : null;
        const updatedTimeGates = newGate
          ? [...state.fund.activeTimeGates, newGate]
          : state.fund.activeTimeGates;

        set({
          fund: {
            ...state.fund,
            cashAvailable: state.fund.cashAvailable - amount,
            deployed: state.fund.deployed + amount,
            activeTimeGates: updatedTimeGates,
          },
          portfolio: [...state.portfolio, portfolioCompany],
          dealPipeline: state.dealPipeline.filter((s) => s.id !== startupId),
        });

        // Track syndicate partners
        if (startup.coInvestors.length > 0) {
          const currentState = get();
          const updated = [...(currentState.syndicatePartners || [])];
          for (const ci of startup.coInvestors) {
            const existing = updated.find((s) => s.investorName === ci.name);
            if (existing) {
              existing.dealsShared++;
              existing.totalCoInvested += amount;
            } else {
              updated.push({
                investorName: ci.name,
                tier: ci.tier,
                dealsShared: 1,
                totalCoInvested: amount,
                firstDealMonth: currentState.fund!.currentMonth,
              });
            }
          }
          set({ syndicatePartners: updated });
        }

        return { success: true };
      },

      // ============================================================
      // PASS ON DEAL
      // ============================================================
      passOnDeal: (startupId) => {
        const state = get();
        set({
          dealPipeline: state.dealPipeline.filter((s) => s.id !== startupId),
          dealsPassed: state.dealsPassed + 1,
        });
      },

      // ============================================================
      // FOLLOW ON
      // ============================================================
      followOn: (companyId, amount) => {
        const state = get();
        if (!state.fund || amount > state.fund.cashAvailable) return;

        const company = state.portfolio.find((c) => c.id === companyId);
        const opportunity = state.followOnOpportunities.find(
          (f) => f.companyId === companyId,
        );
        if (!company || !opportunity) return;

        const newOwnership =
          company.ownership + (amount / opportunity.preMoneyValuation) * 100;

        set({
          fund: {
            ...state.fund,
            cashAvailable: state.fund.cashAvailable - amount,
            deployed: state.fund.deployed + amount,
          },
          portfolio: state.portfolio.map((c) =>
            c.id === companyId
              ? {
                  ...c,
                  investedAmount: c.investedAmount + amount,
                  followOnInvested: (c.followOnInvested || 0) + amount,
                  ownership: Math.min(100, newOwnership),
                  influence: getInfluenceLevel(newOwnership),
                }
              : c,
          ),
          followOnOpportunities: state.followOnOpportunities.filter(
            (f) => f.companyId !== companyId,
          ),
        });
      },

      // ============================================================
      // SKIP FOLLOW ON
      // ============================================================
      skipFollowOn: (companyId) => {
        const state = get();
        const opportunity = state.followOnOpportunities.find(
          (f) => f.companyId === companyId,
        );
        if (!opportunity) return;

        set({
          portfolio: state.portfolio.map((c) =>
            c.id === companyId
              ? {
                  ...c,
                  ownership: Math.max(
                    1,
                    c.ownership * (1 - opportunity.dilutionIfSkip / 100),
                  ),
                }
              : c,
          ),
          followOnOpportunities: state.followOnOpportunities.filter(
            (f) => f.companyId !== companyId,
          ),
        });
      },

      // ============================================================
      // SELL SECONDARY
      // ============================================================
      sellSecondary: (offerId) => {
        const state = get();
        if (!state.fund) return;

        const offer = state.secondaryOffers.find((s) => s.id === offerId);
        if (!offer) return;

        const company = state.portfolio.find((c) => c.id === offer.companyId);
        if (!company) return;

        const stakeToSell = company.ownership * (offer.offerPercentage / 100);
        const cashReceived =
          company.investedAmount *
          offer.offerMultiple *
          (offer.offerPercentage / 100);

        set({
          fund: {
            ...state.fund,
            cashAvailable: state.fund.cashAvailable + cashReceived,
          },
          portfolio: state.portfolio.map((c) =>
            c.id === offer.companyId
              ? {
                  ...c,
                  ownership: c.ownership - stakeToSell,
                  influence: getInfluenceLevel(c.ownership - stakeToSell),
                }
              : c,
          ),
          secondaryOffers: state.secondaryOffers.filter(
            (s) => s.id !== offerId,
          ),
        });
      },

      // ============================================================
      // REJECT SECONDARY
      // ============================================================
      rejectSecondary: (offerId) => {
        set({
          secondaryOffers: get().secondaryOffers.filter(
            (s) => s.id !== offerId,
          ),
        });
      },

      // ============================================================
      // ACCEPT BUYOUT
      // ============================================================
      acceptBuyout: (offerId) => {
        const state = get();
        if (!state.fund) return;
        const currentFund = state.fund;

        const offer = state.buyoutOffers.find((b) => b.id === offerId);
        if (!offer) return;

        const company = state.portfolio.find((c) => c.id === offer.companyId);
        if (!company) return;

        // Check if founder accepts — probabilistic
        const founderAccepts = Math.random() < offer.founderAcceptance;
        if (!founderAccepts) {
          // Founder rejected — remove offer, add news
          set({
            buyoutOffers: state.buyoutOffers.filter((b) => b.id !== offerId),
            news: [
              ...state.news,
              {
                id: uuid(),
                headline: `${company.name} Founder Rejects ${offer.buyerName} Buyout`,
                summary: `${company.founderName} declined the $${(offer.offerPrice / 1_000_000).toFixed(1)}M offer from ${offer.buyerName}, choosing to continue building independently.`,
                type: "exit" as const,
                sentiment: "neutral" as const,
                month: currentFund.currentMonth,
                portfolioRelated: true,
                companyId: company.id,
              },
            ],
          });
          return;
        }

        // Buyout accepted — exit the company
        const cashReturned = offer.offerPrice * (company.ownership / 100);
        const exitMultiple =
          company.investedAmount > 0
            ? offer.offerPrice / company.investedAmount
            : offer.offerPremium;

        set({
          fund: {
            ...currentFund,
            cashAvailable: currentFund.cashAvailable + cashReturned,
          },
          portfolio: state.portfolio.map((c) =>
            c.id === offer.companyId
              ? {
                  ...c,
                  status: "exited" as const,
                  currentValuation: offer.offerPrice,
                  multiple: Math.round(exitMultiple * 100) / 100,
                  exitData: {
                    acquirerType:
                      offer.buyerType === "pe"
                        ? ("pe" as const)
                        : ("strategic_rival" as const),
                    acquirerName: offer.buyerName,
                    exitMultiple: Math.round(exitMultiple * 100) / 100,
                    exitValue: offer.offerPrice,
                    month: currentFund.currentMonth,
                  },
                }
              : c,
          ),
          buyoutOffers: state.buyoutOffers.filter((b) => b.id !== offerId),
          news: [
            ...state.news,
            {
              id: uuid(),
              headline: `${company.name} Acquired by ${offer.buyerName} for $${(offer.offerPrice / 1_000_000).toFixed(1)}M`,
              summary: `${offer.buyerName} completes acquisition of ${company.name} at a ${((offer.offerPremium - 1) * 100).toFixed(0)}% premium. The fund receives $${(cashReturned / 1_000_000).toFixed(1)}M.`,
              type: "exit" as const,
              sentiment: "positive" as const,
              month: currentFund.currentMonth,
              portfolioRelated: true,
              companyId: company.id,
            },
          ],
        });
      },

      // ============================================================
      // REJECT BUYOUT
      // ============================================================
      rejectBuyout: (offerId) => {
        set({
          buyoutOffers: get().buyoutOffers.filter((b) => b.id !== offerId),
        });
      },

      // ============================================================
      // RESOLVE DECISION
      // ============================================================
      resolveDecision: (decisionId, optionIndex) => {
        const state = get();
        const decision = state.pendingDecisions.find(
          (d) => d.id === decisionId,
        );
        if (!decision) return;

        const option = decision.options[optionIndex];
        if (!option) return;

        const company = state.portfolio.find(
          (c) => c.id === decision.companyId,
        );
        const record: DecisionRecord = {
          id: uuid(),
          companyId: decision.companyId,
          companyName: company?.name ?? "Unknown",
          title: decision.title,
          chosenOption: option.label,
          effects: option.effects,
          month: state.fund?.currentMonth ?? 0,
        };

        set({
          portfolio: state.portfolio.map((c) => {
            if (c.id !== decision.companyId) return c;

            const updated = { ...c };
            const effects = option.effects;

            if (effects.growthRate)
              updated.metrics = {
                ...updated.metrics,
                growthRate: clamp(
                  updated.metrics.growthRate + effects.growthRate,
                  0,
                  1,
                ),
              };
            if (effects.churn)
              updated.metrics = {
                ...updated.metrics,
                churn: clamp(updated.metrics.churn + effects.churn, 0, 1),
              };
            if (effects.burnRate)
              updated.metrics = {
                ...updated.metrics,
                burnRate: Math.max(
                  0,
                  updated.metrics.burnRate * (1 + effects.burnRate),
                ),
              };
            if (effects.runway)
              updated.metrics = {
                ...updated.metrics,
                runway: Math.max(0, updated.metrics.runway + effects.runway),
              };
            if (effects.mrr)
              updated.metrics = {
                ...updated.metrics,
                mrr: Math.max(0, updated.metrics.mrr * (1 + effects.mrr)),
              };
            if (effects.customers)
              updated.metrics = {
                ...updated.metrics,
                customers: Math.max(
                  0,
                  Math.round(
                    updated.metrics.customers * (1 + effects.customers),
                  ),
                ),
              };
            if (effects.relationship)
              updated.relationship = clamp(
                updated.relationship + effects.relationship,
                0,
                100,
              );
            if (effects.pmfScore)
              updated.pmfScore = clamp(
                updated.pmfScore + effects.pmfScore,
                0,
                100,
              );

            return updated;
          }),
          pendingDecisions: state.pendingDecisions.filter(
            (d) => d.id !== decisionId,
          ),
          decisionHistory: [...(state.decisionHistory || []), record],
        });
      },

      // ============================================================
      // HIRE TALENT
      // ============================================================
      hireTalent: (companyId, talentId) => {
        const state = get();
        const company = state.portfolio.find((c) => c.id === companyId);
        const candidate = state.talentPool.find((t) => t.id === talentId);
        if (!company || !candidate) return;

        const probability = calculateHireProbability(
          candidate,
          company,
          state.marketCycle,
        );
        if (Math.random() > probability) return; // Hire failed

        const effects = applyHireEffects(candidate, company);

        set({
          portfolio: state.portfolio.map((c) => {
            if (c.id !== companyId) return c;
            const updated = {
              ...c,
              hiredTalent: [...c.hiredTalent, candidate],
            };

            if (effects.pmfScore)
              updated.pmfScore = clamp(
                updated.pmfScore + (effects.pmfScore as number),
                0,
                100,
              );
            if (effects.supportScore)
              updated.supportScore = clamp(
                updated.supportScore + (effects.supportScore as number),
                0,
                100,
              );

            return updated;
          }),
          talentPool: state.talentPool.filter((t) => t.id !== talentId),
        });
      },

      // ============================================================
      // SUPPORT ACTION
      // ============================================================
      supportAction: (companyId, action) => {
        const state = get();
        const scoreBoost: Record<string, number> = {
          "Make Intros": 2,
          "Give Advice": 3,
          "Engineering Sprint": 5,
          "GTM Sprint": 4,
          "Product Sprint": 4,
          "Capital Injection": 3,
          "Restructure Burn": 2,
          "Force Focus": 3,
          "Replace GTM Strategy": 3,
          "Founder Intervention": 4,
        };

        const boost = scoreBoost[action] || 2;

        set({
          portfolio: state.portfolio.map((c) => {
            if (c.id !== companyId) return c;
            return {
              ...c,
              supportScore: clamp(c.supportScore + boost, 0, 100),
              relationship: clamp(
                c.relationship + (action === "Make Intros" ? 5 : 2),
                0,
                100,
              ),
              pmfScore: clamp(
                c.pmfScore + (action === "Give Advice" ? 2 : 0),
                0,
                100,
              ),
            };
          }),
        });
      },

      // ============================================================
      // INCUBATOR
      // ============================================================
      launchIncubator: () => {
        const state = get();
        if (!state.fund || state.activeIncubator) return;

        const cost = state.fund.currentSize * 0.01;
        if (cost > state.fund.cashAvailable) return;

        const companies = [];
        const numCompanies = randomInt(2, 4);
        for (let i = 0; i < numCompanies; i++) {
          companies.push({
            startup: generateStartup(
              "pre_seed",
              state.marketCycle,
              state.fund.skillLevel + 1,
            ),
            mentoringActions: [],
            graduated: false,
          });
        }

        set({
          fund: {
            ...state.fund,
            cashAvailable: state.fund.cashAvailable - cost,
          },
          activeIncubator: {
            year: getGameYear(state.fund.currentMonth),
            companies,
            graduated: false,
          },
        });
      },

      mentorIncubatorCompany: (companyId, action) => {
        const state = get();
        if (!state.activeIncubator) return;

        set({
          activeIncubator: {
            ...state.activeIncubator,
            companies: state.activeIncubator.companies.map((c) => {
              if (c.startup.id !== companyId) return c;
              if (c.mentoringActions.includes(action)) return c;
              return {
                ...c,
                mentoringActions: [...c.mentoringActions, action],
              };
            }),
          },
        });
      },

      graduateIncubator: () => {
        const state = get();
        if (!state.activeIncubator) return;

        const newPortfolio: PortfolioCompany[] =
          state.activeIncubator.companies.map((ic) => ({
            ...ic.startup,
            investedAmount: 0,
            followOnInvested: 0,
            ownership: 2,
            currentValuation: ic.startup.valuation,
            multiple: 0,
            status: "active" as const,
            origin: "incubator" as CompanyOrigin,
            founderState: "coachable" as FounderState,
            pmfScore: randomInt(35, 55),
            relationship: 80,
            supportScore: 30,
            influence: "observer" as const,
            monthInvested: state.fund!.currentMonth,
            events: [],
            hiredTalent: [],
            milestones: [],
            region: ic.startup.region ?? "silicon_valley",
          }));

        set({
          portfolio: [...state.portfolio, ...newPortfolio],
          activeIncubator: null,
          incubatorBatches: [
            ...state.incubatorBatches,
            { ...state.activeIncubator, graduated: true },
          ],
        });
      },

      // ============================================================
      // VENTURE LAB
      // ============================================================
      createLabProject: (config) => {
        const state = get();
        const project: LabProject = {
          id: uuid(),
          sector: config.sector || "SaaS",
          problemStatement: config.problemStatement || "",
          visionLevel: config.visionLevel || "medium",
          teamBoosts: config.teamBoosts || [],
          status: "idea",
        };
        set({ labProjects: [...state.labProjects, project] });
      },

      assignLabFounder: (projectId, founderId) => {
        const state = get();
        const founder = state.talentPool.find((t) => t.id === founderId);
        if (!founder) return;

        set({
          labProjects: state.labProjects.map((p) =>
            p.id === projectId
              ? { ...p, founder, status: "assembling" as const }
              : p,
          ),
          talentPool: state.talentPool.filter((t) => t.id !== founderId),
        });
      },

      spinOutLab: (projectId) => {
        const state = get();
        if (!state.fund) return;

        const project = state.labProjects.find((p) => p.id === projectId);
        if (!project || !project.founder) return;

        const visionMods = { small: 0.7, medium: 1.0, big: 1.4 };
        const vMod = visionMods[project.visionLevel];

        const startup = generateStartup(
          "pre_seed",
          state.marketCycle,
          state.fund.skillLevel + 2,
        );
        startup.sector = project.sector;
        startup.description = project.problemStatement || startup.description;
        startup.founderName = project.founder.name;

        const ownership = randomBetween(40, 80);
        const investedAmount = Math.round(
          state.fund.currentSize * randomBetween(0.02, 0.05),
        );

        const portfolioCompany: PortfolioCompany = {
          ...startup,
          investedAmount,
          followOnInvested: 0,
          ownership,
          currentValuation: Math.round(startup.valuation * vMod),
          multiple:
            Math.round(((startup.valuation * vMod) / investedAmount) * 100) /
            100,
          status: "active",
          origin: "lab",
          founderState: "focused",
          pmfScore: randomInt(40, 65),
          relationship: 85,
          supportScore: 40,
          influence: getInfluenceLevel(ownership),
          monthInvested: state.fund.currentMonth,
          events: [],
          hiredTalent: [],
          milestones: [],
          region: startup.region ?? "silicon_valley",
        };

        set({
          fund: {
            ...state.fund,
            cashAvailable: state.fund.cashAvailable - investedAmount,
            deployed: state.fund.deployed + investedAmount,
          },
          portfolio: [...state.portfolio, portfolioCompany],
          labProjects: state.labProjects.map((p) =>
            p.id === projectId ? { ...p, status: "spun_out" as const } : p,
          ),
        });
      },

      // ============================================================
      // REBIRTH
      // ============================================================
      rebirth: () => {
        const state = get();
        if (!state.fund) return;

        const skillLevel = state.fund.skillLevel + 1;
        const rebirthCount = state.fund.rebirthCount + 1;

        set({
          fund: null,
          gamePhase: "setup",
          portfolio: [],
          dealPipeline: [],
          lpSentiment: {
            ...initialLPSentiment,
            score: Math.min(70, 50 + rebirthCount * 5),
          },
          lpReports: [],
          incubatorBatches: [],
          activeIncubator: null,
          labProjects: [],
          talentPool: [],
          news: [],
          pendingDecisions: [],
          secondaryOffers: [],
          buyoutOffers: [],
          fundraisingEvents: [],
          followOnOpportunities: [],
          monthlySnapshots: [],
          dealsReviewed: 0,
          dealsPassed: 0,
          history: [],
          boardMeetings: [],
          activeScenario: null,
          unlockedAchievements: state.unlockedAchievements || [],
          syndicatePartners: [],
          tutorialMode: false,
          tutorialStep: 0,
        });

        // Store skill level and rebirth count so initFund can pick them up
        // We do this by keeping them temporarily — the setup page reads them
        set({
          fund: { skillLevel, rebirthCount } as unknown as Fund,
        });
      },

      // ============================================================
      // RESET GAME
      // ============================================================
      resetGame: () => {
        set({
          fund: null,
          marketCycle: "normal",
          gamePhase: "setup",
          portfolio: [],
          dealPipeline: [],
          lpSentiment: initialLPSentiment,
          lpReports: [],
          incubatorBatches: [],
          activeIncubator: null,
          labProjects: [],
          talentPool: [],
          news: [],
          pendingDecisions: [],
          secondaryOffers: [],
          buyoutOffers: [],
          fundraisingEvents: [],
          followOnOpportunities: [],
          monthlySnapshots: [],
          dealsReviewed: 0,
          dealsPassed: 0,
          history: [],
          boardMeetings: [],
          activeScenario: null,
          unlockedAchievements: [],
          syndicatePartners: [],
          tutorialMode: false,
          tutorialStep: 0,
        });
      },

      // ============================================================
      // FUNDRAISING FLOW ACTIONS (v4.0)
      // ============================================================

      launchCampaign: (terms?: FundTermsConfig) => {
        const state = get();
        if (!state.fund || state.gamePhase !== "playing") {
          return { success: false, reason: "No active fund in playing state." };
        }
        if (state.activeCampaign !== null) {
          return {
            success: false,
            reason: "A fundraising campaign is already active.",
          };
        }

        const fund = state.fund;
        const prospects = generateLPProspects(
          fund.fundNumber ?? 1,
          fund.targetSize,
          state.lpSentiment.score,
        );

        const campaign: import("./types").FundraisingCampaign = {
          id: uuid(),
          fundNumber: fund.fundNumber ?? 1,
          prospects,
          closeStatus: "pre_marketing",
          targetAmount: fund.targetSize,
          committedAmount: 0,
          calledAmount: 0,
          terms: terms ?? { ...DEFAULT_FUND_TERMS },
          launchedMonth: fund.currentMonth,
        };

        set({ activeCampaign: campaign });
        return { success: true };
      },

      pitchLP: (prospectId: string) => {
        const state = get();
        if (!state.activeCampaign) {
          return { success: false, reason: "No active fundraising campaign." };
        }

        const prospectIndex = state.activeCampaign.prospects.findIndex(
          (p) => p.id === prospectId,
        );
        if (prospectIndex === -1) {
          return { success: false, reason: "Prospect not found in campaign." };
        }

        const prospect = state.activeCampaign.prospects[prospectIndex];
        const outcome = calculatePitchOutcome(
          prospect,
          state.lpSentiment.score,
          state.marketCycle,
        );

        const updatedProspects = state.activeCampaign.prospects.map((p, i) =>
          i === prospectIndex ? { ...p, status: outcome.newStatus } : p,
        );

        const newCommitted = calculateTotalCommitted(updatedProspects);
        const advanced = outcome.newStatus !== prospect.status;

        set({
          activeCampaign: {
            ...state.activeCampaign,
            prospects: updatedProspects,
            committedAmount: newCommitted,
          },
          news: advanced
            ? [
                ...state.news,
                {
                  id: uuid(),
                  headline: `LP Pitch: ${prospect.name}`,
                  summary: outcome.message,
                  type: "market_trend" as const,
                  sentiment: "positive" as const,
                  month: state.fund?.currentMonth ?? 0,
                },
              ]
            : state.news,
        });

        return {
          success: advanced,
          reason: advanced ? undefined : outcome.message,
          newStatus: outcome.newStatus,
        };
      },

      advanceFundClose: () => {
        const state = get();
        if (!state.activeCampaign) {
          return {
            newCloseStatus:
              "pre_marketing" as import("./types").FundCloseStatus,
            committed: 0,
          };
        }

        const campaign = state.activeCampaign;
        const committed = campaign.committedAmount;
        const current = campaign.closeStatus;

        // Determine target close status — only advance forward, never backward
        const STATUS_ORDER: import("./types").FundCloseStatus[] = [
          "pre_marketing",
          "first_close",
          "interim_close",
          "final_close",
        ];

        let newStatus = current;

        if (
          committed >= getFinalCloseThreshold(campaign.targetAmount) &&
          STATUS_ORDER.indexOf(current) < STATUS_ORDER.indexOf("final_close")
        ) {
          newStatus = "final_close";
        } else if (
          committed >= getFirstCloseThreshold(campaign.targetAmount) &&
          STATUS_ORDER.indexOf(current) < STATUS_ORDER.indexOf("first_close")
        ) {
          newStatus = "first_close";
        }

        if (newStatus !== current) {
          set({
            activeCampaign: { ...campaign, closeStatus: newStatus },
          });
        }

        return { newCloseStatus: newStatus, committed };
      },

      configureFundTerms: (terms: Partial<FundTermsConfig>) => {
        const state = get();
        if (!state.activeCampaign) {
          return { success: false, reason: "No active fundraising campaign." };
        }
        if (state.activeCampaign.closeStatus === "final_close") {
          return {
            success: false,
            reason: "Cannot change terms after final close.",
          };
        }
        if (!state.fund) {
          return { success: false, reason: "No active fund." };
        }

        const newTerms = { ...state.activeCampaign.terms, ...terms };

        // Pitfall 3: update BOTH activeCampaign.terms AND fund economics atomically
        set({
          activeCampaign: {
            ...state.activeCampaign,
            terms: newTerms,
          },
          fund: {
            ...state.fund,
            managementFeeRate:
              terms.managementFee !== undefined
                ? terms.managementFee
                : state.fund.managementFeeRate,
            carryRate:
              terms.carry !== undefined ? terms.carry : state.fund.carryRate,
            hurdleRate:
              terms.hurdleRate !== undefined
                ? terms.hurdleRate
                : state.fund.hurdleRate,
            gpCommit:
              terms.gpCommitPercent !== undefined
                ? Math.round(state.fund.currentSize * terms.gpCommitPercent)
                : state.fund.gpCommit,
          },
        });

        return { success: true };
      },

      completeFundClose: () => {
        const state = get();
        if (!state.fund || state.gamePhase !== "playing") {
          return { success: false, reason: "No active fund in playing state." };
        }

        // Terminal action: push snapshot before reset, then clear history
        const snapshot = captureSnapshot(state);
        const playerProfile = state.playerProfile;
        const fundNumber = (state.fund.fundNumber ?? 1) + 1;
        const skillLevel = state.fund.skillLevel + 1;
        const rebirthCount = state.fund.rebirthCount + 1;

        set({
          // Push snapshot to history first (for reference), then immediately clear
          history: [snapshot],
          fund: null,
          gamePhase: "setup",
          portfolio: [],
          dealPipeline: [],
          activeCampaign: null,
          lpSentiment: {
            ...initialLPSentiment,
            score: Math.min(70, 50 + rebirthCount * 5),
          },
          lpReports: [],
          incubatorBatches: [],
          activeIncubator: null,
          labProjects: [],
          talentPool: [],
          news: [],
          pendingDecisions: [],
          secondaryOffers: [],
          buyoutOffers: [],
          fundraisingEvents: [],
          followOnOpportunities: [],
          monthlySnapshots: [],
          dealsReviewed: 0,
          dealsPassed: 0,
          boardMeetings: [],
          activeScenario: null,
          decisionHistory: [],
          scenarioWon: null,
          unlockedAchievements: state.unlockedAchievements || [],
          syndicatePartners: [],
          tutorialMode: false,
          tutorialStep: 0,
          // Preserve playerProfile — skills and career progression carry over
          playerProfile,
        });

        // Clear history — completeFundClose is terminal, not undoable
        set({ history: [] });

        // Store next fund context so setup page can pre-fill
        set({
          fund: {
            skillLevel,
            rebirthCount,
            fundNumber,
          } as unknown as import("./types").Fund,
        });

        return { success: true };
      },

      // ============================================================
      // SAVE / LOAD SLOTS
      // ============================================================
      saveToSlot: (slotId: string, name: string) => {
        const state = get();
        // Exclude actions and history from the saved blob
        const { history: _h, ...data } = state;
        // Strip function-valued keys (actions) before serialization
        const serializable: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (typeof v !== "function") {
            serializable[k] = v;
          }
        }
        saveSlotToStorage(slotId, name, serializable);
      },

      loadFromSlot: (slotId: string): boolean => {
        const loaded = loadSlotFromStorage(slotId);
        if (!loaded) return false;
        // Apply loaded state, resetting history
        set({
          ...(loaded as Partial<GameState>),
          history: [],
        });
        return true;
      },
    }),
    {
      name: "vencap-game-state",
      partialize: (state) => {
        // Exclude history (undo stack) from localStorage — Feature 7
        const { history: _history, ...rest } = state;
        return rest as typeof state;
      },
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as object) } as GameState;
        // Always start with empty history (not persisted)
        merged.history = [];
        // Backfill fund economics fields for saves from before v1.4
        if (merged.fund && typeof merged.fund === "object") {
          const f = merged.fund;
          if (f.managementFeeRate === undefined) f.managementFeeRate = 0.02;
          if (f.carryRate === undefined) f.carryRate = 0.2;
          if (f.hurdleRate === undefined) f.hurdleRate = 0.08;
          if (f.gpCommit === undefined)
            f.gpCommit = Math.round(f.currentSize * 0.01);
          if (f.totalFeesCharged === undefined) f.totalFeesCharged = 0;
          if (f.carryAccrued === undefined) f.carryAccrued = 0;
          if (f.totalDistributions === undefined) f.totalDistributions = 0;
          if (f.gpEarnings === undefined) f.gpEarnings = 0;
          // Backfill new fields (v1.5)
          if (f.geographicFocus === undefined) f.geographicFocus = "global";
          if (f.lpActionCooldowns === undefined) f.lpActionCooldowns = [];
          if (f.scenarioId === undefined) f.scenarioId = "sandbox";
        }
        // Backfill new GameState fields
        if (!merged.boardMeetings) merged.boardMeetings = [];
        if (merged.activeScenario === undefined) merged.activeScenario = null;
        // Backfill region on existing portfolio companies
        if (merged.portfolio) {
          merged.portfolio = merged.portfolio.map((c) => ({
            ...c,
            region: c.region ?? "silicon_valley",
            milestones: c.milestones ?? [],
          }));
        }
        // Re-evaluate tutorial mode on reload (based on localStorage completion key)
        if (localStorage.getItem("vencap-tutorial-v3-done")) {
          merged.tutorialMode = false;
          merged.tutorialStep = 0;
        }
        if (merged.tutorialMode === undefined) merged.tutorialMode = false;
        if (merged.tutorialStep === undefined) merged.tutorialStep = 0;
        // Backfill real economy fields
        if (merged.marketEra === undefined) merged.marketEra = null;
        if (merged.currentEconomicSnapshot === undefined)
          merged.currentEconomicSnapshot = null;
        if (merged.currentMarketConditions === undefined)
          merged.currentMarketConditions = null;
        return merged;
      },
    },
  ),
);
