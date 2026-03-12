import type { TickSummary, TickSummaryItem } from "@/engine/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getGameYear, getMonthName } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  BarChart3,
  Users,
  Building2,
} from "lucide-react";

const IMPACT_STYLES = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-muted-foreground",
} as const;

const IMPACT_ICONS = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
} as const;

const CATEGORY_ICONS = {
  portfolio: Briefcase,
  market: BarChart3,
  lp: Users,
  fund: Building2,
} as const;

const CATEGORY_LABELS = {
  portfolio: "Portfolio",
  market: "Market",
  lp: "LP Relations",
  fund: "Fund",
} as const;

function SummaryItem({ item }: { item: TickSummaryItem }) {
  const ImpactIcon = IMPACT_ICONS[item.impact];
  const CategoryIcon = CATEGORY_ICONS[item.category];

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <CategoryIcon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${IMPACT_STYLES[item.impact]}`}>
          {item.description}
        </p>
      </div>
      <ImpactIcon
        className={`mt-0.5 size-4 shrink-0 ${IMPACT_STYLES[item.impact]}`}
      />
    </div>
  );
}

export function TickSummaryDialog({
  summary,
  open,
  onClose,
}: {
  summary: TickSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!summary || summary.items.length === 0) return null;

  // Group items by category
  const grouped = summary.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, TickSummaryItem[]>,
  );

  const positiveCount = summary.items.filter(
    (i) => i.impact === "positive",
  ).length;
  const negativeCount = summary.items.filter(
    (i) => i.impact === "negative",
  ).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Month Summary — Year {getGameYear(summary.month)},{" "}
            {getMonthName(summary.month)}
          </DialogTitle>
          <div className="flex gap-2 pt-1">
            {positiveCount > 0 && (
              <Badge
                variant="outline"
                className="text-emerald-400 border-emerald-400/30"
              >
                {positiveCount} positive
              </Badge>
            )}
            {negativeCount > 0 && (
              <Badge
                variant="outline"
                className="text-red-400 border-red-400/30"
              >
                {negativeCount} negative
              </Badge>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {(
              Object.entries(grouped) as [
                TickSummaryItem["category"],
                TickSummaryItem[],
              ][]
            ).map(([category, items], idx) => (
              <div key={category}>
                {idx > 0 && <Separator className="mb-3" />}
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[category]}
                </p>
                {items.map((item, i) => (
                  <SummaryItem key={i} item={item} />
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
