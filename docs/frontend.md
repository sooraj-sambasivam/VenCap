# Frontend Architecture

## Routing

React Router v7 with 9 routes + a catch-all redirect:

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Index | Fund setup wizard |
| `/dashboard` | Dashboard | Command center, time advancement |
| `/deals` | Deals | Deal pipeline, investment decisions |
| `/portfolio` | Portfolio | Active investment management |
| `/incubator` | Incubator | Batch mentoring program |
| `/lab` | Lab | Venture studio creation flow |
| `/news` | News | Market intelligence feed |
| `/reports` | Reports | Annual LP performance reports |
| `/results` | Results | End-of-fund scorecard |
| `*` | → `/` | Catch-all redirect |

**Layout shell** (`App.tsx`): `BrowserRouter` → `TooltipProvider` → `NavBar` (sticky) → page content area (`pt-14` to clear nav) → `Toaster` (sonner).

---

## Pages

### Index — Fund Setup Wizard

4-step sequential flow:

1. **Name Your Fund** — Text input, 3-50 character validation
2. **Choose Fund Type** — Card grid (Regional, National, Multi-stage, Family Office). Each type sets fund size range and check size limits
3. **Choose Stage Focus** — Card grid (Pre-seed, Seed, Series A, Growth). Sets valuation ranges, ownership limits, deal pipeline characteristics
4. **Raise from LPs** — Animated LP commitment sequence. 5-8 LP names appear sequentially (400ms intervals), each contributing a portion of the target raise. Running total animates to final amount

On completion, calls `initFund()` and redirects to `/dashboard`.

**Edge cases handled:**
- If fund already exists (`gamePhase !== 'setup'`), auto-redirects to `/dashboard`
- Rebirth banner shown if `rebirthCount > 0`, displaying inherited skill level
- LP animation uses `setTimeout` + `forEach` (not `setInterval`) to avoid closure bugs

---

### Dashboard — Command Center

The main hub. 9 sections top-to-bottom:

**1. Fund Header**
- Fund name, type badge, stage badge, market cycle badge (color-coded), LP sentiment pill

**2. Key Metrics** (4-card grid)
- Fund size (total raised)
- Cash available (with % of fund)
- TVPI (green ≥2x, yellow ≥1x, red <1x)
- Deployment (% deployed + absolute dollar amount)

**3. Portfolio Summary** (4 cards)
- Active companies
- Exits (with total return amount)
- Write-offs (with total loss)
- Deals reviewed / passed (lifetime stats)

**4. Charts** (rendered after month 1)
- Portfolio Value Over Time (dual-line: value + cash)
- Deployment Pace (area chart + ideal pace reference line)
- LP Sentiment Trend (line chart with green/red zones)
- Sector Allocation (pie chart)

**5. Alerts Panel** (conditional)
- Follow-on opportunities count
- Pending decisions count
- Secondary offers count
- Links to Portfolio page

**6. Portfolio Events** — Recent 3 events with severity/sentiment indicators

**7. Latest LP Report** — Preview with TVPI, IRR, highlights. Link to full Reports page

**8. Quick Actions** — 4 buttons: Review Deals, Manage Portfolio, Incubator, Venture Lab

**9. Advance Time Button**
- Primary CTA: "Advance to [Month] Year [Y]"
- Shows active company count + pending items
- Triggers `advanceTime()`, then displays toast with exit/failure summary
- Changes to "View Results" when `gamePhase === 'ended'`

**Onboarding modal** shown on first visit (5-step tutorial, dismissible with "don't show again").

---

### Deals — Deal Flow & Investment

**Pipeline display** with filter + sort controls:
- **Sector filter** — Dropdown with all 15 sectors
- **Stage filter** — Pre-seed, Seed, Series A, Growth, All
- **Sort** — Valuation (asc/desc), Growth Rate (asc/desc), Name
- **Refresh** — Generates 3 new startups via `generateStartup()`

Each deal renders as a `DealCard` with Pass/Invest buttons. Invest opens `InvestModal`.

---

### Portfolio — Investment Management

**Company list** with expandable detail rows. Each row shows:
- Name, origin badge, status badge
- Invested amount, ownership %, current value, multiple
- Founder state, PMF score
- Alert indicator (yellow dot) for pending items

**Filters**: Status (all/active/exited/failed), Origin (all/external/incubator/lab/buyout)

**Expanded detail** uses Tabs:

| Tab | Content |
|-----|---------|
| **Actions** | 3 tiers: Basic (always), Advanced (advisor+), Studio (lab/buyout origin) |
| **Events** | Chronological timeline with severity badges, sentiment dots |
| **Follow-On** | Round details, amount slider, new ownership preview, skip penalty |
| **Secondary** | Buyer offer details, cash calculation, sell/reject |
| **Decisions** | Multiple-choice company decisions with effect previews |
| **Team** | Hired talent roster with role, reputation, salary |

**Action tiers:**
- *Basic*: Connect Talent, Make Intros, Give Advice
- *Advanced*: Hire Executive, Force Focus, Restructure Burn, Replace GTM, Founder Intervention
- *Studio*: Engineering Sprint, GTM Sprint, Product Sprint, Capital Injection

---

### Incubator — Batch Mentoring

**Active batch** displays 2-4 company cards:
- Founder trait bars (grit, clarity, charisma, experience)
- Metrics: MRR, growth rate, runway
- 3 one-time mentoring actions: Refine Pitch, Intro Advisors, GTM Plan
- Progress tracker (X of 3 actions completed)

