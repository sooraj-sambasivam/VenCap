// ============================================================
// VenCap — Historical Economic Data & FRED API Client
// Real quarterly economic snapshots (2000-2025) + live data fetching
// ============================================================

import type { EconomicSnapshot, EraDefinition, MarketEra } from "./types";

// ============ ERA DEFINITIONS ============

export const ERA_DEFINITIONS: EraDefinition[] = [
  {
    id: "dotcom_boom",
    name: "Dot-Com Boom",
    tagline: "Irrational exuberance at its peak",
    description:
      "The late 1990s internet bubble. Sky-high valuations, easy IPOs, and the belief that clicks = revenue. Can you ride the wave and get out before the crash?",
    startYear: 1999,
    startQuarter: 1,
    difficulty: "hard",
    keyEvents: [
      "NASDAQ hits 5,000",
      "Pets.com IPO",
      "Y2K fears",
      "AOL-Time Warner merger",
    ],
  },
  {
    id: "dotcom_bust",
    name: "Dot-Com Bust",
    tagline: "The party is over",
    description:
      "The NASDAQ has crashed 78%. Startups are shutting down daily. VCs are writing off entire portfolios. Can you find diamonds in the rubble?",
    startYear: 2001,
    startQuarter: 1,
    difficulty: "extreme",
    keyEvents: [
      "NASDAQ crashes 78%",
      "9/11 attacks",
      "Enron collapse",
      "Mass layoffs in tech",
    ],
  },
  {
    id: "recovery_2004",
    name: "Web 2.0 Recovery",
    tagline: "Social, mobile, cloud",
    description:
      "The dust has settled. Google just IPO'd. Facebook is in a dorm room. Social media and cloud computing are about to change everything.",
    startYear: 2004,
    startQuarter: 1,
    difficulty: "easy",
    keyEvents: [
      "Google IPO",
      "Facebook founded",
      "YouTube launches",
      "Web 2.0 term coined",
    ],
  },
  {
    id: "gfc_bubble",
    name: "Pre-GFC Bubble",
    tagline: "Housing boom, easy money",
    description:
      "Credit is cheap, housing prices only go up, and the economy seems unstoppable. But subprime cracks are forming...",
    startYear: 2007,
    startQuarter: 1,
    difficulty: "hard",
    keyEvents: [
      "iPhone launches",
      "CDO crisis begins",
      "Bear Stearns wobbles",
      "First subprime defaults",
    ],
  },
  {
    id: "gfc_crash",
    name: "Global Financial Crisis",
    tagline: "The world economy on the brink",
    description:
      "Lehman Brothers has collapsed. Credit markets are frozen. The worst financial crisis since the Great Depression. Survival is the goal.",
    startYear: 2008,
    startQuarter: 3,
    difficulty: "extreme",
    keyEvents: [
      "Lehman Brothers collapse",
      "AIG bailout",
      "TARP program",
      "Global recession",
    ],
  },
  {
    id: "post_gfc",
    name: "Post-GFC Recovery",
    tagline: "Rebuilding from the ashes",
    description:
      "QE is pumping liquidity. Tech companies are lean and hungry. Instagram, Uber, and Airbnb are just getting started.",
    startYear: 2010,
    startQuarter: 1,
    difficulty: "normal",
    keyEvents: [
      "QE begins",
      "Instagram launches",
      "Uber founded",
      "iPad launches",
    ],
  },
  {
    id: "bull_2013",
    name: "Unicorn Era",
    tagline: "When startups became worth billions",
    description:
      'The term "unicorn" was just coined. SaaS valuations are exploding. Every startup wants to be the Uber of something.',
    startYear: 2013,
    startQuarter: 1,
    difficulty: "easy",
    keyEvents: [
      "Unicorn term coined",
      "Snapchat rejects Facebook",
      "Slack launches",
      "Cloud computing boom",
    ],
  },
  {
    id: "late_cycle",
    name: "Late Cycle",
    tagline: "How long can the bull run?",
    description:
      "Longest bull market in history. SoftBank Vision Fund is writing $100M checks. WeWork is worth $47B on paper. What could go wrong?",
    startYear: 2017,
    startQuarter: 1,
    difficulty: "normal",
    keyEvents: [
      "SoftBank Vision Fund",
      "WeWork saga",
      "Trade war fears",
      "Crypto winter",
    ],
  },
  {
    id: "covid_crash",
    name: "COVID Crash",
    tagline: "Black swan pandemic",
    description:
      "A global pandemic shuts down the world. Markets crash 34% in weeks. Remote work becomes the norm overnight. Some sectors boom, others die.",
    startYear: 2020,
    startQuarter: 1,
    difficulty: "hard",
    keyEvents: [
      "COVID-19 pandemic",
      "Market crash & V-recovery",
      "Zoom boom",
      "Fed cuts to 0%",
    ],
  },
  {
    id: "zirp_boom",
    name: "ZIRP Boom",
    tagline: "Free money era",
    description:
      "Zero interest rates, unlimited QE, and stimulus checks. VC funding hits $330B. SPACs everywhere. Tiger Global deploying at light speed.",
    startYear: 2021,
    startQuarter: 1,
    difficulty: "easy",
    keyEvents: [
      "SPAC mania",
      "Meme stocks",
      "Crypto to $69K",
      "$330B VC funding year",
    ],
  },
  {
    id: "rate_hikes",
    name: "Rate Hike Reckoning",
    tagline: "The hangover begins",
    description:
      "The Fed is hiking aggressively. Valuations are crashing. Layoffs sweep tech. SVB collapses. Time to separate the real companies from the pretenders.",
    startYear: 2022,
    startQuarter: 2,
    difficulty: "hard",
    keyEvents: [
      "Fed hikes to 5.25%",
      "SVB collapse",
      "Crypto winter deepens",
      "Tech layoffs",
    ],
  },
  {
    id: "ai_boom",
    name: "AI Boom",
    tagline: "The generative AI revolution",
    description:
      'ChatGPT changed everything. AI startups are raising at unprecedented valuations. Every company is now an "AI company." Is this the real deal or another bubble?',
    startYear: 2023,
    startQuarter: 2,
    difficulty: "normal",
    keyEvents: [
      "ChatGPT launches",
      "AI valuations skyrocket",
      "NVIDIA to $3T",
      "AI regulation debates",
    ],
  },
  {
    id: "current",
    name: "Current Market",
    tagline: "Live economic data",
    description:
      "Play with real-time economic conditions pulled from the Federal Reserve. Interest rates, stock indices, and inflation are all live.",
    startYear: new Date().getFullYear(),
    startQuarter: Math.ceil((new Date().getMonth() + 1) / 3) as 1 | 2 | 3 | 4,
    difficulty: "normal",
    keyEvents: ["Live data from FRED API"],
  },
];

