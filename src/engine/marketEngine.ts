// ============================================================
// VenCap — Market Engine
// Maps real economic data to game modifiers.
// Pure functions only. No side effects.
// ============================================================

import type { EconomicSnapshot, MarketConditions } from './types';

// ============ REFERENCE BASELINES ============
// "Normal" economic conditions (roughly 2017-2019 averages)
// Modifiers are centered on 1.0 when conditions match these baselines

const BASELINE = {
  fedFundsRate: 2.0,        // Fed funds rate considered "neutral"
  treasury10y: 2.5,          // 10y yield considered "normal"
  sp500: 3000,               // S&P 500 reference level
  nasdaq: 8000,              // NASDAQ reference level
  gdpGrowth: 2.5,            // Normal GDP growth
  unemployment: 4.5,         // Natural rate of unemployment
  cpiYoY: 2.0,               // Fed's inflation target
  vcFundingIndex: 100,       // Baseline VC activity
};

// ============ SECTOR HEAT MAP ============
// How different economic conditions affect different sectors
// Key insight: rate-sensitive sectors (fintech, proptech) suffer more in high-rate environments
// Recession-proof sectors (healthtech, cybersecurity) are more defensive

const SECTOR_RATE_SENSITIVITY: Record<string, number> = {
  SaaS: 0.7,           // Moderate rate sensitivity
  Fintech: 1.2,        // Very rate-sensitive (credit, lending)
  HealthTech: 0.3,     // Defensive, low sensitivity
  DevTools: 0.5,       // Moderate
  Marketplace: 0.9,    // Consumer spending matters
  Consumer: 1.0,       // Directly rate-sensitive
  CleanTech: 1.1,      // Capital-intensive, rate-sensitive
  EdTech: 0.4,         // Counter-cyclical (recession = more education)
  Cybersecurity: 0.2,  // Defensive, always needed
  DeepTech: 0.8,       // Long-horizon, somewhat sensitive
  Biotech: 0.6,        // Long-horizon but less rate-dependent
  SpaceTech: 0.9,      // Capital-intensive
  AgTech: 0.4,         // Essential sector, defensive
  PropTech: 1.3,       // Very rate-sensitive (real estate)
};

const SECTOR_GROWTH_SENSITIVITY: Record<string, number> = {
  SaaS: 0.8,
  Fintech: 1.0,
  HealthTech: 0.4,
  DevTools: 0.7,
  Marketplace: 1.1,
  Consumer: 1.2,
  CleanTech: 0.6,
  EdTech: -0.3,        // Counter-cyclical
  Cybersecurity: 0.3,
  DeepTech: 0.5,
  Biotech: 0.3,
  SpaceTech: 0.5,
  AgTech: 0.3,
  PropTech: 1.0,
};

// ============ CORE CALCULATION ============

/**
 * Calculate game modifiers from an economic snapshot.
 * All modifiers are centered on 1.0 (or 0 for additive ones).
 * This is the main function that drives the real-economy → game-mechanics bridge.
 */
