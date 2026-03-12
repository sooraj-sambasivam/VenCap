// ============================================================
// VenCap — Single Source of Truth for All TypeScript Types
// NO logic in this file. Types and interfaces only.
// ============================================================

// ============ ENUMS ============

export type FundType = "regional" | "national" | "multistage" | "family_office";
export type FundStage = "pre_seed" | "seed" | "series_a" | "growth";
export type MarketCycle = "bull" | "normal" | "cooldown" | "hard";
export type CompanyStatus = "active" | "exited" | "failed";
export type CompanyOrigin = "external" | "incubator" | "lab" | "buyout";
export type FounderState =
  | "focused"
  | "distracted"
  | "burned_out"
  | "overconfident"
  | "defensive"
  | "coachable";
export type AcquirerType =
  | "faang"
  | "enterprise"
  | "acquihire"
  | "pe"
  | "strategic_rival";
export type EventSeverity = "minor" | "moderate" | "severe";
export type EventSentiment = "positive" | "negative" | "neutral";
export type LPSentimentLevel =
  | "excellent"
  | "good"
  | "neutral"
  | "concerned"
  | "critical";
export type DiscoverySource =
  | "inbound"
  | "referral"
  | "conference"
  | "news"
  | "cold_outreach";
export type TalentRole =
  | "engineering"
  | "sales"
  | "product"
  | "marketing"
  | "operations"
  | "executive";
export type TalentSeniority = "junior" | "mid" | "senior" | "leadership";
export type NewsType =
  | "funding_round"
  | "exit"
  | "market_trend"
  | "cycle_change"
  | "regulation"
  | "scandal";
export type InfluenceLevel = "observer" | "advisor" | "board_seat" | "majority";

// Feature 5: Geographic Regions
export type StartupRegion =
  | "silicon_valley"
  | "nyc"
  | "boston"
  | "london"
  | "berlin"
  | "singapore"
  | "austin"
  | "chicago";
export type GeographicFocus = StartupRegion | "global";

// Feature 1: Board Meeting
export type BoardMeetingAgendaType =
  | "budget_approval"
  | "pivot_evaluation"
  | "hiring_plan"
  | "pricing_strategy"
  | "expansion_plan"
  | "ma_review"
  | "product_roadmap";

// Feature 2: LP Actions
export type LPActionType =
  | "quarterly_update"
  | "lp_day"
  | "oneonone_call"
  | "coinvest_opportunity"
  | "early_distribution";

// Company Milestones
export type CompanyMilestone =
  | "first_revenue"
  | "breakeven"
  | "profitable"
  | "first_enterprise_deal"
  | "100_customers"
  | "1000_customers"
  | "series_b_ready"
  | "international_expansion"
  | "key_partnership"
  | "product_launch"
  | "pivot_successful"
  | "team_50";

// Feature 3: Scenarios
export type ScenarioId =
  | "sandbox"
  | "dotcom_crash"
  | "zirp_party"
  | "zombie_fund"
  | "first_time_fund"
  | "buyout_specialist"
  | "crisis_manager"
  | "lp_rescue"
  | "lp_whisperer"
  | "sector_specialist"
  | "the_contrarian"
  | "speed_demon"
  | "syndicate_builder"
  | "capital_efficient";

// v4.0: Timeline Modes
export type TimelineMode = "irl" | "freeplay";

// v4.0: Skills System
export type SkillId =
  | "deal_sourcing"
  | "due_diligence"
  | "valuation"
  | "portfolio_support"
  | "board_governance"
  | "fundraising_gp"
  | "risk_management"
  | "thesis_development"
  | "network_building"
  | "exit_strategy"
  | "financial_modeling"
  | "founder_coaching"
  | "conflict_resolution"
  | "strategic_comms"
  | "team_dynamics"
  | "pattern_recognition"
  | "market_intuition"
  | "relationship_building"
  | "negotiation";

export type SkillContext =
  | "seed"
  | "growth"
  | "buyout"
  | "deep_tech"
  | "consumer"
  | "enterprise";

export type CareerTitle =
  | "analyst"
  | "associate"
  | "vp"
  | "partner"
  | "managing_director";

// v4.0: Fundraising
export type LPType =
  | "institutional"
  | "family_office"
  | "hnw"
  | "fund_of_funds";