// ============ HISTORICAL QUARTERLY DATA (2000-2025) ============
// Sources: FRED (St. Louis Fed), NVCA, PitchBook, Cambridge Associates
// vcFundingIndex: 100 = 2019 annual baseline (~$137B US VC)

export const HISTORICAL_DATA: EconomicSnapshot[] = [
  // 2000 — Dot-com peak & beginning of bust
  {
    year: 2000,
    quarter: 1,
    fedFundsRate: 5.73,
    treasury10y: 6.44,
    sp500: 1498,
    nasdaq: 4572,
    gdpGrowthAnnualized: 1.2,
    unemploymentRate: 4.0,
    cpiYoY: 3.2,
    vcFundingIndex: 175,
    ipoCount: 120,
    isLive: false,
  },
  {
    year: 2000,
    quarter: 2,
    fedFundsRate: 6.27,
    treasury10y: 6.18,
    sp500: 1461,
    nasdaq: 3966,
    gdpGrowthAnnualized: 7.8,
    unemploymentRate: 3.9,
    cpiYoY: 3.3,
    vcFundingIndex: 160,
    ipoCount: 95,
    isLive: false,
  },
  {
    year: 2000,
    quarter: 3,
    fedFundsRate: 6.52,
    treasury10y: 5.89,
    sp500: 1436,
    nasdaq: 3672,
    gdpGrowthAnnualized: 0.3,
    unemploymentRate: 3.9,
    cpiYoY: 3.5,
    vcFundingIndex: 140,
    ipoCount: 70,
    isLive: false,
  },
  {
    year: 2000,
    quarter: 4,
    fedFundsRate: 6.47,
    treasury10y: 5.57,
    sp500: 1320,
    nasdaq: 2471,
    gdpGrowthAnnualized: 2.3,
    unemploymentRate: 3.9,
    cpiYoY: 3.4,
    vcFundingIndex: 110,
    ipoCount: 40,
    isLive: false,
  },

  // 2001 — Dot-com bust + 9/11
  {
    year: 2001,
    quarter: 1,
    fedFundsRate: 5.59,
    treasury10y: 5.05,
    sp500: 1160,
    nasdaq: 1840,
    gdpGrowthAnnualized: -1.3,
    unemploymentRate: 4.2,
    cpiYoY: 3.4,
    vcFundingIndex: 85,
    ipoCount: 15,
    isLive: false,
  },
  {
    year: 2001,
    quarter: 2,
    fedFundsRate: 4.33,
    treasury10y: 5.27,
    sp500: 1224,
    nasdaq: 2160,
    gdpGrowthAnnualized: 2.5,
    unemploymentRate: 4.4,
    cpiYoY: 3.3,
    vcFundingIndex: 65,
    ipoCount: 12,
    isLive: false,
  },
  {
    year: 2001,
    quarter: 3,
    fedFundsRate: 3.5,
    treasury10y: 4.98,
    sp500: 1040,
    nasdaq: 1498,
    gdpGrowthAnnualized: -1.1,
    unemploymentRate: 4.8,
    cpiYoY: 2.6,
    vcFundingIndex: 45,
    ipoCount: 5,
    isLive: false,
  },
  {
    year: 2001,
    quarter: 4,
    fedFundsRate: 2.13,
    treasury10y: 4.76,
    sp500: 1148,
    nasdaq: 1950,
    gdpGrowthAnnualized: 1.4,
    unemploymentRate: 5.5,
    cpiYoY: 1.6,
    vcFundingIndex: 35,
    ipoCount: 4,
    isLive: false,
  },

  // 2002 — Continued downturn
  {
    year: 2002,
    quarter: 1,
    fedFundsRate: 1.73,
    treasury10y: 5.08,
    sp500: 1147,
    nasdaq: 1812,
    gdpGrowthAnnualized: 3.7,
    unemploymentRate: 5.7,
    cpiYoY: 1.1,
    vcFundingIndex: 30,
    ipoCount: 8,
    isLive: false,
  },
  {
    year: 2002,
    quarter: 2,
    fedFundsRate: 1.75,
    treasury10y: 5.1,
    sp500: 989,
    nasdaq: 1463,
    gdpGrowthAnnualized: 2.2,
    unemploymentRate: 5.8,
    cpiYoY: 1.1,
    vcFundingIndex: 28,
    ipoCount: 6,
    isLive: false,
  },
  {
    year: 2002,
    quarter: 3,
    fedFundsRate: 1.74,
    treasury10y: 4.26,
    sp500: 849,
    nasdaq: 1172,
    gdpGrowthAnnualized: 2.4,
    unemploymentRate: 5.7,
    cpiYoY: 1.5,
    vcFundingIndex: 25,
    ipoCount: 4,
    isLive: false,
  },
  {
    year: 2002,
    quarter: 4,
    fedFundsRate: 1.44,
    treasury10y: 4.01,
    sp500: 879,
    nasdaq: 1335,
    gdpGrowthAnnualized: 0.2,
    unemploymentRate: 5.9,
    cpiYoY: 2.4,
    vcFundingIndex: 22,
    ipoCount: 3,
    isLive: false,
  },

  // 2003 — Recovery begins
  {
    year: 2003,
    quarter: 1,
    fedFundsRate: 1.25,
    treasury10y: 3.92,
    sp500: 848,
    nasdaq: 1341,
    gdpGrowthAnnualized: 2.1,
    unemploymentRate: 5.9,
    cpiYoY: 3.0,
    vcFundingIndex: 20,
    ipoCount: 3,
    isLive: false,
  },
  {
    year: 2003,
    quarter: 2,
    fedFundsRate: 1.25,
    treasury10y: 3.62,
    sp500: 974,
    nasdaq: 1622,
    gdpGrowthAnnualized: 3.8,
    unemploymentRate: 6.1,
    cpiYoY: 2.1,
    vcFundingIndex: 22,
    ipoCount: 10,
    isLive: false,
  },
  {
    year: 2003,
    quarter: 3,
    fedFundsRate: 1.02,
    treasury10y: 4.23,
    sp500: 996,
    nasdaq: 1786,
    gdpGrowthAnnualized: 6.9,
    unemploymentRate: 6.1,
    cpiYoY: 2.2,
    vcFundingIndex: 24,
    ipoCount: 18,
    isLive: false,
  },
  {
    year: 2003,
    quarter: 4,
    fedFundsRate: 1.0,
    treasury10y: 4.29,
    sp500: 1112,
    nasdaq: 2003,
    gdpGrowthAnnualized: 4.8,
    unemploymentRate: 5.7,
    cpiYoY: 1.9,
    vcFundingIndex: 28,
    ipoCount: 22,
    isLive: false,
  },

  // 2004 — Web 2.0 begins
  {
    year: 2004,
    quarter: 1,
    fedFundsRate: 1.0,
    treasury10y: 4.02,
    sp500: 1127,
    nasdaq: 1994,
    gdpGrowthAnnualized: 2.3,
    unemploymentRate: 5.6,
    cpiYoY: 1.7,
    vcFundingIndex: 30,
    ipoCount: 25,
    isLive: false,
  },
  {
    year: 2004,
    quarter: 2,
    fedFundsRate: 1.01,
    treasury10y: 4.6,
    sp500: 1140,
    nasdaq: 1971,
    gdpGrowthAnnualized: 3.0,
    unemploymentRate: 5.6,
    cpiYoY: 2.7,
    vcFundingIndex: 33,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2004,
    quarter: 3,
    fedFundsRate: 1.43,
    treasury10y: 4.3,
    sp500: 1114,
    nasdaq: 1896,
    gdpGrowthAnnualized: 3.7,
    unemploymentRate: 5.4,
    cpiYoY: 2.7,
    vcFundingIndex: 35,
    ipoCount: 32,
    isLive: false,
  },
  {
    year: 2004,
    quarter: 4,
    fedFundsRate: 1.95,
    treasury10y: 4.17,
    sp500: 1212,
    nasdaq: 2175,
    gdpGrowthAnnualized: 3.3,
    unemploymentRate: 5.4,
    cpiYoY: 3.3,
    vcFundingIndex: 38,
    ipoCount: 40,
    isLive: false,
  },

  // 2005-2006 — Steady growth
  {
    year: 2005,
    quarter: 1,
    fedFundsRate: 2.47,
    treasury10y: 4.3,
    sp500: 1181,
    nasdaq: 2062,
    gdpGrowthAnnualized: 4.3,
    unemploymentRate: 5.3,
    cpiYoY: 3.0,
    vcFundingIndex: 40,
    ipoCount: 30,
    isLive: false,
  },
  {
    year: 2005,
    quarter: 2,
    fedFundsRate: 2.94,
    treasury10y: 4.16,
    sp500: 1191,
    nasdaq: 2057,
    gdpGrowthAnnualized: 2.1,
    unemploymentRate: 5.1,
    cpiYoY: 2.5,
    vcFundingIndex: 42,
    ipoCount: 32,
    isLive: false,
  },
  {
    year: 2005,
    quarter: 3,
    fedFundsRate: 3.46,
    treasury10y: 4.21,
    sp500: 1228,
    nasdaq: 2151,
    gdpGrowthAnnualized: 3.4,
    unemploymentRate: 5.0,
    cpiYoY: 4.7,
    vcFundingIndex: 45,
    ipoCount: 28,
    isLive: false,
  },
  {
    year: 2005,
    quarter: 4,
    fedFundsRate: 3.98,
    treasury10y: 4.49,
    sp500: 1248,
    nasdaq: 2205,
    gdpGrowthAnnualized: 2.1,
    unemploymentRate: 4.9,
    cpiYoY: 3.4,
    vcFundingIndex: 48,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2006,
    quarter: 1,
    fedFundsRate: 4.46,
    treasury10y: 4.57,
    sp500: 1294,
    nasdaq: 2339,
    gdpGrowthAnnualized: 5.4,
    unemploymentRate: 4.7,
    cpiYoY: 3.6,
    vcFundingIndex: 50,
    ipoCount: 38,
    isLive: false,
  },
  {
    year: 2006,
    quarter: 2,
    fedFundsRate: 4.91,
    treasury10y: 5.07,
    sp500: 1270,
    nasdaq: 2172,
    gdpGrowthAnnualized: 1.2,
    unemploymentRate: 4.6,
    cpiYoY: 4.0,
    vcFundingIndex: 52,
    ipoCount: 40,
    isLive: false,
  },
  {
    year: 2006,
    quarter: 3,
    fedFundsRate: 5.25,
    treasury10y: 4.9,
    sp500: 1335,
    nasdaq: 2258,
    gdpGrowthAnnualized: 0.4,
    unemploymentRate: 4.6,
    cpiYoY: 2.1,
    vcFundingIndex: 55,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2006,
    quarter: 4,
    fedFundsRate: 5.25,
    treasury10y: 4.63,
    sp500: 1418,
    nasdaq: 2415,
    gdpGrowthAnnualized: 3.2,
    unemploymentRate: 4.4,
    cpiYoY: 2.5,
    vcFundingIndex: 58,
    ipoCount: 42,
    isLive: false,
  },

  // 2007 — Pre-GFC bubble
  {
    year: 2007,
    quarter: 1,
    fedFundsRate: 5.26,
    treasury10y: 4.68,
    sp500: 1421,
    nasdaq: 2421,
    gdpGrowthAnnualized: 0.2,
    unemploymentRate: 4.5,
    cpiYoY: 2.4,
    vcFundingIndex: 60,
    ipoCount: 45,
    isLive: false,
  },
  {
    year: 2007,
    quarter: 2,
    fedFundsRate: 5.25,
    treasury10y: 4.89,
    sp500: 1503,
    nasdaq: 2603,
    gdpGrowthAnnualized: 3.1,
    unemploymentRate: 4.5,
    cpiYoY: 2.7,
    vcFundingIndex: 62,
    ipoCount: 50,
    isLive: false,
  },
  {
    year: 2007,
    quarter: 3,
    fedFundsRate: 5.07,
    treasury10y: 4.59,
    sp500: 1526,
    nasdaq: 2701,
    gdpGrowthAnnualized: 2.7,
    unemploymentRate: 4.7,
    cpiYoY: 2.4,
    vcFundingIndex: 58,
    ipoCount: 38,
    isLive: false,
  },
  {
    year: 2007,
    quarter: 4,
    fedFundsRate: 4.5,
    treasury10y: 4.04,
    sp500: 1468,
    nasdaq: 2652,
    gdpGrowthAnnualized: 1.4,
    unemploymentRate: 4.8,
    cpiYoY: 4.1,
    vcFundingIndex: 55,
    ipoCount: 30,
    isLive: false,
  },

  // 2008-2009 — Global Financial Crisis
  {
    year: 2008,
    quarter: 1,
    fedFundsRate: 3.18,
    treasury10y: 3.66,
    sp500: 1322,
    nasdaq: 2279,
    gdpGrowthAnnualized: -1.6,
    unemploymentRate: 5.0,
    cpiYoY: 4.2,
    vcFundingIndex: 48,
    ipoCount: 12,
    isLive: false,
  },
  {
    year: 2008,
    quarter: 2,
    fedFundsRate: 2.09,
    treasury10y: 3.99,
    sp500: 1280,
    nasdaq: 2293,
    gdpGrowthAnnualized: 2.3,
    unemploymentRate: 5.3,
    cpiYoY: 5.0,
    vcFundingIndex: 42,
    ipoCount: 8,
    isLive: false,
  },
  {
    year: 2008,
    quarter: 3,
    fedFundsRate: 1.94,
    treasury10y: 3.85,
    sp500: 1166,
    nasdaq: 2091,
    gdpGrowthAnnualized: -2.1,
    unemploymentRate: 6.0,
    cpiYoY: 5.3,
    vcFundingIndex: 30,
    ipoCount: 3,
    isLive: false,
  },
  {
    year: 2008,
    quarter: 4,
    fedFundsRate: 0.51,
    treasury10y: 2.69,
    sp500: 903,
    nasdaq: 1505,
    gdpGrowthAnnualized: -8.4,
    unemploymentRate: 6.9,
    cpiYoY: 0.1,
    vcFundingIndex: 18,
    ipoCount: 1,
    isLive: false,
  },
  {
    year: 2009,
    quarter: 1,
    fedFundsRate: 0.18,
    treasury10y: 2.71,
    sp500: 735,
    nasdaq: 1299,
    gdpGrowthAnnualized: -4.4,
    unemploymentRate: 8.1,
    cpiYoY: -0.4,
    vcFundingIndex: 15,
    ipoCount: 1,
    isLive: false,
  },
  {
    year: 2009,
    quarter: 2,
    fedFundsRate: 0.18,
    treasury10y: 3.3,
    sp500: 919,
    nasdaq: 1835,
    gdpGrowthAnnualized: -0.6,
    unemploymentRate: 9.3,
    cpiYoY: -1.4,
    vcFundingIndex: 18,
    ipoCount: 5,
    isLive: false,
  },
  {
    year: 2009,
    quarter: 3,
    fedFundsRate: 0.16,
    treasury10y: 3.52,
    sp500: 1057,
    nasdaq: 2122,
    gdpGrowthAnnualized: 1.5,
    unemploymentRate: 9.6,
    cpiYoY: -1.3,
    vcFundingIndex: 22,
    ipoCount: 12,
    isLive: false,
  },
  {
    year: 2009,
    quarter: 4,
    fedFundsRate: 0.12,
    treasury10y: 3.39,
    sp500: 1115,
    nasdaq: 2269,
    gdpGrowthAnnualized: 4.5,
    unemploymentRate: 9.9,
    cpiYoY: 2.7,
    vcFundingIndex: 26,
    ipoCount: 18,
    isLive: false,
  },

  // 2010-2012 — Post-GFC recovery
  {
    year: 2010,
    quarter: 1,
    fedFundsRate: 0.13,
    treasury10y: 3.73,
    sp500: 1169,
    nasdaq: 2398,
    gdpGrowthAnnualized: 1.5,
    unemploymentRate: 9.7,
    cpiYoY: 2.3,
    vcFundingIndex: 35,
    ipoCount: 20,
    isLive: false,
  },
  {
    year: 2010,
    quarter: 2,
    fedFundsRate: 0.19,
    treasury10y: 3.49,
    sp500: 1030,
    nasdaq: 2109,
    gdpGrowthAnnualized: 3.7,
    unemploymentRate: 9.5,
    cpiYoY: 1.1,
    vcFundingIndex: 40,
    ipoCount: 22,
    isLive: false,
  },
  {
    year: 2010,
    quarter: 3,
    fedFundsRate: 0.19,
    treasury10y: 2.79,
    sp500: 1141,
    nasdaq: 2369,
    gdpGrowthAnnualized: 2.7,
    unemploymentRate: 9.5,
    cpiYoY: 1.1,
    vcFundingIndex: 45,
    ipoCount: 25,
    isLive: false,
  },
  {
    year: 2010,
    quarter: 4,
    fedFundsRate: 0.19,
    treasury10y: 2.86,
    sp500: 1257,
    nasdaq: 2653,
    gdpGrowthAnnualized: 2.5,
    unemploymentRate: 9.4,
    cpiYoY: 1.5,
    vcFundingIndex: 50,
    ipoCount: 28,
    isLive: false,
  },
  {
    year: 2011,
    quarter: 1,
    fedFundsRate: 0.16,
    treasury10y: 3.46,
    sp500: 1326,
    nasdaq: 2781,
    gdpGrowthAnnualized: -1.0,
    unemploymentRate: 8.9,
    cpiYoY: 2.1,
    vcFundingIndex: 55,
    ipoCount: 30,
    isLive: false,
  },
  {
    year: 2011,
    quarter: 2,
    fedFundsRate: 0.09,
    treasury10y: 3.16,
    sp500: 1321,
    nasdaq: 2774,
    gdpGrowthAnnualized: 2.9,
    unemploymentRate: 9.0,
    cpiYoY: 3.6,
    vcFundingIndex: 58,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2011,
    quarter: 3,
    fedFundsRate: 0.08,
    treasury10y: 2.42,
    sp500: 1131,
    nasdaq: 2415,
    gdpGrowthAnnualized: 0.8,
    unemploymentRate: 9.0,
    cpiYoY: 3.8,
    vcFundingIndex: 52,
    ipoCount: 28,
    isLive: false,
  },
  {
    year: 2011,
    quarter: 4,
    fedFundsRate: 0.07,
    treasury10y: 2.0,
    sp500: 1258,
    nasdaq: 2605,
    gdpGrowthAnnualized: 4.7,
    unemploymentRate: 8.5,
    cpiYoY: 3.0,
    vcFundingIndex: 55,
    ipoCount: 30,
    isLive: false,
  },
  {
    year: 2012,
    quarter: 1,
    fedFundsRate: 0.1,
    treasury10y: 2.04,
    sp500: 1408,
    nasdaq: 3091,
    gdpGrowthAnnualized: 3.2,
    unemploymentRate: 8.2,
    cpiYoY: 2.7,
    vcFundingIndex: 52,
    ipoCount: 32,
    isLive: false,
  },
  {
    year: 2012,
    quarter: 2,
    fedFundsRate: 0.16,
    treasury10y: 1.82,
    sp500: 1362,
    nasdaq: 2935,
    gdpGrowthAnnualized: 1.7,
    unemploymentRate: 8.2,
    cpiYoY: 1.7,
    vcFundingIndex: 50,
    ipoCount: 28,
    isLive: false,
  },
  {
    year: 2012,
    quarter: 3,
    fedFundsRate: 0.14,
    treasury10y: 1.64,
    sp500: 1441,
    nasdaq: 3116,
    gdpGrowthAnnualized: 0.5,
    unemploymentRate: 7.8,
    cpiYoY: 1.7,
    vcFundingIndex: 52,
    ipoCount: 30,
    isLive: false,
  },
  {
    year: 2012,
    quarter: 4,
    fedFundsRate: 0.16,
    treasury10y: 1.72,
    sp500: 1426,
    nasdaq: 3020,
    gdpGrowthAnnualized: 0.1,
    unemploymentRate: 7.8,
    cpiYoY: 1.7,
    vcFundingIndex: 55,
    ipoCount: 25,
    isLive: false,
  },

  // 2013-2015 — Unicorn era
  {
    year: 2013,
    quarter: 1,
    fedFundsRate: 0.14,
    treasury10y: 1.95,
    sp500: 1569,
    nasdaq: 3268,
    gdpGrowthAnnualized: 3.6,
    unemploymentRate: 7.7,
    cpiYoY: 1.5,
    vcFundingIndex: 58,
    ipoCount: 32,
    isLive: false,
  },
  {
    year: 2013,
    quarter: 2,
    fedFundsRate: 0.12,
    treasury10y: 2.0,
    sp500: 1606,
    nasdaq: 3403,
    gdpGrowthAnnualized: 0.5,
    unemploymentRate: 7.5,
    cpiYoY: 1.4,
    vcFundingIndex: 62,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2013,
    quarter: 3,
    fedFundsRate: 0.08,
    treasury10y: 2.71,
    sp500: 1682,
    nasdaq: 3771,
    gdpGrowthAnnualized: 3.2,
    unemploymentRate: 7.2,
    cpiYoY: 1.2,
    vcFundingIndex: 68,
    ipoCount: 40,
    isLive: false,
  },
  {
    year: 2013,
    quarter: 4,
    fedFundsRate: 0.09,
    treasury10y: 2.9,
    sp500: 1848,
    nasdaq: 4177,
    gdpGrowthAnnualized: 3.2,
    unemploymentRate: 6.7,
    cpiYoY: 1.5,
    vcFundingIndex: 72,
    ipoCount: 45,
    isLive: false,
  },
  {
    year: 2014,
    quarter: 1,
    fedFundsRate: 0.07,
    treasury10y: 2.73,
    sp500: 1872,
    nasdaq: 4199,
    gdpGrowthAnnualized: -1.1,
    unemploymentRate: 6.6,
    cpiYoY: 1.4,
    vcFundingIndex: 78,
    ipoCount: 52,
    isLive: false,
  },
  {
    year: 2014,
    quarter: 2,
    fedFundsRate: 0.09,
    treasury10y: 2.62,
    sp500: 1960,
    nasdaq: 4408,
    gdpGrowthAnnualized: 5.5,
    unemploymentRate: 6.2,
    cpiYoY: 2.1,
    vcFundingIndex: 85,
    ipoCount: 60,
    isLive: false,
  },
  {
    year: 2014,
    quarter: 3,
    fedFundsRate: 0.09,
    treasury10y: 2.49,
    sp500: 1972,
    nasdaq: 4493,
    gdpGrowthAnnualized: 4.7,
    unemploymentRate: 6.1,
    cpiYoY: 1.7,
    vcFundingIndex: 90,
    ipoCount: 55,
    isLive: false,
  },
  {
    year: 2014,
    quarter: 4,
    fedFundsRate: 0.1,
    treasury10y: 2.28,
    sp500: 2059,
    nasdaq: 4736,
    gdpGrowthAnnualized: 2.3,
    unemploymentRate: 5.7,
    cpiYoY: 0.8,
    vcFundingIndex: 92,
    ipoCount: 50,
    isLive: false,
  },
  {
    year: 2015,
    quarter: 1,
    fedFundsRate: 0.11,
    treasury10y: 2.0,
    sp500: 2068,
    nasdaq: 4900,
    gdpGrowthAnnualized: 3.2,
    unemploymentRate: 5.5,
    cpiYoY: -0.1,
    vcFundingIndex: 95,
    ipoCount: 38,
    isLive: false,
  },
  {
    year: 2015,
    quarter: 2,
    fedFundsRate: 0.12,
    treasury10y: 2.17,
    sp500: 2063,
    nasdaq: 5029,
    gdpGrowthAnnualized: 3.0,
    unemploymentRate: 5.4,
    cpiYoY: 0.0,
    vcFundingIndex: 98,
    ipoCount: 42,
    isLive: false,
  },
  {
    year: 2015,
    quarter: 3,
    fedFundsRate: 0.13,
    treasury10y: 2.22,
    sp500: 1920,
    nasdaq: 4620,
    gdpGrowthAnnualized: 1.3,
    unemploymentRate: 5.1,
    cpiYoY: 0.1,
    vcFundingIndex: 95,
    ipoCount: 32,
    isLive: false,
  },
  {
    year: 2015,
    quarter: 4,
    fedFundsRate: 0.24,
    treasury10y: 2.24,
    sp500: 2044,
    nasdaq: 5007,
    gdpGrowthAnnualized: 0.4,
    unemploymentRate: 5.0,
    cpiYoY: 0.7,
    vcFundingIndex: 100,
    ipoCount: 35,
    isLive: false,
  },

  // 2016-2019 — Late cycle
  {
    year: 2016,
    quarter: 1,
    fedFundsRate: 0.36,
    treasury10y: 1.92,
    sp500: 2060,
    nasdaq: 4870,
    gdpGrowthAnnualized: 1.5,
    unemploymentRate: 4.9,
    cpiYoY: 0.8,
    vcFundingIndex: 90,
    ipoCount: 18,
    isLive: false,
  },
  {
    year: 2016,
    quarter: 2,
    fedFundsRate: 0.38,
    treasury10y: 1.75,
    sp500: 2099,
    nasdaq: 4843,
    gdpGrowthAnnualized: 2.3,
    unemploymentRate: 4.9,
    cpiYoY: 1.0,
    vcFundingIndex: 88,
    ipoCount: 22,
    isLive: false,
  },
  {
    year: 2016,
    quarter: 3,
    fedFundsRate: 0.4,
    treasury10y: 1.6,
    sp500: 2168,
    nasdaq: 5312,
    gdpGrowthAnnualized: 2.8,
    unemploymentRate: 4.9,
    cpiYoY: 1.1,
    vcFundingIndex: 85,
    ipoCount: 25,
    isLive: false,
  },
  {
    year: 2016,
    quarter: 4,
    fedFundsRate: 0.54,
    treasury10y: 2.14,
    sp500: 2239,
    nasdaq: 5383,
    gdpGrowthAnnualized: 2.0,
    unemploymentRate: 4.7,
    cpiYoY: 2.1,
    vcFundingIndex: 88,
    ipoCount: 28,
    isLive: false,
  },
  {
    year: 2017,
    quarter: 1,
    fedFundsRate: 0.79,
    treasury10y: 2.48,
    sp500: 2363,
    nasdaq: 5912,
    gdpGrowthAnnualized: 1.4,
    unemploymentRate: 4.3,
    cpiYoY: 2.4,
    vcFundingIndex: 92,
    ipoCount: 30,
    isLive: false,
  },
  {
    year: 2017,
    quarter: 2,
    fedFundsRate: 1.04,
    treasury10y: 2.31,
    sp500: 2423,
    nasdaq: 6140,
    gdpGrowthAnnualized: 3.2,
    unemploymentRate: 4.3,
    cpiYoY: 1.6,
    vcFundingIndex: 95,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2017,
    quarter: 3,
    fedFundsRate: 1.15,
    treasury10y: 2.2,
    sp500: 2519,
    nasdaq: 6496,
    gdpGrowthAnnualized: 2.9,
    unemploymentRate: 4.2,
    cpiYoY: 2.0,
    vcFundingIndex: 98,
    ipoCount: 32,
    isLive: false,
  },
  {
    year: 2017,
    quarter: 4,
    fedFundsRate: 1.3,
    treasury10y: 2.4,
    sp500: 2674,
    nasdaq: 6903,
    gdpGrowthAnnualized: 2.3,
    unemploymentRate: 4.1,
    cpiYoY: 2.1,
    vcFundingIndex: 100,
    ipoCount: 38,
    isLive: false,
  },
  {
    year: 2018,
    quarter: 1,
    fedFundsRate: 1.45,
    treasury10y: 2.76,
    sp500: 2641,
    nasdaq: 7063,
    gdpGrowthAnnualized: 2.2,
    unemploymentRate: 4.1,
    cpiYoY: 2.2,
    vcFundingIndex: 102,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2018,
    quarter: 2,
    fedFundsRate: 1.74,
    treasury10y: 2.87,
    sp500: 2718,
    nasdaq: 7510,
    gdpGrowthAnnualized: 4.2,
    unemploymentRate: 3.9,
    cpiYoY: 2.7,
    vcFundingIndex: 105,
    ipoCount: 42,
    isLive: false,
  },
  {
    year: 2018,
    quarter: 3,
    fedFundsRate: 1.91,
    treasury10y: 2.93,
    sp500: 2914,
    nasdaq: 8046,
    gdpGrowthAnnualized: 2.9,
    unemploymentRate: 3.8,
    cpiYoY: 2.3,
    vcFundingIndex: 108,
    ipoCount: 45,
    isLive: false,
  },
  {
    year: 2018,
    quarter: 4,
    fedFundsRate: 2.27,
    treasury10y: 3.03,
    sp500: 2507,
    nasdaq: 6635,
    gdpGrowthAnnualized: 1.1,
    unemploymentRate: 3.8,
    cpiYoY: 1.9,
    vcFundingIndex: 100,
    ipoCount: 30,
    isLive: false,
  },
  {
    year: 2019,
    quarter: 1,
    fedFundsRate: 2.4,
    treasury10y: 2.69,
    sp500: 2834,
    nasdaq: 7729,
    gdpGrowthAnnualized: 2.7,
    unemploymentRate: 3.8,
    cpiYoY: 1.6,
    vcFundingIndex: 100,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2019,
    quarter: 2,
    fedFundsRate: 2.38,
    treasury10y: 2.33,
    sp500: 2942,
    nasdaq: 8006,
    gdpGrowthAnnualized: 2.0,
    unemploymentRate: 3.6,
    cpiYoY: 1.8,
    vcFundingIndex: 105,
    ipoCount: 42,
    isLive: false,
  },
  {
    year: 2019,
    quarter: 3,
    fedFundsRate: 2.04,
    treasury10y: 1.68,
    sp500: 2977,
    nasdaq: 7999,
    gdpGrowthAnnualized: 2.6,
    unemploymentRate: 3.5,
    cpiYoY: 1.7,
    vcFundingIndex: 102,
    ipoCount: 38,
    isLive: false,
  },
  {
    year: 2019,
    quarter: 4,
    fedFundsRate: 1.64,
    treasury10y: 1.81,
    sp500: 3231,
    nasdaq: 8973,
    gdpGrowthAnnualized: 2.4,
    unemploymentRate: 3.5,
    cpiYoY: 2.3,
    vcFundingIndex: 100,
    ipoCount: 40,
    isLive: false,
  },

  // 2020 — COVID crash & recovery
  {
    year: 2020,
    quarter: 1,
    fedFundsRate: 1.08,
    treasury10y: 1.02,
    sp500: 2585,
    nasdaq: 7700,
    gdpGrowthAnnualized: -5.3,
    unemploymentRate: 3.8,
    cpiYoY: 1.5,
    vcFundingIndex: 75,
    ipoCount: 10,
    isLive: false,
  },
  {
    year: 2020,
    quarter: 2,
    fedFundsRate: 0.06,
    treasury10y: 0.66,
    sp500: 3100,
    nasdaq: 10058,
    gdpGrowthAnnualized: -28.0,
    unemploymentRate: 13.0,
    cpiYoY: 0.6,
    vcFundingIndex: 60,
    ipoCount: 15,
    isLive: false,
  },
  {
    year: 2020,
    quarter: 3,
    fedFundsRate: 0.09,
    treasury10y: 0.68,
    sp500: 3363,
    nasdaq: 11168,
    gdpGrowthAnnualized: 33.8,
    unemploymentRate: 8.8,
    cpiYoY: 1.2,
    vcFundingIndex: 110,
    ipoCount: 50,
    isLive: false,
  },
  {
    year: 2020,
    quarter: 4,
    fedFundsRate: 0.09,
    treasury10y: 0.93,
    sp500: 3756,
    nasdaq: 12888,
    gdpGrowthAnnualized: 4.5,
    unemploymentRate: 6.7,
    cpiYoY: 1.4,
    vcFundingIndex: 140,
    ipoCount: 80,
    isLive: false,
  },

  // 2021 — ZIRP boom
  {
    year: 2021,
    quarter: 1,
    fedFundsRate: 0.07,
    treasury10y: 1.44,
    sp500: 3973,
    nasdaq: 13247,
    gdpGrowthAnnualized: 6.3,
    unemploymentRate: 6.2,
    cpiYoY: 1.7,
    vcFundingIndex: 180,
    ipoCount: 100,
    isLive: false,
  },
  {
    year: 2021,
    quarter: 2,
    fedFundsRate: 0.06,
    treasury10y: 1.45,
    sp500: 4298,
    nasdaq: 14504,
    gdpGrowthAnnualized: 7.0,
    unemploymentRate: 5.9,
    cpiYoY: 4.8,
    vcFundingIndex: 220,
    ipoCount: 110,
    isLive: false,
  },
  {
    year: 2021,
    quarter: 3,
    fedFundsRate: 0.08,
    treasury10y: 1.37,
    sp500: 4307,
    nasdaq: 14448,
    gdpGrowthAnnualized: 2.7,
    unemploymentRate: 5.1,
    cpiYoY: 5.3,
    vcFundingIndex: 250,
    ipoCount: 85,
    isLive: false,
  },
  {
    year: 2021,
    quarter: 4,
    fedFundsRate: 0.08,
    treasury10y: 1.52,
    sp500: 4766,
    nasdaq: 15645,
    gdpGrowthAnnualized: 7.0,
    unemploymentRate: 4.2,
    cpiYoY: 6.7,
    vcFundingIndex: 280,
    ipoCount: 90,
    isLive: false,
  },

  // 2022 — Rate hike reckoning
  {
    year: 2022,
    quarter: 1,
    fedFundsRate: 0.2,
    treasury10y: 2.14,
    sp500: 4530,
    nasdaq: 14221,
    gdpGrowthAnnualized: -1.6,
    unemploymentRate: 3.8,
    cpiYoY: 8.0,
    vcFundingIndex: 180,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2022,
    quarter: 2,
    fedFundsRate: 0.77,
    treasury10y: 2.93,
    sp500: 3785,
    nasdaq: 11028,
    gdpGrowthAnnualized: -0.6,
    unemploymentRate: 3.6,
    cpiYoY: 8.6,
    vcFundingIndex: 130,
    ipoCount: 15,
    isLive: false,
  },
  {
    year: 2022,
    quarter: 3,
    fedFundsRate: 2.12,
    treasury10y: 3.26,
    sp500: 3586,
    nasdaq: 10572,
    gdpGrowthAnnualized: 2.7,
    unemploymentRate: 3.5,
    cpiYoY: 8.3,
    vcFundingIndex: 95,
    ipoCount: 10,
    isLive: false,
  },
  {
    year: 2022,
    quarter: 4,
    fedFundsRate: 3.65,
    treasury10y: 3.88,
    sp500: 3840,
    nasdaq: 10466,
    gdpGrowthAnnualized: 2.6,
    unemploymentRate: 3.5,
    cpiYoY: 7.1,
    vcFundingIndex: 70,
    ipoCount: 8,
    isLive: false,
  },

  // 2023 — SVB collapse + AI boom begins
  {
    year: 2023,
    quarter: 1,
    fedFundsRate: 4.57,
    treasury10y: 3.66,
    sp500: 4109,
    nasdaq: 12222,
    gdpGrowthAnnualized: 2.2,
    unemploymentRate: 3.5,
    cpiYoY: 5.8,
    vcFundingIndex: 55,
    ipoCount: 12,
    isLive: false,
  },
  {
    year: 2023,
    quarter: 2,
    fedFundsRate: 5.08,
    treasury10y: 3.81,
    sp500: 4450,
    nasdaq: 13788,
    gdpGrowthAnnualized: 2.1,
    unemploymentRate: 3.6,
    cpiYoY: 4.0,
    vcFundingIndex: 58,
    ipoCount: 18,
    isLive: false,
  },
  {
    year: 2023,
    quarter: 3,
    fedFundsRate: 5.33,
    treasury10y: 4.44,
    sp500: 4288,
    nasdaq: 13219,
    gdpGrowthAnnualized: 4.9,
    unemploymentRate: 3.8,
    cpiYoY: 3.7,
    vcFundingIndex: 62,
    ipoCount: 22,
    isLive: false,
  },
  {
    year: 2023,
    quarter: 4,
    fedFundsRate: 5.33,
    treasury10y: 4.59,
    sp500: 4770,
    nasdaq: 15011,
    gdpGrowthAnnualized: 3.2,
    unemploymentRate: 3.7,
    cpiYoY: 3.4,
    vcFundingIndex: 68,
    ipoCount: 28,
    isLive: false,
  },

  // 2024 — AI momentum + rate cut expectations
  {
    year: 2024,
    quarter: 1,
    fedFundsRate: 5.33,
    treasury10y: 4.2,
    sp500: 5254,
    nasdaq: 16379,
    gdpGrowthAnnualized: 1.4,
    unemploymentRate: 3.8,
    cpiYoY: 3.5,
    vcFundingIndex: 72,
    ipoCount: 30,
    isLive: false,
  },
  {
    year: 2024,
    quarter: 2,
    fedFundsRate: 5.33,
    treasury10y: 4.36,
    sp500: 5460,
    nasdaq: 17133,
    gdpGrowthAnnualized: 3.0,
    unemploymentRate: 4.0,
    cpiYoY: 3.3,
    vcFundingIndex: 78,
    ipoCount: 35,
    isLive: false,
  },
  {
    year: 2024,
    quarter: 3,
    fedFundsRate: 5.12,
    treasury10y: 3.81,
    sp500: 5762,
    nasdaq: 18189,
    gdpGrowthAnnualized: 3.1,
    unemploymentRate: 4.2,
    cpiYoY: 2.4,
    vcFundingIndex: 85,
    ipoCount: 40,
    isLive: false,
  },
  {
    year: 2024,
    quarter: 4,
    fedFundsRate: 4.58,
    treasury10y: 4.25,
    sp500: 5881,
    nasdaq: 19310,
    gdpGrowthAnnualized: 2.3,
    unemploymentRate: 4.2,
    cpiYoY: 2.7,
    vcFundingIndex: 90,
    ipoCount: 42,
    isLive: false,
  },

  // 2025 — Latest available (partial)
  {
    year: 2025,
    quarter: 1,
    fedFundsRate: 4.33,
    treasury10y: 4.3,
    sp500: 5950,
    nasdaq: 19500,
    gdpGrowthAnnualized: 2.0,
    unemploymentRate: 4.1,
    cpiYoY: 2.8,
    vcFundingIndex: 92,
    ipoCount: 35,
    isLive: false,
  },
];