export function calculateMarketConditions(snapshot: EconomicSnapshot): MarketConditions {
  // --- Interest Rate Effects ---
  // Higher rates → lower valuations, tighter exits
  const rateDeviation = snapshot.fedFundsRate - BASELINE.fedFundsRate;
  const rateFactor = Math.max(0.5, Math.min(1.5, 1.0 - rateDeviation * 0.08));

  // --- Public Market Effects ---
  // S&P and NASDAQ performance affect exit windows and sentiment
  const sp500Ratio = snapshot.sp500 / BASELINE.sp500;
  const nasdaqRatio = snapshot.nasdaq / BASELINE.nasdaq;
  const publicMarketFactor = (sp500Ratio * 0.4 + nasdaqRatio * 0.6); // Weight NASDAQ more (tech focus)
  const normalizedMarketFactor = Math.max(0.4, Math.min(2.0, publicMarketFactor));

  // --- GDP Effects ---
  const gdpDeviation = snapshot.gdpGrowthAnnualized - BASELINE.gdpGrowth;
  const gdpFactor = Math.max(0.7, Math.min(1.3, 1.0 + gdpDeviation * 0.05));

  // --- Unemployment Effects ---
  const unemploymentDeviation = snapshot.unemploymentRate - BASELINE.unemployment;
  const employmentFactor = Math.max(0.8, Math.min(1.2, 1.0 - unemploymentDeviation * 0.03));

  // --- Inflation Effects ---
  const inflationDeviation = snapshot.cpiYoY - BASELINE.cpiYoY;
  const inflationPenalty = Math.max(0, inflationDeviation * 0.03); // Only penalize above target

  // --- VC Funding Environment ---
  const vcActivity = snapshot.vcFundingIndex / BASELINE.vcFundingIndex;

  // ============ COMPOSITE MODIFIERS ============

  // Valuation multiplier: rates, public markets, and VC competition all matter
  const valuationMultiplier = clamp(
    rateFactor * 0.35 + normalizedMarketFactor * 0.35 + vcActivity * 0.15 + gdpFactor * 0.15,
    0.5, 1.8
  );

  // Exit probability: public markets drive IPO/M&A windows
  const exitProbabilityMultiplier = clamp(
    normalizedMarketFactor * 0.5 + rateFactor * 0.25 + gdpFactor * 0.25,
    0.3, 2.0
  );

  // Fail rate: recession + high rates increase failures
  const failRateMultiplier = clamp(
    1.0 + (1.0 - gdpFactor) + (1.0 - rateFactor) * 0.5 + inflationPenalty,
    0.7, 1.5
  );

  // LP sentiment: driven by overall market health
  const lpSentimentModifier = clamp(
    (normalizedMarketFactor - 1.0) * 8 + (gdpFactor - 1.0) * 5 - inflationPenalty * 3,
    -15, 15
  );

  // Deal flow: VC funding environment drives pipeline
  const dealFlowMultiplier = clamp(
    vcActivity * 0.6 + gdpFactor * 0.2 + employmentFactor * 0.2,
    0.5, 1.5
  );

  // IPO window: open when markets are up and rates are reasonable
  const ipoWindowOpen = sp500Ratio > 0.85 && snapshot.fedFundsRate < 6.0 && snapshot.ipoCount > 15;

  // VC competition: how competitive the deal environment is (higher = more competition for deals)
  const vcCompetitionLevel = clamp(vcActivity * 0.7 + normalizedMarketFactor * 0.3, 0.5, 1.5);

  // Sector heat map
  const sectorHeatMap: Record<string, number> = {};
  for (const [sector, rateSens] of Object.entries(SECTOR_RATE_SENSITIVITY)) {
    const growthSens = SECTOR_GROWTH_SENSITIVITY[sector] || 0.5;
    const sectorMod = 1.0
      - rateDeviation * rateSens * 0.04        // Rate impact
      + gdpDeviation * growthSens * 0.03        // Growth impact
      + (normalizedMarketFactor - 1.0) * 0.15;  // Market sentiment
    sectorHeatMap[sector] = clamp(sectorMod, 0.5, 1.5);
  }

  // Generate narrative and educational insight
  const narrative = generateNarrative(snapshot);
  const educationalInsight = generateInsight(snapshot);

  return {
    valuationMultiplier,
    exitProbabilityMultiplier,
    failRateMultiplier,
    lpSentimentModifier,
    dealFlowMultiplier,
    ipoWindowOpen,
    vcCompetitionLevel,
    sectorHeatMap,
    narrative,
    educationalInsight,
  };
}

// ============ NARRATIVE GENERATION ============

