// ============================================================
// VenCap — Skills System Engine
// Pure functions for XP calculation, level thresholds, career titles
// ============================================================

import type {
  SkillId,
  PlayerProfile,
  CareerTitle,
  SkillContext,
} from "./types";

// ============ XP THRESHOLDS ============
// Level 1: 0 XP, Level 2: 100, Level 3: 300, Level 4: 600, Level 5: 1000
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000] as const;

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(level: number): number {
  if (level >= 5) return LEVEL_THRESHOLDS[4]; // max
  return LEVEL_THRESHOLDS[level]; // next threshold
}

export function getXPProgress(xp: number, level: number): number {
  if (level >= 5) return 1;
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level];
  return (xp - currentThreshold) / (nextThreshold - currentThreshold);
}

// ============ CAREER TITLE THRESHOLDS ============
// Based on total XP across all skills
const CAREER_THRESHOLDS: { title: CareerTitle; minXP: number }[] = [
  { title: "managing_director", minXP: 10000 },
  { title: "partner", minXP: 5000 },
  { title: "vp", minXP: 2000 },
  { title: "associate", minXP: 500 },
  { title: "analyst", minXP: 0 },
];

export function getCareerTitle(totalXP: number): CareerTitle {
  for (const tier of CAREER_THRESHOLDS) {
    if (totalXP >= tier.minXP) return tier.title;
  }
  return "analyst";
}

export function getNextCareerTitle(
  current: CareerTitle,
): { title: CareerTitle; xpNeeded: number } | null {
  const idx = CAREER_THRESHOLDS.findIndex((t) => t.title === current);
  if (idx <= 0) return null; // already at top
  return {
    title: CAREER_THRESHOLDS[idx - 1].title,
    xpNeeded: CAREER_THRESHOLDS[idx - 1].minXP,
  };
}

// ============ CAREER TITLE DISPLAY ============
export const CAREER_TITLE_LABELS: Record<CareerTitle, string> = {
  analyst: "Analyst",
  associate: "Associate",
  vp: "Vice President",
  partner: "Partner",
  managing_director: "Managing Director",
};

// ============ SKILL DISPLAY ============
export const SKILL_LABELS: Record<SkillId, string> = {
  deal_sourcing: "Deal Sourcing",
  due_diligence: "Due Diligence",
  valuation: "Valuation",
  portfolio_support: "Portfolio Support",
  board_governance: "Board Governance",
  fundraising_gp: "Fundraising (GP)",
  risk_management: "Risk Management",
  thesis_development: "Thesis Development",
  network_building: "Network Building",
  exit_strategy: "Exit Strategy",
  financial_modeling: "Financial Modeling",
  founder_coaching: "Founder Coaching",
  conflict_resolution: "Conflict Resolution",
  strategic_comms: "Strategic Communication",
  team_dynamics: "Team Dynamics",
  pattern_recognition: "Pattern Recognition",
  market_intuition: "Market Intuition",
  relationship_building: "Relationship Building",
  negotiation: "Negotiation",
};

export const SKILL_DESCRIPTIONS: Record<SkillId, string> = {
  deal_sourcing: "Finding and evaluating investment opportunities",
  due_diligence: "Deep investigation of potential investments",
  valuation: "Assessing fair value and negotiating terms",
  portfolio_support: "Helping portfolio companies succeed",
  board_governance: "Effective board-level decision making",
  fundraising_gp: "Raising capital from limited partners",
  risk_management: "Identifying and mitigating portfolio risks",
  thesis_development: "Building conviction in investment themes",
  network_building: "Expanding your professional network",
  exit_strategy: "Timing and executing portfolio exits",
  financial_modeling: "Building and interpreting financial models",
  founder_coaching: "Mentoring founders through challenges",
  conflict_resolution: "Navigating disagreements and disputes",
  strategic_comms: "Clear communication with stakeholders",
  team_dynamics: "Building and managing effective teams",
  pattern_recognition: "Spotting trends across portfolio and market",
  market_intuition: "Sensing market shifts before they happen",
  relationship_building: "Deepening trust with founders and LPs",
  negotiation: "Achieving favorable terms in deals",
};

// ============ XP AWARD DEFINITIONS ============
// Maps game actions to skill XP awards

export interface SkillXPAward {
  skillId: SkillId;
  amount: number;
  context?: SkillContext;
}

/** XP awarded when the player invests in a startup */
export function getInvestXP(stage: string): SkillXPAward[] {
  const base: SkillXPAward[] = [
    { skillId: "deal_sourcing", amount: 15 },
    { skillId: "due_diligence", amount: 20 },
    { skillId: "valuation", amount: 15 },
    { skillId: "negotiation", amount: 10 },
  ];
  if (stage === "pre_seed" || stage === "seed") {
    base.push({ skillId: "pattern_recognition", amount: 10, context: "seed" });
  } else if (stage === "growth") {
    base.push({ skillId: "financial_modeling", amount: 10, context: "growth" });
  }
  return base;
}

/** XP awarded for follow-on investment */
export function getFollowOnXP(): SkillXPAward[] {
  return [
    { skillId: "portfolio_support", amount: 10 },
    { skillId: "valuation", amount: 10 },
    { skillId: "risk_management", amount: 5 },
  ];
}

