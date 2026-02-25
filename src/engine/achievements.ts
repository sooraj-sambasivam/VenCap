// ============================================================
// VenCap — Achievements System
// Pure data + check functions. No side effects.
// ============================================================

import type {
  Fund,
  PortfolioCompany,
  LPSentiment,
  BoardMeeting,
  LabProject,
  IncubatorBatch,
  ScenarioConfig,
  MonthlySnapshot,
} from './types';

// ============================================================
// TYPES
// ============================================================

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface AchievementCheckContext {
  fund: Fund;
  portfolio: PortfolioCompany[];
  lpSentiment: LPSentiment;
  boardMeetings: BoardMeeting[];
  labProjects: LabProject[];
  incubatorBatches: IncubatorBatch[];
  scenarioWon: boolean | null;
  activeScenario: ScenarioConfig | null;
  monthlySnapshots: MonthlySnapshot[];
}

// ============================================================
// ACHIEVEMENT DEFINITIONS (18 achievements)
// Early game (months 1-36): first_blood, sector_scout, first_follow_on, half_deployed, diversified
// Mid game (months 37-72): portfolio_builder, deep_pockets, speed_run, lp_whisperer, board_regular
// Late game (months 73-120): exit_master, unicorn_hunter, triple_bagger, fund_returner, comeback_kid
// Anytime: zombie_slayer, lab_rat, mentor_badge
// ============================================================

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Make your first investment.',
    icon: '\u{1F4B5}',
  },
  {
    id: 'sector_scout',
    name: 'Sector Scout',
    description: 'Invest in 3 different sectors.',
    icon: '\u{1F50D}',
  },
  {
    id: 'first_follow_on',
    name: 'Double Down',
    description: 'Make your first follow-on investment.',
    icon: '\u{1F501}',
  },
  {
    id: 'half_deployed',
    name: 'Halfway There',
    description: 'Deploy 50% of your fund capital.',
    icon: '\u{1F4CA}',
  },
  {
    id: 'unicorn_hunter',
    name: 'Unicorn Hunter',
    description: 'Have a portfolio company reach $1B+ valuation.',
    icon: '\u{1F984}',
  },
  {
    id: 'lp_whisperer',
    name: 'LP Whisperer',
    description: 'Reach LP sentiment of 90+.',
    icon: '\u{1F91D}',
  },
  {
    id: 'portfolio_builder',
    name: 'Portfolio Builder',
    description: 'Have 10+ active portfolio companies simultaneously.',
    icon: '\u{1F3D7}',
  },
  {
    id: 'exit_master',
    name: 'Exit Master',
    description: 'Complete 5 successful exits.',
    icon: '\u{1F3C6}',
  },
  {
    id: 'zombie_slayer',
    name: 'Zombie Slayer',
    description: 'Win the Zombie Fund scenario.',
    icon: '\u{1F9DF}',
  },
  {
    id: 'speed_run',
    name: 'Speed Run',
    description: 'Get an exit within 3 years (36 months).',
    icon: '\u{26A1}',
  },
  {
    id: 'diversified',
    name: 'Diversified',
    description: 'Invest in 5+ different sectors.',
    icon: '\u{1F310}',
  },
  {
    id: 'deep_pockets',
    name: 'Deep Pockets',
    description: 'Deploy $50M+ in total capital.',
    icon: '\u{1F4B0}',
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Recover LP sentiment from below 30 to above 70.',
    icon: '\u{1F4C8}',
  },
  {
    id: 'board_regular',
    name: 'Board Room Regular',
    description: 'Attend 10 board meetings.',
    icon: '\u{1FA91}',
  },
  {
    id: 'lab_rat',
    name: 'Lab Rat',
    description: 'Spin out 3 lab projects.',
    icon: '\u{1F52C}',
  },
  {
    id: 'mentor_badge',
    name: 'Mentor',
    description: 'Graduate 3 incubator batches.',
    icon: '\u{1F393}',
  },
  {
    id: 'triple_bagger',
    name: 'Triple Bagger',
    description: 'Have a company achieve 10x+ multiple.',
    icon: '\u{1F3AF}',
  },
  {
    id: 'fund_returner',
    name: 'Fund Returner',
    description: 'One company returns the entire fund value.',
    icon: '\u{1F48E}',
  },
];

// ============================================================
// CHECK FUNCTIONS
// ============================================================

const ACHIEVEMENT_CHECKS: Record<string, (ctx: AchievementCheckContext) => boolean> = {
  first_blood: (ctx) =>
    ctx.portfolio.length > 0,

  sector_scout: (ctx) => {
    const sectors = new Set(ctx.portfolio.map(c => c.sector));
    return sectors.size >= 3;
  },

  first_follow_on: (ctx) =>
    ctx.portfolio.some(c => c.followOnInvested > 0),

  half_deployed: (ctx) =>
    ctx.fund.currentSize > 0 && ctx.fund.deployed >= ctx.fund.currentSize * 0.5,

  unicorn_hunter: (ctx) =>
    ctx.portfolio.some(c => c.currentValuation >= 1_000_000_000),

  lp_whisperer: (ctx) =>
    ctx.lpSentiment.score >= 90,

  portfolio_builder: (ctx) =>
    ctx.portfolio.filter(c => c.status === 'active').length >= 10,

  exit_master: (ctx) =>
    ctx.portfolio.filter(c => c.status === 'exited').length >= 5,

  zombie_slayer: (ctx) =>
    ctx.activeScenario?.id === 'zombie_fund' && ctx.scenarioWon === true,

  speed_run: (ctx) =>
    ctx.portfolio.some(c =>
      c.status === 'exited' &&
      c.exitData &&
      (c.exitData.month - c.monthInvested) <= 36
    ),

  diversified: (ctx) => {
    const sectors = new Set(ctx.portfolio.map(c => c.sector));
    return sectors.size >= 5;
  },

  deep_pockets: (ctx) =>
    ctx.fund.deployed >= 50_000_000,

  comeback_kid: (ctx) => {
    const wasLow = ctx.monthlySnapshots.some(s => s.lpScore < 30);
    return wasLow && ctx.lpSentiment.score > 70;
  },

  board_regular: (ctx) =>
    ctx.boardMeetings.filter(m => m.attended).length >= 10,

  lab_rat: (ctx) =>
    ctx.labProjects.filter(p => p.status === 'spun_out').length >= 3,

  mentor_badge: (ctx) =>
    ctx.incubatorBatches.filter(b => b.graduated).length >= 3,

  triple_bagger: (ctx) =>
    ctx.portfolio.some(c => c.multiple >= 10),

  fund_returner: (ctx) => {
    if (!ctx.fund.currentSize) return false;
    return ctx.portfolio.some(c => {
      if (c.status === 'exited' && c.exitData) {
        return (c.exitData.exitValue * (c.ownership / 100)) >= ctx.fund.currentSize;
      }
      return false;
    });
  },
};

/**
 * Check all achievements and return newly unlocked IDs.
 */
export function checkAchievements(
  ctx: AchievementCheckContext,
  alreadyUnlocked: string[],
): string[] {
  const newlyUnlocked: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(achievement.id)) continue;
    const checkFn = ACHIEVEMENT_CHECKS[achievement.id];
    if (checkFn && checkFn(ctx)) {
      newlyUnlocked.push(achievement.id);
    }
  }
  return newlyUnlocked;
}

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
