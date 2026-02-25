import { memo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const COLORS = {
  indigo: "#6366f1",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  slate400: "#94a3b8",
} as const;

const PIE_PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#a78bfa", // light violet
] as const;

/** Format a dollar value as a compact label ($10M, $5K, etc.) */
function formatDollarShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/** Format a dollar value with commas for tooltips */
function formatDollarFull(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const AXIS_STYLE = {
  tick: { fill: "#d1d5db", fontSize: 12 },
  axisLine: { stroke: COLORS.slate400, strokeWidth: 0.5 },
  tickLine: { stroke: COLORS.slate400 },
} as const;

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 13,
  },
  labelStyle: { color: "#94a3b8" },
} as const;

// ---------------------------------------------------------------------------
// 1. PortfolioValueChart — dual-line chart
// ---------------------------------------------------------------------------

interface PortfolioValueChartProps {
  data: {
    month: number;
    totalPortfolioValue: number;
    cashAvailable: number;
  }[];
}

export const PortfolioValueChart = memo(function PortfolioValueChart({ data }: PortfolioValueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Value</CardTitle>
      </CardHeader>
      <CardContent role="img" aria-label="Line chart showing portfolio value and cash available over time">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <XAxis
              dataKey="month"
              {...AXIS_STYLE}
              label={{
                value: "Month",
                position: "insideBottomRight",
                offset: -4,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <YAxis {...AXIS_STYLE} tickFormatter={formatDollarShort} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value, name) => [
                formatDollarFull(Number(value ?? 0)),
                name === "totalPortfolioValue"
                  ? "Portfolio Value"
                  : "Cash Available",
              ]}
              labelFormatter={(label) => `Month ${label}`}
            />
            <Legend
              wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }}
              formatter={(value: string) =>
                value === "totalPortfolioValue"
                  ? "Portfolio Value"
                  : "Cash Available"
              }
            />
            <Line
              type="monotone"
              dataKey="totalPortfolioValue"
              stroke={COLORS.indigo}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COLORS.indigo }}
            />
            <Line
              type="monotone"
              dataKey="cashAvailable"
              stroke={COLORS.emerald}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COLORS.emerald }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
})

// ---------------------------------------------------------------------------
// 2. DeploymentPaceChart — area chart with ideal-pace reference line
// ---------------------------------------------------------------------------

interface DeploymentPaceChartProps {
  data: { month: number; deployed: number }[];
  fundSize: number;
}

