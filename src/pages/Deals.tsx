import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGameStore } from "@/engine/gameState";
import { generateStartup } from "@/engine/mockData";
import { DealCard } from "@/components/DealCard";
import InvestModal from "@/components/InvestModal";
import type { Startup, FundStage } from "@/engine/types";
import { checkTimeGate } from "@/engine/timelineGates";
import { t } from "@/lib/i18n";
import { ArrowLeft, RefreshCw, Filter, Search } from "lucide-react";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { PageShell } from "@/components/PageShell";
import { PageTransition } from "@/components/PageTransition";

const SORT_OPTIONS = [
  { value: "valuation_desc", label: "Valuation (High → Low)" },
  { value: "valuation_asc", label: "Valuation (Low → High)" },
  { value: "growth_desc", label: "Growth (High → Low)" },
  { value: "growth_asc", label: "Growth (Low → High)" },
  { value: "name_asc", label: "Name (A → Z)" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const SECTOR_OPTIONS = [
  "All Sectors",
  "SaaS",
  "Fintech",
  "HealthTech",
  "AI/ML",
  "DevTools",
  "Marketplace",
  "Consumer",
  "CleanTech",
  "EdTech",
  "Cybersecurity",
  "DeepTech",
  "Biotech",
  "SpaceTech",
  "AgTech",
  "PropTech",
];

const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Stages" },
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "growth", label: "Growth" },
];

export default function Deals() {
  const navigate = useNavigate();
  const {
    fund,
    gamePhase,
    dealPipeline,
    passOnDeal,
    tutorialMode,
    tutorialStep,
    setTutorialStep,
  } = useGameStore();

  // Redirect if no fund
  useEffect(() => {
    if (!fund || gamePhase === "setup") {
      navigate("/", { replace: true });
    }
  }, [fund, gamePhase, navigate]);

  // Tutorial: auto-advance to step 1 when arriving on Deals page
  useEffect(() => {
    if (tutorialMode && tutorialStep === 0) {
      setTutorialStep(1);
    }
  }, [tutorialMode, tutorialStep, setTutorialStep]);

  // Filters & sort
  const [sortBy, setSortBy] = useState<SortKey>("valuation_desc");
  const [sectorFilter, setSectorFilter] = useState("All Sectors");
  const [stageFilter, setStageFilter] = useState("all");

  // Invest modal
  const [investTarget, setInvestTarget] = useState<Startup | null>(null);

  // Refresh loading state
  const [refreshing, setRefreshing] = useState(false);

  // Filter & sort pipeline
  const sortedDeals = useMemo(() => {
    let deals = [...dealPipeline];

    // Filter
    if (sectorFilter !== "All Sectors") {
      deals = deals.filter((d) => d.sector === sectorFilter);
    }
    if (stageFilter !== "all") {
      deals = deals.filter((d) => d.stage === stageFilter);
    }

    // Sort
    switch (sortBy) {
      case "valuation_desc":
        deals.sort((a, b) => b.valuation - a.valuation);
        break;
      case "valuation_asc":
        deals.sort((a, b) => a.valuation - b.valuation);
        break;
      case "growth_desc":
        deals.sort((a, b) => b.metrics.growthRate - a.metrics.growthRate);
        break;
      case "growth_asc":
        deals.sort((a, b) => a.metrics.growthRate - b.metrics.growthRate);
        break;
      case "name_asc":
        deals.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return deals;
  }, [dealPipeline, sortBy, sectorFilter, stageFilter]);

  if (!fund) return null;

  const handleRefreshDeals = useCallback(() => {
    setRefreshing(true);
    requestAnimationFrame(() => {
      const store = useGameStore.getState();
      if (!store.fund) {
        setRefreshing(false);
        return;
      }
      const newDeals: Startup[] = [];
      for (let i = 0; i < 3; i++) {
        newDeals.push(
          generateStartup(
            store.fund.stage as FundStage,
            store.marketCycle,
            store.fund.skillLevel,
          ),
        );
      }
      useGameStore.setState({
        dealPipeline: [...store.dealPipeline, ...newDeals],
      });
      setRefreshing(false);
    });
  }, []);

  function handlePass(startupId: string) {
    passOnDeal(startupId);
  }

  function handleInvest(startup: Startup) {
    // Tutorial: auto-advance from step 2 (Evaluate a deal) to step 3 (Make your first investment)
    if (tutorialMode && tutorialStep === 2) {
      setTutorialStep(3);
    }
    setInvestTarget(startup);
  }

  return (
    <PageShell className="max-w-7xl mx-auto px-4 py-6">
      <PageTransition className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Deal Flow</h1>
            <p className="text-sm text-muted-foreground">
              {dealPipeline.length} deals in pipeline
            </p>
          </div>
          <div className="ml-auto">
            <Button
              onClick={handleRefreshDeals}
              variant="secondary"
              className="gap-2"
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Refresh Deals
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div
          role="group"
          aria-label="Deal filters and sorting"
          className="flex flex-wrap items-center gap-2 sm:gap-3"
        >
          <Filter
            className="h-4 w-4 text-muted-foreground hidden sm:block"
            aria-hidden="true"
          />

          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger
              className="w-[calc(33%-6px)] sm:w-40"
              aria-label="Filter by sector"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTOR_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger
              className="w-[calc(33%-6px)] sm:w-36"
              aria-label="Filter by stage"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger
              className="w-[calc(33%-6px)] sm:w-48"
              aria-label="Sort deals by"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto" aria-live="polite">
            {sortedDeals.length} showing
          </Badge>
        </div>

        {/* Deal Cards Grid */}
        {sortedDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedDeals.map((startup, index) => {
              const gateKey =
                startup.stage === "pre_seed" || startup.stage === "seed"
                  ? "seed_check"
                  : "due_diligence";
              const gateCheck = checkTimeGate(fund, gateKey);
              const gateMessage = gateCheck.blocked
                ? t(
                    "timeGate.availableIn",
                    `Available in ${gateCheck.monthsRemaining}mo`,
                  )
                : undefined;
              return (
                <DealCard
                  key={startup.id}
                  startup={startup}
                  onInvest={handleInvest}
                  onPass={handlePass}
                  gateMessage={gateMessage}
                  style={{
                    opacity: 0,
                    animation: "fadeInUp 250ms ease-out forwards",
                    animationDelay: `${Math.min(index * 60, 600)}ms`,
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {dealPipeline.length === 0 ? "Pipeline is Empty" : "No Matches"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {dealPipeline.length === 0
                ? "No deals in the pipeline yet. Refresh to scout new startups, or advance time to let your network surface opportunities."
                : "No deals match your current filters. Try broadening your search criteria."}
            </p>
            <Button
              onClick={handleRefreshDeals}
              variant="secondary"
              className="gap-2"
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Scout New Deals
            </Button>
          </div>
        )}

        {/* Invest Modal */}
        <InvestModal
          startup={investTarget}
          open={investTarget !== null}
          onClose={() => setInvestTarget(null)}
        />

        {/* Guided Tutorial Overlays */}
        <TutorialOverlay step={1} />
        <TutorialOverlay step={2} />
      </PageTransition>
    </PageShell>
  );
}
