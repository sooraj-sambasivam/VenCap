# Game Logic & Algorithms

The core simulation runs through `advanceTime()` — a single function that processes one month of game time. Every mechanic described here executes within that loop.

---

## The Monthly Loop

```
advanceTime() sequence:
│
├─ 1. Increment month (0 → 119)
├─ 2. Market cycle check
├─ 3. For each active portfolio company:
│     ├─ 3a. Calculate composite modifiers
│     ├─ 3b. Generate & apply dynamic events
│     ├─ 3c. Failure check
│     ├─ 3d. Exit check
│     ├─ 3e. Growth calculation
│     ├─ 3f. Follow-on generation
│     ├─ 3g. Decision generation
│     ├─ 3h. Secondary offer generation
│     ├─ 3i. Relationship decay
│     ├─ 3j. PMF drift
│     ├─ 3k. Founder state transition
│     └─ 3l. Influence recalculation
├─ 4. Process exit cash returns
├─ 5. Year-end checks (every 12 months)
├─ 6. Refresh talent pool
├─ 7. Generate new deals (3 startups)
├─ 8. Update fund metrics (TVPI, IRR)
├─ 9. Check game end (month ≥ 120)
└─ 10. Generate news + clean expired items
```

---

## Market Cycles

4-phase cycle that affects every system in the game:

```
bull → normal → cooldown → hard → normal → bull (repeats)
```

**Transition rules:**
- Checked every 12-24 months (random interval)
- 60% chance to advance to next phase
- 30% chance to stay in current phase
- 10% chance to skip a phase (e.g. bull → cooldown)

**Impact matrix:**

| System | Bull | Normal | Cooldown | Hard |
|--------|------|--------|----------|------|
| Company growth | 1.15x | 1.0x | 0.85x | 0.70x |
| Exit multiples | 1.3x | 1.0x | 0.8x | 0.6x |
| Valuations | 1.4x | 1.0x | 0.7x | 0.5x |
| Talent pool size | 6-10 | 8-12 | 10-14 | 12-15 |
| Talent salary | 1.3x | 1.0x | 1.0x | 0.7x |
| Founder willingness | -15 | 0 | +10 | +20 |
| Hire probability | -15% | 0 | 0 | +20% |

---

## The Modifier System

Every company outcome (fail, exit, growth) runs through a compound modifier stack. All modifiers multiply together.

### Modifier Sources

**Origin bonuses:**
| Origin | Fail Mod | Exit Mod |
|--------|----------|----------|
| Lab | 0.80 | 1.15 |
| Incubator | 0.85 | 1.10 |
| External | 1.00 | 1.00 |

**Support score (if >30):**
- failMod × 0.60, growthMod × 1.15

**Relationship:**
| Relationship | Fail Mod |
|-------------|----------|
| < 30 | × 1.50 |
| > 70 | × 0.75 |

**Ownership / Influence:**
| Ownership | Fail Mod | Exit Mod |
|-----------|----------|----------|
| < 10% | 1.00 | 1.00 |
| 10-24% | 0.90 | 1.00 |
| 25-49% | 0.80 | 1.10 |
| 50-74% | 0.70 | 1.15 |
| ≥ 75% | 0.60 | 1.20 |

Board seat or majority adds: failMod × 0.80, exitMod × 1.15

**Founder state:**
| State | Growth Mod | Fail Mod |
|-------|-----------|----------|
| Focused | 1.10 | 1.00 |
| Coachable | 1.05 | 0.90 |
| Distracted | 0.95 | 1.05 |
| Overconfident | 1.05 | 1.10 |
| Defensive | 0.90 | 1.10 |
| Burned Out | 0.85 | 1.25 |

**PMF score:**
| PMF | Growth Mod | Fail Mod |
|-----|-----------|----------|
| > 70 | × 2.0 | × 0.80 |
| < 40 | × 0.5 | × 1.20 |

**Co-investors:** Each co-investor's failMod, exitMod, growthMod stacks multiplicatively.

