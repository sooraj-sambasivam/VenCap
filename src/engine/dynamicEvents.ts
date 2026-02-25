// ============================================================
// VenCap — Monthly Dynamic Event Generation System
// Pure functions. No side effects.
// ============================================================

import type { DynamicEvent, PortfolioCompany, MarketCycle, StartupRegion } from './types';
import { uuid, randomBetween, randomInt, pickRandom } from '@/lib/utils';

// ============================================================
// EVENT TEMPLATES
// ============================================================

interface EventTemplate {
  type: string;
  sentiment: 'positive' | 'negative';
  baseProbability: number;
  probabilityModifiers: (company: PortfolioCompany, market: MarketCycle) => number;
  severityChance: { minor: number; moderate: number; severe: number };
  generateEffects: (severity: 'minor' | 'moderate' | 'severe') => DynamicEvent['effects'];
  titleTemplates: string[];
  descriptionTemplates: (company: PortfolioCompany) => string[];
}

// ============ NEGATIVE EVENTS ============

const NEGATIVE_EVENTS: EventTemplate[] = [
  {
    type: 'founder_conflict',
    sentiment: 'negative',
    baseProbability: 0.03,
    probabilityModifiers: (c, _m) => {
      let mod = 0;
      if (c.relationship < 30) mod += 0.02;
      if (c.founderState === 'defensive') mod += 0.01;
      return mod;
    },
    severityChance: { minor: 0.3, moderate: 0.5, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        relationshipMod: -randomInt(10, 20) * s,
        failChanceMod: randomBetween(0.05, 0.15) * s,
        growthMod: -randomBetween(0.05, 0.10) * s,
      };
    },
    titleTemplates: [
      'Founder Conflict Escalates',
      'Leadership Tensions Surface',
      'Co-founder Disagreement Deepens',
    ],
    descriptionTemplates: (c) => [
      `${c.founderName} and the CTO are clashing over product direction. The engineering team is caught in the middle, and sprint velocity has dropped 30%.`,
      `A disagreement over fundraising strategy has created a rift in ${c.name}'s leadership team. Board meetings have become tense and unproductive.`,
      `${c.founderName} fired a senior VP without board consultation. The remaining leadership team is questioning decision-making processes.`,
    ],
  },
  {
    type: 'product_setback',
    sentiment: 'negative',
    baseProbability: 0.02,
    probabilityModifiers: (c, _m) => {
      let mod = 0;
      if (c.pmfScore < 40) mod += 0.01;
      return mod;
    },
    severityChance: { minor: 0.4, moderate: 0.4, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        mrrMod: -randomBetween(0.05, 0.15) * s,
        pmfMod: -randomInt(5, 10) * s,
        failChanceMod: randomBetween(0.05, 0.10) * s,
      };
    },
    titleTemplates: [
      'Major Product Setback',
      'Product Launch Delayed',
      'Critical Bug Found in Production',
    ],
    descriptionTemplates: (c) => [
      `${c.name}'s latest release introduced a critical data integrity issue affecting enterprise customers. The team is in all-hands mode to fix it, but two large accounts are evaluating alternatives.`,
      `A planned product migration has gone sideways. ${c.name} lost three weeks of customer data during the transition, damaging trust with early adopters.`,
      `The core platform rewrite that was supposed to unlock scalability is 4 months behind schedule. ${c.founderName} is considering rolling back to the legacy architecture.`,
    ],
  },
  {
    type: 'key_employee_departure',
    sentiment: 'negative',
    baseProbability: 0.025,
    probabilityModifiers: (c, _m) => {
      let mod = 0;
      if (c.supportScore < 20) mod += 0.02;
      return mod;
    },
    severityChance: { minor: 0.35, moderate: 0.45, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: -randomBetween(0.05, 0.10) * s,
        mrrMod: -randomBetween(0.03, 0.08) * s,
      };
    },
    titleTemplates: [
      'Key Employee Departs',
      'Senior Leader Leaves for Competitor',
      'VP Engineering Resignation',
    ],
    descriptionTemplates: (c) => [
      `${c.name}'s VP of Engineering just accepted a role at a FAANG company. Three other engineers are rumored to be considering following. The product roadmap is at risk.`,
      `The head of sales at ${c.name} resigned after a disagreement with ${c.founderName} over territory strategy. She's taking her Rolodex to a direct competitor.`,
      `${c.name}'s lead data scientist — the person behind their core ML model — gave two weeks notice. The proprietary algorithm is poorly documented.`,
    ],
  },
  {
    type: 'new_competitor',
    sentiment: 'negative',
    baseProbability: 0.03,
    probabilityModifiers: (_c, _m) => 0,
    severityChance: { minor: 0.3, moderate: 0.5, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: -randomBetween(0.05, 0.15) * s,
        mrrMod: -randomBetween(0.02, 0.05) * s,
      };
    },
    titleTemplates: [
      'New Competitor Enters Market',
      'Well-Funded Rival Launches',
      'Incumbent Pivots Into Space',
    ],
    descriptionTemplates: (c) => [
      `A YC-backed startup just launched a competing product to ${c.name} with a $15M seed round and aggressive pricing. They're offering free migrations to ${c.name}'s customers.`,
      `A Fortune 500 company announced an internal tool that directly competes with ${c.name}'s core offering. They're bundling it free with their enterprise suite.`,
      `A well-known serial entrepreneur just launched in ${c.name}'s space with a star team and $30M in funding. The press coverage is making prospects hesitate.`,
    ],
  },
  {
    type: 'ceo_burnout',
    sentiment: 'negative',
    baseProbability: 0.015,
    probabilityModifiers: (c, _m) => {
      let mod = 0;
      if (c.founderState === 'burned_out') mod += 0.02;
      return mod;
    },
    severityChance: { minor: 0.2, moderate: 0.4, severe: 0.4 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: -randomBetween(0.10, 0.20) * s,
        failChanceMod: randomBetween(0.10, 0.20) * s,
        relationshipMod: -randomInt(5, 10) * s,
      };
    },
    titleTemplates: [
      'CEO Showing Signs of Burnout',
      'Founder Health Concerns',
      'CEO Takes Medical Leave',
    ],
    descriptionTemplates: (c) => [
      `${c.founderName} has been working 100-hour weeks for 18 months straight. They missed the last two board calls and their decision-making quality is visibly declining.`,
      `Investors are concerned about ${c.founderName}'s state. They've been erratic in recent meetings, alternating between aggressive expansion plans and talk of shutting down.`,
      `${c.founderName} checked into a wellness retreat for two weeks. The team is holding things together, but strategic decisions are stalled without the CEO.`,
    ],
  },
  {
    type: 'press_scandal',
    sentiment: 'negative',
    baseProbability: 0.01,
    probabilityModifiers: (_c, _m) => 0,
    severityChance: { minor: 0.7, moderate: 0.0, severe: 0.3 },
    generateEffects: (severity) => {
      if (severity === 'severe') {
        return {
          relationshipMod: -15,
          failChanceMod: 0.15,
          mrrMod: -0.10,
          pmfMod: -10,
        };
      }
      return {
        relationshipMod: -5,
        growthMod: -0.03,
      };
    },
    titleTemplates: [
      'Negative Press Coverage',
      'Company Featured in Exposé',
      'PR Crisis Unfolds',
    ],
    descriptionTemplates: (c) => [
      `A tech journalist published an unflattering piece about ${c.name}'s workplace culture. Former employees are sharing stories on social media, and it's gaining traction.`,
      `${c.name} was mentioned in a viral Twitter thread about companies misleading customers on AI capabilities. The thread has 50K retweets and prospects are asking questions.`,
      `A major news outlet ran an investigation into ${c.name}'s data practices. While nothing illegal was found, the optics are bad and customer trust is shaken.`,
    ],
  },
  {
    type: 'market_headwind',
    sentiment: 'negative',
    baseProbability: 0.04,
    probabilityModifiers: (_c, m) => {
      if (m === 'cooldown') return 0.02;
      if (m === 'hard') return 0.04;
      return 0;
    },
    severityChance: { minor: 0.4, moderate: 0.4, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: -randomBetween(0.05, 0.15) * s,
      };
    },
    titleTemplates: [
      'Market Headwinds Intensify',
      'Sector Sentiment Shifts Negative',
      'Industry Downturn Impacts Pipeline',
    ],
    descriptionTemplates: (c) => [
      `Enterprise budgets in ${c.sector} are getting slashed across the board. ${c.name}'s pipeline is seeing longer deal cycles and more pushback on pricing.`,
      `A wave of layoffs across ${c.sector} companies is creating uncertainty. ${c.name}'s prospects are delaying purchasing decisions until the market stabilizes.`,
      `Analyst reports are downgrading the ${c.sector} sector outlook. Public comps in ${c.name}'s space are trading down 30%, which will impact private valuations.`,
    ],
  },
  {
    type: 'regulatory_issue',
    sentiment: 'negative',
    baseProbability: 0.01,
    probabilityModifiers: (c, _m) => {
      if (c.sector === 'Fintech' || c.sector === 'HealthTech') return 0.02;
      return 0;
    },
    severityChance: { minor: 0.3, moderate: 0.4, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        failChanceMod: randomBetween(0.05, 0.10) * s,
        growthMod: -randomBetween(0.05, 0.10) * s,
      };
    },
    titleTemplates: [
      'Regulatory Scrutiny Increases',
      'Compliance Issue Surfaces',
      'New Regulation Threatens Model',
    ],
    descriptionTemplates: (c) => [
      `New proposed regulations in ${c.sector} could require ${c.name} to fundamentally restructure their data handling. Compliance costs estimated at $500K-1M.`,
      `A regulatory body has sent ${c.name} an information request about their business practices. While not an investigation, it's consuming significant management attention.`,
      `Upcoming legislation could ban ${c.name}'s primary revenue mechanism. The company is scrambling to develop an alternative business model before the law takes effect.`,
    ],
  },
  {
    type: 'cash_crunch',
    sentiment: 'negative',
    baseProbability: 0.02,
    probabilityModifiers: (c, _m) => {
      if (c.metrics.runway < 6) return 0.03;
      return 0;
    },
    severityChance: { minor: 0.2, moderate: 0.4, severe: 0.4 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        failChanceMod: randomBetween(0.10, 0.20) * s,
        relationshipMod: -randomInt(3, 8) * s,
      };
    },
    titleTemplates: [
      'Cash Runway Running Low',
      'Emergency Budget Cuts Needed',
      'Fundraising Falls Short',
    ],
    descriptionTemplates: (c) => [
      `${c.name} burned through cash faster than projected. With ${c.metrics.runway} months of runway left, ${c.founderName} is exploring bridge financing options and cutting non-essential spend.`,
      `A major customer delayed payment by 90 days, putting ${c.name} in a cash crunch. The team is discussing layoffs to extend runway while they close the next round.`,
      `${c.name}'s Series round is taking longer than expected. Two lead investors pulled out, and the company needs to find new capital within 8 weeks or face difficult decisions.`,
    ],
  },
  // ============ LEGAL / REGULATORY EVENTS (Feature 6) ============
  {
    type: 'sec_investigation',
    sentiment: 'negative',
    baseProbability: 0.015,
    probabilityModifiers: (c, _m) => {
      if (c.sector === 'Fintech') return 0;
      return -Infinity; // Only Fintech
    },
    severityChance: { minor: 0.2, moderate: 0.4, severe: 0.4 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        mrrMod: -0.20 * s,
        failChanceMod: 0.15 * s,
      };
    },
    titleTemplates: [
      'SEC Investigation Opened',
      'Regulatory Inquiry from SEC',
      'Securities Compliance Under Review',
    ],
    descriptionTemplates: (c) => [
      `The SEC has opened a formal inquiry into ${c.name}'s financial disclosures. Management is working with outside counsel, but the process is consuming significant bandwidth and signaling concern to customers.`,
      `${c.name} received a document subpoena from the SEC related to a prior fundraising round. ${c.founderName} maintains full compliance, but the investigation has spooked key enterprise accounts.`,
      `Regulators are scrutinizing ${c.name}'s financial reporting practices. Until the inquiry resolves, the company has paused new customer onboarding and delayed a planned funding announcement.`,
    ],
  },
  {
    type: 'gdpr_violation',
    sentiment: 'negative',
    baseProbability: 0.008,
    probabilityModifiers: (c, _m) => {
      if (['SaaS', 'Fintech', 'Consumer'].includes(c.sector)) return 0;
      return -Infinity;
    },
    severityChance: { minor: 0.4, moderate: 0.4, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        mrrMod: -0.08 * s,
        failChanceMod: 0.05 * s,
      };
    },
    titleTemplates: [
      'GDPR Compliance Violation Alleged',
      'Data Protection Fine Issued',
      'Privacy Regulator Investigates',
    ],
    descriptionTemplates: (c) => [
      `A European data protection authority has alleged ${c.name} violated GDPR by improperly processing user data. The potential fine could reach 4% of annual revenue, and the EU market expansion is now on hold.`,
      `${c.name} received a notice of intent to fine from a privacy regulator over its cookie consent practices. The legal team estimates a $200K–$500K settlement, and the PR fallout is affecting retention.`,
      `A data subject complaint triggered a full investigation into ${c.name}'s data retention policies. The company is scrambling to implement a comprehensive compliance overhaul before regulators escalate.`,
    ],
  },
  {
    type: 'antitrust_scrutiny',
    sentiment: 'negative',
    baseProbability: 0.010,
    probabilityModifiers: (c, _m) => {
      if (['Marketplace', 'SaaS'].includes(c.sector) && c.metrics.mrr > 500000) return 0;
      return -Infinity;
    },
    severityChance: { minor: 0.3, moderate: 0.5, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: -0.10 * s,
        exitChanceMod: -0.05 * s,
      };
    },
    titleTemplates: [
      'Antitrust Scrutiny Increases',
      'Competition Regulator Reviews Market Position',
      'DOJ/FTC Inquiry into Market Practices',
    ],
    descriptionTemplates: (c) => [
      `As ${c.name} has grown, it has attracted antitrust scrutiny for alleged exclusionary practices. The investigation is chilling potential acquirers who don't want regulatory headaches.`,
      `A competitor filed an antitrust complaint against ${c.name}, accusing them of bundling tactics that harm competition. Even if unfounded, the PR and legal distraction is slowing enterprise deals.`,
      `Competition regulators are reviewing ${c.name}'s market position following rapid growth. The company has paused two planned acquisitions and is working to demonstrate it doesn't have a dominant position.`,
    ],
  },
  {
    type: 'patent_dispute',
    sentiment: 'negative',
    baseProbability: 0.012,
    probabilityModifiers: (c, _m) => {
      if (['DeepTech', 'Biotech'].includes(c.sector)) return 0;
      return -Infinity;
    },
    severityChance: { minor: 0.3, moderate: 0.4, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        exitChanceMod: -0.10 * s,
        failChanceMod: 0.04 * s,
      };
    },
    titleTemplates: [
      'Patent Infringement Lawsuit Filed',
      'IP Dispute Threatens Core Product',
      'Patent Troll Targets Portfolio Company',
    ],
    descriptionTemplates: (c) => [
      `A large incumbent filed a patent infringement suit against ${c.name}, claiming their core technology violates three patents. Potential acquirers are now demanding IP indemnification, slowing M&A conversations.`,
      `${c.name} received a cease-and-desist from a patent holding company alleging infringement on foundational methods. The legal battle could take 18+ months and cost $1M+ to defend.`,
      `A university IP office is claiming ownership over research that ${c.founderName} conducted while a PhD student. The dispute clouds ${c.name}'s freedom-to-operate and has spooked strategic partners.`,
    ],
  },
];

