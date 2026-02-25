import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useGameStore } from '@/engine/gameState'
import { formatCurrency, formatMultiple, formatPercent, getMonthName, getGameYear } from '@/lib/utils'
import type { PortfolioCompany, FollowOnOpportunity, SecondaryOffer, BuyoutOffer, PendingDecision, BoardMeeting, DecisionRecord, CompanyMilestone } from '@/engine/types'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Users,
  Handshake,
  Loader2,
  MessageSquare,
  UserPlus,
  Focus,
  Scissors,
  Replace,
  HeartHandshake,
  Wrench,
  Megaphone,
  Box,
  DollarSign,
  FolderOpen,
  MapPin,
  Calendar,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import { TutorialOverlay } from '@/components/TutorialOverlay'

const REGION_SHORT: Record<string, string> = {
  silicon_valley: 'SV',
  nyc: 'NYC',
  boston: 'BOS',
  london: 'LON',
  berlin: 'BER',
  singapore: 'SGP',
  austin: 'AUS',
  chicago: 'CHI',
}
import { PageShell } from '@/components/PageShell'

// ============ CONSTANTS ============

const ORIGIN_COLORS: Record<string, string> = {
  external: 'bg-gray-600 text-gray-100',
  incubator: 'bg-blue-600 text-blue-100',
  lab: 'bg-purple-600 text-purple-100',
  buyout: 'bg-orange-600 text-orange-100',
}

const FOUNDER_STATE_COLORS: Record<string, string> = {
  focused: 'bg-green-600 text-green-100',
  coachable: 'bg-teal-600 text-teal-100',
  distracted: 'bg-yellow-600 text-yellow-100',
  overconfident: 'bg-orange-600 text-orange-100',
  defensive: 'bg-red-600 text-red-100',
  burned_out: 'bg-red-900 text-red-200',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-600 text-blue-100',
  exited: 'bg-green-600 text-green-100',
  failed: 'bg-red-600 text-red-100',
}

