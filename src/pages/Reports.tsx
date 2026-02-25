import { useEffect, useState, lazy, Suspense } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useGameStore } from '@/engine/gameState'
import { formatCurrency, formatMultiple, formatPercent, formatIRR } from '@/lib/utils'
import type { LPReport, LPPressureReport, LPActionType } from '@/engine/types'
import { getBenchmarkForFund } from '@/engine/benchmarkData'
import { calculateLPActionEffect } from '@/engine/lpSentiment'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingUp,
  Trophy,
  XCircle,
  AlertTriangle,
  BarChart3,
  DollarSign,
  MessageSquare,
  Landmark,
  ScrollText,
  Star,
  Phone,
  Users,
  Gift,
  Handshake,
} from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { toast } from 'sonner'
const LazyWaterfallChart = lazy(() => import('@/components/Charts').then(m => ({ default: m.WaterfallChart })))

// ============ HELPERS ============

function getTvpiColor(tvpi: number): string {
  if (tvpi >= 3) return 'text-green-400'
  if (tvpi >= 2) return 'text-emerald-400'
  if (tvpi >= 1) return 'text-yellow-400'
  return 'text-red-400'
}

function getTvpiBadge(tvpi: number): { label: string; className: string } {
  if (tvpi >= 3) return { label: 'Outstanding', className: 'bg-green-500/20 text-green-400' }
  if (tvpi >= 2) return { label: 'Strong', className: 'bg-emerald-500/20 text-emerald-400' }
  if (tvpi >= 1.5) return { label: 'On Track', className: 'bg-blue-500/20 text-blue-400' }
  if (tvpi >= 1) return { label: 'Below Target', className: 'bg-yellow-500/20 text-yellow-400' }
  return { label: 'Underperforming', className: 'bg-red-500/20 text-red-400' }
}

function getGradeBadge(grade: string): string {
  if (grade === 'A' || grade === 'A+') return 'bg-green-500/20 text-green-400'
  if (grade === 'B' || grade === 'B+') return 'bg-emerald-500/20 text-emerald-400'
  if (grade === 'C' || grade === 'C+') return 'bg-yellow-500/20 text-yellow-400'
  if (grade === 'D' || grade === 'D+') return 'bg-orange-500/20 text-orange-400'
  return 'bg-red-500/20 text-red-400'
}

function getOneLineSummary(report: LPReport): string {
  if (report.exits.length > 0 && report.tvpi >= 2) {
    return `Strong year with ${report.exits.length} exit${report.exits.length > 1 ? 's' : ''} and portfolio momentum.`
  }
  if (report.tvpi >= 1.5) {
    return `Solid performance with ${formatMultiple(report.tvpi)} TVPI and healthy portfolio growth.`
  }
  if (report.writeOffs.length > 0 && report.tvpi < 1) {
    return `Challenging year with ${report.writeOffs.length} write-off${report.writeOffs.length > 1 ? 's' : ''} impacting returns.`
  }
  if (report.concerns.length > 0) {
    return `Mixed results with emerging concerns requiring LP attention.`
  }
  if (report.highlights.length > 0) {
    return report.highlights[0]
  }
  return `Year ${report.year} annual fund report.`
}

// ============ COMPONENT ============