### Example Modifier Calculation

A lab-origin company with 30% ownership, focused founder, PMF 75, support score 40, relationship 80, one tier-1 co-investor:

```
failMod = 1.0
  × 0.80  (lab origin)
  × 0.60  (support > 30)
  × 0.75  (relationship > 70)
  × 0.80  (25-49% ownership)
  × 0.80  (board seat)
  × 1.00  (focused founder)
  × 0.80  (PMF > 70)
  × 0.90  (tier-1 co-investor)
  = 0.165  → ~83% reduction in base failure rate
```

This is what makes studio-built, well-supported companies significantly safer.

---

## Failure Algorithm

```
baseFailChance = { pre_seed: 3%, seed: 2%, series_a: 1.5%, growth: 1% }
finalChance = baseFailChance[stage] × compoundFailMod
roll = Math.random()
if (roll < finalChance) → company fails
```

On failure:
- Status set to `failed`, valuation → 0, multiple → 0
- Failure reason generated (contextual narrative)
- News item created
- 1-3 alumni enter talent pool

---

## Exit Algorithm

Only runs if company didn't fail this month.

```
baseExitChance = { pre_seed: 0.3%, seed: 0.5%, series_a: 0.8%, growth: 1.2% }
monthBonus = max(0, (monthsActive - 48) × 0.001)  // pressure after year 4
finalChance = (baseExitChance[stage] + monthBonus) × compoundExitMod
roll = Math.random()
if (roll < finalChance) → company exits
```

**Exit valuation:**

```
1. Determine acquirer type (weighted by PMF + MRR):
   - High PMF/MRR → FAANG, strategic_rival, enterprise, PE
   - Otherwise → enterprise, acquihire, PE, strategic_rival

2. Get base multiple range from acquirer type:
   - FAANG: 10-20x, Enterprise: 3-7x, Acquihire: 0.5-2x, PE: 2-5x, Strategic: 4-10x

3. Apply market modifier:
   - bull: 1.3x, normal: 1.0x, cooldown: 0.8x, hard: 0.6x

4. Apply bonuses:
   - PMF > 60: × 1.2
   - Relationship > 70: × 1.1
   - Support: + 0.5% per support score point

5. Cash returned = exitValue × (ownership / 100) → added to fund.cashAvailable
```

---

## Growth Algorithm

Runs each month for active, non-exited, non-failed companies.

```
baseGrowth = random(0.9, 1.2)
marketMod = { bull: 1.15, normal: 1.0, cooldown: 0.85, hard: 0.70 }
finalGrowth = baseGrowth × marketMod[cycle] × compoundGrowthMod
```

**Applied to metrics:**
- `mrr × finalGrowth`
- `customers × (1 + (finalGrowth - 1) × 0.5)` — customers grow at half the rate
- `growthRate` clamped to 0-100%
- `valuation × finalGrowth`
- `multiple = valuation / investedAmount`

**Runway recalculation:**
```
if burnRate > 0:
  netBurn = burnRate - mrr
  if netBurn > 0: runway = max(0, round(valuation × 0.1 / netBurn))
  else: runway = 36 months (sustainable)
```

---

## Founder State Machine

20% chance to transition each month. New state weighted by conditions:

| Condition | Likely States |
|-----------|--------------|
| Growth >10% + relationship >60 | focused, coachable |
| Growth <3% + relationship <40 | defensive, burned_out |
| Growth >8% + support <30 | overconfident |
| Otherwise | focused, distracted, coachable (mixed) |

---

## Relationship Decay

Every month, relationship decreases unless protected:

| Condition | Decay/month |
|-----------|------------|
| Board seat or majority | 0 (no decay) |
| Lab/incubator origin or >50% ownership | -0.5 |
| Default | -1.0 |

Minimum: 10. This means neglected companies slowly drift toward danger.

---

## PMF Drift

Each month: `pmfScore += random(-3, +3)`, clamped 0-100.

