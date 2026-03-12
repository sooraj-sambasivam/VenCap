# Engine — Simulation Core

The engine lives in `src/engine/` and contains **zero React imports**. Every file is pure TypeScript — testable in isolation, portable to a server or CLI.

---

## File Map

| File               | Responsibility                                   | Exports                                                     |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------- |
| `types.ts`         | All interfaces, enums, constants                 | 20+ types                                                   |
| `gameState.ts`     | Zustand store, `advanceTime()` loop, all actions | `useGameStore`                                              |
| `mockData.ts`      | Startup generation, sector data, acquirer data   | `generateStartup()`, sector/name pools                      |
| `dynamicEvents.ts` | Monthly event generation & application           | `generateMonthlyEvents()`, `applyEventModifiers()`          |
| `lpSentiment.ts`   | LP scoring, pressure reports, effects            | `calculateLPSentiment()`, `generateLPReport()`              |
| `talentMarket.ts`  | Talent pool, hiring, alumni                      | `generateTalentPool()`, `processAlumni()`                   |
| `vcRealism.ts`     | Ownership rules, check sizes, buyout math        | `getCheckSizeRange()`, `getOwnershipRange()`, `canInvest()` |

---

## Types System (`types.ts`)

### Core Enums

```
FundType:      regional | national | multistage | family_office
FundStage:     pre_seed | seed | series_a | growth
MarketCycle:   bull | normal | cooldown | hard
CompanyStatus: active | exited | failed
CompanyOrigin: external | incubator | lab | buyout
FounderState:  focused | distracted | burned_out | overconfident | defensive | coachable
InfluenceLevel: observer | advisor | board_seat | majority
EventSeverity: minor | moderate | severe
```

### Key Interfaces

**Startup** — A deal in the pipeline:

- Identity: name, sector, stage, description, founderName
- Founder traits: grit, clarity, charisma, experience (1-10 scale)
- Metrics: mrr, growthRate, customers, churn, burnRate, runway
- Unit economics: cac, ltv, ltvCacRatio, grossMargin, paybackMonths
- Market: tam, tamGrowth, competitionLevel
- Valuation, strengths[], risks[], redFlags[], ddNotes[]
- Co-investors with tier modifiers (failMod, exitMod, growthMod)
- Discovery source, founder willingness (0-100)

**PortfolioCompany** — Extends Startup with investment data:

- investedAmount, ownership, currentValuation, multiple
- Status, origin, founderState, pmfScore, relationship, supportScore
- Influence level, monthsActive
- Event history, hired talent roster

**Fund** — The player's fund:

- name, type, stage, currentSize, cashAvailable, deployedAmount
- currentMonth (0-119), tvpiEstimate, irrEstimate
- skillLevel (persists across rebirths), rebirthCount

**DynamicEvent** — Monthly company event:

- type, severity (minor/moderate/severe), sentiment (positive/negative)
- effects: mrrMod, relationshipMod, failChanceMod, exitChanceMod, growthMod, pmfMod

**LPSentiment** — Trust tracker:

- score (0-100), level (excellent → critical)
- 8 factor breakdowns

---

## Game State Store (`gameState.ts`)

Zustand store with persist middleware → localStorage key `vencap-game-state`.

### State Shape

```
Core:       fund, marketCycle, gamePhase (setup/playing/ended)
Portfolio:  portfolio[], dealPipeline[]
LP:         lpSentiment, lpReports[]
Studio:     incubatorBatches[], activeIncubator, labProjects[]
Market:     talentPool[]
Events:     news[], pendingDecisions[], secondaryOffers[], followOnOpportunities[]
Analytics:  monthlySnapshots[], dealsReviewed, dealsPassed
```

### Actions

| Action                                      | Description                                           |
| ------------------------------------------- | ----------------------------------------------------- |
| `initFund(config)`                          | Create fund from wizard, set gamePhase to playing     |
| `advanceTime()`                             | Core monthly loop (see [Game Logic](./game-logic.md)) |
| `invest(startupId, amount, ownership)`      | Move deal from pipeline to portfolio                  |
| `passOnDeal(startupId)`                     | Remove deal from pipeline                             |
| `followOn(companyId, amount)`               | Invest in follow-on round                             |
| `skipFollowOn(companyId)`                   | Decline, accept dilution penalty                      |
| `sellSecondary(offerId)`                    | Sell partial stake to buyer                           |
| `resolveDecision(decisionId, optionIdx)`    | Choose option for pending decision                    |
| `hireTalent(companyId, talentId)`           | Assign talent candidate to company                    |
| `supportAction(companyId, action)`          | Execute support action (mentoring, ops, etc.)         |
| `launchIncubator()`                         | Start new batch (costs 1% of fund)                    |
| `mentorIncubatorCompany(companyId, action)` | Apply mentoring action                                |
| `graduateIncubator()`                       | Graduate batch → companies enter portfolio            |
| `createLabProject(config)`                  | Start lab project with sector + problem               |
| `assignLabFounder(projectId, talentId)`     | Match founder to lab project                          |
| `spinOutLab(projectId)`                     | Launch lab company into portfolio                     |
| `rebirth()`                                 | End current fund, start new with skill carryover      |
| `refreshDeals()`                            | Generate 3 new pipeline startups                      |