export type LPCommitmentStatus =
  | "prospect"
  | "pitched"
  | "soft_circle"
  | "hard_commit"
  | "closed"
  | "declined";

export type FundCloseStatus =
  | "pre_marketing"
  | "first_close"
  | "interim_close"
  | "final_close";

// v4.0: Reports
export type ReportType =
  | "portfolio_summary"
  | "deal_memo"
  | "lp_update"
  | "market_analysis";

export type ReportStatus =
  | "idle"
  | "generating"
  | "streaming"
  | "complete"
  | "error";

// ============ CORE ENTITIES ============

export interface FounderTraits {
  grit: number; // 1-10
  clarity: number; // 1-10
  charisma: number; // 1-10
  experience: number; // 1-10
}

export interface UnitEconomics {
  cac: number; // Customer acquisition cost ($)
  ltv: number; // Lifetime value ($)
  ltvCacRatio: number; // LTV/CAC
  grossMargin: number; // 0-100%
  paybackMonths: number; // Months to recoup CAC
}

export interface CompanyMetrics {
  mrr: number; // Monthly recurring revenue ($)
  growthRate: number; // Monthly growth rate (0-1)
  customers: number;
  churn: number; // Monthly churn rate (0-1)
  burnRate: number; // Monthly burn ($)
  runway: number; // Months of runway remaining
}

export interface MarketData {
  tamSize: number; // Total addressable market ($)
  tamGrowthRate: number; // Annual TAM growth (0-1)
  competitionLevel: "low" | "medium" | "high" | "saturated";
}

export interface CoInvestor {
  name: string;
  tier: "tier1" | "friendly" | "competitive" | "strategic";
  failMod: number; // Multiplier on fail chance (e.g. 0.9 = -10%)
  exitMod: number; // Multiplier on exit chance
  growthMod: number; // Multiplier on growth
  reputation: number; // 0-100
}

export interface Startup {
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
  founderWillingness: number; // 0-100
  coInvestors: CoInvestor[];
  region: StartupRegion; // Feature 5
}

export interface PortfolioCompany extends Startup {
  investedAmount: number;
  followOnInvested: number; // Total follow-on capital deployed
  ownership: number; // 0-100%
  currentValuation: number;
  multiple: number; // currentValuation / investedAmount
  status: CompanyStatus;
  origin: CompanyOrigin;
  founderState: FounderState;
  pmfScore: number; // 0-100
  relationship: number; // 0-100 (your relationship with founder)
  supportScore: number; // 0-100
  influence: InfluenceLevel;
  monthInvested: number; // Which game month the investment was made
  events: DynamicEvent[]; // History of events for this company
  milestones: CompanyMilestone[]; // Achieved milestones (prevents re-triggering)
  hiredTalent: TalentCandidate[];
  exitData?: ExitData;
  failureReason?: string;
}

export interface DynamicEvent {
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

export interface ExitData {
  acquirerType: AcquirerType;
  acquirerName: string;
  exitMultiple: number;
  exitValue: number;
  month: number;
}

export interface TalentCandidate {
  id: string;
  name: string;
  role: TalentRole;
  seniority: TalentSeniority;
  reputation: number; // 0-100
  salary: number; // Annual ($)
  skills: string[];
  isAlumni: boolean; // From a failed portfolio company
}

// ============ FUND & LP ============

export interface Fund {
  name: string;
  type: FundType;
  stage: FundStage;
  targetSize: number;
  currentSize: number; // Amount raised
  cashAvailable: number;
  deployed: number; // Total invested so far
  tvpiEstimate: number;
  irrEstimate: number;
  yearStarted: number;
  currentMonth: number; // 0-119 (10 years)
  skillLevel: number; // Carries across rebirths
  rebirthCount: number;

  // Fund Economics
  managementFeeRate: number; // Annual % (e.g. 0.02 = 2%)
  carryRate: number; // % of profits (e.g. 0.20 = 20%)
  hurdleRate: number; // Preferred return before carry (e.g. 0.08 = 8%)
  gpCommit: number; // GP's own capital commitment
  totalFeesCharged: number; // Cumulative management fees deducted
  carryAccrued: number; // Carry accrued from exits (not yet distributed)
  totalDistributions: number; // Total cash distributed to LPs
  gpEarnings: number; // GP's total earnings (fees + carry)

