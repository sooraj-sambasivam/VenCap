import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useGameStore } from '@/engine/gameState'
import { formatCurrency } from '@/lib/utils'
import type { IncubatorBatch, IncubatorCompany } from '@/engine/types'
import {
  ArrowLeft,
  Rocket,
  Loader2,
  GraduationCap,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Users,
  Map,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CircleDot,
} from 'lucide-react'
import { PageShell } from '@/components/PageShell'

// ============ CONSTANTS ============

const MENTORING_ACTIONS = [
  { id: 'refine_pitch', label: 'Refine Pitch', icon: MessageSquare },
  { id: 'intro_advisors', label: 'Intro Advisors', icon: Users },
  { id: 'gtm_plan', label: 'GTM Plan', icon: Map },
] as const

function traitColor(value: number): string {
  if (value >= 8) return 'bg-green-500'
  if (value >= 5) return 'bg-yellow-500'
  return 'bg-red-500'
}

// ============ COMPONENT ============

export default function Incubator() {
  const navigate = useNavigate()
  const {
    fund,
    gamePhase,
    activeIncubator,
    incubatorBatches,
    portfolio,
    launchIncubator,
    mentorIncubatorCompany,
    graduateIncubator,
  } = useGameStore()

  const [expandedBatchIndex, setExpandedBatchIndex] = useState<number | null>(null)
  const [launching, setLaunching] = useState(false)
  const [graduating, setGraduating] = useState(false)
  const [showGraduateConfirm, setShowGraduateConfirm] = useState(false)

  useEffect(() => {
    if (!fund || gamePhase === 'setup') {
      navigate('/', { replace: true })
    }
  }, [fund, gamePhase, navigate])

  if (!fund) return null

  const costPerYear = fund.currentSize * 0.01
  const canLaunch = !activeIncubator && fund.cashAvailable >= costPerYear
  const pastBatches = incubatorBatches.filter((b) => b.graduated)

  // Count incubator-origin portfolio companies
  const incubatorPortfolioCount = portfolio.filter((c) => c.origin === 'incubator').length

  function handleLaunch() {
    setLaunching(true)
    requestAnimationFrame(() => {
      launchIncubator()
      setLaunching(false)
    })
  }

  function handleMentor(companyId: string, action: string) {
    mentorIncubatorCompany(companyId, action)
  }

  function handleGraduate() {
    setShowGraduateConfirm(false)
    setGraduating(true)
    requestAnimationFrame(() => {
      graduateIncubator()
      setGraduating(false)
    })
  }

  function toggleBatch(index: number) {
    setExpandedBatchIndex((prev) => (prev === index ? null : index))
  }

  return (
    <PageShell className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">Incubator Program</h1>
            {activeIncubator ? (
              <Badge className="bg-green-600 text-green-100">Active Batch</Badge>
            ) : (
              <Badge variant="secondary">No Active Batch</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cost: {formatCurrency(costPerYear)} per year (1% of fund)
            {incubatorPortfolioCount > 0 && (
              <span className="ml-3">
                {incubatorPortfolioCount} graduate{incubatorPortfolioCount !== 1 ? 's' : ''} in portfolio
              </span>
            )}
          </p>
        </div>
        {!activeIncubator && (
          <Button
            onClick={handleLaunch}
            disabled={!canLaunch || launching}
            className="gap-2"
          >
            {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {launching ? 'Launching...' : 'Launch New Batch'}
          </Button>
        )}
      </div>

      <Separator />

      {/* Active Batch */}
      {activeIncubator ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              Current Batch — Year {activeIncubator.year}
            </h2>
            <Button
              onClick={() => setShowGraduateConfirm(true)}
              variant="secondary"
              className="gap-2"
              disabled={graduating}
            >
              {graduating ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
              {graduating ? 'Graduating...' : 'Graduate Batch'}
            </Button>

            {/* Graduate Confirmation Dialog */}
            {showGraduateConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
                  <h3 className="text-lg font-bold">Graduate This Batch?</h3>
                  <p className="text-sm text-muted-foreground">
                    This will finalize the current incubator batch. Companies will be added to your portfolio and you cannot undo this action.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowGraduateConfirm(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleGraduate}>
                      Graduate
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeIncubator.companies.map((ic) => (
              <IncubatorCompanyCard
                key={ic.startup.id}
                company={ic}
                onMentor={handleMentor}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">No active incubator batch.</p>
            <p className="text-sm text-muted-foreground">
              {canLaunch
                ? 'Launch a new batch to mentor 2-4 early-stage companies.'
                : `Insufficient funds. Need ${formatCurrency(costPerYear)} to launch.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Past Batches */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Past Batches</h2>
        {pastBatches.length > 0 ? (
          pastBatches.map((batch, idx) => (
            <PastBatchRow
              key={`batch-${batch.year}-${idx}`}
              batch={batch}
              index={idx}
              isExpanded={expandedBatchIndex === idx}
              onToggle={() => toggleBatch(idx)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No past batches yet. Launch and graduate your first batch to see results here.
          </p>
        )}
      </div>
    </PageShell>
  )
}

// ============ INCUBATOR COMPANY CARD ============

function IncubatorCompanyCard({
  company,
  onMentor,
}: {
  company: IncubatorCompany
  onMentor: (companyId: string, action: string) => void
}) {
  const { startup, mentoringActions, graduated } = company
  const traits = startup.founderTraits

  return (
    <Card className={graduated ? 'border-green-500/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {startup.name}
            {graduated && (
              <Badge className="bg-green-600 text-green-100 text-[10px]">Graduated</Badge>
            )}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {startup.sector}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Founder Traits Mini Bars */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Founder Traits</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <TraitBar label="Grit" value={traits.grit} />
            <TraitBar label="Clarity" value={traits.clarity} />
            <TraitBar label="Charisma" value={traits.charisma} />
            <TraitBar label="Exp" value={traits.experience} />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">MRR</span>
            <p className="font-medium">{formatCurrency(startup.metrics.mrr)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Growth</span>
            <p className="font-medium">{(startup.metrics.growthRate * 100).toFixed(0)}%/mo</p>
          </div>
          <div>
            <span className="text-muted-foreground">Runway</span>
            <p className="font-medium">{startup.metrics.runway}mo</p>
          </div>
        </div>

        <Separator />

        {/* Mentoring Actions */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Mentoring Actions</p>
          <div className="flex flex-wrap gap-2">
            {MENTORING_ACTIONS.map((action) => {
              const taken = mentoringActions.includes(action.id)
              const Icon = action.icon
              return (
                <Button
                  key={action.id}
                  size="sm"
                  variant={taken ? 'default' : 'secondary'}
                  className="gap-1.5 text-xs"
                  disabled={taken}
                  onClick={() => onMentor(startup.id, action.id)}
                >
                  {taken ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  {action.label}
                </Button>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {mentoringActions.length} of {MENTORING_ACTIONS.length} actions taken
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ TRAIT BAR ============

function TraitBar({ label, value }: { label: string; value: number }) {
  const widthPercent = (value / 10) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full ${traitColor(value)}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-4 text-right">{value}</span>
    </div>
  )
}

// ============ PAST BATCH ROW ============

function PastBatchRow({
  batch,
  index,
  isExpanded,
  onToggle,
}: {
  batch: IncubatorBatch
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <Card>
      <button onClick={onToggle} className="w-full text-left">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CircleDot className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Batch {index + 1} — Year {batch.year}</span>
              <Badge variant="secondary" className="text-xs">
                {batch.companies.length} companies
              </Badge>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <Separator className="mb-3" />
          <div className="space-y-2">
            {batch.companies.map((ic) => (
              <div
                key={ic.startup.id}
                className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ic.startup.name}</span>
                  <Badge variant="outline" className="text-[10px] py-0">
                    {ic.startup.sector}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{ic.mentoringActions.length} actions</span>
                  {ic.graduated && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
