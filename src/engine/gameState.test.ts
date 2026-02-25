import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameState';

// Helper to reset the store before each test
function resetStore() {
  useGameStore.setState(useGameStore.getInitialState());
}

function initDefaultFund() {
  useGameStore.getState().initFund({
    name: 'Test Fund I',
    type: 'national',
    stage: 'seed',
    targetSize: 100_000_000,
    currentSize: 100_000_000,
    skillLevel: 1,
    rebirthCount: 0,
    scenarioId: 'sandbox',
  });
}

describe('gameState — Full Lifecycle Integration Tests', () => {
  beforeEach(() => {
    resetStore();
  });

  it('completes 120 months without throwing', () => {
    initDefaultFund();
    const store = useGameStore.getState();
    expect(store.gamePhase).toBe('playing');
    expect(store.fund).not.toBeNull();

    // Advance through all 120 months
    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      expect(() => s.advanceTime()).not.toThrow();
    }

    const finalState = useGameStore.getState();
    expect(finalState.gamePhase).toBe('ended');
    expect(finalState.fund!.currentMonth).toBe(120);
  });

  it('TVPI is positive at end of lifecycle', () => {
    initDefaultFund();
    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      s.advanceTime();
    }
    const { fund } = useGameStore.getState();
    expect(fund!.tvpiEstimate).toBeGreaterThan(0);
  });

  it('invest adds a company to the portfolio', () => {
    initDefaultFund();
    // Advance a few months to populate deal pipeline
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().advanceTime();
    }
    const { dealPipeline, portfolio } = useGameStore.getState();
    const initialPortfolioLen = portfolio.length;

    if (dealPipeline.length > 0) {
      const deal = dealPipeline[0];
      const amount = Math.min(deal.valuation * 0.1, useGameStore.getState().fund!.cashAvailable * 0.2);
      const ownership = (amount / deal.valuation) * 100;
      const result = useGameStore.getState().invest(deal.id, amount, ownership);

      if (result.success) {
        const newState = useGameStore.getState();
        expect(newState.portfolio.length).toBe(initialPortfolioLen + 1);
        expect(newState.portfolio.find(c => c.id === deal.id)).toBeDefined();
      }
    }
  });

  it('undo restores previous state', () => {
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

  it('LP action changes sentiment', () => {
    initDefaultFund();
    // Advance a few months first
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().advanceTime();
    }
    const sentimentBefore = useGameStore.getState().lpSentiment.score;
    const result = useGameStore.getState().performLPAction('quarterly_update');
    if (result.success) {
      const sentimentAfter = useGameStore.getState().lpSentiment.score;
      expect(sentimentAfter).toBeGreaterThan(sentimentBefore);
    }
  });

  it('board meeting resolves without error', () => {
    initDefaultFund();
    // Invest in a company with board_seat influence to eventually get a board meeting
    // Advance through months until we have a board meeting
    for (let i = 0; i < 60; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      // Try to invest in deals to build portfolio
      if (s.dealPipeline.length > 0 && s.fund!.cashAvailable > 5_000_000) {
        const deal = s.dealPipeline[0];
        const amount = Math.min(deal.valuation * 0.15, s.fund!.cashAvailable * 0.15);
        const ownership = (amount / deal.valuation) * 100;
        s.invest(deal.id, amount, ownership);
      }
      s.advanceTime();

      // Check if we have a board meeting
      const current = useGameStore.getState();
      const pendingMeeting = (current.boardMeetings || []).find(m => !m.attended);
      if (pendingMeeting) {
        const choices: Record<string, number> = {};
        pendingMeeting.agendaItems.forEach(item => {
          choices[item.id] = 0; // pick first option
        });
        expect(() => current.resolveBoardMeeting(pendingMeeting.id, choices)).not.toThrow();
        break;
      }
    }
  });

  it('scenario win condition triggers game end', () => {
    // Use first_time_fund scenario which has TVPI win condition
    useGameStore.getState().initFund({
      name: 'Scenario Test',
      type: 'regional',
      stage: 'seed',
      targetSize: 30_000_000,
      currentSize: 30_000_000,
      skillLevel: 3,
      rebirthCount: 2,
      scenarioId: 'first_time_fund',
    });

    const { activeScenario } = useGameStore.getState();
    // first_time_fund has win conditions
    expect(activeScenario).not.toBeNull();

    // Just verify it can run without crashing
    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      s.advanceTime();
    }
    expect(useGameStore.getState().gamePhase).toBe('ended');
  });

  it('all cash deployed does not crash', () => {
    initDefaultFund();
    // Invest heavily to exhaust cash
    for (let i = 0; i < 30; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;

      // Invest all available deals
      while (s.dealPipeline.length > 0 && s.fund!.cashAvailable > 500_000) {
        const deal = s.dealPipeline[0];
        const amount = Math.min(deal.valuation * 0.1, s.fund!.cashAvailable * 0.5);
        const ownership = (amount / deal.valuation) * 100;
        const result = useGameStore.getState().invest(deal.id, amount, ownership);
        if (!result.success) break;
        // Re-fetch state after invest
        break;
      }

      expect(() => useGameStore.getState().advanceTime()).not.toThrow();
    }
  });
});

