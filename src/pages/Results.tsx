import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGameStore } from "@/engine/gameState";
import {
  formatCurrency,
  formatMultiple,
  formatIRR,
  formatFeeRate,
} from "@/lib/utils";
import type { PortfolioCompany } from "@/engine/types";
import { getBenchmarkForFund } from "@/engine/benchmarkData";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  Skull,
  Star,
  Copy,
  Check,
  RotateCcw,
  Award,
  Target,
  PieChart,
  Zap,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ACHIEVEMENTS } from "@/engine/achievements";
import {
  getLeaderboard,
  addToLeaderboard,
  clearLeaderboard,
  isTopThreeScore,
  getCloudLeaderboard,
  submitToCloudLeaderboard,
} from "@/engine/leaderboard";
import { useAuth } from "@/engine/auth";
import type { CloudLeaderboardEntry, LeaderboardEntry } from "@/engine/types";

const LazyWaterfallChart = lazy(() =>
  import("@/components/Charts").then((m) => ({ default: m.WaterfallChart })),
);

// ============================================================
// GRADE HELPERS
// ============================================================

type Grade = "A+" | "A" | "B+" | "B" | "C" | "D";

function getPerformanceGrade(tvpi: number): Grade {
  if (tvpi >= 5) return "A+";
  if (tvpi >= 3) return "A";
  if (tvpi >= 2) return "B+";
  if (tvpi >= 1.5) return "B";
  if (tvpi > 1) return "C";
  return "D";
}

function getGradeColor(grade: Grade): string {
  switch (grade) {
    case "A+":
      return "text-yellow-400";
    case "A":
    case "B+":
    case "B":
      return "text-green-400";
    case "C":
      return "text-yellow-500";
    case "D":
      return "text-red-400";
  }
}

function getGradeBgColor(grade: Grade): string {
  switch (grade) {
    case "A+":
      return "bg-yellow-500/20 border-yellow-500/30";
    case "A":
    case "B+":
    case "B":
      return "bg-green-500/20 border-green-500/30";
    case "C":
      return "bg-yellow-500/20 border-yellow-500/30";
    case "D":
      return "bg-red-500/20 border-red-500/30";
  }
}

function getGradeLabel(grade: Grade): string {
  switch (grade) {
    case "A+":
      return "Legendary Fund";
    case "A":
      return "Top-Tier Fund";
    case "B+":
      return "Strong Performer";
    case "B":
      return "Solid Returns";
    case "C":
      return "Capital Preserved";
    case "D":
      return "Capital Lost";
  }
}

function getStatusBadge(status: PortfolioCompany["status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "exited":
      return {
        label: "Exited",
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      };
    case "active":
      return {
        label: "Active",
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      };
    case "failed":
      return {
        label: "Failed",
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      };
  }
}

function getOriginLabel(origin: PortfolioCompany["origin"]): string {
  switch (origin) {
    case "external":
      return "Deal Flow";
    case "incubator":
      return "Incubator";
    case "lab":
      return "Venture Lab";
    case "buyout":
      return "Buyout";
  }
}

// ============================================================
// RESULTS PAGE
// ============================================================

