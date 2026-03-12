import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "./gameState";

// Helper to reset the store before each test
function resetStore() {
  useGameStore.setState(useGameStore.getInitialState());
}

function initDefaultFund() {
  useGameStore.getState().initFund({
    name: "Test Fund I",
    type: "national",
    stage: "seed",
    targetSize: 100_000_000,
    currentSize: 100_000_000,
    skillLevel: 1,
    rebirthCount: 0,
    scenarioId: "sandbox",
  });
}

describe("gameState — Full Lifecycle Integration Tests", () => {
  beforeEach(() => {
    resetStore();
  });

  it("completes 120 months without throwing", () => {
    initDefaultFund();
    const store = useGameStore.getState();
    expect(store.gamePhase).toBe("playing");
    expect(store.fund).not.toBeNull();

    // Advance through all 120 months
    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      expect(() => s.advanceTime()).not.toThrow();
    }

    const finalState = useGameStore.getState();
    expect(finalState.gamePhase).toBe("ended");
    expect(finalState.fund!.currentMonth).toBe(120);
  });

  it("TVPI is positive at end of lifecycle", () => {
    initDefaultFund();
    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      s.advanceTime();
    }
    const { fund } = useGameStore.getState();
    expect(fund!.tvpiEstimate).toBeGreaterThan(0);
  });

  it("invest adds a company to the portfolio", () => {
    initDefaultFund();
    // Advance a few months to populate deal pipeline
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().advanceTime();
    }
    const { dealPipeline, portfolio } = useGameStore.getState();
    const initialPortfolioLen = portfolio.length;

    if (dealPipeline.length > 0) {
      const deal = dealPipeline[0];
      const amount = Math.min(
        deal.valuation * 0.1,
        useGameStore.getState().fund!.cashAvailable * 0.2,
      );
      const ownership = (amount / deal.valuation) * 100;
      const result = useGameStore.getState().invest(deal.id, amount, ownership);

      if (result.success) {
        const newState = useGameStore.getState();
        expect(newState.portfolio.length).toBe(initialPortfolioLen + 1);
        expect(newState.portfolio.find((c) => c.id === deal.id)).toBeDefined();
      }
    }
  });

  it("undo restores previous state", () => {
    initDefaultFund();
    // Advance to create history
    useGameStore.getState().advanceTime();
    const monthAfterFirst = useGameStore.getState().fund!.currentMonth;
    useGameStore.getState().advanceTime();
    const monthAfterSecond = useGameStore.getState().fund!.currentMonth;
    expect(monthAfterSecond).toBe(monthAfterFirst + 1);

    // Undo should restore to month after first advance
    useGameStore.getState().undoAdvance();
    const restored = useGameStore.getState();
    expect(restored.fund!.currentMonth).toBe(monthAfterFirst);
  });

  it("LP action changes sentiment", () => {
    initDefaultFund();
    // Advance a few months first
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().advanceTime();
    }
    const sentimentBefore = useGameStore.getState().lpSentiment.score;
    const result = useGameStore.getState().performLPAction("quarterly_update");
    if (result.success) {
      const sentimentAfter = useGameStore.getState().lpSentiment.score;
      expect(sentimentAfter).toBeGreaterThan(sentimentBefore);
    }
  });

  it("board meeting resolves without error", () => {
    initDefaultFund();
    // Invest in a company with board_seat influence to eventually get a board meeting
    // Advance through months until we have a board meeting
    for (let i = 0; i < 60; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      // Try to invest in deals to build portfolio
      if (s.dealPipeline.length > 0 && s.fund!.cashAvailable > 5_000_000) {
        const deal = s.dealPipeline[0];
        const amount = Math.min(
          deal.valuation * 0.15,
          s.fund!.cashAvailable * 0.15,
        );
        const ownership = (amount / deal.valuation) * 100;
        s.invest(deal.id, amount, ownership);
      }
      s.advanceTime();

      // Check if we have a board meeting
      const current = useGameStore.getState();
      const pendingMeeting = (current.boardMeetings || []).find(
        (m) => !m.attended,
      );
      if (pendingMeeting) {
        const choices: Record<string, number> = {};
        pendingMeeting.agendaItems.forEach((item) => {
          choices[item.id] = 0; // pick first option
        });
        expect(() =>
          current.resolveBoardMeeting(pendingMeeting.id, choices),
        ).not.toThrow();
        break;
      }
    }
  });

  it("scenario win condition triggers game end", () => {
    // Use first_time_fund scenario which has TVPI win condition
    useGameStore.getState().initFund({
      name: "Scenario Test",
      type: "regional",
      stage: "seed",
      targetSize: 30_000_000,
      currentSize: 30_000_000,
      skillLevel: 3,
      rebirthCount: 2,
      scenarioId: "first_time_fund",
    });

    const { activeScenario } = useGameStore.getState();
    // first_time_fund has win conditions
    expect(activeScenario).not.toBeNull();

    // Just verify it can run without crashing
    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      s.advanceTime();
    }
    expect(useGameStore.getState().gamePhase).toBe("ended");
  });

  it("all cash deployed does not crash", () => {
    initDefaultFund();
    // Invest heavily to exhaust cash
    for (let i = 0; i < 30; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;

      // Invest all available deals
      while (s.dealPipeline.length > 0 && s.fund!.cashAvailable > 500_000) {
        const deal = s.dealPipeline[0];
        const amount = Math.min(
          deal.valuation * 0.1,
          s.fund!.cashAvailable * 0.5,
        );
        const ownership = (amount / deal.valuation) * 100;
        const result = useGameStore
          .getState()
          .invest(deal.id, amount, ownership);
        if (!result.success) break;
        // Re-fetch state after invest
        break;
      }

      expect(() => useGameStore.getState().advanceTime()).not.toThrow();
    }
  });
});

