# Next Steps

Post-MVP improvements organized by priority and effort.

---

## High Priority — Polish & Stability

### Code Splitting

The production bundle is ~1MB, mostly Recharts. Lazy-load chart-heavy pages (`Dashboard`, `Reports`, `Results`) with `React.lazy()` + `Suspense` to improve initial load.

### Loading States & Transitions

- Skeleton loaders for cards and tables
- Advance time overlay (0.5-1s with month summary before state resolves)
- Page transition animations (fade in/out)
- Number count-up animations on metric changes

### Empty States

Every page needs a meaningful empty state:

- Deals: "No deals in pipeline. Hit refresh to scout new startups."
- Portfolio: "No investments yet. Head to Deals to review your pipeline."
- News: "No news yet. Advance time to see market activity."
- Reports: "Reports are generated annually. Keep playing."

### Mobile Polish

- Horizontal scroll on tables → card layout on mobile
- Touch-friendly slider interactions (InvestModal, follow-on)
- Bottom sheet alternatives for modals on small screens

### Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels on badges, progress bars, charts
- Focus management in modals and wizards
- Screen reader support for game state changes

---

## Medium Priority — Gameplay Depth

### Fund Economics

Add realistic GP/LP mechanics:

- 2% management fee (annual, on committed capital)
- 20% carried interest (over hurdle rate)
- GP commit (1-5% of fund from personal capital)
- Fee drag on returns
- Waterfall distribution modeling

### Board Meeting Simulation

Quarterly board meetings as a decision event:

- Present metrics to board (automated)
- Vote on strategic direction
- Handle contentious topics (pivots, down rounds, bridge financing)
- Board composition matters (investor-friendly vs founder-friendly)

### Cap Table Visualization

Interactive cap table per company showing:

- Ownership waterfall across rounds
- Dilution impact of new rounds
- Option pool allocation
- Liquidation preferences

### LP Communication

Direct interactions with LP personas:

- Annual meeting preparation
- Capital call timing decisions
- Distribution announcements
- Managing LP expectations during drawdowns

### Advanced Market Events

- Black swan events (pandemic, financial crisis) — rare, game-changing
- Sector-specific bubbles and corrections
- Interest rate cycle effects on valuations
- IPO window mechanics (open/closed windows)

### Deal Sourcing Mechanics

- Scout network (hire scouts for sector-specific dealflow)
- Reputation system (track record affects inbound quality)
- Conference attendance (spend time/money for deal access)
- LP referrals based on sentiment

---

## High Impact — Monte Carlo Simulation Engine

### The Vision

A headless "what if" mode that runs the VenCap engine 1,000+ times with no UI, aggregating outcomes into probability distributions. Instead of playing one fund manually, you define a thesis and let the simulator stress-test it against realistic conditions.

### Core Concept: Thesis → Simulate → Analyze

```
Input:  Fund config + investment thesis + real-world parameters
Engine: Run 1,000x accelerated game loops (no UI, pure engine)
Output: Probability distributions, survival rates, expected returns
```

**Use cases:**

- "If I raise a $10M seed fund focused on AI/ML, what's my expected TVPI range?"
- "What's the survival rate for a HealthTech startup with $50K MRR and 15% growth?"
- "How does deploying 80% in year 1 vs spreading over 3 years affect outcomes?"
- "What happens to my portfolio if a hard market hits in year 3?"

### Real-World Data Integration

Replace procedural generation with calibrated, real-world parameters:

**Startup base rates** (sourced from public datasets):

- Failure rates by stage, sector, and geography (Crunchbase, PitchBook aggregates)
- Median time-to-exit by sector
- Actual MRR/growth benchmarks by stage (OpenBenchmark, SaaS Capital indices)
- Real CAC/LTV ratios by vertical

**Market conditions** (live or historical feeds):

- Interest rate environment → maps to market cycle probabilities
- Public market multiples (SaaS index, biotech index) → calibrate exit multiples
- VC funding volume by quarter → adjust deal competition and founder willingness
- Sector-specific funding trends (AI boom, crypto winter, etc.)

**News & macro events**:

