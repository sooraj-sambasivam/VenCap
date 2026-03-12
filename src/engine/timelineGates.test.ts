// ============================================================
// VenCap — Timeline Gates Unit Tests
// ============================================================

import { describe, it, expect } from "vitest";
import type { Fund, TimeGate } from "./types";
import {
  IRL_GATE_DURATIONS,
  checkTimeGate,
  openTimeGate,
  clearExpiredGates,
} from "./timelineGates";

// Minimal Fund factory — only fields needed for gate logic
function makeFund(
  overrides: Partial<
    Pick<Fund, "timelineMode" | "activeTimeGates" | "currentMonth">
  > = {},
): Pick<Fund, "timelineMode" | "activeTimeGates" | "currentMonth"> {
  return {
    timelineMode: "irl",
    activeTimeGates: [],
    currentMonth: 0,
    ...overrides,
  } as Pick<Fund, "timelineMode" | "activeTimeGates" | "currentMonth">;
}

// ============================================================
// IRL_GATE_DURATIONS constant calibration
// ============================================================

describe("IRL_GATE_DURATIONS", () => {
  it("seed_check has min >= 1 and max <= 2", () => {
    expect(IRL_GATE_DURATIONS.seed_check.min).toBeGreaterThanOrEqual(1);
    expect(IRL_GATE_DURATIONS.seed_check.max).toBeLessThanOrEqual(2);
  });

  it("due_diligence has min >= 1 and max <= 3", () => {
    expect(IRL_GATE_DURATIONS.due_diligence.min).toBeGreaterThanOrEqual(1);
    expect(IRL_GATE_DURATIONS.due_diligence.max).toBeLessThanOrEqual(3);
  });

  it("series_a_check has min >= 2 and max <= 4", () => {
    expect(IRL_GATE_DURATIONS.series_a_check.min).toBeGreaterThanOrEqual(2);
    expect(IRL_GATE_DURATIONS.series_a_check.max).toBeLessThanOrEqual(4);
  });

  it("lp_close has min >= 6 and max <= 12", () => {
    expect(IRL_GATE_DURATIONS.lp_close.min).toBeGreaterThanOrEqual(6);
    expect(IRL_GATE_DURATIONS.lp_close.max).toBeLessThanOrEqual(12);
  });

  it("follow_on has min >= 1 and max <= 2", () => {
    expect(IRL_GATE_DURATIONS.follow_on.min).toBeGreaterThanOrEqual(1);
    expect(IRL_GATE_DURATIONS.follow_on.max).toBeLessThanOrEqual(2);
  });

  it("all durations have min <= max", () => {
    for (const [_key, dur] of Object.entries(IRL_GATE_DURATIONS)) {
      expect(dur.min).toBeLessThanOrEqual(dur.max);
    }
  });
});

// ============================================================
// checkTimeGate
// ============================================================

describe("checkTimeGate", () => {
  it("returns blocked:false when timelineMode is freeplay (no gates checked)", () => {
    const fund = makeFund({
      timelineMode: "freeplay",
      activeTimeGates: [
        {
          actionType: "seed_check",
          availableFromMonth: 99,
          reason: "Queued",
        },
      ],
    });
    const result = checkTimeGate(fund as Fund, "seed_check");
    expect(result.blocked).toBe(false);
  });

  it("returns blocked:false when no active gate exists for the actionType", () => {
    const fund = makeFund({ timelineMode: "irl", activeTimeGates: [] });
    const result = checkTimeGate(fund as Fund, "seed_check");
    expect(result.blocked).toBe(false);
  });

  it("returns blocked:true with monthsRemaining when IRL fund has an active gate", () => {
    const fund = makeFund({
      timelineMode: "irl",
      currentMonth: 5,
      activeTimeGates: [
        { actionType: "seed_check", availableFromMonth: 8, reason: "DD queue" },
      ],
    });
    const result = checkTimeGate(fund as Fund, "seed_check");
    expect(result.blocked).toBe(true);
    expect(result.monthsRemaining).toBe(3);
    expect(result.availableFromMonth).toBe(8);
  });

  it("returns blocked:false when gate exists but availableFromMonth <= currentMonth (expired)", () => {
    const fund = makeFund({
      timelineMode: "irl",
      currentMonth: 10,
      activeTimeGates: [
        {
          actionType: "due_diligence",
          availableFromMonth: 10,
          reason: "Done",
        },
      ],
    });
    const result = checkTimeGate(fund as Fund, "due_diligence");
    expect(result.blocked).toBe(false);
  });

  it("returns blocked:false when gate for a different actionType exists", () => {
    const fund = makeFund({
      timelineMode: "irl",
      currentMonth: 5,
      activeTimeGates: [
        {
          actionType: "due_diligence",
          availableFromMonth: 10,
          reason: "Queue",
        },
      ],
    });
    const result = checkTimeGate(fund as Fund, "seed_check");
    expect(result.blocked).toBe(false);
  });
});