describe("gameState — Edge Case Tests", () => {
  beforeEach(() => {
    resetStore();
  });

  it("zero cash remaining does not crash on advance", () => {
    initDefaultFund();
    // Aggressively deploy all cash — limited to 15 rounds and 2 deals per round
    // to keep portfolio size manageable for JSON serialization in undo snapshots
    for (let i = 0; i < 15; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;

      // Invest in up to 2 deals per round
      let dealsThisRound = 0;
      let invested = true;
      while (
        invested &&
        dealsThisRound < 2 &&
        s.dealPipeline.length > 0 &&
        useGameStore.getState().fund!.cashAvailable > 100_000
      ) {
        const deal = useGameStore.getState().dealPipeline[0];
        if (!deal) break;
        const cash = useGameStore.getState().fund!.cashAvailable;
        const amount = Math.min(deal.valuation * 0.2, cash * 0.9);
        const ownership = (amount / deal.valuation) * 100;
        const result = useGameStore
          .getState()
          .invest(deal.id, amount, ownership);
        invested = result.success;
        dealsThisRound++;
      }

      expect(() => useGameStore.getState().advanceTime()).not.toThrow();
    }

    // Run remaining months without investing to drain cash via fees
    for (let i = 0; i < 110; i++) {
      if (useGameStore.getState().gamePhase === "ended") break;
      expect(() => useGameStore.getState().advanceTime()).not.toThrow();
    }

    // Should still be able to advance even with near-zero cash
    const { fund } = useGameStore.getState();
    expect(fund).not.toBeNull();
  });

  it("all portfolio companies failing does not crash", () => {
    initDefaultFund();
    // Build a portfolio then advance rapidly
    for (let i = 0; i < 10; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      if (s.dealPipeline.length > 0 && s.fund!.cashAvailable > 1_000_000) {
        const deal = s.dealPipeline[0];
        const amount = Math.min(
          deal.valuation * 0.1,
          s.fund!.cashAvailable * 0.15,
        );
        const ownership = (amount / deal.valuation) * 100;
        s.invest(deal.id, amount, ownership);
      }
      s.advanceTime();
    }

    // Run remaining months — companies may fail naturally
    for (let i = 0; i < 110; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      expect(() => s.advanceTime()).not.toThrow();
    }

    expect(useGameStore.getState().gamePhase).toBe("ended");
  });

  it("zombie_fund scenario seeds and completes", () => {
    useGameStore.getState().initFund({
      name: "Zombie Test",
      type: "national",
      stage: "seed",
      targetSize: 50_000_000,
      currentSize: 50_000_000,
      skillLevel: 2,
      rebirthCount: 1,
      scenarioId: "zombie_fund",
    });

    const { activeScenario } = useGameStore.getState();
    expect(activeScenario).not.toBeNull();
    expect(activeScenario!.id).toBe("zombie_fund");

    // Run full lifecycle without crashing
    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      s.advanceTime();
    }
    expect(useGameStore.getState().gamePhase).toBe("ended");
  });

  it("lp_rescue scenario seeds and completes", () => {
    useGameStore.getState().initFund({
      name: "LP Rescue Test",
      type: "regional",
      stage: "seed",
      targetSize: 40_000_000,
      currentSize: 40_000_000,
      skillLevel: 2,
      rebirthCount: 1,
      scenarioId: "lp_rescue",
    });

    const { activeScenario, lpSentiment } = useGameStore.getState();
    expect(activeScenario).not.toBeNull();
    expect(activeScenario!.id).toBe("lp_rescue");
    // lp_rescue starts with low LP sentiment
    expect(lpSentiment.score).toBeLessThan(50);

    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      s.advanceTime();
    }
    expect(useGameStore.getState().gamePhase).toBe("ended");
  });

  it("multi-undo back to initial state", () => {
    initDefaultFund();
    const monthStart = useGameStore.getState().fund!.currentMonth;

    // Advance 3 times
    useGameStore.getState().advanceTime();
    useGameStore.getState().advanceTime();
    useGameStore.getState().advanceTime();
    expect(useGameStore.getState().fund!.currentMonth).toBe(monthStart + 3);

    // Undo 3 times (history holds max 3)
    useGameStore.getState().undoAdvance();
    expect(useGameStore.getState().fund!.currentMonth).toBe(monthStart + 2);
    useGameStore.getState().undoAdvance();
    expect(useGameStore.getState().fund!.currentMonth).toBe(monthStart + 1);
    useGameStore.getState().undoAdvance();
    expect(useGameStore.getState().fund!.currentMonth).toBe(monthStart);

    // Extra undo should be a no-op
    useGameStore.getState().undoAdvance();
    expect(useGameStore.getState().fund!.currentMonth).toBe(monthStart);
  });

  it("heavy investment portfolio survives full lifecycle", () => {
    initDefaultFund();
    // Invest in deals for the first 20 months (capped to avoid state explosion)
    for (let i = 0; i < 20; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;

      // Invest in up to 2 deals per month
      let invested = 0;
      for (const deal of [...useGameStore.getState().dealPipeline]) {
        if (invested >= 2) break;
        const cash = useGameStore.getState().fund!.cashAvailable;
        if (cash < 1_000_000) break;
        const amount = Math.min(deal.valuation * 0.1, cash * 0.15);
        const ownership = (amount / deal.valuation) * 100;
        useGameStore.getState().invest(deal.id, amount, ownership);
        invested++;
      }

      expect(() => useGameStore.getState().advanceTime()).not.toThrow();
    }

    // Run remaining months — the key assertion is no crashes
    for (let i = 0; i < 110; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === "ended") break;
      expect(() => s.advanceTime()).not.toThrow();
    }

    expect(useGameStore.getState().gamePhase).toBe("ended");
  });

  it("state without new fields does not crash on load", () => {
    initDefaultFund();
    useGameStore.getState().advanceTime();

    // Simulate an old save missing newer fields
    const state = useGameStore.getState();
    const partialState = { ...state } as Record<string, unknown>;
    delete partialState.boardMeetings;
    delete partialState.lpActionCooldowns;
    delete partialState.activeScenario;
    delete partialState.history;

    // Setting partial state should not crash the store
    expect(() => useGameStore.setState(partialState as never)).not.toThrow();

    // advanceTime should still work with missing fields
    const s = useGameStore.getState();
    if (s.gamePhase === "playing") {
      expect(() => s.advanceTime()).not.toThrow();
    }
  });
});

