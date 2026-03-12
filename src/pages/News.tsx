import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
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
import { getMonthName, getGameYear } from "@/lib/utils";
import type { NewsType, EventSentiment } from "@/engine/types";
import { ArrowLeft, Newspaper, Briefcase, Filter } from "lucide-react";
import { PageShell } from "@/components/PageShell";

// ============ CONSTANTS ============

const TYPE_CONFIG: Record<NewsType, { label: string; className: string }> = {
  funding_round: {
    label: "Funding Round",
    className: "bg-green-600 text-green-100",
  },
  exit: { label: "Exit", className: "bg-blue-600 text-blue-100" },
  market_trend: {
    label: "Market Trend",
    className: "bg-purple-600 text-purple-100",
  },
  cycle_change: {
    label: "Cycle Change",
    className: "bg-orange-600 text-orange-100",
  },
  regulation: { label: "Regulation", className: "bg-gray-600 text-gray-100" },
  scandal: { label: "Scandal", className: "bg-red-600 text-red-100" },
};

const SENTIMENT_DOT: Record<EventSentiment, string> = {
  positive: "bg-green-400",
  negative: "bg-red-400",
  neutral: "bg-blue-400",
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "funding_round", label: "Funding Round" },
  { value: "exit", label: "Exit" },
  { value: "market_trend", label: "Market Trend" },
  { value: "cycle_change", label: "Cycle Change" },
  { value: "regulation", label: "Regulation" },
  { value: "scandal", label: "Scandal" },
];

const SENTIMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Sentiment" },
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
];

// ============ COMPONENT ============

export default function News() {
  const navigate = useNavigate();
  const { fund, gamePhase, news } = useGameStore();

  useEffect(() => {
    if (!fund || gamePhase === "setup") {
      navigate("/", { replace: true });
    }
  }, [fund, gamePhase, navigate]);

  const [typeFilter, setTypeFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [portfolioOnly, setPortfolioOnly] = useState(false);

  const filteredNews = useMemo(() => {
    let items = [...news];

    if (typeFilter !== "all") {
      items = items.filter((n) => n.type === typeFilter);
    }
    if (sentimentFilter !== "all") {
      items = items.filter((n) => n.sentiment === sentimentFilter);
    }
    if (portfolioOnly) {
      items = items.filter((n) => n.portfolioRelated);
    }

    // Chronological, newest first
    items.sort((a, b) => b.month - a.month);

    return items;
  }, [news, typeFilter, sentimentFilter, portfolioOnly]);

  if (!fund) return null;

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
          <h1 className="text-2xl font-bold">News Feed</h1>
          <p className="text-sm text-muted-foreground">
            {news.length} total articles — Market intelligence and portfolio
            updates
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SENTIMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={portfolioOnly ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setPortfolioOnly((prev) => !prev)}
        >
          <Briefcase className="h-3.5 w-3.5" />
          My Portfolio Only
        </Button>

        <Badge variant="secondary" className="ml-auto">
          {filteredNews.length} showing
        </Badge>
      </div>

      {/* News Cards */}
      {filteredNews.length > 0 ? (
        <div className="space-y-3 max-h-[calc(100dvh-14rem)] overflow-y-auto">
          {filteredNews.map((item) => {
            const typeConf = TYPE_CONFIG[item.type];
            const sentimentClass = SENTIMENT_DOT[item.sentiment];

            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Sentiment dot */}
                    <span
                      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${sentimentClass}`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={typeConf.className}
                          variant="secondary"
                        >
                          {typeConf.label}
                        </Badge>
                        {item.portfolioRelated && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 gap-1"
                          >
                            <Briefcase className="h-2.5 w-2.5" />
                            Portfolio
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-sm leading-tight">
                        {item.headline}
                      </h3>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {getMonthName(item.month)} Y{getGameYear(item.month)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Newspaper className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {news.length === 0 ? "No News Yet" : "No Matches"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {news.length === 0
              ? "Market intelligence will flow in as you advance time. Expect funding rounds, exits, and sector trends."
              : "No articles match your current filters. Try broadening your criteria."}
          </p>
        </div>
      )}
    </PageShell>
  );
}