// ============================================================
// openTimeGate
// ============================================================

describe("openTimeGate", () => {
  it("returns a TimeGate with the correct actionType and reason", () => {
    const fund = makeFund({ currentMonth: 5 });
    const gate = openTimeGate(fund as Fund, "seed_check", "Test reason");
    expect(gate.actionType).toBe("seed_check");
    expect(gate.reason).toBe("Test reason");
  });

  it("sets availableFromMonth in the valid range for seed_check", () => {
    const fund = makeFund({ currentMonth: 0 });
    // Run many times to test the range probabilistically
    for (let i = 0; i < 50; i++) {
      const gate = openTimeGate(fund as Fund, "seed_check", "test");
      const delay = gate.availableFromMonth - 0;
      expect(delay).toBeGreaterThanOrEqual(IRL_GATE_DURATIONS.seed_check.min);
      expect(delay).toBeLessThanOrEqual(IRL_GATE_DURATIONS.seed_check.max);
    }
  });

  it("sets availableFromMonth in the valid range for due_diligence", () => {
    const fund = makeFund({ currentMonth: 10 });
    for (let i = 0; i < 50; i++) {
      const gate = openTimeGate(fund as Fund, "due_diligence", "test");
      const delay = gate.availableFromMonth - 10;
      expect(delay).toBeGreaterThanOrEqual(
        IRL_GATE_DURATIONS.due_diligence.min,
      );
      expect(delay).toBeLessThanOrEqual(IRL_GATE_DURATIONS.due_diligence.max);
    }
  });

  it("falls back to delay of 1 for unknown actionType", () => {
    const fund = makeFund({ currentMonth: 3 });
    const gate = openTimeGate(fund as Fund, "unknown_action", "test");
    expect(gate.availableFromMonth).toBe(4); // currentMonth + 1
  });
});

// ============================================================
// clearExpiredGates
// ============================================================

describe("clearExpiredGates", () => {
  it("removes gates where availableFromMonth <= currentMonth", () => {
    const fund = makeFund({
      currentMonth: 10,
      activeTimeGates: [
        { actionType: "seed_check", availableFromMonth: 10, reason: "expired" },
        {
          actionType: "due_diligence",
          availableFromMonth: 8,
          reason: "very expired",
        },
      ],
    });
    const result = clearExpiredGates(fund as Fund);
    expect(result).toHaveLength(0);
  });

  it("keeps gates where availableFromMonth > currentMonth", () => {
    const fund = makeFund({
      currentMonth: 5,
      activeTimeGates: [
        {
          actionType: "series_a_check",
          availableFromMonth: 8,
          reason: "active",
        },
      ],
    });
    const result = clearExpiredGates(fund as Fund);
    expect(result).toHaveLength(1);
    expect(result[0].actionType).toBe("series_a_check");
  });

  it("keeps only active gates when mixed", () => {
    const gates: TimeGate[] = [
      { actionType: "seed_check", availableFromMonth: 3, reason: "expired" },
      {
        actionType: "due_diligence",
        availableFromMonth: 12,
        reason: "active",
      },
      {
        actionType: "series_a_check",
        availableFromMonth: 7,
        reason: "expired",
      },
    ];
    const fund = makeFund({ currentMonth: 7, activeTimeGates: gates });
    const result = clearExpiredGates(fund as Fund);
    expect(result).toHaveLength(1);
    expect(result[0].actionType).toBe("due_diligence");
  });

  it("returns empty array when no gates exist", () => {
    const fund = makeFund({ activeTimeGates: [] });
    const result = clearExpiredGates(fund as Fund);
    expect(result).toHaveLength(0);
  });
});
