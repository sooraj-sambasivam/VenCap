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
} from "./types";

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
    items.push({
      category: "portfolio",
      description: `${exit.name} exited at ${multiple.toFixed(1)}x via ${exit.exitData?.acquirerName ?? "acquisition"}`,
      impact:
        multiple >= 2 ? "positive" : multiple >= 1 ? "neutral" : "negative",
      delta: multiple,
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
    });
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
    });
  }

  return { month, items };
}
