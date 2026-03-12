import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  Rocket,
  LayoutDashboard,
  Search,
  CalendarClock,
  Trophy,
  X,
  Gavel,
  HeartHandshake,
  Keyboard,
} from "lucide-react";

const STORAGE_KEY = "vencap-tutorial-done-v2";

interface OnboardingProps {
  fundName: string;
  fundSize: number;
}

type Placement = "bottom" | "top" | "right" | "left";

interface TutorialStep {
  icon: typeof Rocket;
  title: string;
  description: string;
  /** data-tour attribute value on the target element */
  target: string;
  /** preferred tooltip placement relative to target */
  placement: Placement;
}

function getSteps(fundName: string, fundSize: number): TutorialStep[] {
  return [
    {
      icon: Rocket,
      title: "Welcome!",
      description: `Welcome to ${fundName}! You're now managing a ${formatCurrency(fundSize)} fund. Let's take a quick tour.`,
      target: "fund-header",
      placement: "bottom",
    },
    {
      icon: LayoutDashboard,
      title: "Key Metrics",
      description:
        "These cards track your fund's vital signs — size, cash, TVPI, and deployment pace.",
      target: "key-metrics",
      placement: "bottom",
    },
    {
      icon: Search,
      title: "Review Deals",
      description:
        "Head here to browse startups seeking funding. Invest in the ones that match your thesis.",
      target: "quick-actions",
      placement: "top",
    },
    {
      icon: CalendarClock,
      title: "Advance Time",
      description:
        "Click this each month to progress. Events, exits, and market shifts will happen!",
      target: "advance-time",
      placement: "top",
    },
    {
      icon: Gavel,
      title: "Board Meetings",
      description:
        "Companies where you hold a board seat will call meetings every 6 months. Check Portfolio to review and resolve them.",
      target: "nav-portfolio",
      placement: "bottom",
    },
    {
      icon: HeartHandshake,
      title: "LP Management",
      description:
        "Keep your LPs happy with quarterly updates and special events. Visit Reports for LP communication tools.",
      target: "nav-reports",
      placement: "bottom",
    },
    {
      icon: Keyboard,
      title: "Keyboard Shortcuts",
      description:
        "Press ? anytime to see all shortcuts. Use D for deals, P for portfolio, N for news, and more!",
      target: "advance-time",
      placement: "top",
    },
    {
      icon: Trophy,
      title: "Your Goal",
      description:
        "Maximize returns for your LPs over 10 years. Track your TVPI here — aim for 3x+. Good luck!",
      target: "tvpi-card",
      placement: "bottom",
    },
  ];
}

const PAD = 8; // padding around the highlighted element
const GAP = 12; // gap between highlight box and tooltip
const TOOLTIP_MAX_W = 340;

function tooltipW() {
  return Math.min(TOOLTIP_MAX_W, window.innerWidth - 24);
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTargetRect(target: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
}

function computeTooltipStyle(
  rect: SpotlightRect,
  placement: Placement,
): CSSProperties {
  const vw = window.innerWidth;
  const padded = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  let top = 0;
  let left = 0;

  switch (placement) {
    case "bottom":
      top = padded.top + padded.height + GAP;
      left = padded.left + padded.width / 2 - tooltipW() / 2;
      break;
    case "top":
      top = padded.top - GAP; // will subtract tooltip height via transform
      left = padded.left + padded.width / 2 - tooltipW() / 2;
      break;
    case "right":
      top = padded.top + padded.height / 2;
      left = padded.left + padded.width + GAP;
      break;
    case "left":
      top = padded.top + padded.height / 2;
      left = padded.left - GAP - tooltipW();
      break;
  }

  // Clamp horizontal so tooltip doesn't overflow viewport
  left = Math.max(12, Math.min(left, vw - tooltipW() - 12));

  const transform = placement === "top" ? "translateY(-100%)" : undefined;

  return {
    position: "absolute",
    top,
    left,
    width: tooltipW(),
    transform,
  };
}

function computeArrowStyle(
  rect: SpotlightRect,
  placement: Placement,
  tooltipLeft: number,
): CSSProperties {
  const centerX = rect.left + rect.width / 2;
  const arrowLeft = centerX - tooltipLeft - 6; // 6 = half of arrow size

  switch (placement) {
    case "bottom":
      return {
        position: "absolute",
        top: -6,
        left: Math.max(16, Math.min(arrowLeft, tooltipW() - 24)),
        width: 12,
        height: 12,
        transform: "rotate(45deg)",
      };
    case "top":
      return {
        position: "absolute",
        bottom: -6,
        left: Math.max(16, Math.min(arrowLeft, tooltipW() - 24)),
        width: 12,
        height: 12,
        transform: "rotate(45deg)",
      };
    case "right":
      return {
        position: "absolute",
        top: "50%",
        left: -6,
        width: 12,
        height: 12,
        transform: "translateY(-50%) rotate(45deg)",
      };
    case "left":
      return {
        position: "absolute",
        top: "50%",
        right: -6,
        width: 12,
        height: 12,
        transform: "translateY(-50%) rotate(45deg)",
      };
  }
}

export function Onboarding({ fundName, fundSize }: OnboardingProps) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const steps = getSteps(fundName, fundSize);
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const StepIcon = step.icon;

  // Check if tutorial should show
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay to let the dashboard render targets
      const timer = setTimeout(() => setActive(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  // Measure target element on step change / resize / scroll
  const measure = useCallback(() => {
    if (!active) return;
    const r = getTargetRect(steps[currentStep].target);
    setRect(r);
  }, [active, currentStep, steps]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  // Scroll target into view
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector(
      `[data-tour="${steps[currentStep].target}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Re-measure after scroll settles
      const timer = setTimeout(measure, 350);
      return () => clearTimeout(timer);
    }
  }, [active, currentStep, steps, measure]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setActive(false);
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLast, handleComplete]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  if (!active || !rect) return null;

  const spotlightStyle: CSSProperties = {
    position: "absolute",
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: 12,
    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
    pointerEvents: "none",
    zIndex: 9998,
    border: "2px solid rgba(99, 102, 241, 0.5)",
    transition: "all 0.3s ease",
  };

  const tooltipStyle = computeTooltipStyle(rect, step.placement);
  const arrowStyle = computeArrowStyle(
    rect,
    step.placement,
    (tooltipStyle.left as number) ?? 0,
  );

  return createPortal(
    <>
      {/* Click-away overlay (invisible, blocks interaction) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9997,
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight cutout */}
      <div style={spotlightStyle} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          ...tooltipStyle,
          zIndex: 9999,
          transition: "all 0.3s ease",
        }}
        className="rounded-xl border border-border bg-card p-4 shadow-2xl"
      >
        {/* Arrow */}
        <div
          style={arrowStyle}
          className="bg-card border-l border-t border-border"
        />

        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <StepIcon className="size-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`block size-1.5 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                      ? "bg-primary/40"
                      : "bg-muted-foreground/25"
                }`}
              />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1.5">
              {currentStep + 1}/{steps.length}
            </span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                className="h-7 px-2.5 text-xs"
              >
                Back
              </Button>
            )}
            {isFirst && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-7 px-2.5 text-xs text-muted-foreground"
              >
                Skip
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="h-7 px-3 text-xs">
              {isLast ? "Got it!" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