  // Feature 5: Geographic
  geographicFocus: GeographicFocus;

  // Feature 2: LP Actions
  lpActionCooldowns: LPActionCooldown[];

  // Feature 3: Scenarios
  scenarioId: ScenarioId;

  // v4.0: Timeline Mode (defaults set in initFund)
  timelineMode: TimelineMode;
  activeTimeGates: TimeGate[];

  // v4.0: Fund Series (defaults set in initFund)
  fundNumber: number; // 1-3
  nextFundUnlockTvpi: number; // TVPI threshold to unlock next fund
}

// Feature 2: LP Action Cooldown
export interface LPActionCooldown {
  actionType: LPActionType;
  availableFromMonth: number;
}

// Feature 4: Benchmark
export interface BenchmarkDataPoint {
  vintageYear: number;
  fundType: "seed" | "growth" | "multistage" | "buyout";
  topQuartileTvpi: number;
  medianTvpi: number;
  bottomQuartileTvpi: number;
  topQuartileIrr: number;
  medianIrr: number;
  bottomQuartileIrr: number;
  sampleSize: number;
}

export interface BenchmarkComparison {
  benchmarkTvpi: { topQ: number; median: number; bottomQ: number };
  benchmarkIrr: { topQ: number; median: number; bottomQ: number };
  playerTvpiPercentile:
    | "top_quartile"
    | "second_quartile"
    | "third_quartile"
    | "bottom_quartile";
  playerIrrPercentile:
    | "top_quartile"
    | "second_quartile"
    | "third_quartile"
    | "bottom_quartile";
  vintageYear: number;
  proxyNote?: string;
}

// Feature 1: Board Meeting
export interface BoardMeetingAgendaItem {
  id: string;
  type: BoardMeetingAgendaType;
  title: string;
  description: string;
  options: {
    label: string;
    description: string;
    effects: Record<string, number>;
  }[];
  resolved: boolean;
  chosenOptionIndex?: number;
}

export interface BoardMeeting {
  id: string;
  companyId: string;
  scheduledMonth: number;
  agendaItems: BoardMeetingAgendaItem[];
  attended: boolean;
}

// Feature 3: Scenario
export interface ScenarioWinCondition {
  type:
    | "tvpi"
    | "lp_sentiment"
    | "exits"
    | "survival"
    | "lp_sentiment_sustained"
    | "sector_concentration_moic"
    | "contrarian_exits"
    | "unique_coinvestors"
    | "capital_efficient";
  threshold: number;
  byMonth: number;
  description: string;
}

export interface ScenarioConfig {
  id: ScenarioId;
  name: string;
  tagline: string;
  description: string;
  difficulty: "easy" | "normal" | "hard" | "extreme";
  fundOverrides: Partial<Fund>;
  startingMarketCycle: MarketCycle;
  startingLPSentiment: number;
  startingMonth: number;
  winConditions: ScenarioWinCondition[];
  bonusScoreMultiplier: number;
  specialRules: string[];
}

export interface LPSentiment {
  score: number; // 0-100
  level: LPSentimentLevel;
  factors: {
    portfolioPerformance: number; // -20 to +20
    eventQuality: number; // -15 to +15
    valuationMomentum: number; // -10 to +10
    supportQuality: number; // -10 to +10
    deploymentPace: number; // -10 to +10
    labQuality: number; // -10 to +10
    incubatorOutput: number; // -10 to +10
    marketAdjustment: number; // -15 to +15
  };
  pressureReports: LPPressureReport[];
}

export interface LPPressureReport {
  year: number;
  deploymentRating: string;
  breakoutCompanies: number;
  redFlagCount: number;
  reservesRating: string;
  studioROI: string;
  overallGrade: string;
}

export interface LPReport {
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

