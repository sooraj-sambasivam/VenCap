// ============================================================
// VenCap — Simulated LLM Report Generator
// Async generators that produce report text in streaming chunks.
// No real LLM — synthesizes context-aware prose from game state.
// ============================================================

import type {
  Fund,
  PortfolioCompany,
  LPSentiment,
  MarketCycle,
  ReportRequest,
} from "./types";
import {
  formatCurrency,
  formatMultiple,
  formatPercent,
  pickRandom,
} from "@/lib/utils";

// ---------- public API ----------

export interface ReportContext {
  fund: Fund;
  portfolio: PortfolioCompany[];
  lpSentiment: LPSentiment;
  marketCycle: MarketCycle;
}

/**
 * Async generator that yields chunks of report text, simulating streaming.
 * Each chunk is 1–4 words with a small random delay (15-80ms) to look natural.
 */
export async function* streamReport(
  request: ReportRequest,
  ctx: ReportContext,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const fullText = buildReport(request, ctx);
  const words = fullText.split(" ");

  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;

    // Yield 1-3 words at a time for natural pacing
    const chunkSize = Math.min(
      1 + Math.floor(Math.random() * 3),
      words.length - i,
    );
    const chunk = words.slice(i, i + chunkSize).join(" ");
    i += chunkSize - 1; // -1 because the for loop also increments

    yield (i === 0 ? "" : " ") + chunk;

    // Simulate typing delay — shorter for middle words, longer at punctuation
    const isPunctuation = /[.!?,;:]$/.test(chunk);
    const delay = isPunctuation
      ? 40 + Math.random() * 80
      : 15 + Math.random() * 40;
    await sleep(delay, signal);
  }
}

/**
 * Returns the full report text synchronously (for testing / non-streaming use).
 */
export function buildReport(
  request: ReportRequest,
  ctx: ReportContext,
): string {
  switch (request.type) {
    case "portfolio_summary":
      return buildPortfolioSummary(ctx);
    case "deal_memo":
      return buildDealMemo(request, ctx);
    case "lp_update":
      return buildLPUpdate(ctx);
    case "market_analysis":
      return buildMarketAnalysis(request, ctx);
    default:
      return "Unknown report type.";
  }
}

// ---------- report builders ----------

