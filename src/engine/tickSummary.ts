// ============================================================
// VenCap — Tick Summary Engine
// Generates a summary of what changed during advanceTime()
// Compare before/after snapshots to produce human-readable items
// ============================================================

import type {
  PortfolioCompany,
  MonthlySnapshot,
  TickSummary,
  TickSummaryItem,
  Fund,
  MarketCycle,
  FundStage,
  FollowOnOpportunity,
  SecondaryOffer,
  BuyoutOffer,
  Startup,
} from "./types";

// ============ HELPERS ============

const STAGE_LABELS: Record<FundStage, string> = {
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  growth: "Growth",
};

const STAGE_ORDER: Record<FundStage, number> = {
  pre_seed: 0,
  seed: 1,
  series_a: 2,
  growth: 3,
};

/** Optional extra state for richer summaries */
export interface TickSummaryExtras {
  prevDealPipeline?: Startup[];
  currDealPipeline?: Startup[];
  prevFollowOns?: FollowOnOpportunity[];
  currFollowOns?: FollowOnOpportunity[];
  prevSecondaryOffers?: SecondaryOffer[];
  currSecondaryOffers?: SecondaryOffer[];
  prevBuyoutOffers?: BuyoutOffer[];
  currBuyoutOffers?: BuyoutOffer[];
}

// ============ MAIN ============