// ============ FRED API CLIENT ============

const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";

const FRED_SERIES = {
  fedFundsRate: "FEDFUNDS",
  treasury10y: "DGS10",
  sp500: "SP500",
  nasdaq: "NASDAQCOM",
  unemploymentRate: "UNRATE",
  cpiYoY: "CPIAUCSL", // We'll calculate YoY from this
  gdpGrowth: "A191RL1Q225SBEA",
} as const;

const CACHE_KEY = "vencap-fred-cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FredCache {
  timestamp: number;
  data: EconomicSnapshot;
}

function getFredApiKey(): string | null {
  try {
    return import.meta.env.VITE_FRED_API_KEY || null;
  } catch {
    return null;
  }
}

async function fetchFredSeries(
  seriesId: string,
  apiKey: string,
): Promise<number | null> {
  try {
    const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const observations = data.observations;
    if (!observations || observations.length === 0) return null;
    const value = parseFloat(observations[0].value);
    return isNaN(value) ? null : value;
  } catch {
    return null;
  }
}

async function fetchFredCpiYoY(apiKey: string): Promise<number | null> {
  try {
    const url = `${FRED_BASE_URL}?series_id=CPIAUCSL&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13&frequency=m`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const obs = data.observations;
    if (!obs || obs.length < 13) return null;
    const latest = parseFloat(obs[0].value);
    const yearAgo = parseFloat(obs[12].value);
    if (isNaN(latest) || isNaN(yearAgo) || yearAgo === 0) return null;
    return parseFloat((((latest - yearAgo) / yearAgo) * 100).toFixed(1));
  } catch {
    return null;
  }
}

