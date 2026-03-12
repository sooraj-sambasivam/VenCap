import type { ActionPreview } from "@/engine/types";
import { formatPreviewValue } from "@/engine/actionPreview";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

const DIRECTION_STYLES = {
  up: "text-emerald-400",
  down: "text-red-400",
  neutral: "text-muted-foreground",
} as const;

const DIRECTION_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
} as const;

export function ActionPreviewPanel({ preview }: { preview: ActionPreview }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Predicted Effects
      </p>
      <div className="space-y-1.5">
        {preview.effects.map((effect, i) => {
          const Icon = DIRECTION_ICONS[effect.direction];
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Icon
                className={`size-3.5 shrink-0 ${DIRECTION_STYLES[effect.direction]}`}
              />
              <span className="text-muted-foreground">{effect.metric}</span>
              <span className="ml-auto flex items-center gap-1.5 tabular-nums">
                <span className="text-muted-foreground/60">
                  {formatPreviewValue(effect.metric, effect.before)}
                </span>
                <ArrowRight className="size-3 text-muted-foreground/40" />
                <span className={DIRECTION_STYLES[effect.direction]}>
                  {formatPreviewValue(effect.metric, effect.after)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
