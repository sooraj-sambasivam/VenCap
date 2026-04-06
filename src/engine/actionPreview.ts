// ============================================================
// VenCap — Action Preview Engine
// Generates predicted effects for player actions before execution
// ============================================================

import type {
  ActionPreview,
  ActionPreviewEffect,
  BoardMeetingAgendaItem,
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

// ============ BUYOUT PREVIEW ============

/** Preview effects of accepting a buyout offer for a portfolio company */
export function previewBuyout(
  fund: Fund,
  company: PortfolioCompany,
  offerPrice: number,
  activeCompanyCount: number,
): ActionPreview {
  const effects: ActionPreviewEffect[] = [];

  effects.push({
    metric: "Cash Available",
    before: fund.cashAvailable,
    after: fund.cashAvailable + offerPrice,
    direction: "up",
  });

  effects.push({
    metric: "Ownership",
    before: company.ownership,
    after: 0,
    direction: "down",
  });

  effects.push({
    metric: "Active Companies",
    before: activeCompanyCount,
    after: activeCompanyCount - 1,
    direction: "down",
  });

  return { actionType: "buyout", effects };
}

// ============ EXIT PREVIEW ============

/** Preview effects of a portfolio company exit (IPO or acquisition) */
export function previewExit(
  _fund: Fund,
  company: PortfolioCompany,
  exitValue: number,
): ActionPreview {
  const effects: ActionPreviewEffect[] = [];
  const cashReturned = exitValue * (company.ownership / 100);
  const invested = company.investedAmount;
  const multiple = invested > 0 ? cashReturned / invested : 0;

  effects.push({
    metric: "Cash Returned",
    before: 0,
    after: cashReturned,
    direction: "up",
  });

  effects.push({
    metric: "Return Multiple",
    before: 0,
    after: multiple,
    direction: multiple >= 1 ? "up" : "down",
  });

  effects.push({
    metric: "Ownership",
    before: company.ownership,
    after: 0,
    direction: "down",
  });

  return { actionType: "exit", effects };
}

// ============ BOARD VOTE PREVIEW ============

/** Preview a summary of board meeting decisions before confirming */
export function previewBoardVote(
  agendaItems: BoardMeetingAgendaItem[],
  selectedChoices: Record<string, number>,
): ActionPreview {
  const effects: ActionPreviewEffect[] = [];
  let positiveCount = 0;
  let negativeCount = 0;

  for (const item of agendaItems) {
    const choiceIndex = selectedChoices[item.id];
    if (choiceIndex == null) continue;

    const chosen = item.options[choiceIndex];
    if (!chosen) continue;

    // Sum the effect values to determine net direction
    const netEffect = Object.values(chosen.effects).reduce(
      (sum, v) => sum + v,
      0,
    );
    if (netEffect >= 0) positiveCount++;
    else negativeCount++;
  }

  effects.push({
    metric: "Decisions Made",
    before: 0,
    after: agendaItems.length,
    direction: "neutral",
  });

  if (positiveCount > 0) {
    effects.push({
      metric: "Growth-Oriented",
      before: 0,
      after: positiveCount,
      direction: "up",
    });
  }

  if (negativeCount > 0) {
    effects.push({
      metric: "Conservative",
      before: 0,
      after: negativeCount,
      direction: "neutral",
    });
  }

  return { actionType: "board_vote", effects };
}

/** Format a preview effect value for display */
export function formatPreviewValue(metric: string, value: number): string {
  if (
    metric === "Cash Available" ||
    metric === "Capital Deployed" ||
    metric === "Total Invested" ||
    metric === "Cash Returned"
  ) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (metric === "Ownership" || metric === "Deployment %") {
    return `${value.toFixed(1)}%`;
  }
  if (metric === "Return Multiple") {
    return `${value.toFixed(2)}x`;
  }
  if (
    metric === "Active Companies" ||
    metric === "Decisions Made" ||
    metric === "Growth-Oriented" ||
    metric === "Conservative"
  ) {
    return `${Math.round(value)}`;
  }
  return value.toFixed(1);
}