**Actions**: Launch new batch (costs 1% of fund), Graduate batch (awards 2% free equity, 80 starting relationship, -15% permanent fail reduction)

**Past batches**: Collapsible list with company outcomes

---

### Lab — Venture Studio

4-step creation wizard:

1. **Choose Sector** — Grid of 15 sectors
2. **Define Problem** — Text input + vision level (Focused / Medium / Moonshot)
3. **Match Founder** — Select from talent pool (senior/leadership candidates)
4. **Assemble & Spin Out** — Review, optional team boosts, launch

Spun-out companies enter portfolio with origin `lab`, 40-80% ownership, and permanent bonuses (-20% fail rate, +15% exit rate).

**Sections**: Active lab projects (in-progress), Past spinouts with portfolio performance

---

### News — Market Intelligence

Chronological feed (newest first). Each card shows:
- Sentiment dot (green/red/blue)
- Type badge (Funding Round, Exit, Market Trend, Cycle Change, Regulation, Scandal)
- Portfolio-related indicator
- Headline + summary + timestamp

**Filters**: Type, Sentiment (positive/negative/neutral), Portfolio-only toggle

---

### Reports — LP Annual Reports

**Report list** with expandable rows. Collapsed: year, TVPI badge, IRR, one-liner.

**Expanded full report** (8 sections):
1. Letter from GP — Tone-adjusted narrative
2. Key Metrics — TVPI, IRR, cash position, exit count
3. Top Performers — Best companies by multiple
4. Exits — Details on successful exits
5. Write-offs — Failed companies with post-mortems
6. Concerns — Areas requiring attention
7. Market Commentary — Cycle conditions, outlook
8. Cash Position — Remaining capital, reserves

Includes **LP Pressure Report** with grades: deployment rating, breakout companies, red flags, reserves rating, studio ROI, overall grade (A+ to F).

---

### Results — End-of-Fund Scorecard

Shown when `gamePhase === 'ended'` (month 120):

- **Hero section**: Fund name, grade (A+ to D), grade label
- **Key metrics**: Final TVPI, IRR, total investments, successful exits
- **Fund summary**: Raised, deployed, returned, cash remaining, best exit, worst investment
- **Portfolio breakdown**: Full company table with invested/value/multiple/status
- **Skill assessment**: Skill level, star rating, rebirth info
- **Actions**: "Start New Fund" (rebirth with skill carryover), "Copy Summary" (clipboard)

---

## Shared Components

### NavBar
Sticky top navigation. Desktop: horizontal links. Mobile: hamburger → Sheet drawer. Shows current month/year. Active route highlighting. Hidden during setup phase.

### DealCard
Full startup display card. Sections: founder name + traits (progress bars), metrics grid (MRR, growth, churn, burn, runway), unit economics (CAC, LTV, LTV:CAC, gross margin), market data (TAM, competition), signals (strengths as green pills, risks as yellow, red flags as red), DD notes (expandable), co-investors with tier indicators, founder willingness bar, Pass/Invest CTAs.

### InvestModal
shadcn Dialog. Investment amount slider (range from `getCheckSizeRange`), real-time ownership calculator, ownership range warnings (stage-specific), influence level preview (observer → majority), co-investor display, founder willingness risk alert, validation gating.

### Charts
4 Recharts components: `PortfolioValueChart` (dual-line), `DeploymentPaceChart` (area + reference), `LPSentimentChart` (line with zones), `SectorAllocationChart` (pie). Dark-themed with indigo/emerald/rose/amber palette. Responsive containers.

### Onboarding
5-step modal tutorial: Welcome, Dashboard intro, Deal review, Time advancement, Goal. localStorage persistence, "don't show again" checkbox, step indicator dots.

---

## State Management

All pages consume state from `useGameStore` (Zustand):

```
Read:  fund, gamePhase, portfolio, dealPipeline, marketCycle,
       lpSentiment, lpReports, news, talentPool,
       monthlySnapshots, pendingDecisions, secondaryOffers,
       followOnOpportunities, incubatorBatches, labProjects,
       dealsReviewed, dealsPassed

Write: initFund(), advanceTime(), invest(), passOnDeal(),
       followOn(), skipFollowOn(), sellSecondary(),
       resolveDecision(), hireTalent(), supportAction(),
       launchIncubator(), mentorIncubatorCompany(),
       graduateIncubator(), createLabProject(),
       assignLabFounder(), spinOutLab(), rebirth(),
       refreshDeals()
```

No Redux, no Context API. Single store, single source of truth. Persist middleware serializes to localStorage under `vencap-game-state`.

---

## UI Patterns

**Color coding:**
- Green → positive (exits, gains, excellent sentiment, high PMF)
- Red → negative (failures, losses, critical sentiment, red flags)
- Yellow → warning (dilution, concerns, risks)
- Blue → neutral/info (active companies, lab origin)
- Purple → studio-related (incubator, lab)

**Badges**: Origin (external/incubator/lab/buyout), status (active/exited/failed), founder state, sentiment level, market cycle

**Layout**: Card-based throughout. Responsive grids (1 col mobile → 2-4 desktop). Expandable/collapsible rows. Tabbed detail views. Modals for input/confirmation.

**Responsive breakpoints**: `sm` 640px, `md` 768px, `lg` 1024px. Mobile hamburger nav, stacked cards. Desktop multi-column grids.

**shadcn/ui components used**: Button, Card, Input, Slider, Table, Tabs, Tooltip, Badge, Dialog, Sheet, Progress, Separator, Select, ScrollArea, DropdownMenu, Label, Sonner (toasts).
