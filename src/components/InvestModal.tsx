import { useState, useMemo } from "react";
import type { Startup } from "@/engine/types";
import { useGameStore } from "@/engine/gameState";
import {
  getCheckSizeRange,
  getOwnershipLimits,
  getInfluenceLevel,
  canInvest,
} from "@/engine/vcRealism";
import { checkTimeGate } from "@/engine/timelineGates";
import { t } from "@/lib/i18n";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { previewInvest } from "@/engine/actionPreview";
import { ActionPreviewPanel } from "@/components/ActionPreviewPanel";

interface InvestModalProps {
  startup: Startup | null;
  open: boolean;
  onClose: () => void;
}

const INFLUENCE_LABELS: Record<string, string> = {
  observer: "Observer",
  advisor: "Advisor",
  board_seat: "Board Seat",
  majority: "Majority",
};

const TIER_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  tier1: "default",
  friendly: "secondary",
  competitive: "destructive",
  strategic: "outline",
};

export default function InvestModal({
  startup,
  open,
  onClose,
}: InvestModalProps) {
  const fund = useGameStore((s) => s.fund);
  const invest = useGameStore((s) => s.invest);

  const checkRange = useMemo(() => {
    if (!fund || !startup) return { min: 0, max: 0 };
    return getCheckSizeRange(fund.type, fund.currentSize, startup.stage);
  }, [fund, startup]);

  const [amount, setAmount] = useState(checkRange.min);

  // Reset amount when the slider range changes (new startup selected)
  const [prevMin, setPrevMin] = useState(checkRange.min);
  if (checkRange.min !== prevMin) {
    setPrevMin(checkRange.min);
    setAmount(checkRange.min);
  }

  // All hooks must come before any early return
  const [confirming, setConfirming] = useState(false);

  if (!fund || !startup) return null;

  const ownership = (amount / startup.valuation) * 100;
  const ownershipLimits = getOwnershipLimits(startup.stage);
  const isOwnershipOutOfRange =
    ownership < ownershipLimits.min || ownership > ownershipLimits.max;
  const influence = getInfluenceLevel(ownership);
  const fundPercent = (amount / fund.currentSize) * 100;
  const validation = canInvest(fund, amount, startup.stage);

  // Gate check for IRL mode
  const gateKey =
    startup.stage === "pre_seed" || startup.stage === "seed"
      ? "seed_check"
      : "due_diligence";
  const gateCheck = checkTimeGate(fund, gateKey);
  const gateBlocked = gateCheck.blocked;
  const gateLabel = gateBlocked
    ? t(
        "timeGate.availableIn",
        `Available in ${gateCheck.monthsRemaining} month(s)`,
      )
    : null;

  function handleConfirm() {
    if (!startup) return;
    setConfirming(true);
    requestAnimationFrame(() => {
      const result = invest(startup.id, amount, ownership);
      setConfirming(false);
      if (result.success) {
        toast.success(`Invested ${formatCurrency(amount)} in ${startup.name}`);
        // Tutorial: auto-advance from step 3 (Make your first investment) to step 4 (Check your portfolio)
        const tutState = useGameStore.getState();
        if (tutState.tutorialMode && tutState.tutorialStep === 3) {
          tutState.setTutorialStep(4);
        }
        onClose();
      } else {
        toast.error(result.reason || "Investment failed");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{startup.name}</DialogTitle>
          <DialogDescription>
            Valuation: {formatCurrency(startup.valuation)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Available Cash */}
          <div className="text-sm text-muted-foreground">
            Available cash:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(fund.cashAvailable)}
            </span>
          </div>

          {/* Investment Amount Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Investment amount</span>
              <span className="font-medium">
                {formatCurrency(amount)}{" "}
                <span className="text-muted-foreground">
                  ({formatPercent(fundPercent)} of fund)
                </span>
              </span>
            </div>
            <Slider
              min={checkRange.min}
              max={checkRange.max}
              step={Math.max(
                1000,
                Math.round((checkRange.max - checkRange.min) / 100),
              )}
              value={[amount]}
              onValueChange={(v) => setAmount(v[0])}
              aria-label="Investment amount"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(checkRange.min)}</span>
              <span>{formatCurrency(checkRange.max)}</span>
            </div>
          </div>

          {/* Ownership Calculator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ownership</span>
              <span className="font-medium">{formatPercent(ownership)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Stage-appropriate range: {formatPercent(ownershipLimits.min, 0)}
              {" - "}
              {formatPercent(ownershipLimits.max, 0)}
            </div>
            {isOwnershipOutOfRange && (
              <p className="text-xs text-red-500">
                Ownership is outside the normal range for{" "}
                {startup.stage.replace("_", "-")} stage deals.
              </p>
            )}
          </div>

          {/* Influence Level Preview */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Influence level</span>
            <Badge variant="outline">{INFLUENCE_LABELS[influence]}</Badge>
          </div>

          {/* Co-Investor Preview */}
          {startup.coInvestors.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">
                Co-investors
              </span>
              <div className="flex flex-wrap gap-2">
                {startup.coInvestors.map((ci) => (
                  <Badge
                    key={ci.name}
                    variant={TIER_VARIANTS[ci.tier] ?? "outline"}
                  >
                    {ci.name}
                    <span className="ml-1 opacity-60">{ci.tier}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Founder Willingness Warning */}
          {startup.founderWillingness < 40 && (
            <p className="text-xs text-yellow-500">
              Founder willingness is low ({startup.founderWillingness}/100).
              There is a significant chance the founder will reject this
              investment.
            </p>
          )}

          {/* Action Preview */}
          {validation.allowed && !gateBlocked && (
            <ActionPreviewPanel
              preview={previewInvest(fund, startup, amount, ownership)}
            />
          )}

          {/* Validation Error */}
          {!validation.allowed && validation.reason && (
            <p className="text-xs text-red-500">{validation.reason}</p>
          )}

          {/* Confirm Button */}
          <Button
            className="w-full gap-2"
            disabled={!validation.allowed || confirming || gateBlocked}
            onClick={handleConfirm}
          >
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirming
              ? "Confirming..."
              : `Invest ${formatCurrency(amount)} for ${ownership.toFixed(1)}% ownership`}
          </Button>

          {/* Gate countdown message */}
          {gateLabel && (
            <p className="text-xs text-center text-muted-foreground">
              {gateLabel}
            </p>
          )}
        </div>
      </DialogContent>

      {/* Guided Tutorial Overlay */}
      <TutorialOverlay step={3} />
    </Dialog>
  );
}