---

## Startup Generation (`mockData.ts`)

### 15 Sectors

SaaS, Fintech, HealthTech, AI/ML, DevTools, Marketplace, Consumer, CleanTech, EdTech, Cybersecurity, DeepTech, Biotech, SpaceTech, AgTech, PropTech

Each sector defines:

- Name word pools (2-word random combinations)
- 4 description templates
- 8 strength phrases
- 8 risk phrases
- 5 red flag phrases
- 4 DD note phrases

### Generation Pipeline

```
1. Pick stage (from fund or random)
2. Pick sector (random from 15)
3. Generate name (sector pool → 2-word combo)
4. Roll founder traits (grit, clarity, charisma: 3-10; experience: 2-8 + stage bonus)
5. Generate unit economics (ranges scale by stage)
6. Generate company metrics (MRR, growth, churn, burn, runway — stage-scaled)
7. Calculate valuation (base range × market multiplier)
8. Pick signals (2-3 strengths, 1-2 risks, 0-1 red flags, 1-2 DD notes)
9. Roll discovery source (25% inbound, 30% referral, 20% conference, 10% news, 15% cold)
10. Roll co-investors (0-2, tier distribution: 15% tier1, 40% friendly, 25% competitive, 20% strategic)
11. Calculate founder willingness (40-85 base, market-adjusted)
```

### Co-Investor Tiers

| Tier        | Fail Mod | Exit Mod | Growth Mod | Reputation |
| ----------- | -------- | -------- | ---------- | ---------- |
| Tier 1      | 0.90     | 1.15     | 1.10       | 80-100     |
| Friendly    | 0.95     | 1.05     | 1.05       | 50-80      |
| Competitive | 1.00     | 1.05     | 0.95       | 60-90      |
| Strategic   | 0.95     | 1.20     | 1.00       | 40-70      |

### Acquirer Types (on exit)

| Type            | Companies                             | Multiple Range |
| --------------- | ------------------------------------- | -------------- |
| FAANG           | Alphabet, Meta, Apple, Amazon, etc.   | 10-20x         |
| Enterprise      | ServiceNow, Salesforce, Workday, etc. | 3-7x           |
| Acquihire       | Stripe, Shopify, Figma, etc.          | 0.5-2x         |
| PE              | Thoma Bravo, Vista, Silver Lake, etc. | 2-5x           |
| Strategic Rival | Generated from sector context         | 4-10x          |

---

## Dynamic Events (`dynamicEvents.ts`)

### Event Templates

**Negative (9 types):**

| Event                  | Base Prob                   | Key Effects                           |
| ---------------------- | --------------------------- | ------------------------------------- |
| Founder Conflict       | 3%                          | relationship -10-20, fail +5-15%      |
| Product Setback        | 2%                          | MRR -5-15%, PMF -5-10                 |
| Key Employee Departure | 2.5%                        | growth -5-10%, MRR -3-8%              |
| New Competitor         | 3%                          | growth -5-15%, MRR -2-5%              |
| CEO Burnout            | 1.5%                        | growth -10-20%, fail +10-20%          |
| Press Scandal          | 1%                          | relationship -15, fail +15%, MRR -10% |
| Market Headwind        | 4% (+2-4% cooldown/hard)    | growth -5-15%                         |
| Regulatory Issue       | 1% (+2% fintech/healthtech) | fail +5-10%, growth -5-10%            |
| Cash Crunch            | 2% (+3% if runway <6mo)     | fail +10-20%, relationship -3-8       |

**Positive (6 types):**

| Event                 | Base Prob                       | Key Effects                |
| --------------------- | ------------------------------- | -------------------------- |
| Market Tailwind       | 4% (+3% bull)                   | growth +5-15%              |
| Viral Moment          | 1.5% (+1% if PMF >70)           | MRR +10-25%, growth +5-10% |
| Strategic Partnership | 2% (+2% strategic co-investors) | growth +5-10%, exit +5%    |
| Key Hire              | 2% (+2% if support >50)         | growth +5-10%, PMF +3-5    |
| Surprise M&A Interest | 1.5% (req. MRR >100k, PMF >50)  | exit +15-25%               |
| Major Customer Win    | 3%                              | MRR +5-15%, growth +3-5%   |

### Severity System

Roll: minor 30-40%, moderate 40-50%, severe 20-30%.

Severity scalar on all effects: minor 0.6x, moderate 1.0x, severe 1.5x.

### Event Mitigation

Negative event effects are reduced by:

- Lab origin: 40-60% reduction
- Incubator origin: 20-30% reduction
- High support (>50): 20% reduction
- Board seat / majority: 15% reduction
- High relationship (>70): 10% reduction

These stack multiplicatively.

---

## LP Sentiment Engine (`lpSentiment.ts`)

### 8 Scoring Factors

Each factor contributes a bounded score. Sum starts from baseline 50, clamped 0-100.