// ============ POSITIVE EVENTS ============

const POSITIVE_EVENTS: EventTemplate[] = [
  {
    type: 'market_tailwind',
    sentiment: 'positive',
    baseProbability: 0.04,
    probabilityModifiers: (_c, m) => {
      if (m === 'bull') return 0.03;
      return 0;
    },
    severityChance: { minor: 0.3, moderate: 0.5, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: randomBetween(0.05, 0.15) * s,
      };
    },
    titleTemplates: [
      'Favorable Market Tailwinds',
      'Sector Momentum Accelerates',
      'Industry Boom Benefits Portfolio',
    ],
    descriptionTemplates: (c) => [
      `The ${c.sector} sector is experiencing a surge of interest from enterprise buyers. ${c.name}'s inbound pipeline has doubled in the last month.`,
      `A major industry report named ${c.sector} as the top growth sector for the year. ${c.name} is seeing increased brand awareness and inbound leads as a result.`,
      `Government stimulus spending is flowing into ${c.sector}. ${c.name} just landed three government-adjacent contracts they weren't even pursuing.`,
    ],
  },
  {
    type: 'viral_moment',
    sentiment: 'positive',
    baseProbability: 0.015,
    probabilityModifiers: (c, _m) => {
      if (c.pmfScore > 70) return 0.01;
      return 0;
    },
    severityChance: { minor: 0.2, moderate: 0.5, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        mrrMod: randomBetween(0.10, 0.25) * s,
        growthMod: randomBetween(0.05, 0.10) * s,
      };
    },
    titleTemplates: [
      'Product Goes Viral',
      'Organic Growth Spikes',
      'Social Media Breakout',
    ],
    descriptionTemplates: (c) => [
      `A prominent tech influencer featured ${c.name} in a viral video. Sign-ups jumped 400% overnight, and the team is scrambling to handle onboarding at scale.`,
      `${c.name}'s product was featured on the front page of Hacker News and stayed #1 for 12 hours. They received 5,000 sign-ups and 200 enterprise demo requests in a single day.`,
      `A customer's success story using ${c.name} went viral on LinkedIn. The post generated 2M impressions and the sales team can't keep up with inbound interest.`,
    ],
  },
  {
    type: 'strategic_partnership',
    sentiment: 'positive',
    baseProbability: 0.02,
    probabilityModifiers: (c, _m) => {
      if (c.coInvestors.some(ci => ci.tier === 'strategic')) return 0.02;
      return 0;
    },
    severityChance: { minor: 0.2, moderate: 0.5, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: randomBetween(0.05, 0.10) * s,
        exitChanceMod: 0.05 * s,
        mrrMod: randomBetween(0.05, 0.10) * s,
      };
    },
    titleTemplates: [
      'Strategic Partnership Signed',
      'Major Distribution Deal Closed',
      'Channel Partnership Expands Reach',
    ],
    descriptionTemplates: (c) => [
      `${c.name} just signed a strategic partnership with a Fortune 500 company. The deal includes co-marketing, API integration, and a guaranteed minimum revenue commitment.`,
      `A leading platform in ${c.sector} selected ${c.name} as their exclusive technology partner. This opens distribution to 10,000+ potential customers.`,
      `${c.name} closed a reseller agreement with a major systems integrator. The partner will bundle ${c.name}'s solution into their enterprise deals.`,
    ],
  },
  {
    type: 'key_hire',
    sentiment: 'positive',
    baseProbability: 0.02,
    probabilityModifiers: (c, _m) => {
      if (c.supportScore > 50) return 0.02;
      return 0;
    },
    severityChance: { minor: 0.2, moderate: 0.5, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: randomBetween(0.05, 0.10) * s,
        pmfMod: randomInt(3, 5) * s,
      };
    },
    titleTemplates: [
      'Key Hire Lands',
      'Star Executive Joins Team',
      'Industry Veteran Comes Aboard',
    ],
    descriptionTemplates: (c) => [
      `${c.name} just hired a former VP from a successful competitor. She brings deep domain expertise, a strong network, and credibility with enterprise buyers.`,
      `A senior Google engineer with expertise in ${c.sector} joined ${c.name} as CTO. The hire has energized the engineering team and attracted interest from other top talent.`,
      `${c.name} recruited a seasoned sales leader who previously scaled a competitor from $1M to $50M ARR. The sales team's morale has noticeably improved.`,
    ],
  },
  {
    type: 'surprise_acquisition_interest',
    sentiment: 'positive',
    baseProbability: 0.015,
    probabilityModifiers: (c, _m) => {
      if (c.metrics.mrr > 100000 && c.pmfScore > 50) return 0.01;
      return -Infinity; // conditions not met — event won't fire
    },
    severityChance: { minor: 0.0, moderate: 0.5, severe: 0.5 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.7;
      return {
        exitChanceMod: randomBetween(0.15, 0.25) * s,
      };
    },
    titleTemplates: [
      'Surprise M&A Interest',
      'Acquisition Inquiry Received',
      'Strategic Buyer Approaches',
    ],
    descriptionTemplates: (c) => [
      `${c.name} received an unsolicited acquisition inquiry from a major tech company. ${c.founderName} isn't sure they want to sell, but the interest validates the business.`,
      `A corp dev team from a Fortune 100 reached out to ${c.name} about a potential acquisition. They're impressed by the technology and the team.`,
      `Multiple strategic buyers have approached ${c.name} in the last month. The competitive interest could drive a favorable outcome if the team decides to explore.`,
    ],
  },
  // ============ LEGAL / REGULATORY POSITIVE EVENTS (Feature 6) ============
  {
    type: 'fda_approval',
    sentiment: 'positive',
    baseProbability: 0.015,
    probabilityModifiers: (c, _m) => {
      if (['HealthTech', 'Biotech'].includes(c.sector)) return 0;
      return -Infinity;
    },
    severityChance: { minor: 0.0, moderate: 0.4, severe: 0.6 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        mrrMod: 0.35 * s,
        exitChanceMod: 0.20 * s,
      };
    },
    titleTemplates: [
      'FDA Approval Granted',
      'Regulatory Clearance Received',
      'FDA 510(k) Cleared',
    ],
    descriptionTemplates: (c) => [
      `${c.name} has received FDA clearance for their flagship product. This milestone opens up hospital procurement channels and dramatically de-risks the business. Strategic acquirers are already reaching out.`,
      `After an 18-month regulatory review, ${c.name} received FDA approval for their core technology. The company can now bill insurance for the first time, unlocking a massive new revenue stream.`,
      `The FDA granted ${c.name} breakthrough device designation, accelerating the approval timeline. The news has supercharged investor interest and hospital system conversations.`,
    ],
  },
  {
    type: 'regulatory_approval',
    sentiment: 'positive',
    baseProbability: 0.010,
    probabilityModifiers: (c, _m) => {
      if (['Fintech', 'HealthTech', 'Biotech'].includes(c.sector)) return 0;
      return -Infinity;
    },
    severityChance: { minor: 0.2, moderate: 0.5, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: 0.12 * s,
        exitChanceMod: 0.10 * s,
      };
    },
    titleTemplates: [
      'Key Regulatory License Granted',
      'Banking License Obtained',
      'Regulatory Approval Unlocks Market',
    ],
    descriptionTemplates: (c) => [
      `${c.name} received a critical regulatory license that allows them to operate in 12 new markets. The compliance moat this creates significantly raises the barrier for competitors.`,
      `After a lengthy application process, ${c.name} obtained a banking charter. They can now offer deposit accounts directly, dramatically expanding the product and revenue potential.`,
      `Regulators approved ${c.name}'s application to operate in the EU, unlocking a $2B+ addressable market. The company is already in conversations with major European enterprise accounts.`,
    ],
  },
  {
    type: 'major_customer_win',
    sentiment: 'positive',
    baseProbability: 0.03,
    probabilityModifiers: (_c, _m) => 0,
    severityChance: { minor: 0.3, moderate: 0.5, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        mrrMod: randomBetween(0.05, 0.15) * s,
        growthMod: randomBetween(0.03, 0.05) * s,
        pmfMod: randomInt(2, 3) * s,
      };
    },
    titleTemplates: [
      'Major Customer Win',
      'Enterprise Logo Landed',
      'Breakthrough Deal Closed',
    ],
    descriptionTemplates: (c) => [
      `${c.name} just closed their largest deal ever — a 3-year enterprise contract worth $${randomInt(200, 800)}K annually. The customer is a recognizable brand that will open doors.`,
      `After a 6-month sales cycle, ${c.name} landed a marquee account that competitors were also pursuing. The win is a strong signal of product-market fit in the enterprise segment.`,
      `${c.name} signed a pilot-to-production deal with a Fortune 500 company. The initial contract is modest, but expansion potential is $${randomInt(1, 5)}M+ annually.`,
    ],
  },
  // ============ GROWTH MILESTONE EVENTS ============
  {
    type: 'product_market_fit_achieved',
    sentiment: 'positive',
    baseProbability: 0.02,
    probabilityModifiers: (c, _m) => {
      if (c.pmfScore > 75 && c.metrics.growthRate > 0.08) return 0.02;
      return -Infinity;
    },
    severityChance: { minor: 0.0, moderate: 0.4, severe: 0.6 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: randomBetween(0.10, 0.20) * s,
        pmfMod: randomInt(5, 10) * s,
        exitChanceMod: 0.05 * s,
      };
    },
    titleTemplates: [
      'Product-Market Fit Confirmed',
      'PMF Breakthrough Moment',
      'Organic Demand Surges',
    ],
    descriptionTemplates: (c) => [
      `${c.name} has hit a clear product-market fit inflection point in ${c.sector}. Customers are converting faster than the sales team can handle, and NPS scores have hit 70+. ${c.founderName} is fielding inbound interest from strategic partners.`,
      `After months of iteration, ${c.name}'s ${c.sector} product is resonating deeply with customers. Retention is at 95%, expansion revenue is outpacing new logos, and the word-of-mouth flywheel has kicked in.`,
      `${c.name} crossed a critical threshold — customers are now referring other customers unprompted. ${c.founderName} reports that the last 15 deals closed without any outbound effort.`,
    ],
  },
  {
    type: 'revenue_acceleration',
    sentiment: 'positive',
    baseProbability: 0.025,
    probabilityModifiers: (c, _m) => {
      if (c.metrics.mrr > 50000 && c.metrics.growthRate > 0.05) return 0.01;
      return -Infinity;
    },
    severityChance: { minor: 0.2, moderate: 0.5, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        mrrMod: randomBetween(0.15, 0.30) * s,
        growthMod: randomBetween(0.05, 0.10) * s,
      };
    },
    titleTemplates: [
      'Revenue Growth Accelerates',
      'ARR Growth Hits Inflection',
      'Revenue Engine Firing on All Cylinders',
    ],
    descriptionTemplates: (c) => [
      `${c.name}'s revenue engine is firing. MRR grew ${randomInt(20, 40)}% this month alone, driven by a combination of new logos and expansion within existing accounts in ${c.sector}. The team is projecting $${randomInt(5, 20)}M ARR by year-end.`,
      `A new enterprise sales motion at ${c.name} is paying dividends. Average deal sizes have tripled, and the pipeline has never been healthier. ${c.founderName} is considering raising the next round early.`,
      `${c.name} just had their best revenue month ever. A combination of product improvements and a maturing sales team has pushed MRR past $${Math.round(c.metrics.mrr / 1000)}K, with no signs of slowing down.`,
    ],
  },
  {
    type: 'team_scaling_success',
    sentiment: 'positive',
    baseProbability: 0.02,
    probabilityModifiers: (c, _m) => {
      if (c.teamSize > 30 && c.pmfScore > 50) return 0.01;
      return -Infinity;
    },
    severityChance: { minor: 0.3, moderate: 0.5, severe: 0.2 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: randomBetween(0.05, 0.10) * s,
        pmfMod: randomInt(2, 4) * s,
      };
    },
    titleTemplates: [
      'Team Scaling Milestone Reached',
      'Engineering Team Doubles Output',
      'Organizational Maturity Leap',
    ],
    descriptionTemplates: (c) => [
      `${c.name} has successfully scaled from ${Math.max(5, c.teamSize - randomInt(10, 20))} to ${c.teamSize} employees without losing velocity. ${c.founderName} credits strong hiring processes and a culture-first approach to onboarding.`,
      `The ${c.sector} team at ${c.name} shipped more features this quarter than in all of last year combined. New engineering hires are ramping faster than expected, and code quality metrics are actually improving.`,
      `${c.name} just promoted their first layer of middle management. The organizational structure is maturing, and ${c.founderName} is finally able to focus on strategy rather than day-to-day operations.`,
    ],
  },
  {
    type: 'international_market_entry',
    sentiment: 'positive',
    baseProbability: 0.015,
    probabilityModifiers: (c, _m) => {
      if (c.metrics.mrr > 100000 && c.pmfScore > 55) return 0.01;
      return -Infinity;
    },
    severityChance: { minor: 0.2, moderate: 0.5, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        mrrMod: randomBetween(0.08, 0.15) * s,
        growthMod: randomBetween(0.05, 0.08) * s,
        exitChanceMod: 0.03 * s,
      };
    },
    titleTemplates: [
      'International Expansion Succeeds',
      'New Market Entry Gains Traction',
      'Global Footprint Expands',
    ],
    descriptionTemplates: (c) => [
      `${c.name}'s international expansion into Europe is off to a strong start. The first quarter in-market exceeded targets by 40%, and the local team has already closed three enterprise accounts in ${c.sector}.`,
      `${c.name} launched in APAC last month and early signals are extremely positive. ${c.founderName} reports that the product-market fit in Singapore and Australia is even stronger than in the US market.`,
      `The ${c.sector} opportunity abroad proved irresistible — ${c.name} opened a London office and immediately signed a $${randomInt(300, 800)}K annual contract with a FTSE 100 company. The international revenue mix is growing fast.`,
    ],
  },
  {
    type: 'category_leader_recognition',
    sentiment: 'positive',
    baseProbability: 0.015,
    probabilityModifiers: (c, _m) => {
      if (c.metrics.customers > 200 && c.pmfScore > 60) return 0.01;
      return -Infinity;
    },
    severityChance: { minor: 0.2, moderate: 0.5, severe: 0.3 },
    generateEffects: (severity) => {
      const s = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.0 : 0.6;
      return {
        growthMod: randomBetween(0.05, 0.10) * s,
        mrrMod: randomBetween(0.05, 0.10) * s,
        exitChanceMod: 0.05 * s,
      };
    },
    titleTemplates: [
      'Named Category Leader by Analysts',
      'Industry Award Win',
      'Top-Ranked in Analyst Report',
    ],
    descriptionTemplates: (c) => [
      `${c.name} was named a Leader in the latest Gartner Magic Quadrant for ${c.sector}. The recognition is driving significant inbound interest from enterprise buyers who rely on analyst reports for purchasing decisions.`,
      `A prestigious industry publication named ${c.name} the "Most Innovative ${c.sector} Company" of the year. The award has generated substantial media coverage and ${c.founderName} is being invited to keynote major conferences.`,
      `${c.name} topped a G2 Grid Report in ${c.sector} with the highest user satisfaction scores. With ${c.metrics.customers}+ customers and a 4.8-star rating, the brand is becoming synonymous with the category.`,
    ],
  },
];