function pmfColor(score: number): string {
  if (score > 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function multipleColor(m: number): string {
  if (m >= 3) return 'text-green-400'
  if (m >= 1) return 'text-yellow-400'
  return 'text-red-400'
}

// ============ COMPONENT ============

export default function Portfolio() {
  const navigate = useNavigate()
  const {
    fund,
    gamePhase,
    portfolio,
    followOnOpportunities,
    secondaryOffers,
    buyoutOffers,
    pendingDecisions,
    talentPool,
    followOn,
    skipFollowOn,
    sellSecondary,
    rejectSecondary,
    acceptBuyout,
    rejectBuyout,
    resolveDecision,
    hireTalent,
    supportAction,
    boardMeetings,
    resolveBoardMeeting,
    decisionHistory,
  } = useGameStore()

  useEffect(() => {
    if (!fund || gamePhase === 'setup') {
      navigate('/', { replace: true })
    }
  }, [fund, gamePhase, navigate])

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [followOnAmount, setFollowOnAmount] = useState<Record<string, number>>({})
  const [visibleCount, setVisibleCount] = useState(10)

  if (!fund) return null

  // Filter
  let filtered = [...portfolio]
  if (statusFilter !== 'all') filtered = filtered.filter((c) => c.status === statusFilter)
  if (originFilter !== 'all') filtered = filtered.filter((c) => c.origin === originFilter)

  // Sort by status (active first) then by multiple
  filtered.sort((a, b) => {
    const statusOrder = { active: 0, exited: 1, failed: 2 }
    const so = statusOrder[a.status] - statusOrder[b.status]
    if (so !== 0) return so
    return b.multiple - a.multiple
  })

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function getFollowOn(companyId: string): FollowOnOpportunity | undefined {
    return followOnOpportunities.find((f) => f.companyId === companyId)
  }

  function getSecondary(companyId: string): SecondaryOffer | undefined {
    return secondaryOffers.find((s) => s.companyId === companyId)
  }

  function getBuyout(companyId: string): BuyoutOffer | undefined {
    return (buyoutOffers || []).find((b) => b.companyId === companyId)
  }

  function getDecisions(companyId: string): PendingDecision[] {
    return pendingDecisions.filter((d) => d.companyId === companyId)
  }

  function getBoardMeeting(companyId: string): BoardMeeting | undefined {
    return (boardMeetings || []).find((m) => m.companyId === companyId && !m.attended)
  }

  function getDecisionHistory(companyId: string): DecisionRecord[] {
    return (decisionHistory || []).filter((d) => d.companyId === companyId)
  }

  return (
    <PageShell className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            {portfolio.filter((c) => c.status === 'active').length} active investments
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="exited">Exited</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={originFilter} onValueChange={setOriginFilter}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Origins</SelectItem>
            <SelectItem value="external">External</SelectItem>
            <SelectItem value="incubator">Incubator</SelectItem>
            <SelectItem value="lab">Lab</SelectItem>
            <SelectItem value="buyout">Buyout</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="ml-auto self-center">
          {filtered.length} companies
        </Badge>
      </div>

      {/* Portfolio Table / Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {portfolio.length === 0 ? 'No Investments Yet' : 'No Matches'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {portfolio.length === 0
              ? 'Your portfolio is empty. Head to Deal Flow to review startups and make your first investment.'
              : 'No companies match your current filters. Try adjusting the status or origin filter.'}
          </p>
          {portfolio.length === 0 && (
            <Link to="/deals">
              <Button variant="secondary" className="mt-4 gap-2">
                <ArrowLeft className="h-4 w-4 rotate-180" />
                Browse Deals
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, visibleCount).map((company) => {
            const isExpanded = expandedId === company.id
            const fo = getFollowOn(company.id)
            const sec = getSecondary(company.id)
            const bo = getBuyout(company.id)
            const decs = getDecisions(company.id)
            const bm = getBoardMeeting(company.id)
            const dh = getDecisionHistory(company.id)
            const hasAlerts = !!(fo || sec || bo || decs.length > 0 || bm)

            return (
              <Card key={company.id} className={isExpanded ? 'border-primary/30' : ''}>
                {/* Summary Row */}
                <button
                  onClick={() => toggleExpand(company.id)}
                  className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Name + badges */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold truncate" title={company.name}>{company.name}</span>
                        <Badge className={ORIGIN_COLORS[company.origin]} variant="secondary">
                          {company.origin}
                        </Badge>
                        <Badge className={STATUS_COLORS[company.status]} variant="secondary">
                          {company.status}
                        </Badge>
                        {company.region && (
                          <Badge variant="outline" className="text-[10px] gap-1 hidden sm:inline-flex">
                            <MapPin className="size-3" />
                            {REGION_SHORT[company.region] ?? company.region}
                          </Badge>
                        )}
                        {bm && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" title="Board meeting pending" />
                        )}
                        {hasAlerts && !bm && (
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        )}
                      </div>

                      {/* Metrics row */}
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm ml-auto flex-wrap">
                        <span className="text-muted-foreground hidden sm:inline">
                          Invested: <span className="text-foreground font-medium">{formatCurrency(company.investedAmount)}</span>
                          {(company.followOnInvested || 0) > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">(+{formatCurrency(company.followOnInvested)} follow-on)</span>
                          )}
                        </span>
                        <span className="text-muted-foreground hidden sm:inline">
                          Own: <span className="text-foreground font-medium">{formatPercent(company.ownership)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          <span className="text-foreground font-medium">{formatCurrency(company.currentValuation)}</span>
                        </span>
                        <span className={`font-bold ${multipleColor(company.multiple)}`}>
                          {formatMultiple(company.multiple)}
                        </span>
                        <Badge className={`${FOUNDER_STATE_COLORS[company.founderState]} hidden sm:inline-flex`} variant="secondary">
                          {company.founderState.replace('_', ' ')}
                        </Badge>
                        <span className={`font-medium ${pmfColor(company.pmfScore)}`}>
                          PMF {Math.round(company.pmfScore)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <Separator className="mb-4" />
                    <Tabs defaultValue="actions" className="w-full">
                      <TabsList className="mb-4 w-full overflow-x-auto flex justify-start">
                        <TabsTrigger value="actions">Actions</TabsTrigger>
                        <TabsTrigger value="events">
                          Events ({company.events.length})
                        </TabsTrigger>
                        {(company.milestones ?? []).length > 0 && (
                          <TabsTrigger value="milestones" className="gap-1">
                            <Trophy className="h-3 w-3" /> Milestones ({(company.milestones ?? []).length})
                          </TabsTrigger>
                        )}
                        {fo && <TabsTrigger value="followon">Follow-On</TabsTrigger>}
                        {sec && <TabsTrigger value="secondary">Secondary</TabsTrigger>}
                        {bo && <TabsTrigger value="buyout">Buyout Offer</TabsTrigger>}
                        {decs.length > 0 && (
                          <TabsTrigger value="decisions">
                            Decisions ({decs.length})
                          </TabsTrigger>
                        )}
                        {dh.length > 0 && (
                          <TabsTrigger value="history">
                            History ({dh.length})
                          </TabsTrigger>
                        )}
                        {bm && (
                          <TabsTrigger value="boardmeeting" className="gap-1">
                            <Calendar className="h-3 w-3" /> Board Meeting
                          </TabsTrigger>
                        )}
                        <TabsTrigger value="team">
                          Team ({company.hiredTalent.length})
                        </TabsTrigger>
                        <TabsTrigger value="captable">Cap Table</TabsTrigger>
                      </TabsList>

                      {/* ACTIONS TAB */}
                      <TabsContent value="actions" className="space-y-4">
                        <ActionsSection
                          company={company}
                          fund={fund}
                          talentPool={talentPool}
                          onSupport={supportAction}
                          onHire={hireTalent}
                        />
                      </TabsContent>

                      {/* EVENTS TAB */}
                      <TabsContent value="events">
                        <EventsTimeline events={company.events} />
                      </TabsContent>

                      {/* MILESTONES TAB */}
                      {(company.milestones ?? []).length > 0 && (
                        <TabsContent value="milestones">
                          <MilestonesSection milestones={company.milestones ?? []} />
                        </TabsContent>
                      )}

                      {/* FOLLOW-ON TAB */}
                      {fo && (
                        <TabsContent value="followon">
                          <FollowOnSection
                            company={company}
                            opportunity={fo}
                            amount={followOnAmount[company.id] ?? Math.round(fo.roundSize * 0.1)}
                            onAmountChange={(v) =>
                              setFollowOnAmount((prev) => ({ ...prev, [company.id]: v }))
                            }
                            onFollowOn={() => {
                              followOn(company.id, followOnAmount[company.id] ?? Math.round(fo.roundSize * 0.1))
                            }}
                            onSkip={() => skipFollowOn(company.id)}
                          />
                        </TabsContent>
                      )}

                      {/* SECONDARY TAB */}
                      {sec && (
                        <TabsContent value="secondary">
                          <SecondarySection
                            company={company}
                            offer={sec}
                            onSell={() => sellSecondary(sec.id)}
                            onReject={() => rejectSecondary(sec.id)}
                          />
                        </TabsContent>
                      )}

                      {/* BUYOUT TAB */}
                      {bo && (
                        <TabsContent value="buyout">
                          <BuyoutSection
                            company={company}
                            offer={bo}
                            onAccept={() => acceptBuyout(bo.id)}
                            onReject={() => rejectBuyout(bo.id)}
                          />
                        </TabsContent>
                      )}

                      {/* DECISIONS TAB */}
                      {decs.length > 0 && (
                        <TabsContent value="decisions" className="space-y-4">
                          {decs.map((dec) => (
                            <DecisionSection
                              key={dec.id}
                              decision={dec}
                              onResolve={(optIdx) => resolveDecision(dec.id, optIdx)}
                            />
                          ))}
                        </TabsContent>
                      )}

                      {/* HISTORY TAB */}
                      {dh.length > 0 && (
                        <TabsContent value="history">
                          <DecisionHistorySection records={dh} />
                        </TabsContent>
                      )}

                      {/* TEAM TAB */}
                      <TabsContent value="team">
                        <TeamSection company={company} />
                      </TabsContent>

                      {/* BOARD MEETING TAB */}
                      {bm && (
                        <TabsContent value="boardmeeting">
                          <BoardMeetingSection
                            meeting={bm}
                            onResolve={(choicesByItemId) => {
                              resolveBoardMeeting(bm.id, choicesByItemId)
                              const itemCount = Object.keys(choicesByItemId).length
                              toast.success(`Board meeting resolved — ${itemCount} agenda item${itemCount !== 1 ? 's' : ''} addressed.`)
                            }}
                          />
                        </TabsContent>
                      )}

                      {/* CAP TABLE TAB */}
                      <TabsContent value="captable">
                        <CapTableSection company={company} />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </Card>
            )
          })}
          {visibleCount < filtered.length && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setVisibleCount((v) => v + 10)}
            >
              Show More ({filtered.length - visibleCount} remaining)
            </Button>
          )}
        </div>
      )}

      {/* Guided Tutorial Overlay */}
      <TutorialOverlay step={4} />
    </PageShell>
  )
}

