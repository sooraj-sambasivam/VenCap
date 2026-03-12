import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useGameStore } from "@/engine/gameState";
import {
  getFirstCloseThreshold,
  calculateNegotiatedFundSize,
} from "@/engine/fundraising";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { FundTermsConfig, LPCommitmentStatus } from "@/engine/types";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import {
  TrendingUp,
  Users,
  DollarSign,
  Settings,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

// ============ HELPERS ============

function getCloseStatusLabel(status: string): string {
  switch (status) {
    case "pre_marketing":
      return t("fundraising.status.preMarketing", "Pre-Marketing");
    case "first_close":
      return t("fundraising.status.firstClose", "First Close");
    case "interim_close":
      return t("fundraising.status.interimClose", "Interim Close");
    case "final_close":
      return t("fundraising.status.finalClose", "Final Close");
    default:
      return status;
  }
}

function getCloseStatusVariant(
  status: string,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "pre_marketing":
      return "secondary";
    case "first_close":
      return "default";
    case "interim_close":
      return "default";
    case "final_close":
      return "default";
    default:
      return "outline";
  }
}

function getLPStatusBadgeClass(status: LPCommitmentStatus): string {
  switch (status) {
    case "prospect":
      return "bg-secondary text-secondary-foreground";
    case "pitched":
      return "bg-blue-500/20 text-blue-400";
    case "soft_circle":
      return "bg-yellow-500/20 text-yellow-400";
    case "hard_commit":
      return "bg-green-500/20 text-green-400";
    case "closed":
      return "bg-emerald-500/20 text-emerald-400";
    case "declined":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function getLPStatusLabel(status: LPCommitmentStatus): string {
  switch (status) {
    case "prospect":
      return t("fundraising.lpStatus.prospect", "Prospect");
    case "pitched":
      return t("fundraising.lpStatus.pitched", "Pitched");
    case "soft_circle":
      return t("fundraising.lpStatus.softCircle", "Soft Circle");
    case "hard_commit":
      return t("fundraising.lpStatus.hardCommit", "Hard Commit");
    case "closed":
      return t("fundraising.lpStatus.closed", "Closed");
    case "declined":
      return t("fundraising.lpStatus.declined", "Declined");
    default:
      return status;
  }
}

function getLPTypeLabel(type: string): string {
  switch (type) {
    case "institutional":
      return t("fundraising.lpType.institutional", "Institutional");
    case "family_office":
      return t("fundraising.lpType.familyOffice", "Family Office");
    case "hnw":
      return t("fundraising.lpType.hnw", "HNW");
    case "fund_of_funds":
      return t("fundraising.lpType.fundOfFunds", "Fund of Funds");
    default:
      return type;
  }
}

// ============ MAIN PAGE ============

export default function Fundraising() {
  const activeCampaign = useGameStore((s) => s.activeCampaign);
  const fund = useGameStore((s) => s.fund);
  const marketCycle = useGameStore((s) => s.marketCycle);
  const lpSentiment = useGameStore((s) => s.lpSentiment);
  const launchCampaign = useGameStore((s) => s.launchCampaign);
  const pitchLP = useGameStore((s) => s.pitchLP);
  const advanceFundClose = useGameStore((s) => s.advanceFundClose);
  const configureFundTerms = useGameStore((s) => s.configureFundTerms);
  const completeFundClose = useGameStore((s) => s.completeFundClose);

  // Local state for fund terms editor
  const [localTerms, setLocalTerms] = useState<FundTermsConfig | null>(null);

  // Sync localTerms from campaign when opened or campaign changes
  const terms = localTerms ?? activeCampaign?.terms ?? null;

  function handleLaunchCampaign() {
    const result = launchCampaign();
    if (result && "success" in result && !result.success) {
      toast.error(
        result.reason ??
          t("fundraising.launch.error", "Cannot launch campaign."),
      );
    } else {
      toast.success(
        t(
          "fundraising.launch.success",
          "Campaign launched! Start pitching your LPs.",
        ),
      );
    }
    setLocalTerms(null);
  }

  function handlePitchLP(prospectId: string, prospectName: string) {
    const result = pitchLP(prospectId);
    if (!result) return;
    if (result.success) {
      toast.success(
        `${prospectName}: ${result.reason ?? t("fundraising.pitch.advanced", "Status advanced.")}`,
      );
    } else {
      if (result.newStatus === "declined") {
        toast.error(
          `${prospectName}: ${result.reason ?? t("fundraising.pitch.declined", "Declined.")}`,
        );
      } else {
        toast.info(
          `${prospectName}: ${result.reason ?? t("fundraising.pitch.notYet", "Not yet.")}`,
        );
      }
    }
  }

  function handleAdvanceClose() {
    const result = advanceFundClose();
    if (!result) return;
    const label = getCloseStatusLabel(result.newCloseStatus);
    toast.success(
      t(
        "fundraising.close.advanced",
        `Reached ${label} — ${formatCurrency(result.committed)} committed.`,
      ),
    );
  }

  function handleSaveTerms() {
    if (!terms) return;
    const result = configureFundTerms({
      managementFee: terms.managementFee,
      carry: terms.carry,
      hurdleRate: terms.hurdleRate,
      fundLife: terms.fundLife,
    });
    if (result && "success" in result && !result.success) {
      toast.error(
        result.reason ?? t("fundraising.terms.error", "Cannot update terms."),
      );
    } else {
      toast.success(t("fundraising.terms.saved", "Fund terms updated."));
      setLocalTerms(null);
    }
  }

  function handleCompleteFundClose() {
    completeFundClose();
    toast.success(
      t(
        "fundraising.complete.success",
        "Fund closed. Starting setup for next fund.",
      ),
    );
  }

  // Derived values
  const isFinalClose = activeCampaign?.closeStatus === "final_close";
  const committedAmount = activeCampaign?.committedAmount ?? 0;
  const targetAmount = activeCampaign?.targetAmount ?? 1;
  const firstCloseThreshold = activeCampaign
    ? getFirstCloseThreshold(activeCampaign.targetAmount)
    : 0;
  const commitPct = Math.min(100, (committedAmount / targetAmount) * 100);
  const firstClosePct = Math.min(
    100,
    (firstCloseThreshold / targetAmount) * 100,
  );
  const negotiatedSize =
    activeCampaign && fund
      ? calculateNegotiatedFundSize(
          activeCampaign.prospects,
          marketCycle,
          lpSentiment.score,
        )
      : 0;

  const canAdvanceClose =
    activeCampaign && !isFinalClose && committedAmount >= firstCloseThreshold;

  return (
    <PageShell className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">
          {t("fundraising.title", "Fundraising")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeCampaign
            ? t(
                "fundraising.subtitle.active",
                `Fund ${activeCampaign.fundNumber} Campaign`,
              )
            : t(
                "fundraising.subtitle.inactive",
                "Launch a campaign to start raising capital from LPs.",
              )}
        </p>
      </div>

      {/* ============ SECTION 1: CAMPAIGN OVERVIEW ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {t("fundraising.campaign.title", "Campaign Overview")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeCampaign ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-muted-foreground text-sm max-w-md">
                {t(
                  "fundraising.campaign.noActive",
                  "No active fundraising campaign. Launch one to begin pitching LPs and securing commitments.",
                )}
              </p>
              <Button onClick={handleLaunchCampaign} className="gap-2">
                <DollarSign className="h-4 w-4" />
                {t("fundraising.campaign.launch", "Launch Campaign")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status row */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant={getCloseStatusVariant(activeCampaign.closeStatus)}
                  className={
                    isFinalClose
                      ? "bg-emerald-500/20 text-emerald-400"
                      : undefined
                  }
                >
                  {getCloseStatusLabel(activeCampaign.closeStatus)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t(
                    "fundraising.campaign.fundNumber",
                    `Fund ${activeCampaign.fundNumber}`,
                  )}
                </span>
              </div>

              {/* Committed vs target */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("fundraising.campaign.committed", "Committed")}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(committedAmount)}{" "}
                    <span className="text-muted-foreground">
                      / {formatCurrency(targetAmount)}
                    </span>
                  </span>
                </div>

                {/* Progress with milestone markers */}
                <div className="relative">
                  <Progress value={commitPct} className="h-3" />
                  {/* First close marker at firstClosePct% */}
                  <div
                    className="absolute top-0 bottom-0 flex flex-col items-center"
                    style={{ left: `${firstClosePct}%` }}
                  >
                    <div className="w-0.5 h-3 bg-yellow-400/80" />
                  </div>
                </div>

                {/* Milestone labels */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span
                    className="text-yellow-400/80"
                    style={{ marginLeft: `${firstClosePct - 10}%` }}
                  >
                    {t("fundraising.campaign.firstClose", "First Close (50%)")}
                  </span>
                  <span>
                    {t("fundraising.campaign.finalClose", "Final Close (100%)")}
                  </span>
                </div>
              </div>

              {/* Negotiated fund size */}
              {negotiatedSize > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {t(
                      "fundraising.campaign.negotiatedSize",
                      "Negotiated Fund Size",
                    )}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(negotiatedSize)}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ SECTION 2: LP PROSPECTS ============ */}
      {activeCampaign && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              {t("fundraising.prospects.title", "LP Prospects")}
              <Badge variant="secondary" className="ml-auto text-xs">
                {activeCampaign.prospects.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCampaign.prospects.map((prospect) => {
                const isPitchDisabled =
                  prospect.status === "closed" ||
                  prospect.status === "declined";

                return (
                  <div
                    key={prospect.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center"
                  >
                    {/* LP info */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">
                          {prospect.name}
                        </span>
                        <Badge variant="outline" className="text-xs h-5 px-1.5">
                          {getLPTypeLabel(prospect.type)}
                        </Badge>
                        <Badge
                          className={`text-xs h-5 px-1.5 ${getLPStatusBadgeClass(prospect.status)}`}
                        >
                          {getLPStatusLabel(prospect.status)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>
                          {t("fundraising.prospect.target", "Target:")}{" "}
                          <span className="text-foreground font-medium">
                            {formatCurrency(prospect.targetCommitment)}
                          </span>
                        </span>
                        <span>
                          {t("fundraising.prospect.interest", "Interest:")}{" "}
                          <span className="text-foreground font-medium">
                            {prospect.interestLevel}
                            /100
                          </span>
                        </span>
                        <span>
                          {t(
                            "fundraising.prospect.relationship",
                            "Relationship:",
                          )}{" "}
                          <span className="text-foreground font-medium">
                            {prospect.relationshipScore}
                            /100
                          </span>
                        </span>
                      </div>

                      {/* Interest bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${prospect.interestLevel}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pitch button */}
                    <div className="shrink-0">
                      {prospect.status === "closed" ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          {t("fundraising.prospect.committed", "Committed")}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant={isPitchDisabled ? "ghost" : "outline"}
                          disabled={isPitchDisabled}
                          onClick={() =>
                            handlePitchLP(prospect.id, prospect.name)
                          }
                          className="gap-1"
                        >
                          {t("fundraising.prospect.pitch", "Pitch")}
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ SECTION 3: FUND TERMS ============ */}
      {activeCampaign && terms && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-muted-foreground" />
              {t("fundraising.terms.title", "Fund Terms")}
              {isFinalClose && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {t("fundraising.terms.locked", "Locked")}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Management Fee */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {t("fundraising.terms.managementFee", "Management Fee")}
                </span>
                <span className="text-primary font-semibold">
                  {formatPercent(terms.managementFee)}
                </span>
              </div>
              <Slider
                value={[terms.managementFee * 100]}
                min={1}
                max={3}
                step={0.25}
                disabled={isFinalClose}
                onValueChange={([v]) =>
                  setLocalTerms({
                    ...activeCampaign.terms,
                    ...terms,
                    managementFee: v / 100,
                  })
                }
                className="py-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1.00%</span>
                <span>3.00%</span>
              </div>
            </div>

            {/* Carry */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {t("fundraising.terms.carry", "Carried Interest")}
                </span>
                <span className="text-primary font-semibold">
                  {formatPercent(terms.carry)}
                </span>
              </div>
              <Slider
                value={[terms.carry * 100]}
                min={15}
                max={30}
                step={1}
                disabled={isFinalClose}
                onValueChange={([v]) =>
                  setLocalTerms({
                    ...activeCampaign.terms,
                    ...terms,
                    carry: v / 100,
                  })
                }
                className="py-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Hurdle Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {t("fundraising.terms.hurdleRate", "Hurdle Rate")}
                </span>
                <span className="text-primary font-semibold">
                  {formatPercent(terms.hurdleRate)}
                </span>
              </div>
              <Slider
                value={[terms.hurdleRate * 100]}
                min={5}
                max={12}
                step={1}
                disabled={isFinalClose}
                onValueChange={([v]) =>
                  setLocalTerms({
                    ...activeCampaign.terms,
                    ...terms,
                    hurdleRate: v / 100,
                  })
                }
                className="py-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5%</span>
                <span>12%</span>
              </div>
            </div>

            {/* Fund Life */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {t("fundraising.terms.fundLife", "Fund Life")}
                </span>
                <span className="text-primary font-semibold">
                  {terms.fundLife} {t("fundraising.terms.years", "years")}
                </span>
              </div>
              <Slider
                value={[terms.fundLife]}
                min={7}
                max={12}
                step={1}
                disabled={isFinalClose}
                onValueChange={([v]) =>
                  setLocalTerms({
                    ...activeCampaign.terms,
                    ...terms,
                    fundLife: v,
                  })
                }
                className="py-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>7 yrs</span>
                <span>12 yrs</span>
              </div>
            </div>

            {!isFinalClose && (
              <Button
                onClick={handleSaveTerms}
                className="w-full"
                variant="outline"
              >
                {t("fundraising.terms.save", "Save Terms")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ SECTION 4: CLOSE ACTIONS ============ */}
      {activeCampaign && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              {t("fundraising.close.title", "Close Actions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                disabled={!canAdvanceClose}
                onClick={handleAdvanceClose}
                className="flex-1 gap-2"
              >
                <ChevronRight className="h-4 w-4" />
                {t("fundraising.close.advance", "Advance to Next Close")}
              </Button>

              <Button
                variant={isFinalClose ? "default" : "ghost"}
                disabled={!isFinalClose}
                onClick={handleCompleteFundClose}
                className="flex-1 gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("fundraising.close.complete", "Close Fund & Start Next")}
              </Button>
            </div>

            {!canAdvanceClose && !isFinalClose && activeCampaign && (
              <p className="text-xs text-muted-foreground text-center">
                {t(
                  "fundraising.close.hint",
                  `Pitch LPs until ${formatPercent(0.5)} committed (${formatCurrency(firstCloseThreshold)}) to advance.`,
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
