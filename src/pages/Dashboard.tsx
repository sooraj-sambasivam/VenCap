import { useEffect, useMemo, useCallback, useState, lazy, Suspense } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useGameStore } from '@/engine/gameState'
import { formatCurrency, formatMultiple, formatPercent, formatIRR, formatFeeRate, getMonthName, getGameYear } from '@/lib/utils'
import { getAchievement } from '@/engine/achievements'

// Lazy-load Recharts-heavy charts — splits ~380KB into a separate chunk
const PortfolioValueChart = lazy(() => import('@/components/Charts').then(m => ({ default: m.PortfolioValueChart })))
const DeploymentPaceChart = lazy(() => import('@/components/Charts').then(m => ({ default: m.DeploymentPaceChart })))
const LPSentimentChart = lazy(() => import('@/components/Charts').then(m => ({ default: m.LPSentimentChart })))
const SectorAllocationChart = lazy(() => import('@/components/Charts').then(m => ({ default: m.SectorAllocationChart })))
import { Onboarding } from '@/components/Onboarding'
import { PageShell } from '@/components/PageShell'
import { toast } from 'sonner'
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Briefcase,
  AlertTriangle,
  Zap,
  FileText,
  ArrowRight,
  Play,
  Loader2,
  Trophy,
  Building2,
  Lightbulb,
  FlaskConical,
  HandCoins,
  BarChart3,
  Clock,
  XCircle,
  Handshake,
  RotateCcw,
  Calendar,
  Flag,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'

// ============ HELPERS ============

const MARKET_COLORS: Record<string, string> = {
  bull: 'bg-green-500/20 text-green-400 border-green-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cooldown: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const LP_COLORS: Record<string, string> = {
  excellent: 'bg-green-500/20 text-green-400',
  good: 'bg-emerald-500/20 text-emerald-400',
  neutral: 'bg-blue-500/20 text-blue-400',
  concerned: 'bg-yellow-500/20 text-yellow-400',
  critical: 'bg-red-500/20 text-red-400',
}

const FUND_TYPE_LABELS: Record<string, string> = {
  regional: 'Regional',
  national: 'National',
  multistage: 'Multi-stage',
  family_office: 'Family Office',
}

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  series_a: 'Series A',
  growth: 'Growth',
}