export function generateTickSummary(
  month: number,
  prevSnapshot: MonthlySnapshot | null,
  currSnapshot: MonthlySnapshot,
  prevPortfolio: PortfolioCompany[],
  currPortfolio: PortfolioCompany[],
  prevCycle: MarketCycle,
  currCycle: MarketCycle,
  prevFund: Fund,
  currFund: Fund,
  extras?: TickSummaryExtras,
): TickSummary {
  const items: TickSummaryItem[] = [];

  // ---- Portfolio value change ----
  if (prevSnapshot) {
    const valueDelta =
      currSnapshot.totalPortfolioValue - prevSnapshot.totalPortfolioValue;
    if (Math.abs(valueDelta) > 100_000) {
      const pct =
        prevSnapshot.totalPortfolioValue > 0
          ? ((valueDelta / prevSnapshot.totalPortfolioValue) * 100).toFixed(1)
          : "0";
      items.push({
        category: "portfolio",
        description: `Portfolio value ${valueDelta > 0 ? "increased" : "decreased"} by $${(Math.abs(valueDelta) / 1_000_000).toFixed(1)}M (${valueDelta > 0 ? "+" : ""}${pct}%)`,
        impact: valueDelta > 0 ? "positive" : "negative",
        delta: valueDelta,
        cause: "Market conditions and company growth drove valuations",
      });
    }
  }

  // ---- New exits ----
  const prevExited = new Set(
    prevPortfolio.filter((c) => c.status === "exited").map((c) => c.id),
  );
  const newExits = currPortfolio.filter(
    (c) => c.status === "exited" && !prevExited.has(c.id),
  );
  for (const exit of newExits) {
    const multiple = exit.exitData?.exitMultiple ?? exit.multiple;
    const acquirerType = exit.exitData?.acquirerType;
    const causeReason =
      acquirerType === "acquihire"
        ? "Talent acquisition by larger company"
        : acquirerType === "pe"
          ? "Private equity buyout at target valuation"
          : "Company reached acquisition threshold";
    items.push({
      category: "portfolio",
      description: `${exit.name} exited at ${multiple.toFixed(1)}x via ${exit.exitData?.acquirerName ?? "acquisition"}`,
      impact:
        multiple >= 2 ? "positive" : multiple >= 1 ? "neutral" : "negative",
      delta: multiple,
      cause: causeReason,
    });
  }

  // ---- New failures ----
  const prevFailed = new Set(
    prevPortfolio.filter((c) => c.status === "failed").map((c) => c.id),
  );
  const newFailures = currPortfolio.filter(
    (c) => c.status === "failed" && !prevFailed.has(c.id),
  );
  for (const fail of newFailures) {
    items.push({
      category: "portfolio",
      description: `${fail.name} failed${fail.failureReason ? `: ${fail.failureReason}` : ""}`,
      impact: "negative",
      cause: fail.failureReason ?? "Runway exhausted or market downturn",
    });
  }

  // ---- Stage progressions ----
  const prevStageMap = new Map(
    prevPortfolio
      .filter((c) => c.status === "active")
      .map((c) => [c.id, c.stage]),
  );
  for (const co of currPortfolio) {
    if (co.status !== "active") continue;
    const prevStage = prevStageMap.get(co.id);
    if (
      prevStage &&
      prevStage !== co.stage &&
      STAGE_ORDER[co.stage] > STAGE_ORDER[prevStage]
    ) {
      items.push({
        category: "portfolio",
        description: `${co.name} advanced from ${STAGE_LABELS[prevStage]} to ${STAGE_LABELS[co.stage]}`,
        impact: "positive",
        cause: "Strong traction and growth metrics triggered stage progression",
      });
    }
  }

  // ---- TVPI change ----
  if (prevSnapshot) {
    const tvpiDelta = currSnapshot.tvpi - prevSnapshot.tvpi;
    if (Math.abs(tvpiDelta) >= 0.05) {
      items.push({
        category: "fund",
        description: `TVPI moved from ${prevSnapshot.tvpi.toFixed(2)}x to ${currSnapshot.tvpi.toFixed(2)}x`,
        impact: tvpiDelta > 0 ? "positive" : "negative",
        delta: tvpiDelta,
        cause:
          tvpiDelta > 0
            ? "Portfolio appreciation and realized gains"
            : "Markdowns or realized losses reduced fund value",
      });
    }
  }

  // ---- Market cycle change ----
  if (prevCycle !== currCycle) {
    items.push({
      category: "market",
      description: `Market shifted from ${prevCycle} to ${currCycle} cycle`,
      impact:
        currCycle === "bull"
          ? "positive"
          : currCycle === "hard"
            ? "negative"
            : "neutral",
      cause: "18-month cycle rotation driven by macro conditions",
    });
  }

  // ---- LP sentiment change ----
  if (prevSnapshot) {
    const lpDelta = currSnapshot.lpScore - prevSnapshot.lpScore;
    if (Math.abs(lpDelta) >= 3) {
      items.push({
        category: "lp",
        description: `LP sentiment ${lpDelta > 0 ? "improved" : "declined"} by ${Math.abs(Math.round(lpDelta))} points (now ${Math.round(currSnapshot.lpScore)})`,
        impact: lpDelta > 0 ? "positive" : "negative",
        delta: lpDelta,
        cause: "Periodic review based on fund performance and communication",
      });
    }
  }

  // ---- Cash position ----
  const cashDelta = currFund.cashAvailable - prevFund.cashAvailable;
  if (Math.abs(cashDelta) > 500_000) {
    items.push({
      category: "fund",
      description: `Cash ${cashDelta > 0 ? "increased" : "decreased"} by $${(Math.abs(cashDelta) / 1_000_000).toFixed(1)}M (now $${(currFund.cashAvailable / 1_000_000).toFixed(1)}M)`,
      impact:
        cashDelta > 0
          ? "positive"
          : currFund.cashAvailable < 1_000_000
            ? "negative"
            : "neutral",
      delta: cashDelta,
      cause:
        cashDelta > 0
          ? "Exit proceeds or distributions returned capital"
          : "Investments and fees reduced available capital",
    });
  }

  // ---- Management fee deducted ----
  const feesDelta = currFund.totalFeesCharged - prevFund.totalFeesCharged;
  if (feesDelta > 0) {
    items.push({
      category: "fund",
      description: `Management fee of $${(feesDelta / 1000).toFixed(0)}K deducted`,
      impact: "neutral",
      delta: -feesDelta,
      cause: "Monthly 2% annual fee deduction from committed capital",
    });
  }

  // ---- New deal pipeline opportunities ----
  if (extras?.prevDealPipeline && extras.currDealPipeline) {
    const prevIds = new Set(extras.prevDealPipeline.map((d) => d.id));
    const newDeals = extras.currDealPipeline.filter((d) => !prevIds.has(d.id));
    if (newDeals.length > 0) {
      items.push({
        category: "market",
        description: `${newDeals.length} new deal${newDeals.length > 1 ? "s" : ""} entered the pipeline`,
        impact: "positive",
        cause: "Market conditions generated new investment opportunities",
      });
    }
  }

  // ---- New follow-on opportunities ----
  if (extras?.prevFollowOns && extras.currFollowOns) {
    const prevIds = new Set(extras.prevFollowOns.map((f) => f.companyId));
    const newFollowOns = extras.currFollowOns.filter(
      (f) => !prevIds.has(f.companyId),
    );
    if (newFollowOns.length > 0) {
      items.push({
        category: "portfolio",
        description: `${newFollowOns.length} new follow-on opportunit${newFollowOns.length > 1 ? "ies" : "y"} available`,
        impact: "neutral",
        cause: "Portfolio companies raising new rounds",
      });
    }
  }

  // ---- New secondary offers ----
  if (extras?.prevSecondaryOffers && extras.currSecondaryOffers) {
    const prevIds = new Set(extras.prevSecondaryOffers.map((s) => s.id));
    const newSecondaries = extras.currSecondaryOffers.filter(
      (s) => !prevIds.has(s.id),
    );
    if (newSecondaries.length > 0) {
      items.push({
        category: "portfolio",
        description: `${newSecondaries.length} new secondary offer${newSecondaries.length > 1 ? "s" : ""} received`,
        impact: "neutral",
        cause: "Buyers interested in purchasing fund stakes",
      });
    }
  }

  // ---- New buyout offers ----
  if (extras?.prevBuyoutOffers && extras.currBuyoutOffers) {
    const prevIds = new Set(extras.prevBuyoutOffers.map((b) => b.id));
    const newBuyouts = extras.currBuyoutOffers.filter(
      (b) => !prevIds.has(b.id),
    );
    if (newBuyouts.length > 0) {
      items.push({
        category: "portfolio",
        description: `${newBuyouts.length} new buyout offer${newBuyouts.length > 1 ? "s" : ""} on the table`,
        impact: "neutral",
        cause: "Acquirers making offers for portfolio companies",
      });
    }
  }

  return { month, items };
}
