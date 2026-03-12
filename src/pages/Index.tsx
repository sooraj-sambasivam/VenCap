import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useGameStore } from "@/engine/gameState";
import type {
  FundType,
  FundStage,
  GeographicFocus,
  ScenarioId,
  MarketEra,
  TimelineMode,
} from "@/engine/types";
import { t } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { SCENARIOS } from "@/engine/scenarios";
import {
  getAvailableEras,
  isFredApiKeyConfigured,
} from "@/engine/economicData";
import {
  Building2,
  Globe,
  Layers,
  Landmark,
  Sprout,
  Target,
  TrendingUp,
  Rocket,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  DollarSign,
  MapPin,
  Flag,
  Calendar,
  Radio,
  Zap,
  Clock,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";

// ============ CONSTANTS ============

const FUND_TYPES: {
  value: FundType;
  label: string;
  description: string;
  range: [number, number];
  icon: React.ReactNode;
}[] = [
  {
    value: "regional",
    label: "Regional",
    description: "Deep local networks, focused portfolio",
    range: [10_000_000, 50_000_000],
    icon: <Building2 className="h-6 w-6" />,
  },
  {
    value: "national",
    label: "National",
    description: "Broader reach, competitive positioning",
    range: [50_000_000, 200_000_000],
    icon: <Globe className="h-6 w-6" />,
  },
  {
    value: "multistage",
    label: "Multi-stage",
    description: "Follow winners from seed to growth",
    range: [100_000_000, 500_000_000],
    icon: <Layers className="h-6 w-6" />,
  },
  {
    value: "family_office",
    label: "Family Office",
    description: "Patient capital, unique access",
    range: [20_000_000, 100_000_000],
    icon: <Landmark className="h-6 w-6" />,
  },
];

const STAGE_OPTIONS: {
  value: FundStage;
  label: string;
  description: string;
  checkSize: string;
  ownership: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "pre_seed",
    label: "Pre-seed",
    description: "The earliest bets. High risk, high reward.",
    checkSize: "$100K – $500K",
    ownership: "7 – 20%",
    icon: <Sprout className="h-6 w-6" />,
  },
  {
    value: "seed",
    label: "Seed",
    description: "Product-market fit hunters.",
    checkSize: "$500K – $3M",
    ownership: "5 – 15%",
    icon: <Target className="h-6 w-6" />,
  },
  {
    value: "series_a",
    label: "Series A",
    description: "Scaling proven winners.",
    checkSize: "$2M – $10M",
    ownership: "3 – 12%",
    icon: <TrendingUp className="h-6 w-6" />,
  },
  {
    value: "growth",
    label: "Growth",
    description: "Category leaders only.",
    checkSize: "$10M – $50M",
    ownership: "2 – 8%",
    icon: <Rocket className="h-6 w-6" />,
  },
];

// LP names for the fundraising animation
const LP_NAMES = [
  "Horizon Endowment",
  "Pacific Pension Fund",
  "Great Lakes Foundation",
  "Atlas Family Office",
  "Sterling Capital Partners",
  "Meridian Trust",
  "Blue Harbor Advisors",
  "Cedar Grove Foundation",
  "Pinnacle Wealth Group",
  "Northstar Retirement System",
  "Redwood Capital",
  "Summit Partners LP",
  "Lighthouse Family Trust",
  "Iron Gate Holdings",
  "Coastal Ventures LP",
];

// ============ COMPONENT ============