// ============================================================
// CORE FUNCTIONS
// ============================================================

function rollSeverity(chances: { minor: number; moderate: number; severe: number }): 'minor' | 'moderate' | 'severe' {
  const roll = Math.random();
  if (roll < chances.minor) return 'minor';
  if (roll < chances.minor + chances.moderate) return 'moderate';
  return 'severe';
}

// High-regulatory-risk regions (Feature 5)
const HIGH_REG_REGIONS: StartupRegion[] = ['london', 'berlin', 'singapore'];

export function generateMonthlyEvents(
  company: PortfolioCompany,
  market: MarketCycle,
  region?: StartupRegion
): DynamicEvent[] {
  const events: DynamicEvent[] = [];
  const allTemplates = [...NEGATIVE_EVENTS, ...POSITIVE_EVENTS];

  // Feature 5: Region-based regulatory risk boost
  const regBoost = region && HIGH_REG_REGIONS.includes(region) ? 0.015 : 0;

  for (const template of allTemplates) {
    // Cap at 2 events per company per month
    if (events.length >= 2) break;

    let adjustedProbability = template.baseProbability + template.probabilityModifiers(company, market);
    // Boost regulatory_issue for high-risk regions
    if (template.type === 'regulatory_issue') {
      adjustedProbability += regBoost;
    }

    // Skip if probability is 0 or negative
    if (adjustedProbability <= 0) continue;

    if (Math.random() < adjustedProbability) {
      const severity = rollSeverity(template.severityChance);
      const effects = template.generateEffects(severity);
      const descriptions = template.descriptionTemplates(company);

      const event: DynamicEvent = {
        id: uuid(),
        type: template.type,
        title: pickRandom(template.titleTemplates),
        description: pickRandom(descriptions),
        severity,
        sentiment: template.sentiment,
        effects,
        month: company.monthInvested, // Will be overridden by caller with current month
      };

      events.push(event);
    }
  }

  return events;
}