// ============ ACTIONS SECTION ============

function ActionsSection({
  company,
  fund,
  talentPool,
  onSupport,
  onHire,
}: {
  company: PortfolioCompany
  fund: { cashAvailable: number }
  talentPool: { id: string; name: string; role: string; seniority: string; salary: number }[]
  onSupport: (companyId: string, action: string) => void
  onHire: (companyId: string, talentId: string) => void
}) {
  const isAdvisor = company.influence === 'advisor' || company.influence === 'board_seat' || company.influence === 'majority'
  const isStudio = company.origin === 'lab' || company.origin === 'buyout'
  const leadershipTalent = talentPool.filter((t) => t.seniority === 'leadership')

  return (
    <div className="space-y-4">
      {/* Basic Actions */}
      <div>
        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Basic</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => onSupport(company.id, 'connect_talent')}
            disabled={company.status !== 'active'}
          >
            <Users className="h-3.5 w-3.5" /> Connect Talent
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => onSupport(company.id, 'make_intros')}
            disabled={company.status !== 'active'}
          >
            <Handshake className="h-3.5 w-3.5" /> Make Intros
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => onSupport(company.id, 'give_advice')}
            disabled={company.status !== 'active'}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Give Advice
          </Button>
        </div>
      </div>

      {/* Advanced Actions */}
      {isAdvisor && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Advanced (Advisor+)</h4>
          <div className="flex flex-wrap gap-2">
            {leadershipTalent.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={() => onHire(company.id, leadershipTalent[0].id)}
                disabled={company.status !== 'active'}
              >
                <UserPlus className="h-3.5 w-3.5" /> Hire Executive
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => onSupport(company.id, 'force_focus')}
              disabled={company.status !== 'active' || (company.founderState !== 'distracted' && company.founderState !== 'overconfident')}
            >
              <Focus className="h-3.5 w-3.5" /> Force Focus
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => onSupport(company.id, 'restructure_burn')}
              disabled={company.status !== 'active'}
            >
              <Scissors className="h-3.5 w-3.5" /> Restructure Burn
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => onSupport(company.id, 'replace_gtm')}
              disabled={company.status !== 'active'}
            >
              <Replace className="h-3.5 w-3.5" /> Replace GTM
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => onSupport(company.id, 'founder_intervention')}
              disabled={
                company.status !== 'active' ||
                company.relationship < 50 ||
                (company.founderState !== 'burned_out' && company.founderState !== 'defensive')
              }
            >
              <HeartHandshake className="h-3.5 w-3.5" /> Founder Intervention
            </Button>
          </div>
        </div>
      )}

      {/* Studio Actions */}
      {isStudio && company.status === 'active' && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Studio (Lab/Buyout)</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => onSupport(company.id, 'engineering_sprint')}
              disabled={fund.cashAvailable < 50_000}
            >
              <Wrench className="h-3.5 w-3.5" /> Engineering Sprint
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => onSupport(company.id, 'gtm_sprint')}
              disabled={fund.cashAvailable < 100_000}
            >
              <Megaphone className="h-3.5 w-3.5" /> GTM Sprint
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => onSupport(company.id, 'product_sprint')}
              disabled={fund.cashAvailable < 75_000}
            >
              <Box className="h-3.5 w-3.5" /> Product Sprint
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => onSupport(company.id, 'capital_injection')}
              disabled={fund.cashAvailable < 100_000}
            >
              <DollarSign className="h-3.5 w-3.5" /> Capital Injection
            </Button>
          </div>
        </div>
      )}

      {/* Relationship & Support info */}
      <div className="flex gap-6 text-xs text-muted-foreground pt-2">
        <span>Relationship: <span className="text-foreground font-medium">{Math.round(company.relationship)}/100</span></span>
        <span>Support: <span className="text-foreground font-medium">{Math.round(company.supportScore)}/100</span></span>
        <span>Influence: <span className="text-foreground font-medium capitalize">{company.influence.replace('_', ' ')}</span></span>
      </div>
    </div>
  )
}