export const DeploymentPaceChart = memo(function DeploymentPaceChart({
  data,
  fundSize,
}: DeploymentPaceChartProps) {
  const merged = Array.from({ length: 61 }, (_, i) => {
    const existing = data.find((d) => d.month === i);
    return {
      month: i,
      deployed: existing?.deployed ?? null,
      idealPace: (fundSize / 60) * i,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployment Pace</CardTitle>
      </CardHeader>
      <CardContent role="img" aria-label="Area chart showing capital deployment pace versus ideal deployment rate">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={merged}>
            <XAxis
              dataKey="month"
              {...AXIS_STYLE}
              label={{
                value: "Month",
                position: "insideBottomRight",
                offset: -4,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <YAxis {...AXIS_STYLE} tickFormatter={formatDollarShort} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value, name) => {
                if (value == null) return ["-", name ?? ""];
                return [
                  formatDollarFull(Number(value)),
                  name === "deployed" ? "Deployed" : "Ideal Pace",
                ];
              }}
              labelFormatter={(label) => `Month ${label}`}
            />
            <Legend
              wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }}
              formatter={(value: string) =>
                value === "deployed" ? "Deployed" : "Ideal Pace"
              }
            />
            <Area
              type="monotone"
              dataKey="deployed"
              stroke={COLORS.indigo}
              fill={COLORS.indigo}
              fillOpacity={0.25}
              strokeWidth={2}
              connectNulls
            />
            <ReferenceLine
              stroke={COLORS.amber}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              segment={[
                { x: 0, y: 0 },
                { x: 60, y: fundSize },
              ]}
              label={{
                value: "Ideal Pace",
                position: "insideTopRight",
                fill: COLORS.amber,
                fontSize: 11,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
})

// ---------------------------------------------------------------------------
// 3. LPSentimentChart — line chart with colored reference zones
// ---------------------------------------------------------------------------

interface LPSentimentChartProps {
  data: { month: number; lpScore: number }[];
}

export const LPSentimentChart = memo(function LPSentimentChart({ data }: LPSentimentChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LP Sentiment</CardTitle>
      </CardHeader>
      <CardContent role="img" aria-label="Line chart showing LP sentiment score over time, with green zone above 60 and red zone below 40">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <XAxis
              dataKey="month"
              {...AXIS_STYLE}
              label={{
                value: "Month",
                position: "insideBottomRight",
                offset: -4,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <YAxis
              {...AXIS_STYLE}
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [
                Number(value ?? 0).toFixed(1),
                "LP Score",
              ]}
              labelFormatter={(label) => `Month ${label}`}
            />

            {/* Green zone: 60-100 */}
            <ReferenceArea
              y1={60}
              y2={100}
              fill={COLORS.emerald}
              fillOpacity={0.1}
            />

            {/* Red zone: 0-40 */}
            <ReferenceArea
              y1={0}
              y2={40}
              fill={COLORS.rose}
              fillOpacity={0.1}
            />

            <Line
              type="monotone"
              dataKey="lpScore"
              stroke={COLORS.indigo}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COLORS.indigo }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
})

// ---------------------------------------------------------------------------
// 4. SectorAllocationChart — pie chart
// ---------------------------------------------------------------------------

interface SectorAllocationChartProps {
  data: { sector: string; amount: number }[];
}

function renderPieLabel(props: PieLabelRenderProps): string {
  const name = String(props.name ?? "");
  const value = Number(props.value ?? 0);
  return `${name} ${formatDollarShort(value)}`;
}

export const SectorAllocationChart = memo(function SectorAllocationChart({ data }: SectorAllocationChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Allocation</CardTitle>
      </CardHeader>
      <CardContent role="img" aria-label="Pie chart showing investment allocation across sectors">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="sector"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderPieLabel}
              labelLine={{ stroke: "#94a3b8" }}
              stroke="none"
            >
              {data.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_PALETTE[index % PIE_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [
                formatDollarFull(Number(value ?? 0)),
                "Amount",
              ]}
            />
            <Legend wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
})

// ---------------------------------------------------------------------------
// 5. WaterfallChart — fund performance waterfall
// ---------------------------------------------------------------------------

interface WaterfallChartProps {
  data: {
    invested: number;
    cashReturned: number;
    unrealizedValue: number;
    fees: number;
    carry: number;
  };
}

export const WaterfallChart = memo(function WaterfallChart({ data }: WaterfallChartProps) {
  const netValue = data.invested + data.cashReturned + data.unrealizedValue - data.fees - data.carry;

  const chartData = [
    { name: 'Invested', value: data.invested, base: 0, fill: COLORS.indigo },
    { name: 'Returned', value: data.cashReturned, base: data.invested, fill: COLORS.emerald },
    { name: 'Unrealized', value: data.unrealizedValue, base: data.invested + data.cashReturned, fill: '#8b5cf6' },
    { name: 'Fees', value: data.fees, base: data.invested + data.cashReturned + data.unrealizedValue - data.fees, fill: COLORS.amber },
    { name: 'Carry', value: data.carry, base: data.invested + data.cashReturned + data.unrealizedValue - data.fees - data.carry, fill: COLORS.rose },
    { name: 'Net to LP', value: Math.max(0, netValue), base: 0, fill: '#06b6d4' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fund Performance Waterfall</CardTitle>
      </CardHeader>
      <CardContent role="img" aria-label="Bar chart showing fund performance waterfall from invested capital to net LP returns">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barCategoryGap="20%">
            <XAxis dataKey="name" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} tickFormatter={formatDollarShort} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value) => [formatDollarFull(Number(value ?? 0)), 'Amount']}
            />
            <Bar dataKey="base" stackId="waterfall" fill="transparent" />
            <Bar
              dataKey="value"
              stackId="waterfall"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
})