  // Fund Economics in report
  grossTvpi: number; // TVPI before fees & carry
  netTvpi: number; // TVPI after fees & carry (what LPs actually get)
  grossIrr: number; // IRR before fees & carry
  netIrr: number; // IRR after fees & carry
  feesChargedYtd: number; // Fees charged this year
  totalFeesCharged: number; // Cumulative fees to date
  carryAccrued: number; // Total carry accrued to date
  distributionsToDate: number; // Total distributions to LPs
}

// ============ SKILLS ============

export interface SkillRecord {
  id: SkillId;
  name: string;
  category: "hard" | "soft";
  xp: number; // 0-1000
  level: number; // 1-5 derived from XP thresholds
  contextTags: SkillContext[];
}

export interface PlayerProfile {
  skills: Record<SkillId, SkillRecord>;
  careerTitle: CareerTitle;
  totalXP: number;
}

// ============ FUNDRAISING ============

export interface LPProspect {
  id: string;
  name: string;
  type: LPType;
  targetCommitment: number;
  status: LPCommitmentStatus;
  interestLevel: number; // 0-100
  relationshipScore: number; // 0-100
}

export interface FundTermsConfig {
  managementFee: number; // e.g. 0.02 = 2%
  carry: number; // e.g. 0.20 = 20%
  hurdleRate: number; // e.g. 0.08 = 8%
  fundLife: number; // years (e.g. 10)
  gpCommitPercent: number; // e.g. 0.01 = 1%
}

export interface FundraisingCampaign {
  id: string;
  fundNumber: number; // 1-3
  prospects: LPProspect[];
  closeStatus: FundCloseStatus;
  targetAmount: number;
  committedAmount: number;
  calledAmount: number;
  terms: FundTermsConfig;
  launchedMonth: number;
  closedMonth?: number;
}

// ============ TIMELINE ============

export interface TimeGate {
  actionType: string; // e.g. "seed_check", "due_diligence"
  availableFromMonth: number; // absolute game month when gate lifts
  reason: string; // human-readable delay explanation
}

export type IrlGateDuration = { min: number; max: number };
export type IrlGateDurations = Record<string, IrlGateDuration>;

// ============ INCUBATOR & LAB ============

export interface IncubatorBatch {
  year: number;
  companies: IncubatorCompany[];
  graduated: boolean;
}

export interface IncubatorCompany {
  startup: Startup;
  mentoringActions: string[]; // Actions taken so far
  graduated: boolean;
}

export interface LabProject {
  id: string;
  sector: string;
  problemStatement: string;
  visionLevel: "small" | "medium" | "big";
  founder?: TalentCandidate;
  teamBoosts: TalentRole[]; // Max 2
  status: "idea" | "matching" | "assembling" | "spun_out";
}

// ============ NEWS ============

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  type: NewsType;
  sentiment: EventSentiment;
  month: number;
  portfolioRelated?: boolean; // True if this is about a portfolio company
  companyId?: string; // If portfolio related, which company
}

// ============ PENDING DECISIONS ============

export interface PendingDecision {
  id: string;
  companyId: string;
  title: string;
  description: string;
  options: {
    label: string;
    effects: Record<string, number>;
  }[];
  deadline: number; // Month by which you must decide
}

export interface DecisionRecord {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  chosenOption: string;
  effects: Record<string, number>;
  month: number;
}

export interface SyndicateRelationship {
  investorName: string;
  tier: "tier1" | "friendly" | "competitive" | "strategic";
  dealsShared: number;
  totalCoInvested: number;
  firstDealMonth: number;
}

export interface SecondaryOffer {
  id: string;
  companyId: string;
  buyerName: string;
  offerPercentage: number; // % of your stake they want
  offerMultiple: number; // Multiple on invested amount
  expiresMonth: number;
}

export interface BuyoutOffer {
  id: string;
  companyId: string;
  offerPrice: number; // Total offer price for the company
  offerPremium: number; // Premium over current valuation (e.g. 1.5 = 50% premium)
  buyerName: string;
  buyerType: "pe" | "strategic" | "rival_fund";
  expiresMonth: number;
  founderAcceptance: number; // 0-1 probability founder accepts
}

export interface FollowOnOpportunity {
  companyId: string;
  roundSize: number;
  preMoneyValuation: number;
  dilutionIfSkip: number; // % dilution if you don't follow on
}

export interface FundraisingEvent {
  id: string;
  type: "capital_call" | "distribution" | "fund_ii_offer";
  title: string;
  description: string;
  amount: number; // Dollar amount involved
  month: number;
  resolved: boolean;
}

