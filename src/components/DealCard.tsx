import { useState, memo } from "react"
import type { CSSProperties } from "react"
import type { Startup, DiscoverySource, CoInvestor } from "@/engine/types"
import { formatCurrency, formatPercent } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Inbox,
  Users,
  Presentation,
  Newspaper,
  Phone,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react"

const REGION_SHORT: Record<string, string> = {
  silicon_valley: 'SV',
  nyc: 'NYC',
  boston: 'BOS',
  london: 'LON',
  berlin: 'BER',
  singapore: 'SGP',
  austin: 'AUS',
  chicago: 'CHI',
}

interface DealCardProps {
  startup: Startup
  onInvest: (startup: Startup) => void
  onPass: (startupId: string) => void
  /** Optional inline style, used by parent for staggered animation delay */
  style?: CSSProperties
}

const DISCOVERY_ICONS: Record<DiscoverySource, typeof Inbox> = {
  inbound: Inbox,
  referral: Users,
  conference: Presentation,
  news: Newspaper,
  cold_outreach: Phone,
}

const TRAIT_COLORS: Record<string, string> = {
  grit: "bg-orange-500",
  clarity: "bg-blue-500",
  charisma: "bg-purple-500",
  experience: "bg-green-500",
}

const TIER_COLORS: Record<CoInvestor["tier"], string> = {
  tier1: "bg-yellow-600 text-yellow-100",
  friendly: "bg-green-700 text-green-100",
  competitive: "bg-red-700 text-red-100",
  strategic: "bg-blue-700 text-blue-100",
}

function TraitBar({ label, value, color }: { label: string; value: number; color: string }) {
  const widthPercent = (value / 10) * 100
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 capitalize text-muted-foreground">{label}</span>
      <div
        className="flex-1 h-2 rounded-full bg-muted overflow-hidden"
        role="meter"
        aria-label={`${label} score`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={10}
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="w-5 text-right text-muted-foreground">{value}</span>
    </div>
  )
}