- Ingest real headlines via news API (or curated dataset)
- Map real events to game event templates (e.g., "Fed raises rates" → market headwind)
- Regulatory changes mapped to sector-specific risk modifiers
- Black swan catalog (COVID, SVB collapse, etc.) as injectable scenario shocks

### Simulation Modes

**Monte Carlo (default):**

- Run N simulations (100 / 1,000 / 10,000)
- Randomize: market cycles, events, founder outcomes, exit timing
- Hold thesis constant (fund config, deployment strategy, support level)
- Output: TVPI distribution (P10, P25, P50, P75, P90), IRR range, failure rate, exit count histogram

**Sensitivity Analysis:**

- Sweep one variable (e.g., check size) across a range
- Hold everything else constant
- Output: how TVPI/IRR shifts as the variable changes
- Identify inflection points and optimal ranges

**Scenario Stress Test:**

- Define specific market sequences (e.g., 2 years bull → 3 years hard → recovery)
- Inject specific events at specific months
- Test portfolio resilience under adversity
- Compare strategies head-to-head under identical conditions

**Backtesting:**

- Feed historical market data (2015-2025 VC environment)
- Calibrate cycle transitions to actual market timing
- Run fund strategy against "what actually happened"
- Compare simulated outcomes to real fund benchmarks

### Implementation Architecture

```
src/engine/simulator.ts    — Headless loop runner (no React, no Zustand)
src/engine/calibration.ts  — Real-world parameter mappings
src/engine/distributions.ts — Statistical output (percentiles, histograms)
src/pages/Simulator.tsx    — UI: thesis input, run controls, results dashboard
```

**Key design constraint:** The existing `advanceTime()` logic must be extractable into a pure function that takes state in and returns state out — no store mutations during simulation. The current engine is already close to this (pure TS, no React), but the Zustand integration needs a clean separation layer.

### Simulator Output Dashboard

**Distribution charts:**

- TVPI histogram (1,000 outcomes) with percentile markers
- IRR bell curve with confidence intervals
- Portfolio size distribution (how many companies survive)
- Time-to-first-exit distribution

**Survival analysis:**

- Company survival curves by sector, stage, origin
- Kaplan-Meier style plots
- Hazard rate by month (when do most failures happen?)

**Strategy comparison:**

- Side-by-side: aggressive deploy vs conservative
- Side-by-side: pure external vs studio-heavy
- Side-by-side: concentrated (5 bets) vs diversified (20 bets)

**Sensitivity heatmaps:**

- 2D grid: check size vs deployment pace → median TVPI
- 2D grid: support spending vs portfolio size → survival rate

### Data Sources (for real-world calibration)

| Data                       | Source                              | Update Frequency |
| -------------------------- | ----------------------------------- | ---------------- |
| Startup failure rates      | Crunchbase, CB Insights             | Quarterly        |
| Median valuations by stage | PitchBook, Carta                    | Quarterly        |
| SaaS benchmarks            | OpenBenchmark, Bessemer Cloud Index | Monthly          |
| VC funding volume          | NVCA, Crunchbase                    | Quarterly        |
| Public market multiples    | Yahoo Finance APIs, Koyfin          | Daily            |
| Interest rates / macro     | FRED API                            | Daily            |
| Tech news / events         | NewsAPI, Hacker News API, RSS feeds | Real-time        |
| Regulatory changes         | SEC EDGAR, manual curation          | As needed        |

### Phased Rollout

**Phase 1 — Headless engine** (no real-world data yet):

- Extract `advanceTime()` into a pure function
- Build `runSimulation(config, n)` that loops N times
- Basic percentile output (P10/P25/P50/P75/P90 for TVPI, IRR)
- Simple results page with histograms

**Phase 2 — Calibrated parameters**:

- Replace hardcoded base rates with data-driven defaults
- Sector-specific failure/exit rates from public datasets
- Market cycle calibration to historical VC winters/booms

**Phase 3 — Live data integration**:

- News API ingestion → event mapping
- Public market feeds → exit multiple calibration
- Interest rate feeds → cycle probability adjustment

**Phase 4 — Advanced analysis**:

- Sensitivity sweeps, scenario builder, backtesting
- Strategy comparison tools
- Exportable reports (PDF, CSV)

---

## Lower Priority — Features & Engagement

### Scenario / Challenge Modes

- **Speed Run**: 5-year fund, compressed timeline
- **Crisis Mode**: Start in a hard market with inherited portfolio
- **Sector Focus**: All deals from one sector
- **Studio Only**: Can only invest through lab/incubator
- **Legacy Fund**: Manage Fund III with existing LP expectations

### Leaderboards

- Anonymous fund performance comparison
- Requires backend (Supabase or similar)
- Metrics: TVPI, IRR, grade, exits, skill level
- Filter by fund type, stage, rebirth count

### Multiplayer / Competitive

- Shared deal pipeline (compete for deals)
- Co-investment mechanics (split rounds)
- LP allocation competition
- Market events affect all players simultaneously

### Shareable Results

- Generate OG image with fund stats
- Shareable URL with encoded game summary
- Twitter/LinkedIn card format
- "My VC Track Record" visual

### Undo / Redo

- Action history stack
- Undo last investment, hire, or support action
- Limited undo count (3 per year) to maintain stakes

### Keyboard Shortcuts

- `Space` → Advance time
- `D` → Go to deals
- `P` → Go to portfolio
- `1-9` → Quick navigate pages
- `Esc` → Close modals

### Tutorial Expansion

- Interactive tutorial (highlight specific UI elements)
- Contextual tooltips on first encounter (TVPI, IRR, PMF, etc.)
- Strategy guide (unlocked tips based on actions taken)
- VC glossary page

---

## Technical Debt

### Testing

No test coverage currently. Priority additions:

1. **Engine unit tests** — `advanceTime()` outcomes, modifier calculations, LP scoring
2. **Component tests** — InvestModal validation, DealCard rendering, wizard flow
3. **Integration tests** — Full game loop (setup → invest → advance → exit → results)
4. **Snapshot tests** — Startup generation distribution validation

### State Management

- Consider `immer` middleware for Zustand to simplify nested state updates
- Separate derived state into selectors to avoid unnecessary re-renders
- Add state migration for localStorage schema changes between versions

### Performance

- Memoize expensive calculations (`useMemo` for filtered/sorted lists)
- Virtualize long lists (portfolio companies, news feed, talent pool)
- Debounce slider inputs in InvestModal
- Profile and optimize `advanceTime()` for large portfolios (20+ companies)

### Type Safety

- Replace magic strings with const enums where possible
- Add runtime validation at engine boundaries (Zod schemas)
- Stricter event effect typing (currently uses generic number fields)

---

## Infrastructure — When Ready for Production

### Backend (Supabase)

- Auth (email, Google, GitHub)
- Game state persistence (replace localStorage)
- Leaderboard storage
- Analytics / telemetry

### Deployment

- Vercel or Netlify for static hosting
- Environment-based configuration
- Error tracking (Sentry)
- Analytics (PostHog or similar)

### CI/CD

- GitHub Actions: lint → type check → test → build → deploy
- Preview deployments on PRs
- Bundle size tracking
- Lighthouse CI for performance regression

---

## Prioritized Roadmap

| Phase    | Focus             | Key Deliverables                                                       |
| -------- | ----------------- | ---------------------------------------------------------------------- |
| **v1.1** | Polish            | Loading states, empty states, mobile polish, code splitting            |
| **v1.2** | Testing           | Engine unit tests, component tests, CI pipeline                        |
| **v1.3** | Depth             | Fund economics, board meetings, cap table                              |
| **v1.4** | Engagement        | Challenge modes, keyboard shortcuts, tutorial expansion                |
| **v2.0** | Backend           | Auth, cloud persistence, leaderboards                                  |
| **v2.1** | Social            | Shareable results, multiplayer foundation                              |
| **v3.0** | Simulator         | Headless Monte Carlo engine, 1000x sim runs, distribution dashboards   |
| **v3.1** | Real-World Data   | Calibrated base rates, live market feeds, news API integration         |
| **v3.2** | Advanced Analysis | Sensitivity sweeps, backtesting, scenario builder, strategy comparison |