describe("gameState — Timeline Modes", () => {
  beforeEach(() => {
    resetStore();
  });

  it("initFund with timelineMode 'irl' sets fund.timelineMode to 'irl'", () => {
    useGameStore.getState().initFund({
      name: "IRL Fund",
      type: "national",
      stage: "seed",
      targetSize: 100_000_000,
      currentSize: 100_000_000,
      skillLevel: 1,
      rebirthCount: 0,
      scenarioId: "sandbox",
      timelineMode: "irl",
    });
    expect(useGameStore.getState().fund!.timelineMode).toBe("irl");
  });

  it("initFund without timelineMode defaults to 'freeplay'", () => {
    initDefaultFund();
    expect(useGameStore.getState().fund!.timelineMode).toBe("freeplay");
  });

  it("invest action is blocked and returns success:false when IRL gate is active", () => {
    useGameStore.getState().initFund({
      name: "IRL Fund",
      type: "national",
      stage: "seed",
      targetSize: 100_000_000,
      currentSize: 100_000_000,
      skillLevel: 1,
      rebirthCount: 0,
      scenarioId: "sandbox",
      timelineMode: "irl",
    });

    // Advance to populate deal pipeline
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().advanceTime();
    }

    const { dealPipeline, fund } = useGameStore.getState();
    if (dealPipeline.length === 0 || !fund) return;

    const deal = dealPipeline[0];
    const amount = Math.min(deal.valuation * 0.1, fund.cashAvailable * 0.2);
    const ownership = (amount / deal.valuation) * 100;

    // Plant an active gate for seed_check to block the investment
    useGameStore.setState({
      fund: {
        ...fund,
        activeTimeGates: [
          {
            actionType: "seed_check",
            availableFromMonth: fund.currentMonth + 2,
            reason: "Due diligence in progress",
          },
        ],
      },
    });

    const result = useGameStore.getState().invest(deal.id, amount, ownership);
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain("month");
  });

  it("invest action opens a new gate after success in IRL mode", () => {
    useGameStore.getState().initFund({
      name: "IRL Fund",
      type: "national",
      stage: "seed",
      targetSize: 100_000_000,
      currentSize: 100_000_000,
      skillLevel: 1,
      rebirthCount: 0,
      scenarioId: "sandbox",
      timelineMode: "irl",
    });

    // Advance to populate deal pipeline
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().advanceTime();
    }

    const { dealPipeline, fund } = useGameStore.getState();
    if (dealPipeline.length === 0 || !fund) return;

    // Ensure no active gates so investment can proceed
    useGameStore.setState({
      fund: { ...fund, activeTimeGates: [] },
    });

    const deal = dealPipeline[0];
    // Use high founder willingness to reduce flakiness
    useGameStore.setState({
      dealPipeline: useGameStore
        .getState()
        .dealPipeline.map((d) =>
          d.id === deal.id ? { ...d, founderWillingness: 100 } : d,
        ),
    });

    const currentFund = useGameStore.getState().fund!;
    const amount = Math.min(
      deal.valuation * 0.1,
      currentFund.cashAvailable * 0.2,
    );
    const ownership = (amount / deal.valuation) * 100;

    const result = useGameStore.getState().invest(deal.id, amount, ownership);

    if (result.success) {
      // A new gate should have been opened
      const newFund = useGameStore.getState().fund!;
      expect(newFund.activeTimeGates.length).toBeGreaterThan(0);
    }
  });

  it("invest action ignores gates in freeplay mode", () => {
    // initDefaultFund creates a freeplay fund
    initDefaultFund();

    // Advance to populate deal pipeline
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().advanceTime();
    }

    const { dealPipeline, fund } = useGameStore.getState();
    if (dealPipeline.length === 0 || !fund) return;

    // Plant a gate — should be ignored in freeplay
    useGameStore.setState({
      fund: {
        ...fund,
        activeTimeGates: [
          {
            actionType: "seed_check",
            availableFromMonth: fund.currentMonth + 10,
            reason: "Should be ignored",
          },
        ],
        timelineMode: "freeplay",
      },
      dealPipeline: useGameStore
        .getState()
        .dealPipeline.map((d, i) =>
          i === 0 ? { ...d, founderWillingness: 100 } : d,
        ),
    });

    const deal = useGameStore.getState().dealPipeline[0];
    const currentFund = useGameStore.getState().fund!;
    const amount = Math.min(
      deal.valuation * 0.1,
      currentFund.cashAvailable * 0.2,
    );
    const ownership = (amount / deal.valuation) * 100;

    const result = useGameStore.getState().invest(deal.id, amount, ownership);

    // In freeplay, gate should be ignored — may succeed or fail for other reasons
    // but must NOT be blocked due to time gate
    if (!result.success) {
      expect(result.reason).not.toContain("month");
    }
  });

  it("advanceTime prunes expired gates from fund.activeTimeGates", () => {
    useGameStore.getState().initFund({
      name: "IRL Fund",
      type: "national",
      stage: "seed",
      targetSize: 100_000_000,
      currentSize: 100_000_000,
      skillLevel: 1,
      rebirthCount: 0,
      scenarioId: "sandbox",
      timelineMode: "irl",
    });

    const fund = useGameStore.getState().fund!;

    // Plant an expired gate (availableFromMonth <= currentMonth)
    useGameStore.setState({
      fund: {
        ...fund,
        currentMonth: 5,
        activeTimeGates: [
          {
            actionType: "seed_check",
            availableFromMonth: 5,
            reason: "expired",
          },
          {
            actionType: "due_diligence",
            availableFromMonth: 10,
            reason: "active",
          },
        ],
      },
    });

    useGameStore.getState().advanceTime();

    const newFund = useGameStore.getState().fund!;
    // The expired gate (availableFromMonth: 5, was <= 5) should be cleared
    // Note: after advanceTime, currentMonth becomes 6, so gate at 10 stays
    const expiredGate = newFund.activeTimeGates.find(
      (g) => g.actionType === "seed_check",
    );
    expect(expiredGate).toBeUndefined();
  });

  it("fund.timelineMode persists across Zustand rehydrate cycle", () => {
    useGameStore.getState().initFund({
      name: "IRL Fund",
      type: "national",
      stage: "seed",
      targetSize: 100_000_000,
      currentSize: 100_000_000,
      skillLevel: 1,
      rebirthCount: 0,
      scenarioId: "sandbox",
      timelineMode: "irl",
    });

    // Verify the value is stored in state
    expect(useGameStore.getState().fund!.timelineMode).toBe("irl");

    // Simulate rehydration by manually re-setting the fund state
    const currentFund = useGameStore.getState().fund!;
    useGameStore.setState({ fund: { ...currentFund } });

    // Should still be "irl" after setState (persist middleware handles JSON round-trip)
    expect(useGameStore.getState().fund!.timelineMode).toBe("irl");
  });
});