// ============================================================
// EVENT MODIFIER APPLICATION
// ============================================================

export function applyEventModifiers(
  event: DynamicEvent,
  company: PortfolioCompany
): DynamicEvent {
  // Only reduce negative effects
  if (event.sentiment !== 'negative') return event;

  let reductionMultiplier = 1.0;

  // Lab companies: negative effects reduced by 40-60%
  if (company.origin === 'lab') {
    reductionMultiplier *= randomBetween(0.40, 0.60);
  }
  // Incubator companies: negative effects reduced by 20-30%
  else if (company.origin === 'incubator') {
    reductionMultiplier *= randomBetween(0.70, 0.80);
  }

  // High support score (>50): negative effects reduced by 20%
  if (company.supportScore > 50) {
    reductionMultiplier *= 0.80;
  }

  // Board seat: negative effects reduced by 15%
  if (company.influence === 'board_seat' || company.influence === 'majority') {
    reductionMultiplier *= 0.85;
  }

  // High relationship (>70): negative effects reduced by 10%
  if (company.relationship > 70) {
    reductionMultiplier *= 0.90;
  }

  // Apply reduction to all numeric effects
  const modifiedEffects = { ...event.effects };

  if (modifiedEffects.mrrMod !== undefined && modifiedEffects.mrrMod < 0) {
    modifiedEffects.mrrMod *= reductionMultiplier;
  }
  if (modifiedEffects.relationshipMod !== undefined && modifiedEffects.relationshipMod < 0) {
    modifiedEffects.relationshipMod *= reductionMultiplier;
  }
  if (modifiedEffects.failChanceMod !== undefined && modifiedEffects.failChanceMod > 0) {
    modifiedEffects.failChanceMod *= reductionMultiplier;
  }
  if (modifiedEffects.exitChanceMod !== undefined && modifiedEffects.exitChanceMod < 0) {
    modifiedEffects.exitChanceMod *= reductionMultiplier;
  }
  if (modifiedEffects.growthMod !== undefined && modifiedEffects.growthMod < 0) {
    modifiedEffects.growthMod *= reductionMultiplier;
  }
  if (modifiedEffects.pmfMod !== undefined && modifiedEffects.pmfMod < 0) {
    modifiedEffects.pmfMod *= reductionMultiplier;
  }

  return {
    ...event,
    effects: modifiedEffects,
  };
}