function generateNarrative(snapshot: EconomicSnapshot): string {
  const parts: string[] = [];

  // Rate environment
  if (snapshot.fedFundsRate < 0.5) {
    parts.push('Zero interest rate policy is flooding the market with cheap capital.');
  } else if (snapshot.fedFundsRate < 2.0) {
    parts.push('Low interest rates are supporting startup valuations.');
  } else if (snapshot.fedFundsRate < 4.0) {
    parts.push('Moderate interest rates are creating a balanced funding environment.');
  } else if (snapshot.fedFundsRate < 5.5) {
    parts.push('High interest rates are compressing valuations and tightening exit windows.');
  } else {
    parts.push('Very high interest rates are creating a challenging environment for startups.');
  }

  // GDP
  if (snapshot.gdpGrowthAnnualized < -2) {
    parts.push('The economy is in recession.');
  } else if (snapshot.gdpGrowthAnnualized < 0) {
    parts.push('GDP is contracting — recessionary pressures are building.');
  } else if (snapshot.gdpGrowthAnnualized > 5) {
    parts.push('The economy is booming with strong growth.');
  } else if (snapshot.gdpGrowthAnnualized > 3) {
    parts.push('Solid economic growth is supporting business activity.');
  }

  // Inflation
  if (snapshot.cpiYoY > 6) {
    parts.push('Inflation is running hot, raising costs for startups and pressuring the Fed to keep rates high.');
  } else if (snapshot.cpiYoY > 4) {
    parts.push('Above-target inflation is a concern for investors.');
  } else if (snapshot.cpiYoY < 1) {
    parts.push('Low inflation gives the Fed room to cut rates.');
  }

  // Public markets
  if (snapshot.nasdaq > 15000) {
    parts.push('Tech stocks are at elevated levels, supporting exit valuations.');
  } else if (snapshot.nasdaq < 5000) {
    parts.push('Tech stocks are depressed, making exits difficult.');
  }

  // VC environment
  if (snapshot.vcFundingIndex > 200) {
    parts.push('VC funding is at record levels — deal competition is fierce.');
  } else if (snapshot.vcFundingIndex < 40) {
    parts.push('VC funding has dried up — good deals are available at lower valuations.');
  }

  return parts.join(' ');
}

function generateInsight(snapshot: EconomicSnapshot): string {
  // Pick the most educational aspect of the current environment
  if (snapshot.fedFundsRate > 5 && snapshot.cpiYoY > 4) {
    return 'When the Fed raises rates to fight inflation, startup valuations fall because future cash flows are worth less in present value. VCs get more cautious, and the IPO window narrows. This is when disciplined investors find the best deals — buying quality at lower prices.';
  }
  if (snapshot.fedFundsRate < 0.5) {
    return 'Zero interest rate policy (ZIRP) makes cash in the bank worth nothing, so investors pile into risky assets like startups. Valuations inflate, and VCs compete aggressively for deals. The danger: companies raising at sky-high valuations may struggle to grow into them.';
  }
  if (snapshot.gdpGrowthAnnualized < -5) {
    return 'During severe recessions, many startups fail — but some of the greatest companies were built in downturns (Airbnb, Uber, WhatsApp all started around 2008-2009). Lower competition for talent and cheaper office space can be advantages.';
  }
  if (snapshot.vcFundingIndex > 200) {
    return 'When VC funding hits record levels, competition for deals drives up valuations. As a fund manager, you face a dilemma: deploy capital at high prices or sit on dry powder and risk missing great companies. This dynamic is called the "deployment pressure" problem.';
  }
  if (snapshot.vcFundingIndex < 40) {
    return 'During VC funding droughts, only the strongest companies survive. This is often when the best vintage years are born — investing when others are fearful typically produces the highest returns. Warren Buffett\'s advice applies: "Be greedy when others are fearful."';
  }
  if (snapshot.ipoCount > 80) {
    return 'A hot IPO market gives VCs clear exit paths. But timing matters — some of the worst-performing IPOs happen at market peaks when companies rush to go public. The best exits often come from strategic M&A rather than IPOs.';
  }
  if (snapshot.unemploymentRate > 8) {
    return 'High unemployment is a double-edged sword for startups. It\'s easier to hire talented people, but consumer spending drops and B2B sales cycles lengthen. Smart VCs look for companies solving problems that matter more in tough times.';
  }
  return 'In venture capital, market timing matters less than people think. The best VCs consistently outperform across cycles by picking great founders, providing meaningful support, and maintaining discipline on valuations.';
}