function buildPortfolioSummary(ctx: ReportContext): string {
  const { fund, portfolio, marketCycle } = ctx;
  const active = portfolio.filter((c) => c.status === "active");
  const exited = portfolio.filter((c) => c.status === "exited");
  const failed = portfolio.filter((c) => c.status === "failed");

  const totalValue = active.reduce(
    (sum, c) => sum + c.currentValuation * (c.ownership / 100),
    0,
  );
  const exitProceeds = exited.reduce(
    (sum, c) => sum + (c.exitData?.exitValue ?? 0) * (c.ownership / 100),
    0,
  );

  // Best performer
  const topCompany = [...active].sort((a, b) => b.multiple - a.multiple)[0];

  // Worst active
  const worstCompany = [...active].sort((a, b) => a.multiple - b.multiple)[0];

  // Sector breakdown
  const sectors = new Map<string, number>();
  for (const c of active) {
    sectors.set(c.sector, (sectors.get(c.sector) ?? 0) + 1);
  }
  const topSectors = [...sectors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const lines: string[] = [];

  lines.push(`# Portfolio Summary — ${fund.name}`);
  lines.push("");
  lines.push(`## Overview`);
  lines.push("");
  lines.push(
    `As of Month ${fund.currentMonth}, the fund manages a portfolio of ${active.length} active companies across ${sectors.size} sectors. ` +
      `Total fund size is ${formatCurrency(fund.currentSize)} with ${formatCurrency(fund.deployed)} deployed (${formatPercent((fund.deployed / fund.currentSize) * 100)} deployment rate). ` +
      `The market is currently in a **${marketCycle}** cycle.`,
  );
  lines.push("");
  lines.push(
    `Current TVPI stands at **${formatMultiple(fund.tvpiEstimate)}** with an estimated IRR of **${formatPercent(fund.irrEstimate * 100)}**.`,
  );

  lines.push("");
  lines.push(`## Portfolio Composition`);
  lines.push("");
  lines.push(`- **Active investments:** ${active.length}`);
  lines.push(
    `- **Realized exits:** ${exited.length} (${formatCurrency(exitProceeds)} in proceeds)`,
  );
  lines.push(`- **Write-offs:** ${failed.length}`);
  lines.push(`- **Unrealized value:** ${formatCurrency(totalValue)}`);
  lines.push(`- **Cash available:** ${formatCurrency(fund.cashAvailable)}`);

  if (topSectors.length > 0) {
    lines.push("");
    lines.push(
      "**Sector concentration:** " +
        topSectors.map(([s, n]) => `${s} (${n})`).join(", ") +
        ".",
    );
  }

  if (topCompany) {
    lines.push("");
    lines.push(`## Top Performer`);
    lines.push("");
    lines.push(
      `**${topCompany.name}** (${topCompany.sector}) leads the portfolio at **${formatMultiple(topCompany.multiple)}** MOIC. ` +
        `Current valuation is ${formatCurrency(topCompany.currentValuation)} with ${formatCurrency(topCompany.metrics.mrr)} MRR ` +
        `and ${formatPercent(topCompany.metrics.growthRate * 100)} monthly growth. ` +
        `PMF score: ${topCompany.pmfScore}/100.`,
    );
  }

  if (worstCompany && worstCompany.id !== topCompany?.id) {
    lines.push("");
    lines.push(`## Watch List`);
    lines.push("");
    lines.push(
      `**${worstCompany.name}** (${worstCompany.sector}) requires attention at **${formatMultiple(worstCompany.multiple)}** MOIC. ` +
        `Runway: ${worstCompany.metrics.runway} months. Burn rate: ${formatCurrency(worstCompany.metrics.burnRate)}/mo. ` +
        `Founder state: ${worstCompany.founderState}.`,
    );
  }

  lines.push("");
  lines.push(`## Outlook`);
  lines.push("");
  lines.push(
    pickRandom([
      `The fund is well-positioned to capitalize on opportunities in the current ${marketCycle} market. We continue to focus on supporting our highest-conviction positions while maintaining prudent reserves for follow-on investments.`,
      `Portfolio dynamics remain favorable despite macro headwinds. Our deployment discipline and active portfolio management approach are yielding results, with several companies approaching significant value inflection points.`,
      `We see continued momentum across the portfolio, with particular strength in our earlier vintage investments that have had time to compound. The team remains focused on driving value creation across all active positions.`,
    ]),
  );

  return lines.join("\n");
}

function buildDealMemo(request: ReportRequest, ctx: ReportContext): string {
  const { fund, portfolio } = ctx;
  const company = portfolio.find((c) => c.id === request.companyId);

  if (!company) {
    return `# Deal Memo\n\nNo company found with the specified ID. Please select a portfolio company to generate a deal memo.`;
  }

  const monthsHeld = fund.currentMonth - company.monthInvested;
  const recentEvents = company.events.slice(-5);

  const lines: string[] = [];

  lines.push(`# Deal Memo — ${company.name}`);
  lines.push("");
  lines.push(`## Investment Thesis`);
  lines.push("");
  lines.push(
    `${company.name} is a ${company.stage.replace("_", " ")} stage company in the **${company.sector}** sector, ` +
      `based in ${company.region.replace("_", " ")}. The company was sourced via ${company.discoverySource.replace("_", " ")} ` +
      `and entered the portfolio at Month ${company.monthInvested}. ` +
      `We invested ${formatCurrency(company.investedAmount)} for ${formatPercent(company.ownership)} ownership ` +
      `at a ${formatCurrency(company.valuation)} pre-money valuation.`,
  );

  lines.push("");
  lines.push(`## Current Position (Month ${fund.currentMonth})`);
  lines.push("");
  lines.push(`- **Status:** ${company.status}`);
  lines.push(`- **Holding period:** ${monthsHeld} months`);
  lines.push(
    `- **Current valuation:** ${formatCurrency(company.currentValuation)}`,
  );
  lines.push(`- **MOIC:** ${formatMultiple(company.multiple)}`);
  lines.push(`- **Ownership:** ${formatPercent(company.ownership)}`);
  if (company.followOnInvested > 0) {
    lines.push(
      `- **Follow-on deployed:** ${formatCurrency(company.followOnInvested)}`,
    );
  }

  lines.push("");
  lines.push(`## Metrics Snapshot`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| MRR | ${formatCurrency(company.metrics.mrr)} |`);
  lines.push(
    `| Monthly Growth | ${formatPercent(company.metrics.growthRate * 100)} |`,
  );
  lines.push(`| Customers | ${company.metrics.customers} |`);
  lines.push(`| Churn | ${formatPercent(company.metrics.churn * 100)} |`);
  lines.push(`| Burn Rate | ${formatCurrency(company.metrics.burnRate)}/mo |`);
  lines.push(`| Runway | ${company.metrics.runway} months |`);
  lines.push(`| PMF Score | ${company.pmfScore}/100 |`);

  lines.push("");
  lines.push(`## Founder Assessment`);
  lines.push("");
  lines.push(
    `**${company.founderName}** — currently in a **${company.founderState}** state. ` +
      `Relationship score: ${company.relationship}/100. ` +
      `Traits: Grit ${company.founderTraits.grit}/10, Clarity ${company.founderTraits.clarity}/10, ` +
      `Charisma ${company.founderTraits.charisma}/10, Experience ${company.founderTraits.experience}/10.`,
  );

  if (company.strengths.length > 0) {
    lines.push("");
    lines.push(`## Strengths`);
    lines.push("");
    for (const s of company.strengths) {
      lines.push(`- ${s}`);
    }
  }

  if (company.risks.length > 0) {
    lines.push("");
    lines.push(`## Risks`);
    lines.push("");
    for (const r of company.risks) {
      lines.push(`- ${r}`);
    }
  }

  if (recentEvents.length > 0) {
    lines.push("");
    lines.push(`## Recent Events`);
    lines.push("");
    for (const ev of recentEvents) {
      const icon =
        ev.sentiment === "positive"
          ? "+"
          : ev.sentiment === "negative"
            ? "−"
            : "•";
      lines.push(
        `${icon} **${ev.title}** (Month ${ev.month}) — ${ev.description}`,
      );
    }
  }

  lines.push("");
  lines.push(`## Recommendation`);
  lines.push("");

  if (company.multiple >= 3 && company.pmfScore >= 70) {
    lines.push(
      `This is a **strong performer**. Consider follow-on investment to maximize ownership in what appears to be a breakout company. Monitor exit timing carefully.`,
    );
  } else if (company.multiple >= 1.5) {
    lines.push(
      `The position is **developing well**. Continue active portfolio support and evaluate follow-on opportunities at the next milestone. Key focus areas: ${company.risks[0] ?? "maintaining growth trajectory"}.`,
    );
  } else if (company.metrics.runway > 12) {
    lines.push(
      `Performance is **below thesis** but the company has adequate runway. Increase founder engagement and review strategic options. The board should discuss operational adjustments at the next meeting.`,
    );
  } else {
    lines.push(
      `Position is **at risk** with limited runway and below-thesis performance. Recommend urgent board discussion on strategic options including potential pivot, bridge financing, or managed wind-down. Preserve capital where possible.`,
    );
  }

  return lines.join("\n");
}

function buildLPUpdate(ctx: ReportContext): string {
  const { fund, portfolio, lpSentiment, marketCycle } = ctx;
  const active = portfolio.filter((c) => c.status === "active");
  const exited = portfolio.filter((c) => c.status === "exited");
  const failed = portfolio.filter((c) => c.status === "failed");
  const quarter = Math.ceil((fund.currentMonth % 12 || 12) / 3);
  const year = Math.floor(fund.currentMonth / 12) + 1;

  const lines: string[] = [];

  lines.push(`# LP Quarterly Update — ${fund.name}`);
  lines.push(`**Year ${year}, Q${quarter}**`);
  lines.push("");
  lines.push(`Dear Limited Partners,`);
  lines.push("");
  lines.push(
    `We are pleased to provide this quarterly update on the fund's progress. ` +
      `As of Month ${fund.currentMonth}, the fund has deployed ${formatCurrency(fund.deployed)} ` +
      `across ${active.length + exited.length + failed.length} investments, ` +
      `maintaining ${formatCurrency(fund.cashAvailable)} in reserves.`,
  );

  lines.push("");
  lines.push(`## Key Metrics`);
  lines.push("");
  lines.push(`- **Net TVPI:** ${formatMultiple(fund.tvpiEstimate)}`);
  lines.push(`- **Estimated IRR:** ${formatPercent(fund.irrEstimate * 100)}`);
  lines.push(`- **Active positions:** ${active.length}`);
  lines.push(`- **Exits to date:** ${exited.length}`);
  lines.push(`- **Write-offs:** ${failed.length}`);
  lines.push(
    `- **Management fees charged:** ${formatCurrency(fund.totalFeesCharged ?? 0)}`,
  );
  lines.push(`- **Carry accrued:** ${formatCurrency(fund.carryAccrued ?? 0)}`);

  // Highlight top 3 companies
  const topThree = [...active]
    .sort((a, b) => b.multiple - a.multiple)
    .slice(0, 3);
  if (topThree.length > 0) {
    lines.push("");
    lines.push(`## Portfolio Highlights`);
    lines.push("");
    for (const c of topThree) {
      lines.push(
        `**${c.name}** (${c.sector}): ${formatMultiple(c.multiple)} MOIC, ` +
          `${formatCurrency(c.metrics.mrr)} MRR, ${c.metrics.customers} customers. ` +
          `${c.pmfScore >= 70 ? "Strong product-market fit." : c.pmfScore >= 40 ? "PMF developing." : "Pre-PMF."}`,
      );
    }
  }

  // Recent exits
  const recentExits = exited.filter(
    (c) => c.exitData && fund.currentMonth - (c.exitData.month ?? 0) <= 3,
  );
  if (recentExits.length > 0) {
    lines.push("");
    lines.push(`## Recent Exits`);
    lines.push("");
    for (const c of recentExits) {
      lines.push(
        `**${c.name}** — Acquired by ${c.exitData!.acquirerName} at ${formatMultiple(c.multiple)} MOIC. ` +
          `Proceeds: ${formatCurrency((c.exitData!.exitValue ?? 0) * (c.ownership / 100))}.`,
      );
    }
  }

  lines.push("");
  lines.push(`## Market Environment`);
  lines.push("");
  lines.push(
    `The market is currently in a **${marketCycle}** cycle. ` +
      pickRandom([
        `We are seeing pricing discipline return to the market, which creates opportunities for well-positioned funds.`,
        `Deal flow quality has been strong this quarter, with several companies showing exceptional traction.`,
        `We continue to take a measured approach to new deployments while focusing on supporting existing portfolio companies.`,
        `Macro conditions are creating both risks and opportunities, and we are actively adjusting our strategy accordingly.`,
      ]),
  );

  lines.push("");
  lines.push(`## LP Sentiment & Communication`);
  lines.push("");
  lines.push(
    `Current LP satisfaction score: **${Math.round(lpSentiment.score)}/100** (${lpSentiment.level}). ` +
      pickRandom([
        `We value your continued trust and partnership.`,
        `As always, we welcome the opportunity to discuss any questions about the portfolio.`,
        `We remain committed to transparency and regular communication with our LP base.`,
      ]),
  );

  lines.push("");
  lines.push(
    `*This report is confidential and intended solely for the Limited Partners of ${fund.name}.*`,
  );

  return lines.join("\n");
}

function buildMarketAnalysis(
  request: ReportRequest,
  ctx: ReportContext,
): string {
  const { fund, portfolio, marketCycle } = ctx;
  const targetSector = request.sector ?? "General";

  const sectorCompanies = request.sector
    ? portfolio.filter((c) => c.sector === request.sector)
    : portfolio;

  const activeSector = sectorCompanies.filter((c) => c.status === "active");
  const avgMultiple =
    activeSector.length > 0
      ? activeSector.reduce((s, c) => s + c.multiple, 0) / activeSector.length
      : 0;

  // All sectors in portfolio
  const allSectors = new Set(portfolio.map((c) => c.sector));

  const lines: string[] = [];

  lines.push(`# Market Analysis — ${targetSector}`);
  lines.push("");
  lines.push(`## Current Conditions`);
  lines.push("");
  lines.push(
    `The venture market is operating in a **${marketCycle}** cycle. ` +
      getMarketCommentary(marketCycle),
  );

  if (request.sector && activeSector.length > 0) {
    lines.push("");
    lines.push(`## Sector Performance: ${request.sector}`);
    lines.push("");
    lines.push(
      `The fund holds **${activeSector.length}** active positions in ${request.sector}. ` +
        `Average portfolio MOIC in this sector: **${formatMultiple(avgMultiple)}**. ` +
        getSectorOutlook(request.sector, avgMultiple),
    );

    lines.push("");
    lines.push("**Positions:**");
    for (const c of activeSector) {
      lines.push(
        `- ${c.name}: ${formatMultiple(c.multiple)} MOIC, ${formatCurrency(c.metrics.mrr)} MRR, ` +
          `${c.metrics.runway}mo runway`,
      );
    }
  }

  lines.push("");
  lines.push(`## Portfolio Sector Exposure`);
  lines.push("");

  const sectorCounts = new Map<string, { active: number; total: number }>();
  for (const c of portfolio) {
    const entry = sectorCounts.get(c.sector) ?? { active: 0, total: 0 };
    entry.total++;
    if (c.status === "active") entry.active++;
    sectorCounts.set(c.sector, entry);
  }

  lines.push(`| Sector | Active | Total |`);
  lines.push(`|--------|--------|-------|`);
  for (const [sector, counts] of [...sectorCounts.entries()].sort(
    (a, b) => b[1].total - a[1].total,
  )) {
    lines.push(`| ${sector} | ${counts.active} | ${counts.total} |`);
  }

  lines.push("");
  lines.push(`## Deployment Outlook`);
  lines.push("");
  const deployPct = fund.deployed / fund.currentSize;
  const monthsRemaining = 120 - fund.currentMonth;

  lines.push(
    `The fund has deployed **${formatPercent(deployPct * 100)}** of committed capital ` +
      `with ${monthsRemaining} months remaining in the fund lifecycle. ` +
      `Available reserves: ${formatCurrency(fund.cashAvailable)}.`,
  );
  lines.push("");

  if (deployPct < 0.4 && fund.currentMonth > 36) {
    lines.push(
      `⚠️ Deployment pace is **below target** for the fund's lifecycle stage. Consider accelerating deal flow and expanding sector coverage to ensure full deployment.`,
    );
  } else if (deployPct > 0.8 && monthsRemaining > 48) {
    lines.push(
      `⚠️ The fund is **heavily deployed** with significant runway remaining. Maintain adequate reserves for follow-on investments and consider selective secondary sales to recycle capital.`,
    );
  } else {
    lines.push(
      `The deployment pace is **on track** relative to fund lifecycle. Maintain current cadence while reserving capital for follow-on opportunities in top performers.`,
    );
  }

  lines.push("");
  lines.push(
    `*Analysis generated based on fund data as of Month ${fund.currentMonth}. ` +
      `Sector coverage: ${allSectors.size} sectors across ${portfolio.length} total investments.*`,
  );

  return lines.join("\n");
}

// ---------- helpers ----------

function getMarketCommentary(cycle: MarketCycle): string {
  switch (cycle) {
    case "bull":
      return "Valuations are elevated and deal flow is robust. Competition for high-quality deals is intensifying. Exercise caution on entry multiples and maintain pricing discipline.";
    case "normal":
      return "Market conditions are balanced, with healthy deal flow and reasonable valuations. This environment is conducive to disciplined deployment and portfolio building.";
    case "cooldown":
      return "The market is cooling, with declining valuations and cautious investor sentiment. This creates opportunities for value-conscious investors who can deploy during downturns.";
    case "hard":
      return "The market is under significant stress. Fundraising is challenging, mark-downs are common, and portfolio company cash management is critical. Focus on survival and selective opportunistic deployment.";
  }
}

function getSectorOutlook(_sector: string, avgMultiple: number): string {
  if (avgMultiple >= 2.5) {
    return `The sector is delivering **strong returns** for the fund. Competitive dynamics favor continued investment in proven winners.`;
  }
  if (avgMultiple >= 1.5) {
    return `Sector performance is **healthy** with room for upside. Several positions are approaching inflection points.`;
  }
  if (avgMultiple >= 1) {
    return `Returns are **modest** but within normal ranges for the sector maturity. Focus on operational improvements and milestone acceleration.`;
  }
  return `The sector is **underperforming** relative to fund targets. Review thesis validity and consider strategic adjustments.`;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