export default function Reports() {
  const navigate = useNavigate()
  const { fund, gamePhase, lpReports, lpSentiment, portfolio, marketCycle, performLPAction, syndicatePartners } = useGameStore()

  const [expandedYear, setExpandedYear] = useState<number | null>(null)

  // Redirect to setup if no fund
  useEffect(() => {
    if (!fund || gamePhase === 'setup') {
      navigate('/', { replace: true })
    }
  }, [fund, gamePhase, navigate])

  if (!fund) return null

  // Find pressure report for a given year
  const getPressureReport = (year: number): LPPressureReport | undefined => {
    return lpSentiment.pressureReports.find((pr) => pr.year === year)
  }

  // Sort reports chronologically (most recent first)
  const sortedReports = [...lpReports].sort((a, b) => b.year - a.year)

  return (
    <PageShell className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">LP Reports</h1>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {lpReports.length} Report{lpReports.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Separator />

      {/* Fund Context */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>{fund.name}</span>
        <span>Fund Size: {formatCurrency(fund.currentSize)}</span>
        <span>Current TVPI: <span className={`font-medium ${getTvpiColor(fund.tvpiEstimate)}`}>{formatMultiple(fund.tvpiEstimate)}</span></span>
        <Badge variant="outline" className="text-xs capitalize">{marketCycle} Market</Badge>
      </div>

      {/* LP Communication Card */}
      <LPCommunicationCard
        fund={fund}
        lpSentiment={lpSentiment}
        portfolio={portfolio}
        onAction={performLPAction}
      />

      {/* Benchmark Section */}
      {fund.currentMonth >= 24 && (
        <BenchmarkSection fund={fund} />
      )}

      {/* Fund Performance Waterfall */}
      {fund.currentMonth >= 12 && (
        <Suspense fallback={<Card><CardContent className="py-8 text-center text-muted-foreground">Loading chart...</CardContent></Card>}>
          <LazyWaterfallChart
            data={{
              invested: fund.deployed,
              cashReturned: portfolio.filter(c => c.status === 'exited').reduce((sum, c) => sum + (c.exitData?.exitValue ?? 0) * (c.ownership / 100), 0),
              unrealizedValue: portfolio.filter(c => c.status === 'active').reduce((sum, c) => sum + c.currentValuation * (c.ownership / 100), 0),
              fees: fund.totalFeesCharged ?? 0,
              carry: fund.carryAccrued ?? 0,
            }}
          />
        </Suspense>
      )}

      {/* Performance by Sector */}
      {portfolio.length > 0 && (
        <SectorPerformanceTable portfolio={portfolio} />
      )}

      {/* Performance by Vintage */}
      {portfolio.length > 0 && fund.currentMonth >= 24 && (
        <VintagePerformanceTable portfolio={portfolio} fundMonth={fund.currentMonth} />
      )}

      {/* Syndicate Network */}
      {(syndicatePartners?.length ?? 0) > 0 && (
        <SyndicateNetworkSection partners={syndicatePartners} />
      )}

      {/* Empty State */}
      {sortedReports.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Annual LP reports are generated at the end of each fund year. Continue advancing time to
              receive your first report.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report List */}
      <div className="space-y-3">
        {sortedReports.map((report) => {
          const isExpanded = expandedYear === report.year
          const tvpiBadge = getTvpiBadge(report.tvpi)
          const pressureReport = getPressureReport(report.year)

          return (
            <div key={report.year} className="space-y-0">
              {/* Collapsed Row */}
              <Card
                className={`cursor-pointer transition-colors hover:bg-secondary/30 ${
                  isExpanded ? 'rounded-b-none border-b-0' : ''
                }`}
                onClick={() => setExpandedYear(isExpanded ? null : report.year)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex flex-col items-center justify-center w-14 shrink-0">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Year</span>
                        <span className="text-xl font-bold">{report.year}</span>
                      </div>
                      <Separator orientation="vertical" className="h-10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-base font-semibold ${getTvpiColor(report.tvpi)}`}>
                            {formatMultiple(report.tvpi)} TVPI
                          </span>
                          <Badge className={tvpiBadge.className}>{tvpiBadge.label}</Badge>
                          {pressureReport && (
                            <Badge className={getGradeBadge(pressureReport.overallGrade)}>
                              Grade: {pressureReport.overallGrade}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {getOneLineSummary(report)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">IRR</p>
                        <p className="text-sm font-medium">{formatIRR(report.irr)}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expanded Full Report */}
              {isExpanded && (
                <FullReport
                  report={report}
                  pressureReport={pressureReport}
                  fundName={fund.name}
                  activeCount={portfolio.filter((c) => c.status === 'active').length}
                  totalInvested={fund.deployed}
                />
              )}
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}

// ============ FULL REPORT ============

function FullReport({
  report,
  pressureReport,
  fundName,
  activeCount,
  totalInvested,
}: {
  report: LPReport
  pressureReport: LPPressureReport | undefined
  fundName: string
  activeCount: number
  totalInvested: number
}) {
  const tvpiBadge = getTvpiBadge(report.tvpi)

  return (
    <Card className="rounded-t-none border-t-0">
      <CardContent className="p-0">
        {/* Document-style report container */}
        <div className="bg-secondary/20 rounded-b-lg">
          {/* Report Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                  Annual Report
                </p>
                <h2 className="text-xl font-bold">{fundName} -- Year {report.year}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Prepared for Limited Partners
                </p>
              </div>
              <div className="text-right">
                <Badge className={tvpiBadge.className}>{tvpiBadge.label}</Badge>
              </div>
            </div>
          </div>

          {/* Section: Letter from GP */}
          <ReportSection
            icon={<MessageSquare className="h-4 w-4" />}
            title="Letter from the General Partner"
          >
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dear Limited Partners,
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                {report.highlights.length > 0
                  ? `We are pleased to present the Year ${report.year} annual report for ${fundName}. `
                  : `We present the Year ${report.year} annual report for ${fundName}. `}
                {report.tvpi >= 2
                  ? `The fund has delivered strong returns with a TVPI of ${formatMultiple(report.tvpi)} and an IRR of ${formatPercent(report.irr)}. `
                  : report.tvpi >= 1
                    ? `The fund is progressing with a TVPI of ${formatMultiple(report.tvpi)} and an IRR of ${formatPercent(report.irr)}. `
                    : `The fund faces headwinds with a current TVPI of ${formatMultiple(report.tvpi)}. `}
                {report.exits.length > 0
                  ? `We realized ${report.exits.length} successful exit${report.exits.length > 1 ? 's' : ''} during the period. `
                  : ''}
                {report.writeOffs.length > 0
                  ? `We experienced ${report.writeOffs.length} write-off${report.writeOffs.length > 1 ? 's' : ''}, which we address in detail below. `
                  : ''}
                {report.concerns.length > 0
                  ? `There are ${report.concerns.length} area${report.concerns.length > 1 ? 's' : ''} of concern that we want to bring to your attention. `
                  : ''}
                We continue to actively manage the portfolio of {activeCount} companies with {formatCurrency(totalInvested)} deployed to date.
              </p>
              {report.highlights.length > 0 && (
                <div className="mt-3 space-y-1">
                  {report.highlights.map((h, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                      {h}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </ReportSection>

          <Separator className="mx-6" />

          {/* Section: Key Metrics */}
          <ReportSection
            icon={<BarChart3 className="h-4 w-4" />}
            title="Key Metrics"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricBox label="Net TVPI" value={formatMultiple(report.netTvpi ?? report.tvpi)} valueClass={getTvpiColor(report.netTvpi ?? report.tvpi)} sub={`Gross: ${formatMultiple(report.grossTvpi ?? report.tvpi)}`} />
              <MetricBox label="Net IRR" value={formatPercent(report.netIrr ?? report.irr)} valueClass={(report.netIrr ?? report.irr) >= 15 ? 'text-green-400' : (report.netIrr ?? report.irr) >= 0 ? 'text-yellow-400' : 'text-red-400'} sub={`Gross: ${formatPercent(report.grossIrr ?? report.irr)}`} />
              <MetricBox label="Cash Position" value={formatCurrency(report.cashPosition)} />
              <MetricBox label="Exits" value={`${report.exits.length}`} sub={report.exits.length > 0 ? 'realized' : 'none'} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <MetricBox label="Fees (YTD)" value={formatCurrency(report.feesChargedYtd ?? 0)} valueClass="text-yellow-400" />
              <MetricBox label="Total Fees" value={formatCurrency(report.totalFeesCharged ?? 0)} />
              <MetricBox label="Carry Accrued" value={formatCurrency(report.carryAccrued ?? 0)} valueClass="text-emerald-400" />
              <MetricBox label="Distributions" value={formatCurrency(report.distributionsToDate ?? 0)} />
            </div>
            {pressureReport && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <MetricBox label="Overall Grade" value={pressureReport.overallGrade} valueClass={pressureReport.overallGrade.startsWith('A') ? 'text-green-400' : pressureReport.overallGrade.startsWith('B') ? 'text-emerald-400' : 'text-yellow-400'} />
                <MetricBox label="Deployment" value={pressureReport.deploymentRating} />
                <MetricBox label="Breakout Cos." value={`${pressureReport.breakoutCompanies}`} />
                <MetricBox label="Red Flags" value={`${pressureReport.redFlagCount}`} valueClass={pressureReport.redFlagCount > 2 ? 'text-red-400' : 'text-muted-foreground'} />
              </div>
            )}
          </ReportSection>

          <Separator className="mx-6" />

          {/* Section: Top Performers */}
          {report.topPerformers.length > 0 && (
            <>
              <ReportSection
                icon={<Star className="h-4 w-4" />}
                title="Top Performers"
              >
                <div className="space-y-2">
                  {report.topPerformers.map((performer, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{performer}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
              <Separator className="mx-6" />
            </>
          )}

          {/* Section: Exits */}
          {report.exits.length > 0 && (
            <>
              <ReportSection
                icon={<Trophy className="h-4 w-4" />}
                title="Exits"
              >
                <div className="space-y-2">
                  {report.exits.map((exit, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{exit}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
              <Separator className="mx-6" />
            </>
          )}

          {/* Section: Write-offs */}
          {report.writeOffs.length > 0 && (
            <>
              <ReportSection
                icon={<XCircle className="h-4 w-4" />}
                title="Write-offs"
              >
                <div className="space-y-2">
                  {report.writeOffs.map((wo, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{wo}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
              <Separator className="mx-6" />
            </>
          )}

          {/* Section: Concerns */}
          {report.concerns.length > 0 && (
            <>
              <ReportSection
                icon={<AlertTriangle className="h-4 w-4" />}
                title="Concerns"
              >
                <div className="space-y-2">
                  {report.concerns.map((concern, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">{concern}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
              <Separator className="mx-6" />
            </>
          )}

          {/* Section: Market Commentary */}
          <ReportSection
            icon={<TrendingUp className="h-4 w-4" />}
            title="Market Commentary"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              {report.marketNotes || 'No market commentary available for this period.'}
            </p>
          </ReportSection>

          <Separator className="mx-6" />

          {/* Section: Cash Position */}
          <ReportSection
            icon={<Landmark className="h-4 w-4" />}
            title="Cash Position"
          >
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(report.cashPosition)}</p>
                <p className="text-xs text-muted-foreground mt-1">Available for deployment and reserves</p>
              </div>
            </div>
            {pressureReport && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Badge variant="outline" className="text-xs">
                  Reserves: {pressureReport.reservesRating}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Studio ROI: {pressureReport.studioROI}
                </Badge>
              </div>
            )}
          </ReportSection>

          {/* Report Footer */}
          <div className="px-6 py-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground/50">
              This report is confidential and intended solely for the Limited Partners of {fundName}.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ SUB-COMPONENTS ============

function ReportSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function MetricBox({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string
  value: string
  valueClass?: string
  sub?: string
}) {
  return (
    <Card className="bg-background/50">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-lg font-bold ${valueClass ?? ''}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ============ SYNDICATE NETWORK ============

function SyndicateNetworkSection({ partners }: { partners: import('@/engine/types').SyndicateRelationship[] }) {
  const sorted = [...partners].sort((a, b) => b.dealsShared - a.dealsShared);

  const TIER_COLORS: Record<string, string> = {
    tier1: 'text-yellow-400',
    friendly: 'text-green-400',
    competitive: 'text-red-400',
    strategic: 'text-blue-400',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Handshake className="h-4 w-4" />
          Syndicate Network
          <Badge variant="secondary" className="ml-auto">{partners.length} partners</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Investor</th>
                <th className="text-right py-2 px-2">Tier</th>
                <th className="text-right py-2 px-2">Deals</th>
                <th className="text-right py-2 pl-2">Co-Invested</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.investorName} className="border-b border-border/20">
                  <td className="py-2 pr-4 font-medium">{p.investorName}</td>
                  <td className={`py-2 px-2 text-right capitalize ${TIER_COLORS[p.tier] ?? ''}`}>
                    {p.tier === 'tier1' ? 'Tier 1' : p.tier}
                  </td>
                  <td className="py-2 px-2 text-right">{p.dealsShared}</td>
                  <td className="py-2 pl-2 text-right">{formatCurrency(p.totalCoInvested)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ PERFORMANCE BY SECTOR ============

function SectorPerformanceTable({ portfolio }: { portfolio: import('@/engine/types').PortfolioCompany[] }) {
  const sectors = new Map<string, { count: number; invested: number; value: number }>();
  for (const c of portfolio) {
    const entry = sectors.get(c.sector) ?? { count: 0, invested: 0, value: 0 };
    entry.count++;
    entry.invested += c.investedAmount;
    if (c.status === 'exited') {
      entry.value += (c.exitData?.exitValue ?? 0) * (c.ownership / 100);
    } else if (c.status === 'active') {
      entry.value += c.currentValuation * (c.ownership / 100);
    }
    sectors.set(c.sector, entry);
  }

  const rows = Array.from(sectors.entries())
    .map(([sector, data]) => ({ sector, ...data, moic: data.invested > 0 ? data.value / data.invested : 0 }))
    .sort((a, b) => b.moic - a.moic);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Performance by Sector
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Sector</th>
                <th className="text-right py-2 px-2">#</th>
                <th className="text-right py-2 px-2">Invested</th>
                <th className="text-right py-2 px-2">Value</th>
                <th className="text-right py-2 pl-2">MOIC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sector} className="border-b border-border/20">
                  <td className="py-2 pr-4 font-medium">{r.sector}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{r.count}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(r.invested)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(r.value)}</td>
                  <td className={`py-2 pl-2 text-right font-semibold ${r.moic >= 2 ? 'text-green-400' : r.moic >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {formatMultiple(r.moic)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ PERFORMANCE BY VINTAGE ============

function VintagePerformanceTable({ portfolio, fundMonth }: { portfolio: import('@/engine/types').PortfolioCompany[]; fundMonth: number }) {
  const vintages = new Map<number, { count: number; invested: number; value: number }>();
  for (const c of portfolio) {
    const year = Math.floor(c.monthInvested / 12) + 1;
    const entry = vintages.get(year) ?? { count: 0, invested: 0, value: 0 };
    entry.count++;
    entry.invested += c.investedAmount;
    if (c.status === 'exited') {
      entry.value += (c.exitData?.exitValue ?? 0) * (c.ownership / 100);
    } else if (c.status === 'active') {
      entry.value += c.currentValuation * (c.ownership / 100);
    }
    vintages.set(year, entry);
  }

  const rows = Array.from(vintages.entries())
    .map(([year, data]) => ({ year, ...data, moic: data.invested > 0 ? data.value / data.invested : 0 }))
    .sort((a, b) => a.year - b.year);

  if (rows.length === 0) return null;
  void fundMonth; // used for conditional rendering at call site

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Performance by Vintage Year
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left py-2 pr-4">Year</th>
                <th className="text-right py-2 px-2">#</th>
                <th className="text-right py-2 px-2">Invested</th>
                <th className="text-right py-2 px-2">Value</th>
                <th className="text-right py-2 pl-2">MOIC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year} className="border-b border-border/20">
                  <td className="py-2 pr-4 font-medium">Year {r.year}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{r.count}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(r.invested)}</td>
                  <td className="py-2 px-2 text-right">{formatCurrency(r.value)}</td>
                  <td className={`py-2 pl-2 text-right font-semibold ${r.moic >= 2 ? 'text-green-400' : r.moic >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {formatMultiple(r.moic)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ LP COMMUNICATION CARD ============

const LP_ACTIONS: { type: LPActionType; label: string; gainRange: string; icon: React.ReactNode }[] = [
  { type: 'quarterly_update', label: 'Quarterly Update', gainRange: '+3–5', icon: <FileText className="h-4 w-4" /> },
  { type: 'oneonone_call', label: '1-on-1 Call', gainRange: '+2–3', icon: <Phone className="h-4 w-4" /> },
  { type: 'lp_day', label: 'LP Day Event', gainRange: '+8–12', icon: <Users className="h-4 w-4" /> },
  { type: 'coinvest_opportunity', label: 'Co-invest Opportunity', gainRange: '+5–8', icon: <Handshake className="h-4 w-4" /> },
  { type: 'early_distribution', label: 'Early Distribution', gainRange: '+5–15', icon: <Gift className="h-4 w-4" /> },
]

function LPCommunicationCard({
  fund,
  lpSentiment,
  portfolio,
  onAction,
}: {
  fund: import('@/engine/types').Fund
  lpSentiment: import('@/engine/types').LPSentiment
  portfolio: import('@/engine/types').PortfolioCompany[]
  onAction: (actionType: LPActionType, params?: Record<string, number>) => { success: boolean; reason?: string; sentimentGain?: number }
}) {
  const [loading, setLoading] = useState<LPActionType | null>(null)

  function handleAction(actionType: LPActionType) {
    setLoading(actionType)
    requestAnimationFrame(() => {
      const params = actionType === 'early_distribution' ? { amount: Math.min(fund.cashAvailable * 0.05, 1_000_000) } : undefined
      const result = onAction(actionType, params)
      if (result.success) {
        toast.success(`LP Sentiment +${result.sentimentGain ?? 0} (now ${Math.round(lpSentiment.score + (result.sentimentGain ?? 0))})`)
      } else {
        toast.error(`Cannot perform action`, { description: result.reason })
      }
      setLoading(null)
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          LP Communication
          <Badge variant="secondary" className="ml-auto">Sentiment: {Math.round(lpSentiment.score)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {LP_ACTIONS.map((action) => {
          const effect = calculateLPActionEffect(action.type, lpSentiment.score, fund, portfolio, {})
          const onCooldown = !effect.canPerform && effect.reason?.startsWith('Cooldown')
          const cooldownMonths = fund.lpActionCooldowns?.find(c => c.actionType === action.type)
          const monthsLeft = cooldownMonths ? cooldownMonths.availableFromMonth - fund.currentMonth : 0

          return (
            <div key={action.type} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
              <span className="text-muted-foreground shrink-0">{action.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{action.label}</span>
                {effect.cashCost > 0 && (
                  <span className="text-xs text-yellow-400 ml-2">{formatCurrency(effect.cashCost)}</span>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0 text-green-400">
                {action.gainRange} sentiment
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 h-7 text-xs"
                disabled={!effect.canPerform || loading === action.type}
                onClick={() => handleAction(action.type)}
                title={effect.reason}
              >
                {loading === action.type ? '...' : onCooldown ? `${monthsLeft}mo` : !effect.canPerform ? 'N/A' : 'Act'}
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ============ BENCHMARK SECTION ============

const PERCENTILE_COLORS: Record<string, string> = {
  top_quartile: 'bg-green-500/20 text-green-400',
  second_quartile: 'bg-emerald-500/20 text-emerald-400',
  third_quartile: 'bg-yellow-500/20 text-yellow-400',
  bottom_quartile: 'bg-red-500/20 text-red-400',
}

const PERCENTILE_LABELS: Record<string, string> = {
  top_quartile: 'Top Quartile',
  second_quartile: '2nd Quartile',
  third_quartile: '3rd Quartile',
  bottom_quartile: 'Bottom Quartile',
}

function BenchmarkSection({ fund }: { fund: import('@/engine/types').Fund }) {
  const vintageYear = fund.yearStarted ?? 2024
  const comparison = getBenchmarkForFund(fund.type, fund.stage, vintageYear, fund.tvpiEstimate, fund.irrEstimate * 100)

  const { benchmarkTvpi, playerTvpiPercentile, proxyNote } = comparison

  // Calculate dot position on 0→topQ bar
  const range = benchmarkTvpi.topQ - benchmarkTvpi.bottomQ
  const playerPos = range > 0
    ? Math.max(0, Math.min(100, ((fund.tvpiEstimate - benchmarkTvpi.bottomQ) / range) * 100))
    : 50

  const bottomPct = 0
  const medianPct = range > 0 ? ((benchmarkTvpi.median - benchmarkTvpi.bottomQ) / range) * 100 : 50
  const topPct = 100

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          vs. Industry Benchmarks
          {proxyNote && (
            <span className="text-xs text-muted-foreground font-normal">({proxyNote})</span>
          )}
          <Badge className={`ml-auto ${PERCENTILE_COLORS[playerTvpiPercentile]}`}>
            {PERCENTILE_LABELS[playerTvpiPercentile]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TVPI bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>TVPI vs Peers</span>
            <span className={getTvpiColor(fund.tvpiEstimate)}>{formatMultiple(fund.tvpiEstimate)} yours</span>
          </div>
          <div className="relative h-5 bg-secondary rounded-full overflow-visible">
            {/* Bottom quartile line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500/50"
              style={{ left: `${bottomPct}%` }}
              title={`Bottom Q: ${formatMultiple(benchmarkTvpi.bottomQ)}`}
            />
            {/* Median line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/70"
              style={{ left: `${medianPct}%` }}
              title={`Median: ${formatMultiple(benchmarkTvpi.median)}`}
            />
            {/* Top quartile line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-green-500/50"
              style={{ left: `${topPct - 0.5}%` }}
              title={`Top Q: ${formatMultiple(benchmarkTvpi.topQ)}`}
            />
            {/* Player dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background"
              style={{ left: `calc(${playerPos}% - 6px)` }}
              title={`Your TVPI: ${formatMultiple(fund.tvpiEstimate)}`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>B.Q: {formatMultiple(benchmarkTvpi.bottomQ)}</span>
            <span>Median: {formatMultiple(benchmarkTvpi.median)}</span>
            <span>T.Q: {formatMultiple(benchmarkTvpi.topQ)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
