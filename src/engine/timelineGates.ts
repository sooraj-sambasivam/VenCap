// ============================================================
// VenCap — Timeline Gates Engine Module
// Pure functions for IRL pacing gates — no React imports.
// ============================================================

import type { Fund, TimeGate, IrlGateDurations } from "./types";
import { randomBetween } from "@/lib/utils";

// ============================================================
// IRL_GATE_DURATIONS
// Named constants calibrated to real VC cadences.
// All values are in-game months (1 advanceTime() = 1 month).
// ============================================================

export const IRL_GATE_DURATIONS: IrlGateDurations = {
  /** Initial seed review — typically 1-2 months from first meeting to term sheet */
  seed_check: { min: 1, max: 2 },
  /** Full due diligence process — 1-3 months for standard DD */
  due_diligence: { min: 1, max: 3 },
  /** Series A check — 2-4 months including partner vote and legal */
  series_a_check: { min: 2, max: 4 },
  /** LP fundraising close — 6-12 months for a typical fund close */
  lp_close: { min: 6, max: 12 },
  /** Follow-on decision — 1-2 months for existing portfolio company review */
  follow_on: { min: 1, max: 2 },
  /** Board meeting preparation cycle — 1 month standard cadence */
  board_meeting: { min: 1, max: 1 },
};

// ============================================================
// checkTimeGate
// Returns whether the given action is currently blocked by a
// pending time gate on the fund.
// ============================================================

export function checkTimeGate(
  fund: Pick<Fund, "timelineMode" | "activeTimeGates" | "currentMonth">,
  actionType: string,
): { blocked: boolean; availableFromMonth?: number; monthsRemaining?: number } {
  // Freeplay mode — no gates enforced
  if (fund.timelineMode !== "irl") {
    return { blocked: false };
  }

  // Find a matching active gate
  const gate = fund.activeTimeGates.find((g) => g.actionType === actionType);

  if (!gate) {
    return { blocked: false };
  }

  // Gate is expired — action is available
  if (gate.availableFromMonth <= fund.currentMonth) {
    return { blocked: false };
  }

  // Gate is active — action is blocked
  return {
    blocked: true,
    availableFromMonth: gate.availableFromMonth,
    monthsRemaining: gate.availableFromMonth - fund.currentMonth,
  };
}

// ============================================================
// openTimeGate
// Creates a new TimeGate with a random delay drawn from
// IRL_GATE_DURATIONS[actionType]. Falls back to 1 month if
// the actionType is not in the durations map.
// ============================================================

export function openTimeGate(
  fund: Pick<Fund, "currentMonth">,
  actionType: string,
  reason: string,
): TimeGate {
  const duration = IRL_GATE_DURATIONS[actionType];
  const delay = duration
    ? Math.round(randomBetween(duration.min, duration.max))
    : 1;

  return {
    actionType,
    availableFromMonth: fund.currentMonth + delay,
    reason,
  };
}

// ============================================================
// clearExpiredGates
// Returns a filtered copy of the fund's activeTimeGates,
// removing all gates whose availableFromMonth <= currentMonth.
// Call this each advanceTime() tick to prevent unbounded growth.
// ============================================================

export function clearExpiredGates(
  fund: Pick<Fund, "activeTimeGates" | "currentMonth">,
): TimeGate[] {
  return fund.activeTimeGates.filter(
    (gate) => gate.availableFromMonth > fund.currentMonth,
  );
}