export interface DifficultyModifiers {
  failRateMod: number; // Multiplier on base fail rates
  exitRateMod: number; // Multiplier on base exit rates
  eventFreqMod: number; // Multiplier on negative event frequency
  valuationMod: number; // Multiplier on startup valuations
  dealQualityMod: number; // Multiplier on deal pipeline quality
  marketCycleSpeed: number; // Multiplier on cycle transition speed
}

// ============ ANALYTICS ============

export interface MonthlySnapshot {
  month: number;
  totalPortfolioValue: number;
  cashAvailable: number;
  tvpi: number;
  activeCompanies: number;
  deployed: number;
  lpScore: number;
}

// ============ REPORTS ============

export interface ReportGenerationResult {
  id: string;
  type: ReportType;
  status: ReportStatus;
  content: string; // accumulated text (empty until complete)
  createdAt: number; // Unix timestamp ms
  error?: string; // set only on status === 'error'
}

export interface ReportRequest {
  type: ReportType;
  companyId?: string; // for deal_memo
  sector?: string; // for market_analysis
}

// ============ FEEDBACK ============

export interface TickSummaryItem {
  category: "portfolio" | "market" | "lp" | "fund";
  description: string;
  impact: "positive" | "negative" | "neutral";
  delta?: number; // optional numeric change for display
}

export interface TickSummary {
  month: number;
  items: TickSummaryItem[];
}

export interface ActionPreviewEffect {
  metric: string;
  before: number;
  after: number;
  direction: "up" | "down" | "neutral";
}

export interface ActionPreview {
  actionType: string;
  effects: ActionPreviewEffect[];
}

// ============ GAME STATE ACTIONS ============

export interface GameStateActions {
  initFund: (config: Partial<Fund> & { scenarioId?: ScenarioId }) => void;
  advanceTime: () => void;
  undoAdvance: () => void;
  setTutorialStep: (step: number) => void;
  completeTutorial: () => void;
  invest: (
    startupId: string,
    amount: number,
    ownership: number,
  ) => { success: boolean; reason?: string };
  passOnDeal: (startupId: string) => void;
  followOn: (companyId: string, amount: number) => void;
  skipFollowOn: (companyId: string) => void;
  sellSecondary: (offerId: string) => void;
  rejectSecondary: (offerId: string) => void;
  acceptBuyout: (offerId: string) => void;
  rejectBuyout: (offerId: string) => void;
  resolveDecision: (decisionId: string, optionIndex: number) => void;
  performLPAction: (
    actionType: LPActionType,
    params?: { amount?: number; companyId?: string },
  ) => { success: boolean; reason?: string; sentimentGain?: number };
  resolveBoardMeeting: (
    meetingId: string,
    choicesByItemId: Record<string, number>,
  ) => void;
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
  setMarketEra: (era: MarketEra) => void;
  fetchLiveMarketData: () => Promise<void>;
  saveToSlot: (slotId: string, name: string) => void;
  loadFromSlot: (slotId: string) => boolean;
  // v4.0: Fundraising flow actions
  launchCampaign: (terms?: FundTermsConfig) => {
    success: boolean;
    reason?: string;
  };
  pitchLP: (prospectId: string) => {
    success: boolean;
    reason?: string;
    newStatus?: LPCommitmentStatus;
  };
  advanceFundClose: () => {
    newCloseStatus: FundCloseStatus;
    committed: number;
  };
  configureFundTerms: (terms: Partial<FundTermsConfig>) => {
    success: boolean;
    reason?: string;
  };
  completeFundClose: () => { success: boolean; reason?: string };
  // v4.0: LLM Report Generation
  generateReport: (request: ReportRequest) => string; // returns report ID
  cancelReport: (reportId: string) => void;
  clearReportHistory: () => void;
}

// Feature 7: Undo snapshot — auto-derives from GameState, excludes actions + transient fields
export type GameSnapshot = Omit<
  GameState,
  | keyof GameStateActions
  | "history"
  | "tutorialMode"
  | "tutorialStep"
  | "playerProfile"
  | "reportHistory"
>;

// ============ GAME STATE (Zustand Store Shape) ============

export interface GameState extends GameStateActions {
  // Core
  fund: Fund | null;
  marketCycle: MarketCycle;
  gamePhase: "setup" | "playing" | "ended";

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
  buyoutOffers: BuyoutOffer[];
  fundraisingEvents: FundraisingEvent[];
  followOnOpportunities: FollowOnOpportunity[];