function SignalPills({ items, color }: { items: string[]; color: string }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export const DealCard = memo(function DealCard({ startup, onInvest, onPass, style }: DealCardProps) {
  const [ddExpanded, setDdExpanded] = useState(false)

  const DiscoveryIcon = DISCOVERY_ICONS[startup.discoverySource]
  const { metrics, unitEconomics, marketData, founderTraits } = startup

  return (
    <Card
      className="w-full max-w-lg transition-transform duration-200 hover:scale-[1.02]"
      style={style}
      aria-label={`Deal: ${startup.name}, ${startup.sector}, ${startup.stage}, valued at ${formatCurrency(startup.valuation)}`}
    >
      {/* Header */}
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg truncate">{startup.name}</span>
            <Badge variant="secondary">{startup.sector}</Badge>
            <Badge variant="outline">{startup.stage}</Badge>
            {startup.region && (
              <Badge variant="outline" className="text-xs gap-1">
                <MapPin className="size-3" />
                {REGION_SHORT[startup.region] ?? startup.region}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {startup.description}
          </p>
        </div>
        <DiscoveryIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Founder Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{startup.founderName}</h4>
          <div className="space-y-1">
            {(Object.keys(TRAIT_COLORS) as Array<keyof typeof TRAIT_COLORS>).map(
              (trait) => (
                <TraitBar
                  key={trait}
                  label={trait}
                  value={founderTraits[trait as keyof typeof founderTraits]}
                  color={TRAIT_COLORS[trait]}
                />
              ),
            )}
          </div>
        </div>

        {/* Team */}
        <p className="text-sm text-muted-foreground">
          {startup.teamSize} person team
        </p>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">MRR:</span>
            <span className="font-medium">{formatCurrency(metrics.mrr)}</span>
            {metrics.growthRate > 0.05 && (
              <>
                <TrendingUp className="size-3.5 text-green-500" aria-hidden="true" />
                <span className="sr-only">High growth</span>
              </>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Growth:</span>{" "}
            <span className="font-medium">
              {formatPercent(metrics.growthRate * 100)}/mo
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Churn:</span>{" "}
            <span className="font-medium">
              {formatPercent(metrics.churn * 100)}/mo
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Burn:</span>{" "}
            <span className="font-medium">
              {formatCurrency(metrics.burnRate)}/mo
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Runway:</span>{" "}
            <span className="font-medium">
              {Math.round(metrics.runway)} months
            </span>
          </div>
        </div>

        {/* Unit Economics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-1.5 rounded bg-secondary/40">
            <p className="text-muted-foreground">CAC</p>
            <p className="font-medium">{formatCurrency(unitEconomics.cac)}</p>
          </div>
          <div className="p-1.5 rounded bg-secondary/40">
            <p className="text-muted-foreground">LTV</p>
            <p className="font-medium">{formatCurrency(unitEconomics.ltv)}</p>
          </div>
          <div className="p-1.5 rounded bg-secondary/40">
            <p className="text-muted-foreground">LTV:CAC</p>
            <p className="font-medium">{unitEconomics.ltvCacRatio.toFixed(1)}x</p>
          </div>
          <div className="p-1.5 rounded bg-secondary/40">
            <p className="text-muted-foreground">GM</p>
            <p className="font-medium">
              {formatPercent(unitEconomics.grossMargin)}
            </p>
          </div>
        </div>

        {/* Market */}
        <div className="space-y-1 text-sm">
          <h4 className="font-semibold">Market</h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span>
              TAM: <span className="text-foreground font-medium">{formatCurrency(marketData.tamSize)}</span>
            </span>
            <span>
              Growth: <span className="text-foreground font-medium">{formatPercent(marketData.tamGrowthRate * 100)}/yr</span>
            </span>
            <span>
              Competition:{" "}
              <span className="text-foreground font-medium capitalize">
                {marketData.competitionLevel}
              </span>
            </span>
          </div>
        </div>

        {/* Valuation */}
        <div className="text-sm">
          <span className="text-muted-foreground">Valuation:</span>{" "}
          <span className="font-bold text-base">
            {formatCurrency(startup.valuation)}
          </span>
        </div>

        {/* Signals */}
        <div className="space-y-2">
          <SignalPills
            items={startup.strengths}
            color="bg-green-900/60 text-green-300"
          />
          <SignalPills
            items={startup.risks}
            color="bg-yellow-900/60 text-yellow-300"
          />
          <SignalPills
            items={startup.redFlags}
            color="bg-red-900/60 text-red-300"
          />
        </div>

        {/* DD Notes */}
        {startup.ddNotes.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              aria-expanded={ddExpanded}
              aria-label={`Due diligence notes for ${startup.name}`}
              className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setDdExpanded((prev) => !prev)}
            >
              DD Notes
              {ddExpanded ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </button>
            {ddExpanded && (
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {startup.ddNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Co-investors */}
        {startup.coInvestors.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Co-investors</h4>
            <div className="flex flex-wrap gap-1.5">
              {startup.coInvestors.map((ci) => (
                <span
                  key={ci.name}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[ci.tier]}`}
                >
                  {ci.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Founder Willingness */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Founder Willingness</span>
            <span className="font-medium">{startup.founderWillingness}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="meter"
            aria-label="Founder willingness"
            aria-valuenow={startup.founderWillingness}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-all ${
                startup.founderWillingness > 70
                  ? "bg-green-500"
                  : startup.founderWillingness >= 40
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${startup.founderWillingness}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => onPass(startup.id)}
            aria-label={`Pass on ${startup.name}`}
          >
            Pass
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => onInvest(startup)}
            aria-label={`Invest in ${startup.name}`}
          >
            Invest
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}, (prev, next) => prev.startup.id === next.startup.id && prev.style === next.style)