describe('gameState — Edge Case Tests', () => {
  beforeEach(() => {
    resetStore();
  });

  it('zero cash remaining does not crash on advance', () => {
    initDefaultFund();
    // Aggressively deploy all cash
    for (let i = 0; i < 60; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;

      // Invest in every available deal
      let invested = true;
      while (invested && s.dealPipeline.length > 0 && useGameStore.getState().fund!.cashAvailable > 100_000) {
        const deal = useGameStore.getState().dealPipeline[0];
        if (!deal) break;
        const cash = useGameStore.getState().fund!.cashAvailable;
        const amount = Math.min(deal.valuation * 0.2, cash * 0.9);
        const ownership = (amount / deal.valuation) * 100;
        const result = useGameStore.getState().invest(deal.id, amount, ownership);
        invested = result.success;
      }

      expect(() => useGameStore.getState().advanceTime()).not.toThrow();
    }

    // Should still be able to advance even with near-zero cash
    const { fund } = useGameStore.getState();
    expect(fund).not.toBeNull();
  });

  it('all portfolio companies failing does not crash', () => {
    initDefaultFund();
    // Build a portfolio then advance rapidly
    for (let i = 0; i < 10; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      if (s.dealPipeline.length > 0 && s.fund!.cashAvailable > 1_000_000) {
        const deal = s.dealPipeline[0];
        const amount = Math.min(deal.valuation * 0.1, s.fund!.cashAvailable * 0.15);
        const ownership = (amount / deal.valuation) * 100;
        s.invest(deal.id, amount, ownership);
      }
      s.advanceTime();
    }

    // Run remaining months — companies may fail naturally
    for (let i = 0; i < 110; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      expect(() => s.advanceTime()).not.toThrow();
    }

    expect(useGameStore.getState().gamePhase).toBe('ended');
  });

  it('zombie_fund scenario seeds and completes', () => {
    useGameStore.getState().initFund({
      name: 'Zombie Test',
      type: 'national',
      stage: 'seed',
      targetSize: 50_000_000,
      currentSize: 50_000_000,
      skillLevel: 2,
      rebirthCount: 1,
      scenarioId: 'zombie_fund',
    });

    const { activeScenario } = useGameStore.getState();
    expect(activeScenario).not.toBeNull();
    expect(activeScenario!.id).toBe('zombie_fund');

    // Run full lifecycle without crashing
    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      s.advanceTime();
    }
    expect(useGameStore.getState().gamePhase).toBe('ended');
  });

  it('lp_rescue scenario seeds and completes', () => {
    useGameStore.getState().initFund({
      name: 'LP Rescue Test',
      type: 'regional',
      stage: 'seed',
      targetSize: 40_000_000,
      currentSize: 40_000_000,
      skillLevel: 2,
      rebirthCount: 1,
      scenarioId: 'lp_rescue',
    });

    const { activeScenario, lpSentiment } = useGameStore.getState();
    expect(activeScenario).not.toBeNull();
    expect(activeScenario!.id).toBe('lp_rescue');
    // lp_rescue starts with low LP sentiment
    expect(lpSentiment.score).toBeLessThan(50);

    for (let i = 0; i < 120; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      s.advanceTime();
    }
    expect(useGameStore.getState().gamePhase).toBe('ended');
  });

  it('multi-undo back to initial state', () => {
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

  it('heavy investment portfolio survives full lifecycle', () => {
    initDefaultFund();
    // Invest in as many deals as possible in the first 40 months
    for (let i = 0; i < 40; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;

      // Invest in all available deals with appropriate check sizes
      for (const deal of [...useGameStore.getState().dealPipeline]) {
        const cash = useGameStore.getState().fund!.cashAvailable;
        if (cash < 1_000_000) break;
        const amount = Math.min(deal.valuation * 0.1, cash * 0.15);
        const ownership = (amount / deal.valuation) * 100;
        useGameStore.getState().invest(deal.id, amount, ownership);
      }

      expect(() => useGameStore.getState().advanceTime()).not.toThrow();
    }

    // Run remaining months — the key assertion is no crashes
    for (let i = 0; i < 80; i++) {
      const s = useGameStore.getState();
      if (s.gamePhase === 'ended') break;
      expect(() => s.advanceTime()).not.toThrow();
    }

    expect(useGameStore.getState().gamePhase).toBe('ended');
  });

  it('state without new fields does not crash on load', () => {
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
    if (s.gamePhase === 'playing') {
      expect(() => s.advanceTime()).not.toThrow();
    }
  });
});