// ============ EVENTS TIMELINE ============

function EventsTimeline({ events }: { events: PortfolioCompany['events'] }) {
  const sorted = [...events].sort((a, b) => b.month - a.month)
  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No events yet.</p>
  }
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {sorted.map((evt) => (
        <div key={evt.id} className="flex items-start gap-3 text-sm p-2 rounded-lg bg-secondary/30">
          <span
            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
              evt.sentiment === 'positive'
                ? 'bg-green-400'
                : evt.sentiment === 'negative'
                  ? 'bg-red-400'
                  : 'bg-blue-400'
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{evt.title}</span>
              <Badge variant="outline" className="text-[10px] py-0">
                {evt.severity}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">{evt.description}</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {getMonthName(evt.month)} Y{getGameYear(evt.month)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============ MILESTONES SECTION ============

const MILESTONE_LABELS: Record<CompanyMilestone, string> = {
  first_revenue: 'First Revenue',
  breakeven: 'Breakeven',
  profitable: 'Profitable',
  first_enterprise_deal: 'Enterprise Deal',
  '100_customers': '100 Customers',
  '1000_customers': '1,000 Customers',
  series_b_ready: 'Series B Ready',
  international_expansion: "Int'l Expansion",
  key_partnership: 'Key Partnership',
  product_launch: 'Product Launch',
  pivot_successful: 'Pivot Success',
  team_50: 'Team 50+',
}

const MILESTONE_COLORS: Record<CompanyMilestone, string> = {
  first_revenue: 'bg-green-500/20 text-green-400 border-green-500/30',
  breakeven: 'bg-green-500/20 text-green-400 border-green-500/30',
  profitable: 'bg-green-500/20 text-green-400 border-green-500/30',
  first_enterprise_deal: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  '100_customers': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  '1000_customers': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  series_b_ready: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  international_expansion: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  key_partnership: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  product_launch: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pivot_successful: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  team_50: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

function MilestonesSection({ milestones }: { milestones: CompanyMilestone[] }) {
  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">No milestones achieved yet.</p>
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Milestones achieved ({milestones.length}/12)
      </p>
      <div className="flex flex-wrap gap-2">
        {milestones.map((m) => (
          <Badge
            key={m}
            variant="outline"
            className={`${MILESTONE_COLORS[m]} text-xs py-1 px-2.5 gap-1.5`}
          >
            <Trophy className="h-3 w-3" />
            {MILESTONE_LABELS[m]}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 pt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" /> Revenue
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Growth
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400" /> Product
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-400" /> Team
        </span>
      </div>
    </div>
  )
}

// ============ FOLLOW-ON SECTION ============

function FollowOnSection({
  company,
  opportunity,
  amount,
  onAmountChange,
  onFollowOn,
  onSkip,
}: {
  company: PortfolioCompany
  opportunity: FollowOnOpportunity
  amount: number
  onAmountChange: (v: number) => void
  onFollowOn: () => void
  onSkip: () => void
}) {
  const [loading, setLoading] = useState(false)
  const maxAmount = Math.max(10000, Math.round(opportunity.roundSize * 0.5))
  const minAmount = Math.max(1000, Math.round(opportunity.roundSize * 0.02))
  const safeMin = Math.min(minAmount, maxAmount)
  const newOwnership = company.ownership + (amount / opportunity.preMoneyValuation) * 100

  return (
    <div className="space-y-4">
      <div className="text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Round Size:</span>{' '}
          <span className="font-medium">{formatCurrency(opportunity.roundSize)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Pre-Money:</span>{' '}
          <span className="font-medium">{formatCurrency(opportunity.preMoneyValuation)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Dilution if skip:</span>{' '}
          <span className="font-medium text-red-400">{formatPercent(opportunity.dilutionIfSkip)}</span>
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Follow-on amount</span>
          <span className="font-medium">{formatCurrency(amount)}</span>
        </div>
        <Slider
          min={safeMin}
          max={maxAmount}
          step={Math.max(1000, Math.round((maxAmount - safeMin) / 50))}
          value={[Math.max(safeMin, Math.min(amount, maxAmount))]}
          onValueChange={([v]) => onAmountChange(v)}
        />
        <p className="text-xs text-muted-foreground">
          New ownership: {formatPercent(newOwnership)} (currently {formatPercent(company.ownership)})
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => {
            setLoading(true)
            requestAnimationFrame(() => { onFollowOn(); setLoading(false) })
          }}
          className="flex-1 gap-2"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Investing...' : 'Follow On'}
        </Button>
        <Button variant="ghost" onClick={onSkip} className="flex-1" disabled={loading}>
          Skip (Accept {formatPercent(opportunity.dilutionIfSkip)} Dilution)
        </Button>
      </div>
    </div>
  )
}

// ============ SECONDARY SECTION ============

function SecondarySection({
  company,
  offer,
  onSell,
  onReject,
}: {
  company: PortfolioCompany
  offer: SecondaryOffer
  onSell: () => void
  onReject: () => void
}) {
  const [selling, setSelling] = useState(false)
  const marketCycle = useGameStore((s) => s.marketCycle)
  const cashReceived = company.investedAmount * (offer.offerPercentage / 100) * offer.offerMultiple
  const remainingOwnership = company.ownership * (1 - offer.offerPercentage / 100)
  const currentMoic = company.investedAmount > 0
    ? (company.currentValuation * (company.ownership / 100)) / company.investedAmount
    : 0
  const offerVsCurrent = currentMoic > 0 ? ((offer.offerMultiple / currentMoic) - 1) * 100 : 0

  const MARKET_BADGE: Record<string, { label: string; className: string }> = {
    bull: { label: 'Bull Market — Seller-friendly', className: 'bg-green-500/20 text-green-400' },
    normal: { label: 'Normal Market', className: 'bg-blue-500/20 text-blue-400' },
    cooldown: { label: 'Cooling Market — Buyer-favored', className: 'bg-yellow-500/20 text-yellow-400' },
    hard: { label: 'Down Market — Deep discounts', className: 'bg-red-500/20 text-red-400' },
  }

  const marketBadge = MARKET_BADGE[marketCycle] ?? MARKET_BADGE.normal

  return (
    <div className="space-y-4">
      <Badge className={`${marketBadge.className} text-xs`}>{marketBadge.label}</Badge>

      <div className="text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Buyer:</span>{' '}
          <span className="font-medium">{offer.buyerName}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Wants:</span>{' '}
          <span className="font-medium">{formatPercent(offer.offerPercentage)} of your stake</span>
        </p>
        <p>
          <span className="text-muted-foreground">At:</span>{' '}
          <span className="font-medium">{formatMultiple(offer.offerMultiple)} of invested</span>
        </p>
        <Separator className="my-2" />
        <p>
          <span className="text-muted-foreground">Your current MOIC:</span>{' '}
          <span className={`font-medium ${currentMoic >= 1 ? 'text-green-400' : 'text-red-400'}`}>
            {formatMultiple(currentMoic)}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Offer vs current:</span>{' '}
          <span className={`font-medium ${offerVsCurrent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {offerVsCurrent >= 0 ? '+' : ''}{offerVsCurrent.toFixed(1)}%
          </span>
        </p>
        <Separator className="my-2" />
        <p>
          <span className="text-muted-foreground">Cash received:</span>{' '}
          <span className="font-medium text-green-400">{formatCurrency(cashReceived)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Remaining ownership:</span>{' '}
          <span className="font-medium">{formatPercent(remainingOwnership)}</span>
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => {
            setSelling(true)
            requestAnimationFrame(() => { onSell(); setSelling(false) })
          }}
          className="flex-1 gap-2"
          disabled={selling}
        >
          {selling && <Loader2 className="h-4 w-4 animate-spin" />}
          {selling ? 'Selling...' : 'Sell'}
        </Button>
        <Button variant="ghost" onClick={onReject} className="flex-1" disabled={selling}>
          Reject
        </Button>
      </div>
    </div>
  )
}

// ============ BUYOUT SECTION ============

function BuyoutSection({
  company,
  offer,
  onAccept,
  onReject,
}: {
  company: PortfolioCompany
  offer: BuyoutOffer
  onAccept: () => void
  onReject: () => void
}) {
  const [processing, setProcessing] = useState(false)
  const cashReturned = offer.offerPrice * (company.ownership / 100)
  const premium = ((offer.offerPremium - 1) * 100).toFixed(0)

  const buyerTypeLabel: Record<string, string> = {
    pe: 'Private Equity',
    strategic: 'Strategic Acquirer',
    rival_fund: 'Rival Fund',
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/30">
        <p className="text-sm font-medium text-orange-400">Buyout Offer</p>
        <p className="text-xs text-muted-foreground mt-1">
          A buyer wants to acquire this company. Accepting triggers a founder acceptance check.
        </p>
      </div>

      <div className="text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Buyer:</span>{' '}
          <span className="font-medium">{offer.buyerName}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Type:</span>{' '}
          <span className="font-medium">{buyerTypeLabel[offer.buyerType] || offer.buyerType}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Offer price:</span>{' '}
          <span className="font-medium">{formatCurrency(offer.offerPrice)}</span>
          <span className="text-green-400 ml-1">(+{premium}% premium)</span>
        </p>
        <Separator className="my-2" />
        <p>
          <span className="text-muted-foreground">Your share ({formatPercent(company.ownership)}):</span>{' '}
          <span className="font-medium text-green-400">{formatCurrency(cashReturned)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Founder acceptance:</span>{' '}
          <span className={`font-medium ${offer.founderAcceptance > 0.5 ? 'text-green-400' : 'text-yellow-400'}`}>
            {(offer.founderAcceptance * 100).toFixed(0)}% likely
          </span>
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => {
            setProcessing(true)
            requestAnimationFrame(() => { onAccept(); setProcessing(false) })
          }}
          className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
          disabled={processing}
        >
          {processing && <Loader2 className="h-4 w-4 animate-spin" />}
          {processing ? 'Processing...' : 'Accept Buyout'}
        </Button>
        <Button variant="ghost" onClick={onReject} className="flex-1" disabled={processing}>
          Reject
        </Button>
      </div>
    </div>
  )
}

// ============ DECISIONS SECTION ============

const EFFECT_LABELS: Record<string, string> = {
  growthRate: 'Growth',
  churn: 'Churn',
  burnRate: 'Burn',
  runway: 'Runway',
  mrr: 'MRR',
  customers: 'Customers',
  relationship: 'Relationship',
  pmfScore: 'PMF',
}

function formatEffect(key: string, val: number): string {
  const label = EFFECT_LABELS[key] || key
  const sign = val > 0 ? '+' : ''
  // Percentages for rate-based effects, absolute for others
  if (['growthRate', 'churn', 'burnRate', 'mrr', 'customers'].includes(key)) {
    return `${label} ${sign}${(val * 100).toFixed(0)}%`
  }
  return `${label} ${sign}${val}`
}

function DecisionSection({
  decision,
  onResolve,
}: {
  decision: PendingDecision
  onResolve: (optionIndex: number) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{decision.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{decision.description}</p>
        <div className="space-y-2">
          {decision.options.map((opt, idx) => (
            <Button
              key={idx}
              size="sm"
              variant="secondary"
              className="w-full justify-start gap-2 h-auto py-2"
              onClick={() => onResolve(idx)}
            >
              <span>{opt.label}</span>
              {Object.keys(opt.effects).length > 0 && (
                <span className="ml-auto flex gap-1.5 text-[10px]">
                  {Object.entries(opt.effects).map(([k, v]) => (
                    <span key={k} className={v > 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatEffect(k, v)}
                    </span>
                  ))}
                </span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ TEAM SECTION ============

function TeamSection({ company }: { company: PortfolioCompany }) {
  if (company.hiredTalent.length === 0) {
    return <p className="text-sm text-muted-foreground">No hired talent yet.</p>
  }
  return (
    <div className="space-y-2">
      {company.hiredTalent.map((t) => (
        <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-2">
            <span className="font-medium">{t.name}</span>
            <Badge variant="outline" className="text-[10px] py-0 capitalize">
              {t.role}
            </Badge>
            <Badge variant="outline" className="text-[10px] py-0 capitalize">
              {t.seniority}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Rep: {t.reputation}</span>
            <span>{formatCurrency(t.salary)}/yr</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ CAP TABLE SECTION ============

const CAP_TABLE_COLORS = [
  'bg-blue-500',    // Your fund
  'bg-emerald-500', // Founder
  'bg-purple-500',  // Co-investor 1
  'bg-orange-500',  // Co-investor 2
  'bg-pink-500',    // Co-investor 3
  'bg-cyan-500',    // Co-investor 4
  'bg-yellow-500',  // Other
]

function CapTableSection({ company }: { company: PortfolioCompany }) {
  // Build cap table entries
  const entries: { name: string; ownership: number; type: string; color: string }[] = []

  // Your fund's ownership
  entries.push({
    name: 'Your Fund',
    ownership: company.ownership,
    type: 'fund',
    color: CAP_TABLE_COLORS[0],
  })

  // Co-investors
  let coInvestorTotal = 0
  company.coInvestors.forEach((ci, idx) => {
    // Estimate co-investor ownership based on their participation
    // Each co-investor gets a proportional share of non-founder, non-you equity
    const estimatedOwnership = Math.round((100 - company.ownership) * 0.15 * (ci.reputation / 100) * 10) / 10
    coInvestorTotal += estimatedOwnership
    entries.push({
      name: ci.name,
      ownership: estimatedOwnership,
      type: 'co-investor',
      color: CAP_TABLE_COLORS[Math.min(idx + 2, CAP_TABLE_COLORS.length - 1)],
    })
  })

  // Founder gets the remaining ownership
  const founderOwnership = Math.max(0, Math.round((100 - company.ownership - coInvestorTotal) * 10) / 10)
  entries.splice(1, 0, {
    name: company.founderName,
    ownership: founderOwnership,
    type: 'founder',
    color: CAP_TABLE_COLORS[1],
  })

  return (
    <div className="space-y-4">
      {/* Visual ownership bar */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Ownership Distribution</p>
        <div className="flex h-6 rounded-full overflow-hidden">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className={`${entry.color} transition-all duration-300`}
              style={{ width: `${Math.max(entry.ownership, 0.5)}%` }}
              title={`${entry.name}: ${entry.ownership.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* Detailed table */}
      <div className="space-y-1">
        <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider px-2 pb-1">
          <div className="col-span-1" />
          <div className="col-span-5">Shareholder</div>
          <div className="col-span-3 text-right">Ownership</div>
          <div className="col-span-3 text-right">Value</div>
        </div>
        {entries.map((entry, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-2 items-center text-sm px-2 py-1.5 rounded-lg bg-secondary/30"
          >
            <div className="col-span-1">
              <div className={`w-3 h-3 rounded-full ${entry.color}`} />
            </div>
            <div className="col-span-5">
              <span className="font-medium text-xs">{entry.name}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5 capitalize">{entry.type}</span>
            </div>
            <div className="col-span-3 text-right text-xs font-medium">
              {entry.ownership.toFixed(1)}%
            </div>
            <div className="col-span-3 text-right text-xs text-muted-foreground">
              {formatCurrency(Math.round(company.currentValuation * (entry.ownership / 100)))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 px-2">
        <span>Post-money valuation: {formatCurrency(company.currentValuation)}</span>
        <span>Your position: {formatCurrency(Math.round(company.currentValuation * (company.ownership / 100)))}</span>
      </div>
    </div>
  )
}

// ============ BOARD MEETING SECTION ============

function BoardMeetingSection({
  meeting,
  onResolve,
}: {
  meeting: BoardMeeting
  onResolve: (choicesByItemId: Record<string, number>) => void
}) {
  const [choices, setChoices] = useState<Record<string, number>>({})
  const allResolved = meeting.agendaItems.every((item) => choices[item.id] !== undefined)

  function handleChoice(itemId: string, optionIndex: number) {
    setChoices((prev) => ({ ...prev, [itemId]: optionIndex }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Calendar className="h-4 w-4 text-blue-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-400">Board Meeting</p>
          <p className="text-xs text-muted-foreground">
            {meeting.agendaItems.length} agenda item{meeting.agendaItems.length !== 1 ? 's' : ''} to review.
            Respond before the next month or relationship will suffer.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {meeting.agendaItems.map((item) => (
          <Card key={item.id} className={choices[item.id] !== undefined ? 'border-primary/30 bg-primary/5' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <div className="space-y-2">
                {item.options.map((opt, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant={choices[item.id] === idx ? 'default' : 'secondary'}
                    className="w-full justify-start gap-2 h-auto py-2"
                    onClick={() => handleChoice(item.id, idx)}
                  >
                    <span>{opt.label}</span>
                    {Object.keys(opt.effects).length > 0 && (
                      <span className="ml-auto flex gap-1.5 text-[10px]">
                        {Object.entries(opt.effects).map(([k, v]) => (
                          <span key={k} className={(v as number) > 0 ? 'text-green-400' : 'text-red-400'}>
                            {k} {(v as number) > 0 ? '+' : ''}{(v as number) > 0 && k !== 'growthMod' ? `${((v as number) * 100).toFixed(0)}%` : String(v)}
                          </span>
                        ))}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              {choices[item.id] !== undefined && (
                <p className="text-xs text-primary">
                  Selected: {item.options[choices[item.id]]?.label}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        className="w-full gap-2"
        disabled={!allResolved}
        onClick={() => onResolve(choices)}
      >
        <Calendar className="h-4 w-4" />
        {allResolved ? 'Submit Board Decisions' : `Select all ${meeting.agendaItems.length} items to submit`}
      </Button>
    </div>
  )
}

// ============ DECISION HISTORY SECTION ============

function DecisionHistorySection({ records }: { records: DecisionRecord[] }) {
  const sorted = [...records].sort((a, b) => b.month - a.month)
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {sorted.map((rec) => (
        <div key={rec.id} className="flex items-start gap-3 text-sm p-2 rounded-lg bg-secondary/30">
          <span className="mt-1 w-2 h-2 rounded-full shrink-0 bg-blue-400" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{rec.title}</span>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">
              Chose: <span className="text-foreground">{rec.chosenOption}</span>
            </p>
            {Object.keys(rec.effects).length > 0 && (
              <div className="flex gap-1.5 text-[10px] mt-1">
                {Object.entries(rec.effects).map(([k, v]) => (
                  <span key={k} className={v > 0 ? 'text-green-400' : 'text-red-400'}>
                    {k} {v > 0 ? '+' : ''}{typeof v === 'number' && ['growthRate','churn','burnRate','mrr','customers'].includes(k) ? `${(v*100).toFixed(0)}%` : String(v)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {getMonthName(rec.month)} Y{getGameYear(rec.month)}
          </span>
        </div>
      ))}
    </div>
  )
}