export default function Index() {
  const navigate = useNavigate();
  const { fund, gamePhase, initFund } = useGameStore();

  // If already playing, redirect to dashboard
  useEffect(() => {
    if (gamePhase === "playing" && fund) {
      navigate("/dashboard", { replace: true });
    }
  }, [gamePhase, fund, navigate]);

  // Wizard state
  const [step, setStep] = useState(1);
  const [fundName, setFundName] = useState("");
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("freeplay");
  const [fundType, setFundType] = useState<FundType | null>(null);
  const [fundStage, setFundStage] = useState<FundStage | null>(null);
  const [geographicFocus, setGeographicFocus] =
    useState<GeographicFocus>("global");
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioId>("sandbox");
  const [selectedEra, setSelectedEra] = useState<MarketEra>("current");
  const [raiseTarget, setRaiseTarget] = useState(0);
  const [isFundraising, setIsFundraising] = useState(false);
  const [lpCommitments, setLpCommitments] = useState<
    { name: string; amount: number }[]
  >([]);
  const [fundraisingDone, setFundraisingDone] = useState(false);
  const [totalRaised, setTotalRaised] = useState(0);

  // Rebirth detection
  const rebirthCount = fund?.rebirthCount ?? 0;
  const skillLevel = fund?.skillLevel ?? 1;

  // Get selected fund type config
  const selectedTypeConfig = FUND_TYPES.find((t) => t.value === fundType);

  // Set initial raise target when fund type selected
  useEffect(() => {
    if (selectedTypeConfig) {
      const mid = Math.round(
        (selectedTypeConfig.range[0] + selectedTypeConfig.range[1]) / 2,
      );
      setRaiseTarget(mid);
    }
  }, [selectedTypeConfig]);

  // Validation
  const nameValid = fundName.trim().length >= 3 && fundName.trim().length <= 50;

  // ============ FUNDRAISING ANIMATION ============

  function startFundraising() {
    if (!selectedTypeConfig) return;
    setIsFundraising(true);
    setLpCommitments([]);

    // Randomize how much we'll raise: 80-120% of target
    const raisePct = 0.8 + Math.random() * 0.4 + (skillLevel - 1) * 0.02;
    const finalAmount = Math.round(raiseTarget * raisePct);
    const numLPs = 6 + Math.floor(Math.random() * 5); // 6-10 LPs

    // Split final amount into LP commitments
    const shuffledLPs = [...LP_NAMES]
      .sort(() => Math.random() - 0.5)
      .slice(0, numLPs);
    const commitments: { name: string; amount: number }[] = [];
    let remaining = finalAmount;

    for (let i = 0; i < numLPs; i++) {
      const isLast = i === numLPs - 1;
      const share = isLast
        ? remaining
        : Math.round(remaining * (0.08 + Math.random() * 0.25));
      commitments.push({ name: shuffledLPs[i], amount: share });
      remaining -= share;
    }

    // Animate commitments rolling in one at a time
    commitments.forEach((commitment, i) => {
      setTimeout(
        () => {
          setLpCommitments((prev) => [...prev, commitment]);
          if (i === commitments.length - 1) {
            setTimeout(() => {
              setTotalRaised(finalAmount);
              setFundraisingDone(true);
            }, 300);
          }
        },
        (i + 1) * 400,
      );
    });
  }

  function skipFundraising() {
    if (!selectedTypeConfig) return;
    const mid = Math.round(
      (selectedTypeConfig.range[0] + selectedTypeConfig.range[1]) / 2,
    );
    launchFund(mid);
  }

  function launchFund(raised: number) {
    if (raised <= 0) return;
    initFund({
      name: fundName.trim(),
      type: fundType!,
      stage: fundStage!,
      targetSize: raiseTarget || raised,
      currentSize: raised,
      skillLevel,
      rebirthCount,
      geographicFocus,
      scenarioId: selectedScenario,
      marketEra: selectedEra,
      timelineMode,
    } as Parameters<typeof initFund>[0]);
    navigate("/dashboard");
  }

  // ============ RENDER ============

  return (
    <PageShell className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Rebirth Banner */}
      {rebirthCount > 0 && (
        <div className="mb-8 px-6 py-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
          <p className="text-primary font-medium">
            Welcome back. Your reputation precedes you.{" "}
            <span className="text-muted-foreground">
              (Skill Level: {skillLevel})
            </span>
          </p>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="flex items-center gap-2 mb-10">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                s === step
                  ? "bg-primary text-primary-foreground scale-110"
                  : s < step
                    ? "bg-primary/30 text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {s}
            </div>
            {s < 6 && (
              <div
                className={`w-10 h-0.5 transition-colors duration-300 ${
                  s < step ? "bg-primary/50" : "bg-secondary"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="w-full max-w-2xl">
        {/* ============ STEP 1: NAME ============ */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">Name Your Fund</h1>
              <p className="text-muted-foreground">
                Every great fund starts with a name.
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <Input
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="e.g. Horizon Ventures Fund I"
                className="text-lg h-12"
                maxLength={50}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameValid) setStep(2);
                }}
              />
              <p className="text-xs text-muted-foreground text-right">
                {fundName.trim().length}/50 characters
              </p>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!nameValid}
                  className="gap-2"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 2: TIMELINE MODE ============ */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">
                {t("wizard.timelineMode.title", "Choose Your Pacing")}
              </h1>
              <p className="text-muted-foreground">
                {t(
                  "wizard.timelineMode.subtitle",
                  "How do you want time to work in your fund?",
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
                  timelineMode === "freeplay"
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border"
                }`}
                onClick={() => setTimelineMode("freeplay")}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${timelineMode === "freeplay" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                    >
                      <Zap className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {t("wizard.timelineMode.freeplay.title", "Freeplay")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "wizard.timelineMode.freeplay.description",
                      "No time constraints — invest, pitch LPs, and advance at your own pace. Best for learning.",
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
                  timelineMode === "irl"
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border"
                }`}
                onClick={() => setTimelineMode("irl")}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${timelineMode === "irl" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                    >
                      <Clock className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg">
                      {t("wizard.timelineMode.irl.title", "IRL Pacing")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "wizard.timelineMode.irl.description",
                      "Actions take realistic time — seed checks need 1-2 months, due diligence 1-3 months. Feel the real rhythm of VC.",
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> {t("wizard.back", "Back")}
              </Button>
              <Button onClick={() => setStep(3)} className="gap-2">
                {t("wizard.continue", "Continue")}{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ============ STEP 3: FUND TYPE + GEO ============ */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">Choose Fund Type</h1>
              <p className="text-muted-foreground">
                This determines your fund size range and strategy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FUND_TYPES.map((ft) => (
                <Card
                  key={ft.value}
                  className={`cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
                    fundType === ft.value
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border"
                  }`}
                  onClick={() => setFundType(ft.value)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${fundType === ft.value ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                      >
                        {ft.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{ft.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(ft.range[0])} –{" "}
                          {formatCurrency(ft.range[1])}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ft.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Geographic Focus */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Geographic Focus</span>
                <span className="text-xs text-muted-foreground">
                  (optional)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "global",
                    "silicon_valley",
                    "nyc",
                    "boston",
                    "london",
                    "berlin",
                    "singapore",
                    "austin",
                    "chicago",
                  ] as GeographicFocus[]
                ).map((region) => {
                  const labels: Record<string, string> = {
                    global: "Global",
                    silicon_valley: "Silicon Valley",
                    nyc: "NYC",
                    boston: "Boston",
                    london: "London",
                    berlin: "Berlin",
                    singapore: "Singapore",
                    austin: "Austin",
                    chicago: "Chicago",
                  };
                  return (
                    <Button
                      key={region}
                      size="sm"
                      variant={
                        geographicFocus === region ? "default" : "outline"
                      }
                      className="h-8 text-xs"
                      onClick={() => setGeographicFocus(region)}
                    >
                      {region === "global" ? (
                        <Globe className="h-3 w-3 mr-1" />
                      ) : (
                        <MapPin className="h-3 w-3 mr-1" />
                      )}
                      {labels[region]}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!fundType}
                className="gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ============ STEP 4: STAGE FOCUS ============ */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">Choose Stage Focus</h1>
              <p className="text-muted-foreground">
                What stage of companies will you invest in?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STAGE_OPTIONS.map((so) => (
                <Card
                  key={so.value}
                  className={`cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
                    fundStage === so.value
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border"
                  }`}
                  onClick={() => setFundStage(so.value)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${fundStage === so.value ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                      >
                        {so.icon}
                      </div>
                      <h3 className="font-semibold text-lg">{so.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {so.description}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <span className="text-muted-foreground">
                        Check:{" "}
                        <span className="text-foreground font-medium">
                          {so.checkSize}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Own:{" "}
                        <span className="text-foreground font-medium">
                          {so.ownership}
                        </span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep(5)}
                disabled={!fundStage}
                className="gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ============ STEP 5: CHOOSE SCENARIO ============ */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">Choose Your Challenge</h1>
              <p className="text-muted-foreground">
                Select a scenario or play in classic Sandbox mode.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCENARIOS.map((scenario) => {
                const diffColors: Record<string, string> = {
                  easy: "bg-green-500/20 text-green-400",
                  normal: "bg-blue-500/20 text-blue-400",
                  hard: "bg-orange-500/20 text-orange-400",
                  extreme: "bg-red-500/20 text-red-400",
                };
                const isSelected = selectedScenario === scenario.id;
                return (
                  <Card
                    key={scenario.id}
                    className={`cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedScenario(scenario.id)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Flag
                            className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                          />
                          <span className="font-semibold text-sm">
                            {scenario.name}
                          </span>
                        </div>
                        <Badge
                          className={`${diffColors[scenario.difficulty]} text-[10px] shrink-0`}
                        >
                          {scenario.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        {scenario.tagline}
                      </p>
                      {scenario.winConditions.length > 0 && (
                        <p className="text-xs text-primary/80">
                          Win: {scenario.winConditions[0].description}
                        </p>
                      )}
                      <ul className="space-y-0.5">
                        {scenario.specialRules.slice(0, 2).map((rule, i) => (
                          <li
                            key={i}
                            className="text-[10px] text-muted-foreground flex items-start gap-1"
                          >
                            <span className="shrink-0 mt-0.5">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                      {scenario.bonusScoreMultiplier > 1 && (
                        <Badge variant="outline" className="text-[10px]">
                          ×{scenario.bonusScoreMultiplier} score
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ERA SELECTOR */}
            <div className="space-y-3 pt-4 border-t border-border/50">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" /> Market Era
                </h2>
                <p className="text-xs text-muted-foreground">
                  Play through real economic conditions from history — or use
                  live data.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {getAvailableEras().map((era) => {
                  const eraDiffColors: Record<string, string> = {
                    easy: "bg-green-500/20 text-green-400",
                    normal: "bg-blue-500/20 text-blue-400",
                    hard: "bg-orange-500/20 text-orange-400",
                    extreme: "bg-red-500/20 text-red-400",
                  };
                  const isEraSelected = selectedEra === era.id;
                  const isLive = era.id === "current";
                  return (
                    <Card
                      key={era.id}
                      className={`cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                        isEraSelected
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                          : "border-border"
                      }`}
                      onClick={() => setSelectedEra(era.id)}
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs truncate flex items-center gap-1">
                            {isLive && (
                              <Radio className="h-3 w-3 text-green-400" />
                            )}
                            {era.name}
                          </span>
                          <Badge
                            className={`${eraDiffColors[era.difficulty]} text-[9px] shrink-0`}
                          >
                            {era.startYear}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {era.tagline}
                        </p>
                        {isLive && !isFredApiKeyConfigured() && (
                          <p className="text-[9px] text-amber-400/80">
                            Uses historical data (no API key)
                          </p>
                        )}
                        {isLive && isFredApiKeyConfigured() && (
                          <p className="text-[9px] text-green-400/80">
                            Live FRED data enabled
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(4)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(6)} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ============ STEP 6: RAISE FROM LPS ============ */}
        {step === 6 && selectedTypeConfig && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">Raise From LPs</h1>
              <p className="text-muted-foreground">
                Set your target raise and launch your fundraise — or skip
                straight to investing.
              </p>
            </div>

            {!isFundraising && !fundraisingDone && (
              <div className="space-y-6 max-w-md mx-auto">
                {/* Target slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Target Fund Size
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(raiseTarget)}
                    </span>
                  </div>
                  <Slider
                    value={[raiseTarget]}
                    min={selectedTypeConfig.range[0]}
                    max={selectedTypeConfig.range[1]}
                    step={
                      selectedTypeConfig.range[0] < 50_000_000
                        ? 1_000_000
                        : 5_000_000
                    }
                    onValueChange={([v]) => setRaiseTarget(v)}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(selectedTypeConfig.range[0])}</span>
                    <span>{formatCurrency(selectedTypeConfig.range[1])}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={startFundraising}
                    className="gap-2 h-12"
                    disabled={raiseTarget <= 0}
                  >
                    <DollarSign className="h-4 w-4" /> Start Fundraising
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={skipFundraising}
                    className="gap-2 text-muted-foreground"
                  >
                    <SkipForward className="h-4 w-4" /> Skip to Investing
                  </Button>
                </div>

                <div className="flex justify-start">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(5)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                </div>
              </div>
            )}

            {/* Fundraising animation */}
            {isFundraising && !fundraisingDone && (
              <div className="max-w-md mx-auto space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    LP commitments rolling in...
                  </p>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (lpCommitments.reduce((s, c) => s + c.amount, 0) /
                            raiseTarget) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lpCommitments.map((lp, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <span className="text-sm font-medium">{lp.name}</span>
                      <span className="text-sm text-primary font-bold">
                        {formatCurrency(lp.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fundraising complete */}
            {fundraisingDone && (
              <div className="max-w-md mx-auto space-y-6 text-center">
                <div className="space-y-2">
                  <p className="text-lg text-muted-foreground">Total Raised</p>
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(totalRaised)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {((totalRaised / raiseTarget) * 100).toFixed(0)}% of{" "}
                    {formatCurrency(raiseTarget)} target
                  </p>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lpCommitments.map((lp, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-2 rounded bg-secondary/30 text-sm"
                    >
                      <span>{lp.name}</span>
                      <span className="text-primary font-medium">
                        {formatCurrency(lp.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => launchFund(totalRaised)}
                  className="gap-2 h-12 w-full"
                  size="lg"
                >
                  Launch {fundName} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-muted-foreground/50">
        VenCap — Venture Capital Simulator
      </p>
    </PageShell>
  );
}