// ============ COMPONENT ============

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    fund,
    gamePhase,
    marketCycle,
    portfolio,
    lpSentiment,
    lpReports,
    pendingDecisions,
    secondaryOffers,
    buyoutOffers,
    followOnOpportunities,
    dealsReviewed,
    dealsPassed,
    monthlySnapshots,
    boardMeetings,
    history,
    activeScenario,
    unlockedAchievements,
    advanceTime,
    undoAdvance,
  } = useGameStore()

  // Redirect to setup if no fund
  useEffect(() => {
    if (!fund || gamePhase === 'setup') {
      navigate('/', { replace: true })
    }
  }, [fund, gamePhase, navigate])

  // Show toast when new achievements are unlocked
  const [prevAchievementCount, setPrevAchievementCount] = useState(unlockedAchievements?.length ?? 0)
  useEffect(() => {
    const currentCount = unlockedAchievements?.length ?? 0
    if (currentCount > prevAchievementCount) {
      // Show toast for each new achievement
      const newOnes = (unlockedAchievements ?? []).slice(prevAchievementCount)
      for (const id of newOnes) {
        const ach = getAchievement(id)
        if (ach) {
          toast.success(`${ach.icon} Achievement Unlocked: ${ach.name}`, {
            description: ach.description,
          })
        }
      }
      setPrevAchievementCount(currentCount)
    }
  }, [unlockedAchievements, prevAchievementCount])

  if (!fund) return null

  // Computed values
  const activeCompanies = portfolio.filter((c) => c.status === 'active')
  const exits = portfolio.filter((c) => c.status === 'exited')
  const writeoffs = portfolio.filter((c) => c.status === 'failed')
  const totalExitReturn = exits.reduce((s, c) => s + (c.exitData?.exitValue ?? 0) * (c.ownership / 100), 0)
  const totalLost = writeoffs.reduce((s, c) => s + c.investedAmount, 0)
  const deployedPct = fund.currentSize > 0 ? (fund.deployed / fund.currentSize) * 100 : 0

  // TVPI color
  const tvpiColor =
    fund.tvpiEstimate >= 2
      ? 'text-green-400'
      : fund.tvpiEstimate >= 1
        ? 'text-yellow-400'
        : 'text-red-400'

  // Recent events across portfolio (this year)
  const currentYear = getGameYear(fund.currentMonth)
  const yearStartMonth = (currentYear - 1) * 12
  const thisYearEvents = portfolio.flatMap((c) =>
    c.events.filter((e) => e.month >= yearStartMonth && e.month <= fund.currentMonth)
  )
  const severeEvents = thisYearEvents.filter((e) => e.severity === 'severe' && e.sentiment === 'negative').length
  const positiveEvents = thisYearEvents.filter((e) => e.sentiment === 'positive').length
  const recentEvents = [...thisYearEvents].sort((a, b) => b.month - a.month).slice(0, 3)

  // Latest LP report
  const latestReport = lpReports.length > 0 ? lpReports[lpReports.length - 1] : null

  // Board meetings pending
  const pendingBoardMeetings = (boardMeetings || []).filter((m) => !m.attended)

  // LP actions ready (not on cooldown)
  const LP_ACTION_TYPES = ['quarterly_update', 'lp_day', 'oneonone_call', 'coinvest_opportunity', 'early_distribution'] as const
  const lpActionsReady = LP_ACTION_TYPES.filter(
    (at) => !(fund.lpActionCooldowns ?? []).some((c) => c.actionType === at && c.availableFromMonth > fund.currentMonth)
  ).length

  // Alerts count
  const totalAlerts = followOnOpportunities.length + pendingDecisions.length + secondaryOffers.length + (buyoutOffers || []).length + pendingBoardMeetings.length

  // Next month display
  const nextMonth = fund.currentMonth + 1
  const nextMonthName = getMonthName(nextMonth)
  const nextYear = getGameYear(nextMonth)

  // Sector allocation data for pie chart
  const sectorData = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of portfolio) {
      map.set(c.sector, (map.get(c.sector) ?? 0) + c.investedAmount)
    }
    return Array.from(map, ([sector, amount]) => ({ sector, amount }))
  }, [portfolio])

  const [advancing, setAdvancing] = useState(false)

  const handleAdvance = useCallback(() => {
    setAdvancing(true)
    // Let spinner render before sync computation
    requestAnimationFrame(() => {
      const prevPortfolio = useGameStore.getState().portfolio
      advanceTime()
      const state = useGameStore.getState()

      // Summarize what happened
      const newExits = state.portfolio.filter(
        (c) => c.status === 'exited' && !prevPortfolio.find((p) => p.id === c.id && p.status === 'exited')
      )
      const newFails = state.portfolio.filter(
        (c) => c.status === 'failed' && !prevPortfolio.find((p) => p.id === c.id && p.status === 'failed')
      )

      for (const exit of newExits) {
        toast.success(`${exit.name} acquired by ${exit.exitData?.acquirerName ?? 'unknown'}!`, {
          description: `${formatMultiple(exit.exitData?.exitMultiple ?? 0)} return`,
        })
      }
      for (const fail of newFails) {
        toast.error(`${fail.name} has shut down`, {
          description: fail.failureReason ?? 'The company failed.',
        })
      }

      if (newExits.length === 0 && newFails.length === 0) {
        const active = state.portfolio.filter((c) => c.status === 'active').length
        const pending = state.pendingDecisions.length
        toast.info(`Advanced to ${getMonthName(state.fund!.currentMonth)} Year ${getGameYear(state.fund!.currentMonth)}`, {
          description: `${active} active companies, ${pending} pending decisions`,
        })
      }

      setAdvancing(false)
    })
  }, [advanceTime])

  return (
    <PageShell className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Onboarding Tutorial */}
      <Onboarding fundName={fund.name} fundSize={fund.currentSize} />

      {/* ROW 1: Fund Header */}
      <div data-tour="fund-header" className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold mr-2">{fund.name}</h1>
        <Badge variant="secondary">{FUND_TYPE_LABELS[fund.type]}</Badge>
        <Badge variant="secondary">{STAGE_LABELS[fund.stage]}</Badge>
        <Badge
          className={`${MARKET_COLORS[marketCycle]} border animate-pulse`}
        >
          {marketCycle.charAt(0).toUpperCase() + marketCycle.slice(1)} Market
        </Badge>
        <Badge className={LP_COLORS[lpSentiment.level]}>
          LP: {lpSentiment.level.charAt(0).toUpperCase() + lpSentiment.level.slice(1)}
        </Badge>
        <span className="ml-auto text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Year {getGameYear(fund.currentMonth)}, {getMonthName(fund.currentMonth)}
        </span>
      </div>

      {/* Scenario Banner */}
      {activeScenario && activeScenario.id !== 'sandbox' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Flag className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-primary">{activeScenario.name}</span>
              <span className="text-muted-foreground hidden sm:inline">—</span>
              {activeScenario.winConditions.map((wc, i) => {
                let progress = ''
                if (wc.type === 'tvpi') progress = `TVPI ${formatMultiple(fund.tvpiEstimate)} / ${formatMultiple(wc.threshold)} needed`
                else if (wc.type === 'exits') progress = `${portfolio.filter(c => c.status === 'exited').length} / ${wc.threshold} exits`
                else if (wc.type === 'lp_sentiment') progress = `LP Sentiment ${Math.round(lpSentiment.score)} / ${wc.threshold} needed`
                return (
                  <span key={i} className="text-muted-foreground">
                    {wc.description}
                    {progress && <span className="ml-2 text-foreground font-medium">({progress})</span>}
                  </span>
                )
              })}
              <Badge variant="outline" className="ml-auto text-xs capitalize">{activeScenario.difficulty}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ROW 2: Key Metrics */}
      <div data-tour="key-metrics" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Fund Size"
          value={formatCurrency(fund.currentSize)}
          sub="raised"
        />
        <MetricCard
          icon={<Briefcase className="h-4 w-4" />}
          label="Cash Available"
          value={formatCurrency(fund.cashAvailable)}
          sub={`${formatPercent(fund.currentSize > 0 ? (fund.cashAvailable / fund.currentSize) * 100 : 0, 0)} of fund`}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="TVPI"
          value={formatMultiple(fund.tvpiEstimate)}
          valueClass={tvpiColor}
          dataTour="tvpi-card"
        />
        <MetricCard
          icon={<PieChart className="h-4 w-4" />}
          label="Deployed"
          value={formatPercent(deployedPct, 0)}
          sub={formatCurrency(fund.deployed)}
        />
      </div>

      {/* ROW 3: Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Building2 className="h-4 w-4" />}
          label="Active"
          value={`${activeCompanies.length}`}
          sub="companies"
        />
        <MetricCard
          icon={<Trophy className="h-4 w-4" />}
          label="Exits"
          value={`${exits.length}`}
          sub={totalExitReturn > 0 ? `${formatCurrency(totalExitReturn)} returned` : 'none yet'}
        />
        <MetricCard
          icon={<XCircle className="h-4 w-4" />}
          label="Write-offs"
          value={`${writeoffs.length}`}
          sub={totalLost > 0 ? `${formatCurrency(totalLost)} lost` : 'none yet'}
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Deals"
          value={`${dealsReviewed}`}
          sub={`${dealsPassed} passed`}
        />
      </div>

      {/* ROW 3.5: Fund Economics Bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span className="text-muted-foreground font-medium">Fund Economics</span>
            <span>Mgmt Fee: <span className="font-medium">{formatFeeRate(fund.managementFeeRate ?? 0.02)}</span></span>
            <span>Carry: <span className="font-medium">{formatFeeRate(fund.carryRate ?? 0.20)}</span></span>
            <span>Hurdle: <span className="font-medium">{formatFeeRate(fund.hurdleRate ?? 0.08)}</span></span>
            <span className="hidden sm:inline">Fees Charged: <span className="font-medium text-yellow-400">{formatCurrency(fund.totalFeesCharged ?? 0)}</span></span>
            <span className="hidden sm:inline">Carry Accrued: <span className="font-medium text-emerald-400">{formatCurrency(fund.carryAccrued ?? 0)}</span></span>
            <span className="hidden sm:inline">GP Earnings: <span className="font-medium text-primary">{formatCurrency(fund.gpEarnings ?? 0)}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      {monthlySnapshots.length > 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
            <PortfolioValueChart data={monthlySnapshots} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
            <DeploymentPaceChart data={monthlySnapshots} fundSize={fund.currentSize} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
            <LPSentimentChart data={monthlySnapshots} />
          </Suspense>
          {sectorData.length > 0 && (
            <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
              <SectorAllocationChart data={sectorData} />
            </Suspense>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Charts will appear after your first month. Hit Advance Time to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Board Meeting Warning */}
      {pendingBoardMeetings.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-400">
                {pendingBoardMeetings.length} Board Meeting{pendingBoardMeetings.length !== 1 ? 's' : ''} Pending
              </p>
              <p className="text-xs text-muted-foreground">
                Respond before the next month or company relationships will suffer.
              </p>
            </div>
            <Link to="/portfolio">
              <Button size="sm" variant="outline" className="gap-1">
                Review <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ROW 4: Alerts Panel */}
      {totalAlerts > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Alerts
              <Badge variant="secondary" className="ml-1">{totalAlerts}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {followOnOpportunities.slice(0, 3).map((fo) => {
              const company = portfolio.find((c) => c.id === fo.companyId)
              return (
                <AlertRow
                  key={`fo-${fo.companyId}`}
                  color="text-blue-400"
                  icon={<HandCoins className="h-3.5 w-3.5" />}
                  text={`Follow-on: ${company?.name ?? 'Unknown'} — ${formatCurrency(fo.roundSize)} round`}
                  to="/portfolio"
                />
              )
            })}
            {pendingDecisions.slice(0, 3).map((pd) => {
              const company = portfolio.find((c) => c.id === pd.companyId)
              return (
                <AlertRow
                  key={`pd-${pd.id}`}
                  color="text-yellow-400"
                  icon={<Zap className="h-3.5 w-3.5" />}
                  text={`Decision: ${company?.name ?? 'Unknown'} — ${pd.title}`}
                  to="/portfolio"
                />
              )
            })}
            {secondaryOffers.slice(0, 2).map((so) => {
              const company = portfolio.find((c) => c.id === so.companyId)
              return (
                <AlertRow
                  key={`so-${so.id}`}
                  color="text-green-400"
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                  text={`Secondary: ${so.buyerName} wants ${so.offerPercentage}% of ${company?.name ?? 'Unknown'}`}
                  to="/portfolio"
                />
              )
            })}
            {(buyoutOffers || []).slice(0, 2).map((bo) => {
              const company = portfolio.find((c) => c.id === bo.companyId)
              return (
                <AlertRow
                  key={`bo-${bo.id}`}
                  color="text-orange-400"
                  icon={<Handshake className="h-3.5 w-3.5" />}
                  text={`Buyout: ${bo.buyerName} wants ${company?.name ?? 'Unknown'} for ${formatCurrency(bo.offerPrice)}`}
                  to="/portfolio"
                />
              )
            })}
            {pendingBoardMeetings.slice(0, 2).map((bm) => {
              const company = portfolio.find((c) => c.id === bm.companyId)
              return (
                <AlertRow
                  key={`bm-${bm.id}`}
                  color="text-blue-400"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  text={`Board Meeting: ${company?.name ?? 'Unknown'} — ${bm.agendaItems.length} agenda item${bm.agendaItems.length !== 1 ? 's' : ''}`}
                  to="/portfolio"
                />
              )
            })}
            {totalAlerts > 10 && (
              <Link to="/portfolio" className="block text-center text-xs text-muted-foreground hover:text-foreground pt-1">
                +{totalAlerts - 10} more alerts — view in Portfolio
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* ROW 5: Portfolio Event Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Portfolio Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            This Year: <span className="text-red-400 font-medium">{severeEvents} severe</span>
            {' / '}
            <span className="text-green-400 font-medium">{positiveEvents} positive</span> events
          </p>
          {recentEvents.length > 0 ? (
            <div className="space-y-2">
              {recentEvents.map((evt) => (
                <div key={evt.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      evt.sentiment === 'positive'
                        ? 'bg-green-400'
                        : evt.sentiment === 'negative'
                          ? 'bg-red-400'
                          : 'bg-blue-400'
                    }`}
                  />
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-medium">{evt.title}</span>
                    {' — '}
                    {evt.description.slice(0, 80)}{evt.description.length > 80 ? '...' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No events this year yet.</p>
          )}
        </CardContent>
      </Card>

      {/* ROW 6: Latest LP Report */}
      {latestReport && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Latest LP Report — Year {latestReport.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              TVPI: <span className="text-foreground font-medium">{formatMultiple(latestReport.tvpi)}</span>
              {' | '}
              IRR: <span className="text-foreground font-medium">{formatIRR(latestReport.irr)}</span>
              {latestReport.highlights.length > 0 && (
                <span className="block mt-1">{latestReport.highlights[0]}</span>
              )}
            </div>
            <Link to="/reports">
              <Button variant="ghost" size="sm" className="gap-1">
                View Full Report <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* LP Actions Badge */}
      {lpActionsReady > 0 && (
        <Link to="/reports">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm hover:bg-blue-500/15 transition-colors cursor-pointer">
            <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />
            <span className="text-blue-400 font-medium">{lpActionsReady} LP action{lpActionsReady !== 1 ? 's' : ''} ready</span>
            <ArrowRight className="h-3.5 w-3.5 text-blue-400 ml-auto" />
          </div>
        </Link>
      )}

      {/* ROW 7: Quick Actions */}
      <div data-tour="quick-actions" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/deals" className="contents">
          <Button variant="secondary" className="h-12 gap-2 w-full">
            <Briefcase className="h-4 w-4" /> Review Deals
          </Button>
        </Link>
        <Link to="/portfolio" className="contents">
          <Button variant="secondary" className="h-12 gap-2 w-full">
            <Building2 className="h-4 w-4" /> Manage Portfolio
          </Button>
        </Link>
        <Link to="/incubator" className="contents">
          <Button variant="secondary" className="h-12 gap-2 w-full">
            <Lightbulb className="h-4 w-4" /> Incubator
          </Button>
        </Link>
        <Link to="/lab" className="contents">
          <Button variant="secondary" className="h-12 gap-2 w-full">
            <FlaskConical className="h-4 w-4" /> Venture Lab
          </Button>
        </Link>
      </div>

      {/* ROW 8: Advance Time / View Results */}
      {gamePhase === 'ended' ? (
        <Link to="/results" className="block">
          <Button className="w-full h-14 text-lg gap-2" size="lg">
            <Trophy className="h-5 w-5" /> View Results
          </Button>
        </Link>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-14 px-3 gap-1.5 shrink-0 text-muted-foreground"
            onClick={() => { undoAdvance(); toast.info('Reverted to previous month.') }}
            disabled={!history || history.length === 0}
            title="Undo last month advance"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">
              {history && history.length > 0 ? `Undo (${history.length})` : 'Undo'}
            </span>
          </Button>
          <Button
            data-tour="advance-time"
            className="flex-1 h-14 text-lg gap-2"
            size="lg"
            onClick={handleAdvance}
            disabled={advancing}
          >
            {advancing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            <span className="truncate">
              {advancing ? 'Simulating...' : `Advance to ${nextMonthName} Y${nextYear}`}
            </span>
            {!advancing && (
              <span className="text-sm text-primary-foreground/70 ml-2 hidden sm:inline">
                {activeCompanies.length} active, {pendingDecisions.length} pending
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Footer stats */}
      <div className="flex justify-center gap-6 text-xs text-muted-foreground/50 pt-2">
        <span>Skill Level: {fund.skillLevel}</span>
        {fund.rebirthCount > 0 && <span>Rebirths: {fund.rebirthCount}</span>}
      </div>
    </PageShell>
  )
}

// ============ SUB-COMPONENTS ============

function MetricCard({
  icon,
  label,
  value,
  sub,
  valueClass,
  dataTour,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  valueClass?: string
  dataTour?: string
}) {
  return (
    <Card {...(dataTour ? { 'data-tour': dataTour } : {})}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={`text-xl font-bold ${valueClass ?? ''}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function AlertRow({
  color,
  icon,
  text,
  to,
}: {
  color: string
  icon: React.ReactNode
  text: string
  to: string
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center gap-2 w-full text-left text-sm p-2 rounded-lg hover:bg-secondary/50 transition-colors ${color}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-muted-foreground truncate">{text}</span>
    </button>
  )
}