/** XP awarded for supporting a portfolio company */
export function getSupportActionXP(action: string): SkillXPAward[] {
  const base: SkillXPAward[] = [
    { skillId: "portfolio_support", amount: 8 },
    { skillId: "relationship_building", amount: 5 },
  ];
  if (action === "Give Advice" || action === "Founder Intervention") {
    base.push({ skillId: "founder_coaching", amount: 10 });
  }
  if (action === "Make Intros") {
    base.push({ skillId: "network_building", amount: 10 });
  }
  if (action === "Restructure Burn") {
    base.push({ skillId: "financial_modeling", amount: 8 });
  }
  if (action === "GTM Sprint" || action === "Replace GTM Strategy") {
    base.push({ skillId: "strategic_comms", amount: 8 });
  }
  if (action === "Engineering Sprint" || action === "Product Sprint") {
    base.push({ skillId: "team_dynamics", amount: 8 });
  }
  return base;
}

/** XP awarded for resolving a board meeting */
export function getBoardMeetingXP(agendaCount: number): SkillXPAward[] {
  return [
    { skillId: "board_governance", amount: 15 + agendaCount * 5 },
    { skillId: "conflict_resolution", amount: 10 },
    { skillId: "strategic_comms", amount: 5 },
  ];
}

/** XP awarded for resolving a portfolio decision */
export function getDecisionXP(): SkillXPAward[] {
  return [
    { skillId: "risk_management", amount: 10 },
    { skillId: "pattern_recognition", amount: 5 },
  ];
}

/** XP awarded for LP actions */
export function getLPActionXP(): SkillXPAward[] {
  return [
    { skillId: "fundraising_gp", amount: 15 },
    { skillId: "relationship_building", amount: 10 },
    { skillId: "strategic_comms", amount: 8 },
  ];
}

/** XP awarded for selling secondary */
export function getSecondaryXP(): SkillXPAward[] {
  return [
    { skillId: "exit_strategy", amount: 12 },
    { skillId: "negotiation", amount: 10 },
  ];
}

/** XP awarded for accepting a buyout */
export function getBuyoutXP(): SkillXPAward[] {
  return [
    { skillId: "exit_strategy", amount: 20 },
    { skillId: "negotiation", amount: 15 },
    { skillId: "valuation", amount: 10 },
  ];
}

/** XP for hiring talent */
export function getHireTalentXP(): SkillXPAward[] {
  return [
    { skillId: "team_dynamics", amount: 10 },
    { skillId: "network_building", amount: 5 },
  ];
}

/** XP for incubator actions */
export function getIncubatorXP(): SkillXPAward[] {
  return [
    { skillId: "founder_coaching", amount: 15 },
    { skillId: "thesis_development", amount: 10 },
  ];
}

/** XP for lab spin-out */
export function getLabSpinOutXP(): SkillXPAward[] {
  return [
    { skillId: "thesis_development", amount: 20 },
    { skillId: "deal_sourcing", amount: 10 },
    { skillId: "team_dynamics", amount: 10 },
  ];
}

/** XP for fundraising campaign actions */
export function getFundraisingXP(
  action: "launch" | "pitch" | "close",
): SkillXPAward[] {
  if (action === "launch") {
    return [
      { skillId: "fundraising_gp", amount: 20 },
      { skillId: "strategic_comms", amount: 10 },
    ];
  }
  if (action === "pitch") {
    return [
      { skillId: "fundraising_gp", amount: 12 },
      { skillId: "negotiation", amount: 8 },
      { skillId: "relationship_building", amount: 5 },
    ];
  }
  // close
  return [
    { skillId: "fundraising_gp", amount: 25 },
    { skillId: "financial_modeling", amount: 10 },
  ];
}

/** XP awarded passively each month via advanceTime (market intuition) */
export function getMonthlyPassiveXP(portfolioSize: number): SkillXPAward[] {
  const awards: SkillXPAward[] = [{ skillId: "market_intuition", amount: 2 }];
  if (portfolioSize >= 5) {
    awards.push({ skillId: "pattern_recognition", amount: 2 });
  }
  if (portfolioSize >= 10) {
    awards.push({ skillId: "risk_management", amount: 1 });
  }
  return awards;
}

// ============ APPLY XP AWARDS ============

export function applyXPAwards(
  profile: PlayerProfile,
  awards: SkillXPAward[],
): PlayerProfile {
  const skills = { ...profile.skills };
  let totalXP = profile.totalXP;

  for (const award of awards) {
    const skill = skills[award.skillId];
    if (!skill) continue;

    const newXP = Math.min(1000, skill.xp + award.amount);
    const newLevel = getLevelFromXP(newXP);
    const contextTags = [...skill.contextTags];
    if (award.context && !contextTags.includes(award.context)) {
      contextTags.push(award.context);
    }

    skills[award.skillId] = {
      ...skill,
      xp: newXP,
      level: newLevel,
      contextTags,
    };

    totalXP += award.amount;
  }

  const careerTitle = getCareerTitle(totalXP);

  return { skills, careerTitle, totalXP };
}