// ============ COMPARISON HELPERS ============

/**
 * Compare two snapshots and describe what changed.
 * Used for month-to-month market update notifications.
 */
export function describeChanges(previous: EconomicSnapshot, current: EconomicSnapshot): string[] {
  const changes: string[] = [];

  const rateDiff = current.fedFundsRate - previous.fedFundsRate;
  if (Math.abs(rateDiff) > 0.2) {
    changes.push(rateDiff > 0
      ? `Fed raised rates to ${current.fedFundsRate.toFixed(2)}% (+${rateDiff.toFixed(2)}pp)`
      : `Fed cut rates to ${current.fedFundsRate.toFixed(2)}% (${rateDiff.toFixed(2)}pp)`);
  }

  const sp500Change = ((current.sp500 - previous.sp500) / previous.sp500) * 100;
  if (Math.abs(sp500Change) > 5) {
    changes.push(sp500Change > 0
      ? `S&P 500 up ${sp500Change.toFixed(1)}% to ${current.sp500.toLocaleString()}`
      : `S&P 500 down ${Math.abs(sp500Change).toFixed(1)}% to ${current.sp500.toLocaleString()}`);
  }

  const nasdaqChange = ((current.nasdaq - previous.nasdaq) / previous.nasdaq) * 100;
  if (Math.abs(nasdaqChange) > 7) {
    changes.push(nasdaqChange > 0
      ? `NASDAQ surged ${nasdaqChange.toFixed(1)}%`
      : `NASDAQ dropped ${Math.abs(nasdaqChange).toFixed(1)}%`);
  }

  if (current.gdpGrowthAnnualized < 0 && previous.gdpGrowthAnnualized >= 0) {
    changes.push('Economy entering recession — GDP growth turned negative');
  } else if (current.gdpGrowthAnnualized >= 0 && previous.gdpGrowthAnnualized < 0) {
    changes.push('Economy exiting recession — GDP growth turned positive');
  }

  const cpiDiff = current.cpiYoY - previous.cpiYoY;
  if (cpiDiff > 1.0) {
    changes.push(`Inflation accelerating: CPI at ${current.cpiYoY.toFixed(1)}% YoY`);
  } else if (cpiDiff < -1.0) {
    changes.push(`Inflation cooling: CPI at ${current.cpiYoY.toFixed(1)}% YoY`);
  }

  const unemploymentDiff = current.unemploymentRate - previous.unemploymentRate;
  if (unemploymentDiff > 0.5) {
    changes.push(`Unemployment rising to ${current.unemploymentRate.toFixed(1)}%`);
  } else if (unemploymentDiff < -0.5) {
    changes.push(`Unemployment falling to ${current.unemploymentRate.toFixed(1)}%`);
  }

  return changes;
}

/**
 * Get a severity assessment of the current market conditions.
 */
export function getMarketSeverity(conditions: MarketConditions): 'boom' | 'healthy' | 'neutral' | 'stressed' | 'crisis' {
  const score = conditions.valuationMultiplier * 0.3
    + conditions.exitProbabilityMultiplier * 0.3
    + (1.0 / conditions.failRateMultiplier) * 0.2
    + (conditions.lpSentimentModifier / 15 + 1) * 0.2;

  if (score > 1.3) return 'boom';
  if (score > 1.1) return 'healthy';
  if (score > 0.9) return 'neutral';
  if (score > 0.7) return 'stressed';
  return 'crisis';
}

// ============ UTILITIES ============

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