export default function Results() {
  const navigate = useNavigate();
  const {
    fund,
    gamePhase,
    portfolio,
    monthlySnapshots,
    rebirth,
    activeScenario,
    scenarioWon,
    unlockedAchievements,
  } = useGameStore();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showRebirthConfirm, setShowRebirthConfirm] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cloudLeaderboard, setCloudLeaderboard] = useState<
    CloudLeaderboardEntry[]
  >([]);
  const [leaderboardTab, setLeaderboardTab] = useState<"local" | "global">(
    user ? "global" : "local",
  );
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load leaderboard on mount
  useEffect(() => {
    setLeaderboard(getLeaderboard());
    getCloudLeaderboard().then(setCloudLeaderboard);
  }, []);

  // Redirect if game has not ended
  useEffect(() => {
    if (gamePhase !== "ended") {
      navigate("/dashboard", { replace: true });
    }
  }, [gamePhase, navigate]);

  if (gamePhase !== "ended" || !fund) {
    return null;
  }

  // ---- Fund Economics Computed Values ----
  const totalFees = fund.totalFeesCharged ?? 0;
  const totalCarry = fund.carryAccrued ?? 0;
  const netTvpi =
    fund.currentSize > 0
      ? Math.round(
          ((fund.tvpiEstimate * fund.currentSize - totalFees - totalCarry) /
            fund.currentSize) *
            100,
        ) / 100
      : fund.tvpiEstimate;
  const netIrr =
    fund.currentMonth > 0 && netTvpi > 0
      ? Math.round(
          (Math.pow(Math.max(0.01, netTvpi), 12 / fund.currentMonth) - 1) *
            100 *
            100,
        ) / 100
      : 0;

  // ---- Computed Values ----
  // Grade is based on NET TVPI (what LPs actually receive)
  const grade = getPerformanceGrade(netTvpi);
  const gradeColor = getGradeColor(grade);
  const gradeBgColor = getGradeBgColor(grade);
  const gradeLabel = getGradeLabel(grade);

  // ---- Compute final score for leaderboard ----
  // Score formula: netTvpi * 100 + netIrr + exitBonus + scenarioBonus
  const exitedCompaniesAll = portfolio.filter((c) => c.status === "exited");
  const unicornCount = portfolio.filter(
    (c) => c.currentValuation >= 1_000_000_000,
  ).length;
  const baseScore = Math.round(
    netTvpi * 100 + netIrr + exitedCompaniesAll.length * 5 + unicornCount * 20,
  );
  const scenarioMultiplier =
    scenarioWon && activeScenario ? activeScenario.bonusScoreMultiplier : 1.0;
  const finalScore = Math.round(baseScore * scenarioMultiplier);

  // Auto-submit to leaderboard (after early return guard — fund is guaranteed here)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (scoreSubmitted || !fund) return;
    const entryId = `${fund.name}-${Date.now()}`;
    const entry: LeaderboardEntry = {
      id: entryId,
      fundName: fund.name,
      finalScore,
      grade,
      tvpiNet: netTvpi,
      irrNet: netIrr,
      totalExits: exitedCompaniesAll.length,
      unicornCount,
      scenarioId: activeScenario?.id,
      scenarioWon: scenarioWon ?? undefined,
      difficulty: activeScenario?.difficulty ?? "normal",
      rebirthCount: fund.rebirthCount ?? 0,
      completedAt: Date.now(),
      durationMonths: fund.currentMonth,
    };
    const isTop3 = isTopThreeScore(finalScore);
    addToLeaderboard(entry);
    setLeaderboard(getLeaderboard());
    setIsNewHighScore(isTop3);
    setScoreSubmitted(true);

    // Also submit to cloud if authenticated
    if (user) {
      submitToCloudLeaderboard(user.id, {
        fund_name: fund.name,
        final_score: finalScore,
        grade,
        tvpi_net: netTvpi,
        irr_net: netIrr,
        total_exits: exitedCompaniesAll.length,
        unicorn_count: unicornCount,
        scenario_id: activeScenario?.id ?? null,
        scenario_won: scenarioWon ?? null,
        difficulty: activeScenario?.difficulty ?? "normal",
        rebirth_count: fund.rebirthCount ?? 0,
        duration_months: fund.currentMonth,
      }).then(() => {
        getCloudLeaderboard().then(setCloudLeaderboard);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreSubmitted]);

  const exitedCompanies = portfolio.filter((c) => c.status === "exited");
  const failedCompanies = portfolio.filter((c) => c.status === "failed");
  const activeCompanies = portfolio.filter((c) => c.status === "active");

  const totalReturned = exitedCompanies.reduce(
    (sum, c) => sum + (c.exitData?.exitValue ?? 0) * (c.ownership / 100),
    0,
  );

  const bestExit =
    exitedCompanies.length > 0
      ? exitedCompanies.reduce((best, c) =>
          (c.exitData?.exitMultiple ?? 0) > (best.exitData?.exitMultiple ?? 0)
            ? c
            : best,
        )
      : null;

  const worstInvestment =
    portfolio.length > 0
      ? portfolio.reduce((worst, c) =>
          c.multiple < worst.multiple ? c : worst,
        )
      : null;

  const successfulExits = exitedCompanies.filter(
    (c) => (c.exitData?.exitMultiple ?? 0) >= 1,
  ).length;

  const lastSnapshot =
    monthlySnapshots.length > 0
      ? monthlySnapshots[monthlySnapshots.length - 1]
      : null;

  const totalPortfolioValue =
    lastSnapshot?.totalPortfolioValue ?? fund.cashAvailable;

  // Sorted portfolio by multiple descending
  const sortedPortfolio = [...portfolio].sort(
    (a, b) => b.multiple - a.multiple,
  );

  // ---- Skill Assessment ----
  const skillPoints = fund.skillLevel;
  const skillLabel =
    skillPoints >= 10
      ? "Legendary VC"
      : skillPoints >= 7
        ? "Senior Partner"
        : skillPoints >= 5
          ? "Experienced Investor"
          : skillPoints >= 3
            ? "Rising Manager"
            : "Emerging Manager";

  // ---- Share Summary ----
  function buildShareText(): string {
    if (!fund) return "";
    const lines = [
      `--- ${fund.name} | ${activeScenario && activeScenario.id !== "sandbox" ? `${activeScenario.name} | ` : ""}10-Year Fund Results ---`,
      `Grade: ${grade} (${gradeLabel})`,
      `Net TVPI: ${formatMultiple(netTvpi)} | Net IRR: ${formatIRR(netIrr)}`,
      `Gross TVPI: ${formatMultiple(fund.tvpiEstimate)} | Gross IRR: ${formatIRR(fund.irrEstimate)}`,
      `Fund Size: ${formatCurrency(fund.currentSize)}`,
      `Deployed: ${formatCurrency(fund.deployed)} | Returned: ${formatCurrency(totalReturned)}`,
      `Fees: ${formatCurrency(totalFees)} | Carry: ${formatCurrency(totalCarry)}`,
      `Companies: ${portfolio.length} funded, ${exitedCompanies.length} exited, ${failedCompanies.length} failed`,
      bestExit
        ? `Best Exit: ${bestExit.name} at ${formatMultiple(bestExit.exitData?.exitMultiple ?? 0)}`
        : "",
      `Skill Level: ${skillPoints}`,
      ``,
      `Played VenCap — the VC fund simulator`,
    ];
    return lines.filter(Boolean).join("\n");
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildShareText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRebirth() {
    setShowRebirthConfirm(false);
    rebirth();
    navigate("/", { replace: true });
  }

  return (
    <PageShell className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* ============ HERO ============ */}
        <div className="text-center space-y-4 pt-8 pb-4">
          <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
            <Trophy className="h-4 w-4" />
            <span>Fund Lifecycle Complete</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-100">
            {fund.name}
          </h1>

          <p className="text-slate-400 text-lg">
            10-Year Fund Lifecycle Complete
          </p>

          <div
            className={`inline-flex items-center gap-3 rounded-xl border px-6 py-4 ${gradeBgColor}`}
          >
            <Award className={`h-10 w-10 ${gradeColor}`} />
            <div className="text-left">
              <div
                className={`text-4xl font-black tracking-tight ${gradeColor}`}
              >
                {grade}
              </div>
              <div className="text-sm text-slate-300">{gradeLabel}</div>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* ============ SCENARIO OUTCOME BANNER ============ */}
        {activeScenario && activeScenario.id !== "sandbox" && (
          <Card
            className={
              scenarioWon
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            }
          >
            <CardContent className="py-4 text-center">
              <p
                className={`text-lg font-bold ${scenarioWon ? "text-green-400" : "text-red-400"}`}
              >
                {scenarioWon ? "SCENARIO WON" : "SCENARIO FAILED"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeScenario.name} — {activeScenario.tagline}
              </p>
              {scenarioWon && activeScenario.bonusScoreMultiplier > 1 && (
                <p className="text-xs text-green-400 mt-1">
                  Score multiplier: {activeScenario.bonusScoreMultiplier}x
                  applied
                </p>
              )}
              <div className="mt-2 space-y-1">
                {activeScenario.winConditions.map((cond, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {cond.description}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============ KEY METRICS ============ */}
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Key Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="pt-5 pb-4 text-center">
                <TrendingUp className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-100">
                  {formatMultiple(netTvpi)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Net TVPI</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Gross: {formatMultiple(fund.tvpiEstimate)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="pt-5 pb-4 text-center">
                <Target className="h-5 w-5 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-100">
                  {formatIRR(netIrr)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Net IRR</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Gross: {formatIRR(fund.irrEstimate)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="pt-5 pb-4 text-center">
                <Briefcase className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-100">
                  {portfolio.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Total Investments
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="pt-5 pb-4 text-center">
                <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-100">
                  {successfulExits}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Successful Exits
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============ FUND SUMMARY ============ */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Fund Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Raised
                </div>
                <div className="text-lg font-semibold text-slate-200">
                  {formatCurrency(fund.currentSize)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Deployed
                </div>
                <div className="text-lg font-semibold text-slate-200">
                  {formatCurrency(fund.deployed)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Returned
                </div>
                <div className="text-lg font-semibold text-emerald-400">
                  {formatCurrency(totalReturned)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Cash Remaining
                </div>
                <div className="text-lg font-semibold text-slate-200">
                  {formatCurrency(fund.cashAvailable)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Total Portfolio Value
                </div>
                <div className="text-lg font-semibold text-slate-200">
                  {formatCurrency(totalPortfolioValue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Companies Funded / Exited / Failed
                </div>
                <div className="text-lg font-semibold text-slate-200">
                  {portfolio.length}
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-green-400">
                    {exitedCompanies.length}
                  </span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-red-400">{failedCompanies.length}</span>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-800 my-5" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {bestExit ? (
                <div className="flex items-start gap-3">
                  <ArrowUpRight className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Best Exit
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      {bestExit.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatMultiple(bestExit.exitData?.exitMultiple ?? 0)}{" "}
                      return
                      {bestExit.exitData?.acquirerName
                        ? ` — acquired by ${bestExit.exitData.acquirerName}`
                        : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <ArrowUpRight className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Best Exit
                    </div>
                    <div className="text-sm text-slate-500">
                      No exits recorded
                    </div>
                  </div>
                </div>
              )}

              {worstInvestment ? (
                <div className="flex items-start gap-3">
                  <Skull className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Worst Investment
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      {worstInvestment.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatMultiple(worstInvestment.multiple)} return
                      {worstInvestment.status === "failed" &&
                      worstInvestment.failureReason
                        ? ` — ${worstInvestment.failureReason.slice(0, 60)}...`
                        : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Skull className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Worst Investment
                    </div>
                    <div className="text-sm text-slate-500">
                      No investments made
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ============ FUND ECONOMICS ============ */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              Fund Economics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Management Fee Rate
                </div>
                <div className="text-lg font-semibold text-slate-200">
                  {formatFeeRate(fund.managementFeeRate ?? 0.02)} annually
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Carry Rate
                </div>
                <div className="text-lg font-semibold text-slate-200">
                  {formatFeeRate(fund.carryRate ?? 0.2)} above{" "}
                  {formatFeeRate(fund.hurdleRate ?? 0.08)} hurdle
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  GP Commit
                </div>
                <div className="text-lg font-semibold text-slate-200">
                  {formatCurrency(fund.gpCommit ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Total Fees Charged
                </div>
                <div className="text-lg font-semibold text-yellow-400">
                  {formatCurrency(totalFees)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Carry Accrued
                </div>
                <div className="text-lg font-semibold text-emerald-400">
                  {formatCurrency(totalCarry)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  GP Total Earnings
                </div>
                <div className="text-lg font-semibold text-primary">
                  {formatCurrency(fund.gpEarnings ?? 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ FUND WATERFALL ============ */}
        <Suspense
          fallback={
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="py-8 text-center text-slate-500">
                Loading chart...
              </CardContent>
            </Card>
          }
        >
          <div className="[&_*]:!border-slate-800 [&_.recharts-cartesian-axis-tick_text]:!fill-slate-400">
            <LazyWaterfallChart
              data={{
                invested: fund.deployed,
                cashReturned: totalReturned,
                unrealizedValue: portfolio
                  .filter((c) => c.status === "active")
                  .reduce(
                    (sum, c) => sum + c.currentValuation * (c.ownership / 100),
                    0,
                  ),
                fees: totalFees,
                carry: totalCarry,
              }}
            />
          </div>
        </Suspense>

        {/* ============ PORTFOLIO BREAKDOWN ============ */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-400" />
              Portfolio Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedPortfolio.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No companies in portfolio.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Header row */}
                <div className="hidden md:grid md:grid-cols-12 gap-3 text-xs text-slate-500 uppercase tracking-wider px-3 pb-1">
                  <div className="col-span-4">Company</div>
                  <div className="col-span-2 text-right">Invested</div>
                  <div className="col-span-2 text-right">Value</div>
                  <div className="col-span-2 text-right">Multiple</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>

                {sortedPortfolio.map((company) => {
                  const statusBadge = getStatusBadge(company.status);
                  const multipleColor =
                    company.multiple >= 3
                      ? "text-emerald-400"
                      : company.multiple >= 1.5
                        ? "text-green-400"
                        : company.multiple >= 1
                          ? "text-yellow-400"
                          : "text-red-400";

                  return (
                    <div
                      key={company.id}
                      className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center rounded-lg bg-slate-800/40 px-3 py-3 border border-slate-800/60"
                    >
                      {/* Company Name + Origin */}
                      <div className="col-span-2 md:col-span-4">
                        <div className="font-medium text-sm text-slate-200">
                          {company.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {getOriginLabel(company.origin)} &middot;{" "}
                          {company.sector}
                        </div>
                      </div>

                      {/* Invested */}
                      <div className="text-right md:col-span-2">
                        <div className="text-xs text-slate-500 md:hidden">
                          Invested
                        </div>
                        <div className="text-sm text-slate-300">
                          {formatCurrency(company.investedAmount)}
                        </div>
                      </div>

                      {/* Current Value */}
                      <div className="text-right md:col-span-2">
                        <div className="text-xs text-slate-500 md:hidden">
                          Value
                        </div>
                        <div className="text-sm text-slate-300">
                          {company.status === "failed"
                            ? formatCurrency(0)
                            : formatCurrency(
                                company.currentValuation *
                                  (company.ownership / 100),
                              )}
                        </div>
                      </div>

                      {/* Multiple */}
                      <div className="text-right md:col-span-2">
                        <div className="text-xs text-slate-500 md:hidden">
                          Multiple
                        </div>
                        <div
                          className={`text-sm font-semibold ${multipleColor}`}
                        >
                          {company.status === "exited"
                            ? formatMultiple(
                                company.exitData?.exitMultiple ??
                                  company.multiple,
                              )
                            : formatMultiple(company.multiple)}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="text-right md:col-span-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}

                {/* Summary row */}
                <div className="flex items-center justify-between px-3 pt-2 text-xs text-slate-500">
                  <span>
                    {activeCompanies.length} still active &middot;{" "}
                    {exitedCompanies.length} exited &middot;{" "}
                    {failedCompanies.length} failed
                  </span>
                  <span>{portfolio.length} total companies</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============ SCENARIO RESULT ============ */}
        {activeScenario &&
          activeScenario.id !== "sandbox" &&
          (() => {
            const exitCount = exitedCompanies.length;
            const allMet = activeScenario.winConditions.every((wc) => {
              if (wc.type === "tvpi") return netTvpi >= wc.threshold;
              if (wc.type === "exits") return exitCount >= wc.threshold;
              return true;
            });
            const adjustedScore = allMet
              ? Math.round(
                  netTvpi * activeScenario.bonusScoreMultiplier * 100,
                ) / 100
              : netTvpi;
            return (
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    Scenario: {activeScenario.name}
                    <Badge
                      className={
                        allMet
                          ? "bg-green-500/20 text-green-400 ml-auto"
                          : "bg-red-500/20 text-red-400 ml-auto"
                      }
                    >
                      {allMet ? "Victory" : "Failed"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {activeScenario.winConditions.map((wc, i) => {
                      let met = false;
                      if (wc.type === "tvpi") met = netTvpi >= wc.threshold;
                      else if (wc.type === "exits")
                        met = exitCount >= wc.threshold;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            className={met ? "text-green-400" : "text-red-400"}
                          >
                            {met ? "✓" : "✗"}
                          </span>
                          <span className="text-slate-300">
                            {wc.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {allMet && (
                    <div className="text-xs text-slate-400 border-t border-slate-800 pt-3">
                      Bonus multiplier: ×{activeScenario.bonusScoreMultiplier} →
                      Adjusted TVPI: {formatMultiple(adjustedScore)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

        {/* ============ BENCHMARK COMPARISON ============ */}
        {(() => {
          const vintageYear = fund.yearStarted ?? 2024;
          const comparison = getBenchmarkForFund(
            fund.type,
            fund.stage,
            vintageYear,
            netTvpi,
            netIrr,
          );
          const { benchmarkTvpi, playerTvpiPercentile, proxyNote } = comparison;
          const percentileColor =
            playerTvpiPercentile === "top_quartile"
              ? "text-green-400"
              : playerTvpiPercentile === "second_quartile"
                ? "text-emerald-400"
                : playerTvpiPercentile === "third_quartile"
                  ? "text-yellow-400"
                  : "text-red-400";
          const percentileLabel =
            playerTvpiPercentile === "top_quartile"
              ? "Top Quartile"
              : playerTvpiPercentile === "second_quartile"
                ? "2nd Quartile"
                : playerTvpiPercentile === "third_quartile"
                  ? "3rd Quartile"
                  : "Bottom Quartile";
          return (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-200 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  vs. Industry Benchmarks
                  {proxyNote && (
                    <span className="text-xs text-slate-500 font-normal">
                      ({proxyNote})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-xl font-bold ${percentileColor}`}>
                      {percentileLabel}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Your TVPI Rank
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-300">
                      {formatMultiple(benchmarkTvpi.bottomQ)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Bottom Quartile
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-300">
                      {formatMultiple(benchmarkTvpi.median)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Median</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-300">
                      {formatMultiple(benchmarkTvpi.topQ)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Top Quartile
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* ============ SKILL ASSESSMENT ============ */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Skill Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-slate-800 border-2 border-yellow-500/30">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {skillPoints}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">
                    Level
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-slate-200">
                  {skillLabel}
                </div>
                <div className="text-sm text-slate-400">
                  {fund.rebirthCount > 0
                    ? `Fund ${fund.rebirthCount + 1} — Your experience carries forward.`
                    : "Your first fund. Every lesson counts."}
                </div>
                <div className="flex items-center gap-1 pt-1">
                  {Array.from({ length: Math.min(skillPoints, 10) }).map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 text-yellow-400 fill-yellow-400"
                      />
                    ),
                  )}
                  {Array.from({ length: Math.max(0, 10 - skillPoints) }).map(
                    (_, i) => (
                      <Star
                        key={`empty-${i}`}
                        className="h-4 w-4 text-slate-700"
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ ACHIEVEMENTS ============ */}
        {(unlockedAchievements?.length > 0 || ACHIEVEMENTS.length > 0) && (
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Achievements
                <Badge variant="secondary" className="ml-auto">
                  {unlockedAchievements?.length ?? 0} / {ACHIEVEMENTS.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ACHIEVEMENTS.map((a) => {
                  const unlocked = unlockedAchievements?.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        unlocked
                          ? "border-yellow-500/30 bg-yellow-500/5"
                          : "border-slate-800 bg-slate-800/30 opacity-50"
                      }`}
                    >
                      <span className="text-2xl shrink-0">{a.icon}</span>
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-semibold ${unlocked ? "text-yellow-400" : "text-slate-500"}`}
                        >
                          {a.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {a.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============ NEW HIGH SCORE BANNER ============ */}
        {isNewHighScore && (
          <div className="text-center py-3 px-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 animate-pulse">
            <p className="text-lg font-bold text-yellow-400">NEW HIGH SCORE!</p>
            <p className="text-sm text-slate-400 mt-1">
              Score: {finalScore} — Top 3 on the leaderboard
            </p>
          </div>
        )}

        {/* ============ LEADERBOARD ============ */}
        {(leaderboard.length > 0 || cloudLeaderboard.length > 0) && (
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 rounded-lg bg-slate-800/50 p-1">
                <button
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${leaderboardTab === "global" ? "bg-slate-700 text-slate-200" : "text-slate-400 hover:text-slate-300"}`}
                  onClick={() => setLeaderboardTab("global")}
                >
                  Global
                </button>
                <button
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${leaderboardTab === "local" ? "bg-slate-700 text-slate-200" : "text-slate-400 hover:text-slate-300"}`}
                  onClick={() => setLeaderboardTab("local")}
                >
                  Local
                </button>
              </div>

              {/* Global leaderboard */}
              {leaderboardTab === "global" && (
                <>
                  {cloudLeaderboard.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      {user
                        ? "No global scores yet. Yours will be the first!"
                        : "Sign in to compete on the global leaderboard."}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                            <th className="py-2 px-2 text-left">#</th>
                            <th className="py-2 px-2 text-left">Player</th>
                            <th className="py-2 px-2 text-left">Fund</th>
                            <th className="py-2 px-2 text-right">Score</th>
                            <th className="py-2 px-2 text-center">Grade</th>
                            <th className="py-2 px-2 text-right hidden sm:table-cell">
                              TVPI
                            </th>
                            <th className="py-2 px-2 text-right hidden sm:table-cell">
                              IRR
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {cloudLeaderboard.slice(0, 20).map((entry, idx) => {
                            const isOwn = user && entry.user_id === user.id;
                            return (
                              <tr
                                key={entry.id}
                                className={`border-b border-slate-800/50 ${isOwn ? "bg-yellow-500/5" : ""}`}
                              >
                                <td className="py-2 px-2 text-slate-400">
                                  {idx === 0
                                    ? "🥇"
                                    : idx === 1
                                      ? "🥈"
                                      : idx === 2
                                        ? "🥉"
                                        : idx + 1}
                                </td>
                                <td className="py-2 px-2 text-slate-300 truncate max-w-[80px]">
                                  {entry.profiles?.username || "Anonymous"}
                                </td>
                                <td className="py-2 px-2 text-slate-200 font-medium truncate max-w-[100px]">
                                  {entry.fund_name}
                                </td>
                                <td className="py-2 px-2 text-right font-bold text-yellow-400">
                                  {entry.final_score}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {entry.grade}
                                  </Badge>
                                </td>
                                <td className="py-2 px-2 text-right text-slate-300 hidden sm:table-cell">
                                  {formatMultiple(entry.tvpi_net)}
                                </td>
                                <td className="py-2 px-2 text-right text-slate-300 hidden sm:table-cell">
                                  {formatIRR(entry.irr_net)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Local leaderboard */}
              {leaderboardTab === "local" && (
                <>
                  {leaderboard.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No local scores yet.
                    </p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                              <th className="py-2 px-2 text-left">#</th>
                              <th className="py-2 px-2 text-left">Fund</th>
                              <th className="py-2 px-2 text-right">Score</th>
                              <th className="py-2 px-2 text-center">Grade</th>
                              <th className="py-2 px-2 text-right">Net TVPI</th>
                              <th className="py-2 px-2 text-right">Net IRR</th>
                              <th className="py-2 px-2 text-right hidden sm:table-cell">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaderboard.slice(0, 10).map((entry, idx) => {
                              const isCurrent =
                                scoreSubmitted &&
                                entry.fundName === fund.name &&
                                Math.abs(entry.completedAt - Date.now()) <
                                  60000;
                              return (
                                <tr
                                  key={entry.id}
                                  className={`border-b border-slate-800/50 ${isCurrent ? "bg-yellow-500/5" : ""}`}
                                >
                                  <td className="py-2 px-2 text-slate-400">
                                    {idx === 0
                                      ? "🥇"
                                      : idx === 1
                                        ? "🥈"
                                        : idx === 2
                                          ? "🥉"
                                          : idx + 1}
                                  </td>
                                  <td className="py-2 px-2 text-slate-200 font-medium truncate max-w-[120px]">
                                    {entry.fundName}
                                    {entry.scenarioId &&
                                      entry.scenarioId !== "sandbox" && (
                                        <span className="text-xs text-slate-500 ml-1">
                                          ({entry.scenarioId.replace(/_/g, " ")}
                                          )
                                        </span>
                                      )}
                                  </td>
                                  <td className="py-2 px-2 text-right font-bold text-yellow-400">
                                    {entry.finalScore}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {entry.grade}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-2 text-right text-slate-300">
                                    {formatMultiple(entry.tvpiNet)}
                                  </td>
                                  <td className="py-2 px-2 text-right text-slate-300">
                                    {formatIRR(entry.irrNet)}
                                  </td>
                                  <td className="py-2 px-2 text-right text-slate-500 hidden sm:table-cell">
                                    {new Date(
                                      entry.completedAt,
                                    ).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 text-right">
                        {showClearConfirm ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              Clear all scores?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                clearLeaderboard();
                                setLeaderboard([]);
                                setShowClearConfirm(false);
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowClearConfirm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-slate-500"
                            onClick={() => setShowClearConfirm(true)}
                          >
                            Clear Leaderboard
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============ ACTIONS: REBIRTH + SHARE ============ */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 pb-12">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold"
            onClick={() => setShowRebirthConfirm(true)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Start a New Fund
          </Button>

          {/* Rebirth Confirmation Dialog */}
          {showRebirthConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
                <h3 className="text-lg font-bold text-slate-100">
                  Start a New Fund?
                </h3>
                <p className="text-sm text-slate-400">
                  This will end your current fund and start fresh. Your skill
                  level and rebirth count will carry forward, but all portfolio
                  data will be lost.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-700 text-slate-300"
                    onClick={() => setShowRebirthConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                    onClick={handleRebirth}
                  >
                    Confirm Rebirth
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Summary
              </>
            )}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