PMF also shifts from events and support actions. It's the single most impactful metric — crossing the 70 threshold doubles growth and reduces failure by 20%.

---

## Opportunity Generation

**Follow-on opportunities** — Generated when:
- `monthsActive > 6` AND `multiple > 2` AND `relationship > 40`
- Round size: 15-30% of current valuation
- Dilution if skipped: 5-15%

**Pending decisions** — 25% chance per month if board seat or majority:
- 5 archetypes (pivot, hire, restructure, etc.)
- 3+ options with metric effects
- 3-month deadline

**Secondary offers** — 10% chance if `multiple > 3`:
- Buyer offers 20-50% of your stake
- At 70-95% of current multiple (discount)
- 3-month expiration

---

## LP Sentiment Scoring

Calculated every 12 months. 8 factors sum to a score (baseline 50, range 0-100):

### Factor Details

**Portfolio Performance** (-20 to +20):
```
weightedAvgMultiple = Σ(multiple × investedAmount) / Σ(investedAmount)
if > 2.0x: score scales +10 to +20
if 1.0-2.0x: score scales 0 to +10
if < 1.0x: score scales -20 to 0
```

**Deployment Pace** (-10 to +10):
```
deploymentRatio = deployed / fundSize

Years 1-3:   20-60% = +5,  <10% = -5,  >70% = -5
Years 4-7:   50-80% = +5,  <30% = -5,  >90% = -3
Years 8-10:  ≥70% = +5,    <50% = -5
```

**Market Adjustment** (-15 to +15):
```
Base: bull +8, normal +2, cooldown -5, hard -10
Outperformance bonus (hard/cooldown): avgGrowth >8% → +5, TVPI >1.5x → +3
Underperformance penalty (bull): avgGrowth <5% → -3, TVPI <1.0x → -5
```

### Pressure Report Grading

```
Score each dimension: strong=4, adequate=3, concerning=2, critical=1
Average across: deployment, reserves, studio ROI
Bonus: breakouts >2 → +0.5, TVPI >2x → +0.5
Penalty: red flags >3 → -0.5, TVPI <0.8x → -0.5

A: ≥3.5  B: ≥2.8  C: ≥2.0  D: ≥1.5  F: <1.5
```

---

## End-Game Scoring

At month 120, final grade calculated:

| Grade | Label |
|-------|-------|
| A+ | Legendary Fund |
| A | Top-Tier |
| B+ | Strong Performer |
| B | Above Average |
| C+ | Solid |
| C | Middle of the Pack |
| D | Below Average |

Based on: final TVPI, IRR, exit count, LP sentiment history, skill level accumulated.

**Skill level** persists across rebirths — good investments, successful exits, and avoiding hype traps earn skill points. Higher skill slightly improves future fund performance.

---

## Rebirth Mechanic

When starting a new fund after game end:
- Skill level carries over (accumulated from all prior funds)
- LP commitment modifier from final sentiment affects new fund size
- Deal quality slightly improved at higher skill levels
- Founder trust modifier adjusts starting relationship on new investments
- Rebirth count incremented (displayed in setup wizard)

This creates a meta-progression loop — each playthrough teaches patterns that compound into better outcomes.

---

## Key Feedback Loops

**Positive spiral:** High support → better PMF → higher growth → better multiples → happy LPs → better dealflow → more co-investors → lower fail rates

**Death spiral:** Neglect companies → relationship decays → founder state degrades → growth slows → bad events hit harder → companies fail → LP sentiment drops → worse dealflow

**Studio advantage:** Lab/incubator companies start with built-in mitigation (lower fail rates, higher exit rates, reduced event damage). The cost is upfront cash (1% for incubator, ownership dilution for lab) and time investment.

**Market timing:** Deploying in a hard market gets cheaper valuations and more ownership, but companies face growth headwinds. Bull markets offer growth tailwinds but expensive entry points and scarce talent. The best strategy adapts to cycles.