function getCachedLiveData(): EconomicSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: FredCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) return null;
    return cache.data;
  } catch {
    return null;
  }
}

function setCachedLiveData(data: EconomicSnapshot): void {
  try {
    const cache: FredCache = { timestamp: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Fetch live economic data from FRED API.
 * Returns cached data if available and fresh (< 24h old).
 * Returns null if no API key or all fetches fail.
 */
export async function fetchLiveEconomicData(): Promise<EconomicSnapshot | null> {
  // Check cache first
  const cached = getCachedLiveData();
  if (cached) return cached;

  const apiKey = getFredApiKey();
  if (!apiKey || apiKey === "your_fred_api_key_here") return null;

  // Fetch all series in parallel
  const [
    fedFunds,
    treasury10y,
    sp500,
    nasdaq,
    unemployment,
    gdpGrowth,
    cpiYoY,
  ] = await Promise.all([
    fetchFredSeries(FRED_SERIES.fedFundsRate, apiKey),
    fetchFredSeries(FRED_SERIES.treasury10y, apiKey),
    fetchFredSeries(FRED_SERIES.sp500, apiKey),
    fetchFredSeries(FRED_SERIES.nasdaq, apiKey),
    fetchFredSeries(FRED_SERIES.unemploymentRate, apiKey),
    fetchFredSeries(FRED_SERIES.gdpGrowth, apiKey),
    fetchFredCpiYoY(apiKey),
  ]);

  // Need at least some core data to be useful
  if (fedFunds === null && sp500 === null) return null;

  const now = new Date();
  const fallback = getLatestHistoricalSnapshot();

  const snapshot: EconomicSnapshot = {
    year: now.getFullYear(),
    quarter: Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4,
    fedFundsRate: fedFunds ?? fallback.fedFundsRate,
    treasury10y: treasury10y ?? fallback.treasury10y,
    sp500: sp500 ?? fallback.sp500,
    nasdaq: nasdaq ?? fallback.nasdaq,
    gdpGrowthAnnualized: gdpGrowth ?? fallback.gdpGrowthAnnualized,
    unemploymentRate: unemployment ?? fallback.unemploymentRate,
    cpiYoY: cpiYoY ?? fallback.cpiYoY,
    vcFundingIndex: fallback.vcFundingIndex, // No free API for this
    ipoCount: fallback.ipoCount, // No free API for this
    isLive: true,
  };

  setCachedLiveData(snapshot);
  return snapshot;
}

// ============ DATA ACCESS HELPERS ============

/**
 * Get the historical snapshot for a specific year and quarter.
 * Returns the closest available snapshot if exact match not found.
 */
export function getHistoricalSnapshot(
  year: number,
  quarter: number,
): EconomicSnapshot {
  const exact = HISTORICAL_DATA.find(
    (d) => d.year === year && d.quarter === quarter,
  );
  if (exact) return exact;

  // Find closest
  const targetIndex = year * 4 + quarter;
  let closest = HISTORICAL_DATA[0];
  let closestDiff = Infinity;
  for (const d of HISTORICAL_DATA) {
    const diff = Math.abs(d.year * 4 + d.quarter - targetIndex);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = d;
    }
  }
  return closest;
}

/**
 * Get the snapshot for a game month within an era.
 * Game months 0-119 map to real quarters starting from the era's start date.
 */
export function getSnapshotForGameMonth(
  era: MarketEra,
  gameMonth: number,
): EconomicSnapshot {
  const eraDef = ERA_DEFINITIONS.find((e) => e.id === era);
  if (!eraDef) return getLatestHistoricalSnapshot();

  const quarterOffset = Math.floor(gameMonth / 3);
  const startQuarterIndex = eraDef.startYear * 4 + eraDef.startQuarter - 1;
  const targetQuarterIndex = startQuarterIndex + quarterOffset;
  const targetYear = Math.floor(targetQuarterIndex / 4);
  const targetQuarter = (targetQuarterIndex % 4) + 1;

  return getHistoricalSnapshot(targetYear, targetQuarter);
}

/**
 * Get the most recent historical snapshot.
 */
export function getLatestHistoricalSnapshot(): EconomicSnapshot {
  return HISTORICAL_DATA[HISTORICAL_DATA.length - 1];
}

/**
 * Get all snapshots for a specific era's 10-year span.
 */
export function getEraSnapshots(era: MarketEra): EconomicSnapshot[] {
  const eraDef = ERA_DEFINITIONS.find((e) => e.id === era);
  if (!eraDef) return [];

  const snapshots: EconomicSnapshot[] = [];
  for (let month = 0; month < 120; month += 3) {
    snapshots.push(getSnapshotForGameMonth(era, month));
  }
  return snapshots;
}

/**
 * Get all available era definitions (excluding 'custom').
 */
export function getAvailableEras(): EraDefinition[] {
  return ERA_DEFINITIONS.filter((e) => e.id !== "custom");
}

/**
 * Check if FRED API key is configured.
 */
export function isFredApiKeyConfigured(): boolean {
  const key = getFredApiKey();
  return key !== null && key !== "your_fred_api_key_here" && key.length > 0;
}
