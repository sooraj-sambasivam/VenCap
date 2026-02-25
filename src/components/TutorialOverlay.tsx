import { useCallback } from "react"
import { useGameStore } from "@/engine/gameState"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Rocket,
  Search,
  FileSearch,
  DollarSign,
  Briefcase,
  Play,
  PartyPopper,
} from "lucide-react"

// ============ TUTORIAL STEP DEFINITIONS ============

interface TutorialStepDef {
  icon: typeof Rocket
  title: string
  description: string
  buttonLabel: string
}

const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    icon: Rocket,
    title: "Welcome to your fund",
    description:
      "Your fund is ready! Let's make your first investment. Check out your key metrics above — they show your fund size, cash, and TVPI.",
    buttonLabel: "Next",
  },
  {
    icon: Search,
    title: "Browse the deal pipeline",
    description:
      "These are startups seeking funding. Look for strong founders and growing markets. Navigate to the Deals page to explore.",
    buttonLabel: "Got it",
  },
  {
    icon: FileSearch,
    title: "Evaluate a deal",
    description:
      "Check the founder traits, unit economics, and red flags before investing. Click Invest on a deal that looks promising.",
    buttonLabel: "Got it",
  },
  {
    icon: DollarSign,
    title: "Make your first investment",
    description:
      "Set your check size and ownership target. Start small — you can always follow on later. Confirm to invest!",
    buttonLabel: "Got it",
  },
  {
    icon: Briefcase,
    title: "Check your portfolio",
    description:
      "Your first company! Navigate to Portfolio to monitor its progress and support the founders.",
    buttonLabel: "Got it",
  },
  {
    icon: Play,
    title: "Advance time",
    description:
      "Each month brings new events, deals, and decisions. Go to Dashboard and click Advance to see what happens next.",
    buttonLabel: "Got it",
  },
  {
    icon: PartyPopper,
    title: "You're ready!",
    description:
      "You know the basics. Explore the other features — Incubator, Lab, Reports — and build the best fund you can!",
    buttonLabel: "Let's go!",
  },
]

// ============ TUTORIAL OVERLAY COMPONENT ============

interface TutorialOverlayProps {
  /** The tutorial step to show (0-6). Only renders if this matches the current tutorialStep in store. */
  step: number
}

export function TutorialOverlay({ step }: TutorialOverlayProps) {
  const tutorialMode = useGameStore((s) => s.tutorialMode)
  const tutorialStep = useGameStore((s) => s.tutorialStep)
  const setTutorialStep = useGameStore((s) => s.setTutorialStep)
  const completeTutorial = useGameStore((s) => s.completeTutorial)

  const handleNext = useCallback(() => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      completeTutorial()
    } else {
      setTutorialStep(tutorialStep + 1)
    }
  }, [tutorialStep, setTutorialStep, completeTutorial])

  const handleSkip = useCallback(() => {
    completeTutorial()
  }, [completeTutorial])

  // Only render if tutorial is active and this is the current step
  if (!tutorialMode || tutorialStep !== step) return null

  const stepDef = TUTORIAL_STEPS[step]
  if (!stepDef) return null

  const StepIcon = stepDef.icon

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-md px-4">
      <Card className="border-primary/30 bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardContent className="p-4">
          {/* Header with icon and title */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <StepIcon className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{stepDef.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {stepDef.description}
              </p>
            </div>
          </div>

          {/* Footer: step indicator + buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {/* Step dots and counter */}
            <div className="flex items-center gap-1.5">
              {TUTORIAL_STEPS.map((_, index) => (
                <span
                  key={index}
                  className={`block size-1.5 rounded-full transition-colors ${
                    index === step
                      ? "bg-primary"
                      : index < step
                        ? "bg-primary/40"
                        : "bg-muted-foreground/25"
                  }`}
                />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1.5">
                Step {step + 1}/{TUTORIAL_STEPS.length}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-7 px-2.5 text-xs text-muted-foreground"
              >
                Skip Tutorial
              </Button>
              <Button size="sm" onClick={handleNext} className="h-7 px-3 text-xs">
                {stepDef.buttonLabel}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { TUTORIAL_STEPS }
