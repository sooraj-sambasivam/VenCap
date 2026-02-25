import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useGameStore } from '@/engine/gameState'
import type { LabProject, TalentCandidate, TalentRole } from '@/engine/types'
import {
  ArrowLeft,
  FlaskConical,
  Lightbulb,
  Loader2,
  UserSearch,
  Users,
  Rocket,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  Target,
  Building2,
  Trophy,
  AlertCircle,
} from 'lucide-react'
import { PageShell } from '@/components/PageShell'

// ============ CONSTANTS ============

const SECTORS = [
  'SaaS', 'Fintech', 'HealthTech', 'AI/ML', 'DevTools',
  'Marketplace', 'Consumer', 'CleanTech', 'EdTech', 'Cybersecurity',
  'DeepTech', 'Biotech', 'SpaceTech', 'AgTech', 'PropTech',
] as const

const VISION_LEVELS: { value: LabProject['visionLevel']; label: string; description: string }[] = [
  { value: 'small', label: 'Focused Niche', description: 'Lower risk, quicker to market, smaller TAM' },
  { value: 'medium', label: 'Market Player', description: 'Balanced approach with solid growth potential' },
  { value: 'big', label: 'Moonshot', description: 'High risk, high reward, massive TAM' },
]

const STATUS_CONFIG: Record<LabProject['status'], { label: string; color: string; step: number }> = {
  idea: { label: 'Idea', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', step: 1 },
  matching: { label: 'Matching', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', step: 2 },
  assembling: { label: 'Assembling', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', step: 3 },
  spun_out: { label: 'Spun Out', color: 'bg-green-500/20 text-green-400 border-green-500/30', step: 4 },
}

const ROLE_LABELS: Record<TalentRole, string> = {
  engineering: 'Engineering',
  sales: 'Sales',
  product: 'Product',
  marketing: 'Marketing',
  operations: 'Operations',
  executive: 'Executive',
}

// ============ CREATION FLOW STEPS ============

type CreationStep = 'sector' | 'problem' | 'founder' | 'team'

const STEPS: { key: CreationStep; label: string; icon: React.ReactNode }[] = [
  { key: 'sector', label: 'Choose Sector', icon: <Target className="h-4 w-4" /> },
  { key: 'problem', label: 'Define Problem', icon: <Lightbulb className="h-4 w-4" /> },
  { key: 'founder', label: 'Match Founder', icon: <UserSearch className="h-4 w-4" /> },
  { key: 'team', label: 'Assemble Team', icon: <Users className="h-4 w-4" /> },
]

// ============ COMPONENT ============

export default function Lab() {
  const navigate = useNavigate()
  const {
    fund,
    gamePhase,
    labProjects,
    talentPool,
    portfolio,
    createLabProject,
    assignLabFounder,
    spinOutLab,
  } = useGameStore()

  // Redirect to setup if no fund
  useEffect(() => {
    if (!fund || gamePhase === 'setup') {
      navigate('/', { replace: true })
    }
  }, [fund, gamePhase, navigate])

  // Loading states
  const [spinning, setSpinning] = useState(false)
  const [creating, setCreating] = useState(false)

  // Creation flow state
  const [showCreation, setShowCreation] = useState(false)
  const [creationStep, setCreationStep] = useState<CreationStep>('sector')
  const [selectedSector, setSelectedSector] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [visionLevel, setVisionLevel] = useState<LabProject['visionLevel']>('medium')

  if (!fund) return null

  // Derived data
  const activeProjects = labProjects.filter((p) => p.status !== 'spun_out')
  const pastSpinouts = portfolio.filter((c) => c.origin === 'lab')
  const founderCandidates = talentPool.filter(
    (t) => t.seniority === 'senior' || t.seniority === 'leadership'
  )

  // Reset creation flow
  function resetCreation() {
    setShowCreation(false)
    setCreationStep('sector')
    setSelectedSector('')
    setProblemStatement('')
    setVisionLevel('medium')
  }

  // Step navigation
  function goToStep(step: CreationStep) {
    setCreationStep(step)
  }

  // Handle creating the project (after problem step)
  function handleCreateProject() {
    if (!selectedSector || !problemStatement.trim()) return
    setCreating(true)
    requestAnimationFrame(() => {
      createLabProject({
        sector: selectedSector,
        problemStatement: problemStatement.trim(),
        visionLevel,
      })
      setCreating(false)
      goToStep('founder')
    })
  }

  // Handle assigning founder
  function handleAssignFounder(projectId: string, founderId: string) {
    assignLabFounder(projectId, founderId)
  }

  // Handle spin out
  function handleSpinOut(projectId: string) {
    setSpinning(true)
    requestAnimationFrame(() => {
      spinOutLab(projectId)
      setSpinning(false)
      resetCreation()
    })
  }

  // Find the latest project that needs attention in the creation flow
  const latestActiveProject = labProjects.find(
    (p) => p.status === 'idea' || p.status === 'matching' || p.status === 'assembling'
  )

  // Get current step index for the stepper
  const currentStepIndex = STEPS.findIndex((s) => s.key === creationStep)

  return (
    <PageShell className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <FlaskConical className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-bold">Venture Lab</h1>
        <Badge variant="secondary" className="ml-2">
          {activeProjects.length} Active
        </Badge>
        <Badge variant="secondary">
          {pastSpinouts.length} Spun Out
        </Badge>
      </div>

      <Separator />

      {/* Creation Flow */}
      {showCreation ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              New Lab Project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stepper */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
              {STEPS.map((step, idx) => (
                <div key={step.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                      idx < currentStepIndex
                        ? 'bg-green-500/20 text-green-400'
                        : idx === currentStepIndex
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {idx < currentStepIndex ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{idx + 1}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Step 1: Choose Sector */}
            {creationStep === 'sector' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose the sector for your lab-built startup. This determines the market and competitive landscape.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {SECTORS.map((sector) => (
                    <Button
                      key={sector}
                      variant={selectedSector === sector ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedSector(sector)}
                    >
                      {sector}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={resetCreation}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!selectedSector}
                    onClick={() => goToStep('problem')}
                  >
                    Next: Define Problem <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Define Problem */}
            {creationStep === 'problem' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Sector: <span className="text-foreground font-medium">{selectedSector}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Describe the problem your startup will solve. This shapes the company thesis.
                  </p>
                </div>
                <Input
                  placeholder="e.g. SMBs struggle with real-time fraud detection in cross-border payments..."
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className="min-h-[80px]"
                />
                {problemStatement.length > 0 && problemStatement.trim().length < 10 && (
                  <p className="text-xs text-muted-foreground">
                    Please enter at least 10 characters ({10 - problemStatement.trim().length} more needed)
                  </p>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Vision Level</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {VISION_LEVELS.map((v) => (
                      <Button
                        key={v.value}
                        variant={visionLevel === v.value ? 'default' : 'outline'}
                        className="h-auto py-3 flex-col items-start text-left"
                        onClick={() => setVisionLevel(v.value)}
                      >
                        <span className="font-medium">{v.label}</span>
                        <span className="text-xs opacity-70">{v.description}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => goToStep('sector')}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    disabled={problemStatement.trim().length < 10 || creating}
                    onClick={handleCreateProject}
                    className="gap-1"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {creating ? 'Creating...' : 'Create Project & Find Founder'}
                    {!creating && <ChevronRight className="h-4 w-4 ml-1" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Match Founder */}
            {creationStep === 'founder' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a founder from the talent pool. Senior and leadership candidates are shown.
                </p>
                {latestActiveProject && latestActiveProject.status === 'idea' ? (
                  <>
                    {founderCandidates.length > 0 ? (
                      <div className="space-y-2">
                        {founderCandidates.map((candidate) => (
                          <FounderCard
                            key={candidate.id}
                            candidate={candidate}
                            onSelect={() => {
                              handleAssignFounder(latestActiveProject.id, candidate.id)
                              goToStep('team')
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No senior/leadership candidates in the talent pool. Advance time to refresh.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No project awaiting a founder. Create a new project first.
                  </p>
                )}
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => goToStep('problem')}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button variant="ghost" onClick={resetCreation}>
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Assemble Team & Spin Out */}
            {creationStep === 'team' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your project has a founder. Review and spin it out into a portfolio company.
                </p>
                {latestActiveProject && latestActiveProject.status === 'assembling' ? (
                  <Card className="border-purple-500/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{latestActiveProject.sector} Lab Project</p>
                          <p className="text-sm text-muted-foreground">
                            {latestActiveProject.problemStatement.slice(0, 100)}
                            {latestActiveProject.problemStatement.length > 100 ? '...' : ''}
                          </p>
                        </div>
                        <Badge className={STATUS_CONFIG[latestActiveProject.status].color}>
                          {STATUS_CONFIG[latestActiveProject.status].label}
                        </Badge>
                      </div>
                      {latestActiveProject.founder && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Founder: </span>
                          <span className="font-medium">{latestActiveProject.founder.name}</span>
                          <span className="text-muted-foreground"> ({latestActiveProject.founder.role})</span>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Vision: <span className="text-foreground font-medium capitalize">{latestActiveProject.visionLevel}</span>
                        {latestActiveProject.teamBoosts.length > 0 && (
                          <>
                            {' '} | Boosts: {latestActiveProject.teamBoosts.map((r) => ROLE_LABELS[r]).join(', ')}
                          </>
                        )}
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleSpinOut(latestActiveProject.id)}
                        disabled={spinning}
                      >
                        {spinning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                        {spinning ? 'Spinning Out...' : 'Spin Out to Portfolio'}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No project ready for spin-out. Assign a founder first.
                  </p>
                )}
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => goToStep('founder')}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button variant="ghost" onClick={resetCreation}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button
          className="w-full h-14 text-lg gap-2"
          onClick={() => setShowCreation(true)}
        >
          <Sparkles className="h-5 w-5" /> Start New Lab Project
        </Button>
      )}

      {/* Active Lab Projects */}
      {activeProjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-400" />
            Active Lab Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                founderCandidates={founderCandidates}
                onAssignFounder={(founderId) => handleAssignFounder(project.id, founderId)}
                onSpinOut={() => handleSpinOut(project.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Lab Spinouts */}
      {pastSpinouts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-400" />
            Lab Spinouts in Portfolio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastSpinouts.map((company) => (
              <Card key={company.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{company.name}</span>
                    </div>
                    <Badge
                      className={
                        company.status === 'active'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : company.status === 'exited'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {company.sector} | Founder: {company.founderName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {company.description.slice(0, 120)}
                    {company.description.length > 120 ? '...' : ''}
                  </p>
                  <Separator className="my-2" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Multiple: <span className="text-foreground font-medium">{company.multiple.toFixed(1)}x</span>
                    </span>
                    <span>
                      Ownership: <span className="text-foreground font-medium">{company.ownership.toFixed(0)}%</span>
                    </span>
                    <span>
                      PMF: <span className="text-foreground font-medium">{company.pmfScore}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeProjects.length === 0 && pastSpinouts.length === 0 && !showCreation && (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No Lab Projects Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The Venture Lab lets you build startups from scratch. Choose a sector, define a problem,
              match a founder from the talent pool, and spin it out into your portfolio.
            </p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

// ============ SUB-COMPONENTS ============

function ProjectCard({
  project,
  founderCandidates,
  onAssignFounder,
  onSpinOut,
}: {
  project: LabProject
  founderCandidates: TalentCandidate[]
  onAssignFounder: (founderId: string) => void
  onSpinOut: () => void
}) {
  const [showFounders, setShowFounders] = useState(false)
  const [spinLoading, setSpinLoading] = useState(false)
  const config = STATUS_CONFIG[project.status]

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-purple-400" />
            <span className="font-medium">{project.sector}</span>
          </div>
          <Badge className={`${config.color} border`}>
            {config.label}
          </Badge>
        </div>

        {/* Problem Statement */}
        <p className="text-sm text-muted-foreground">
          {project.problemStatement.slice(0, 150)}
          {project.problemStatement.length > 150 ? '...' : ''}
        </p>

        {/* Vision */}
        <div className="text-xs text-muted-foreground">
          Vision: <span className="text-foreground font-medium capitalize">{project.visionLevel}</span>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step <= config.step ? 'bg-purple-500' : 'bg-secondary'
              }`}
            />
          ))}
        </div>

        {/* Founder Info */}
        {project.founder ? (
          <div className="text-sm flex items-center gap-2">
            <UserSearch className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Founder:</span>
            <span className="font-medium">{project.founder.name}</span>
            <Badge variant="secondary" className="text-xs">
              {ROLE_LABELS[project.founder.role]}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Rep: {project.founder.reputation}
            </Badge>
          </div>
        ) : project.status === 'idea' ? (
          <div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={() => setShowFounders(!showFounders)}
            >
              <UserSearch className="h-3.5 w-3.5" />
              {showFounders ? 'Hide Candidates' : 'Find Founder'}
            </Button>
            {showFounders && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {founderCandidates.length > 0 ? (
                  founderCandidates.map((c) => (
                    <FounderCard
                      key={c.id}
                      candidate={c}
                      onSelect={() => onAssignFounder(c.id)}
                    />
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No senior/leadership candidates available. Advance time.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Team Boosts */}
        {project.teamBoosts.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {project.teamBoosts.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {ROLE_LABELS[role]}
              </Badge>
            ))}
          </div>
        )}

        {/* Spin Out Button */}
        {project.status === 'assembling' && project.founder && (
          <Button
            className="w-full gap-2"
            onClick={() => {
              setSpinLoading(true)
              requestAnimationFrame(() => {
                onSpinOut()
                setSpinLoading(false)
              })
            }}
            disabled={spinLoading}
          >
            {spinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {spinLoading ? 'Spinning Out...' : 'Spin Out to Portfolio'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function FounderCard({
  candidate,
  onSelect,
}: {
  candidate: TalentCandidate
  onSelect: () => void
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg border hover:bg-secondary/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{candidate.name}</span>
          {candidate.isAlumni && (
            <Badge variant="secondary" className="text-xs shrink-0">Alumni</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{ROLE_LABELS[candidate.role]}</span>
          <span>|</span>
          <span className="capitalize">{candidate.seniority}</span>
          <span>|</span>
          <span>Rep: {candidate.reputation}</span>
        </div>
        {candidate.skills.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {candidate.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                {skill}
              </Badge>
            ))}
            {candidate.skills.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{candidate.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <Button size="sm" variant="outline" className="ml-2 shrink-0 gap-1" onClick={onSelect}>
        Select <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