  // Analytics
  monthlySnapshots: MonthlySnapshot[];

  // Stats
  dealsReviewed: number;
  dealsPassed: number;

  // Feature 7: Undo history (excluded from persist)
  history: GameSnapshot[];

  // Feature 1: Board Meetings
  boardMeetings: BoardMeeting[];

  // Feature 3: Active Scenario
  activeScenario: ScenarioConfig | null;

  // Decision History
  decisionHistory: DecisionRecord[];

  // Scenario outcome
  scenarioWon: boolean | null;

  // Achievements
  unlockedAchievements: string[];

  // Syndicate Network
  syndicatePartners: SyndicateRelationship[];

  // Real Economy
  marketEra: MarketEra | null;
  currentEconomicSnapshot: EconomicSnapshot | null;
  currentMarketConditions: MarketConditions | null;

  // Tutorial (excluded from snapshot)
  tutorialMode: boolean;
  tutorialStep: number;

  // v4.0: Skills (excluded from snapshot — undo never rolls back progression)
  playerProfile: PlayerProfile;

  // v4.0: Fundraising
  activeCampaign: FundraisingCampaign | null;

  // v4.0: Reports (excluded from snapshot)
  reportHistory: ReportGenerationResult[];
}

// ============ REAL ECONOMY ============

export type MarketEra =
  | "dotcom_boom" // 1998-2000
  | "dotcom_bust" // 2001-2003
  | "recovery_2004" // 2004-2006
  | "gfc_bubble" // 2007
  | "gfc_crash" // 2008-2009
  | "post_gfc" // 2010-2012
  | "bull_2013" // 2013-2015
  | "late_cycle" // 2016-2019
  | "covid_crash" // 2020Q1-Q2
  | "zirp_boom" // 2020Q3-2021
  | "rate_hikes" // 2022-2023
  | "ai_boom" // 2023-2024
  | "current" // Live data mode
  | "custom"; // Player-defined start year

export interface EconomicSnapshot {
  year: number;
  quarter: number; // 1-4
  fedFundsRate: number; // % (e.g. 5.25)
  treasury10y: number; // 10-year Treasury yield %
  sp500: number; // S&P 500 index level
  nasdaq: number; // NASDAQ Composite index level
  gdpGrowthAnnualized: number; // % annualized GDP growth
  unemploymentRate: number; // %
  cpiYoY: number; // % year-over-year CPI inflation
  vcFundingIndex: number; // 100 = 2019 baseline, relative VC activity
  ipoCount: number; // Approximate IPOs in the quarter
  isLive: boolean; // Whether this data came from a live API
}

export interface MarketConditions {
  valuationMultiplier: number; // 0.5-1.5, affects startup valuations
  exitProbabilityMultiplier: number; // 0.3-2.0, affects exit likelihood
  failRateMultiplier: number; // 0.7-1.5, affects failure rates
  lpSentimentModifier: number; // -15 to +15, added to LP sentiment
  dealFlowMultiplier: number; // 0.5-1.5, affects deal pipeline size
  ipoWindowOpen: boolean; // Whether IPOs are viable
  vcCompetitionLevel: number; // 0.5-1.5, affects deal competition/valuations
  sectorHeatMap: Record<string, number>; // Sector-specific multipliers
  narrative: string; // Human-readable market description
  educationalInsight: string; // Teaching moment about the current conditions
}

export interface EraDefinition {
  id: MarketEra;
  name: string;
  tagline: string;
  description: string;
  startYear: number;
  startQuarter: number;
  difficulty: "easy" | "normal" | "hard" | "extreme";
  keyEvents: string[];
}

// ============ SAVE SLOTS ============

export interface SaveSlot {
  id: string;
  name: string;
  savedAt: number;
  fundName: string;
  month: number;
  tvpiGross: number;
}

// ============ LEADERBOARD ============

export interface LeaderboardEntry {
  id: string;
  fundName: string;
  finalScore: number;
  grade: string;
  tvpiNet: number;
  irrNet: number;
  totalExits: number;
  unicornCount: number;
  scenarioId?: string;
  scenarioWon?: boolean;
  difficulty: string;
  rebirthCount: number;
  completedAt: number;
  durationMonths: number;
}