| Factor                | Range      | What It Measures                               |
| --------------------- | ---------- | ---------------------------------------------- |
| Portfolio Performance | -20 to +20 | Weighted average multiple across investments   |
| Event Quality         | -15 to +15 | Recent severe negative events (last 12 months) |
| Valuation Momentum    | -10 to +10 | Average multiple of active companies           |
| Support Quality       | -10 to +10 | Average support score of active portfolio      |
| Deployment Pace       | -10 to +10 | Deployment % relative to fund year targets     |
| Lab Quality           | -10 to +10 | Lab spinout performance vs external deals      |
| Incubator Output      | -10 to +10 | Graduation rate, incubator company multiples   |
| Market Adjustment     | -15 to +15 | Cycle context, outperformance bonuses          |

### Sentiment Levels

| Level     | Score Range |
| --------- | ----------- |
| Excellent | 80-100      |
| Good      | 60-79       |
| Neutral   | 40-59       |
| Concerned | 20-39       |
| Critical  | 0-19        |

### LP Effects (feedback into game)

| Effect          | Range       | Impact                                   |
| --------------- | ----------- | ---------------------------------------- |
| commitmentMod   | 0.70 - 1.30 | Future fundraising (rebirth)             |
| dealflowMod     | 0.80 - 1.20 | New deal quality                         |
| founderTrustMod | -15 to +15  | Starting relationship on new investments |
| coInvestorMod   | 0.75 - 1.25 | Co-investor participation rates          |

### Annual Pressure Report

Generated every 12 months. Grades deployment pace, breakout companies (>3x), red flags (severe events + failures), cash reserves, studio ROI (lab + incubator multiples). Overall grade A-F.

---

## Talent Market (`talentMarket.ts`)

### Pool Generation

Pool size by market cycle:

- Bull: 6-10 (salary 1.3x — talent is expensive)
- Normal: 8-12 (salary 1.0x)
- Cooldown: 10-14 (salary 1.0x — more available)
- Hard: 12-15 (salary 0.7x — talent abundant, cheap)

6 roles: Engineering, Sales, Product, Marketing, Operations, Executive.
4 seniority levels: Junior, Mid, Senior, Leadership.

### Salary Ranges (pre-market adjustment)

| Seniority  | Range         | Reputation |
| ---------- | ------------- | ---------- |
| Junior     | $80K - $120K  | 20-50      |
| Mid        | $120K - $180K | 35-65      |
| Senior     | $180K - $280K | 50-85      |
| Leadership | $280K - $450K | 65-100     |

### Hire Probability

Base 50%, modified by:

- Lab company: +25%
- Leadership seniority: -20%, Senior: -10%
- High relationship (>60): +10%
- Bull market: -15%, Hard market: +20%
- High MRR (>$500k): +10%
- Clamped to 10-95%

### Hire Effects by Role

Seniority multiplier: junior 0.5x, mid 0.8x, senior 1.0x, leadership 1.5x.

| Role        | PMF  | Growth | MRR    | Support | Burn   | Customers |
| ----------- | ---- | ------ | ------ | ------- | ------ | --------- |
| Engineering | +2-5 | +3-8%  | —      | —       | —      | —         |
| Sales       | —    | +2-4%  | +5-15% | —       | —      | —         |
| Product     | +3-7 | +2-5%  | —      | —       | —      | —         |
| Marketing   | —    | +3-6%  | —      | —       | —      | +5-15%    |
| Operations  | —    | —      | —      | +3-6    | -5-10% | —         |
| Executive   | +1-3 | —      | —      | +5-10   | —      | —         |

### Alumni System

When a company fails, 1-3 employees become available:

- Biased toward mid/senior/leadership (40/40/20)
- +10 reputation bonus (learned from failure)
- Marked `isAlumni: true`

---

## VC Realism Rules (`vcRealism.ts`)

### Ownership Limits by Stage

| Stage    | Min | Max |
| -------- | --- | --- |
| Pre-seed | 7%  | 20% |
| Seed     | 5%  | 15% |
| Series A | 3%  | 12% |
| Growth   | 2%  | 8%  |

Adjusted by relationship (>70 → +25% max) and market (hard → +25% max).

### Check Size Ranges (% of fund)

| Fund Type     | Min | Max |
| ------------- | --- | --- |
| Regional      | 1%  | 5%  |
| National      | 2%  | 8%  |
| Multi-stage   | 1%  | 10% |
| Family Office | 2%  | 15% |

Stage scalar: pre-seed 0.4x, seed 0.65x, series A 1.0x, growth 1.6x.

### Valuation Ranges (pre-market)

| Stage    | Range        |
| -------- | ------------ |
| Pre-seed | $2M - $5M    |
| Seed     | $5M - $15M   |
| Series A | $15M - $50M  |
| Growth   | $50M - $300M |

Market multiplier: bull 1.4x, normal 1.0x, cooldown 0.7x, hard 0.5x.

### Influence from Ownership

| Ownership | Level      |
| --------- | ---------- |
| < 10%     | Observer   |
| 10-24%    | Advisor    |
| 25-49%    | Board Seat |
| 50-74%    | Board Seat |
| ≥ 75%     | Majority   |

### Deployment Guard

Years 1-3: cannot deploy more than 80% of fund (reserves for follow-ons).