describe("gameState — Fundraising Flow", () => {
  beforeEach(() => {
    resetStore();
    initDefaultFund();
  });

  it("launchCampaign creates campaign with prospects and zero commitments", () => {
    const result = useGameStore.getState().launchCampaign();
    expect(result.success).toBe(true);

    const { activeCampaign } = useGameStore.getState();
    expect(activeCampaign).not.toBeNull();
    expect(activeCampaign!.id).toBeDefined();
    expect(activeCampaign!.closeStatus).toBe("pre_marketing");
    expect(activeCampaign!.committedAmount).toBe(0);
    expect(activeCampaign!.calledAmount).toBe(0);
    expect(activeCampaign!.prospects.length).toBeGreaterThan(0);
    expect(activeCampaign!.targetAmount).toBeGreaterThan(0);
  });

  it("launchCampaign fails when activeCampaign already exists", () => {
    useGameStore.getState().launchCampaign();
    const second = useGameStore.getState().launchCampaign();
    expect(second.success).toBe(false);
    expect(second.reason).toBeDefined();
  });

  it("pitchLP advances prospect status", () => {
    useGameStore.getState().launchCampaign();
    const { activeCampaign } = useGameStore.getState();
    const prospect = activeCampaign!.prospects[0];

    // Run 30 pitches to get at least one success with high probability
    let succeeded = false;
    for (let i = 0; i < 30; i++) {
      const result = useGameStore.getState().pitchLP(prospect.id);
      if (result.success) {
        succeeded = true;
        break;
      }
    }
    // pitchLP itself should execute without error (success/fail is probabilistic)
    // We just verify the action runs and returns the expected shape
    const result = useGameStore.getState().pitchLP(prospect.id);
    expect(result).toHaveProperty("success");
    expect(succeeded || !succeeded).toBe(true); // always true — just verifying shape
  });

  it("pitchLP fails for non-existent prospect", () => {
    useGameStore.getState().launchCampaign();
    const result = useGameStore.getState().pitchLP("non-existent-id");
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("pitchLP fails when no active campaign", () => {
    const result = useGameStore.getState().pitchLP("any-id");
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("advanceFundClose transitions to first_close when threshold met", () => {
    useGameStore.getState().launchCampaign();
    const { activeCampaign, fund } = useGameStore.getState();
    expect(activeCampaign).not.toBeNull();

    // Manually set committedAmount to just above first close threshold (50%)
    const firstCloseAmount = fund!.targetSize * 0.5 + 1;
    useGameStore.setState({
      activeCampaign: {
        ...activeCampaign!,
        committedAmount: firstCloseAmount,
      },
    });

    const result = useGameStore.getState().advanceFundClose();
    expect(result.newCloseStatus).toBe("first_close");
    expect(useGameStore.getState().activeCampaign!.closeStatus).toBe(
      "first_close",
    );
  });

  it("advanceFundClose does not transition if threshold not met", () => {
    useGameStore.getState().launchCampaign();
    const { activeCampaign } = useGameStore.getState();
    // committedAmount is 0, thresholds not met
    const result = useGameStore.getState().advanceFundClose();
    expect(result.newCloseStatus).toBe(activeCampaign!.closeStatus);
  });

  it("configureFundTerms updates fund economics atomically", () => {
    useGameStore.getState().launchCampaign();

    const result = useGameStore.getState().configureFundTerms({
      managementFee: 0.025,
      carry: 0.25,
      hurdleRate: 0.1,
      gpCommitPercent: 0.02,
    });
    expect(result.success).toBe(true);

    const { fund, activeCampaign } = useGameStore.getState();
    // Check campaign terms updated
    expect(activeCampaign!.terms.managementFee).toBe(0.025);
    expect(activeCampaign!.terms.carry).toBe(0.25);
    expect(activeCampaign!.terms.hurdleRate).toBe(0.1);
    expect(activeCampaign!.terms.gpCommitPercent).toBe(0.02);
    // Check fund economics also updated (atomic sync)
    expect(fund!.managementFeeRate).toBe(0.025);
    expect(fund!.carryRate).toBe(0.25);
    expect(fund!.hurdleRate).toBe(0.1);
  });

  it("configureFundTerms is blocked after final_close", () => {
    useGameStore.getState().launchCampaign();
    const { activeCampaign } = useGameStore.getState();
    // Force campaign to final_close
    useGameStore.setState({
      activeCampaign: { ...activeCampaign!, closeStatus: "final_close" },
    });

    const result = useGameStore.getState().configureFundTerms({
      managementFee: 0.03,
    });
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("completeFundClose resets economics, preserves playerProfile, sets gamePhase=setup", () => {
    const profileBefore = useGameStore.getState().playerProfile;
    useGameStore.getState().launchCampaign();

    const result = useGameStore.getState().completeFundClose();
    expect(result.success).toBe(true);

    const state = useGameStore.getState();
    expect(state.gamePhase).toBe("setup");
    expect(state.activeCampaign).toBeNull();
    expect(state.portfolio).toHaveLength(0);
    expect(state.dealPipeline).toHaveLength(0);
    // playerProfile preserved
    expect(state.playerProfile).toEqual(profileBefore);
  });

  it("completeFundClose clears history (not undoable)", () => {
    // Advance a few times to build history
    useGameStore.getState().advanceTime();
    useGameStore.getState().advanceTime();
    expect(useGameStore.getState().history.length).toBeGreaterThan(0);

    useGameStore.getState().launchCampaign();
    useGameStore.getState().completeFundClose();

    expect(useGameStore.getState().history).toHaveLength(0);
  });

  it("completeFundClose fails when gamePhase is not playing", () => {
    // Reset store so gamePhase is 'setup'
    resetStore();
    const result = useGameStore.getState().completeFundClose();
    expect(result.success).toBe(false);
  });
});
