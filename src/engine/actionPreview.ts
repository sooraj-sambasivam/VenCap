// ============================================================
// VenCap — Action Preview Engine
// Generates predicted effects for player actions before execution
// ============================================================

import type {
  ActionPreview,
  ActionPreviewEffect,
  Fund,
  Startup,
  PortfolioCompany,
} from "./types";

/** Preview effects of investing in a startup */
export function previewInvest(
  fund: Fund,
  _startup: Startup,
  amount: number,
  ownership: number,
): ActionPreview {
  const effects: ActionPreviewEffect[] = [];

  effects.push({
    metric: "Cash Available",
    before: fund.cashAvailable,
    after: fund.cashAvailable - amount,
    direction: "down",
  });

  effects.push({
    metric: "Capital Deployed",
    before: fund.deployed,
    after: fund.deployed + amount,
    direction: "up",
  });

  const deploymentPct = ((fund.deployed + amount) / fund.currentSize) * 100;
  effects.push({
    metric: "Deployment %",
    before: (fund.deployed / fund.currentSize) * 100,
    after: deploymentPct,
    direction: "up",
  });

  effects.push({
    metric: "Ownership",
    before: 0,
    after: ownership,
    direction: "up",
  });

  return { actionType: "invest", effects };
}

/** Preview effects of a follow-on investment */
export function previewFollowOn(
  fund: Fund,
  company: PortfolioCompany,
  amount: number,
  preMoneyValuation: number,
): ActionPreview {
  const effects: ActionPreviewEffect[] = [];
  const additionalOwnership = (amount / preMoneyValuation) * 100;

  effects.push({
    metric: "Cash Available",
    before: fund.cashAvailable,
    after: fund.cashAvailable - amount,
    direction: "down",
  });

  effects.push({
    metric: "Ownership",
    before: company.ownership,
    after: Math.min(100, company.ownership + additionalOwnership),
    direction: "up",
  });

  effects.push({
    metric: "Total Invested",
    before: company.investedAmount,
    after: company.investedAmount + amount,
    direction: "up",
  });

  return { actionType: "follow_on", effects };
}

/** Preview effects of selling a secondary */
export function previewSecondary(
  fund: Fund,
  company: PortfolioCompany,
  offerPercentage: number,
  offerMultiple: number,
): ActionPreview {
  const effects: ActionPreviewEffect[] = [];
  const stakeToSell = company.ownership * (offerPercentage / 100);
  const cashReceived =
    company.investedAmount * offerMultiple * (offerPercentage / 100);

  effects.push({
    metric: "Cash Available",
    before: fund.cashAvailable,
    after: fund.cashAvailable + cashReceived,
    direction: "up",
  });

  effects.push({
    metric: "Ownership",
    before: company.ownership,
    after: company.ownership - stakeToSell,
    direction: "down",
  });

  return { actionType: "secondary", effects };
}

/** Format a preview effect value for display */
export function formatPreviewValue(metric: string, value: number): string {
  if (
    metric === "Cash Available" ||
    metric === "Capital Deployed" ||
    metric === "Total Invested"
  ) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (metric === "Ownership" || metric === "Deployment %") {
    return `${value.toFixed(1)}%`;
  }
  return value.toFixed(1);
}
