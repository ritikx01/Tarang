import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { TrendingDown, TrendingUp } from "lucide-react";
import { PerformanceInterval } from "@/pages/PeriodicPerformance";

const GREEN_HSL_BASE = "var(--chart-2)"; // A clear, medium-dark green
const RED_HSL_BASE = "var(--chart-1)"; // A strong, medium-light red

const GREEN_START = "rgba(46, 204, 113, 0.8)"; // Light green
const GREEN_END = "rgba(46, 204, 113, 0.5)"; // Medium-dark green
const RED_START = "rgba(231, 76, 60, 0.5)"; // Light red
const RED_END = "rgba(231, 76, 60, 0.8)"; // Medium-dark red

const POSITIVE_COLOR_FROM = GREEN_START;
const POSITIVE_COLOR_TO = GREEN_END;
const NEGATIVE_COLOR_FROM = RED_START;
const NEGATIVE_COLOR_TO = RED_END;

// const POSITIVE_COLOR_FROM = `hsl(${GREEN_HSL_BASE} / 0.8)`;
// const POSITIVE_COLOR_TO = `hsl(${GREEN_HSL_BASE})`;
// const NEGATIVE_COLOR_FROM = `hsl(${RED_HSL_BASE} / 0.8)`;
// const NEGATIVE_COLOR_TO = `hsl(${RED_HSL_BASE})`;

const intervalTypeValueMapping: Partial<Record<PerformanceInterval, string>> = {
  D: "Day",
  W: "Week",
  Y: "Year",
};

const chartConfig = {
  value: {
    label: "Performance",
  },
} satisfies ChartConfig;

interface ChartDataPoint {
  index: number;
  value: number;
}
export function PeriodicChart({
  chartData,
  interval,
}: {
  chartData: ChartDataPoint[];
  interval: PerformanceInterval;
}) {
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0];
      const value = dataPoint.value as number;
      const isPositive = value >= 0;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2">
            <div className="font-semibold">
              {interval === "M"
                ? formatXAxis(Number(label))
                : `${intervalTypeValueMapping[interval]} ${label}`}
            </div>
            <div className="flex-1"></div>
            <div
              className={`flex items-center gap-1 font-semibold ${
                isPositive ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {value}%
            </div>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {chartConfig.value.label}: {value}%
          </div>
        </div>
      );
    }

    return null;
  };

  const formatXAxis = (value: number) => {
    if (interval === "M") {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return months[value - 1] || value.toString();
    }
    return value.toString();
  };
  const yAxisLength: number =
    Math.ceil(Math.max(...chartData.map((data) => Math.abs(data.value))) / 10) *
    10;
  const yAxisTicks: number[] = [];
  for (let i = -yAxisLength; i <= yAxisLength; i += 10) {
    yAxisTicks.push(i);
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="border-[1px] border-slate-600 rounded-lg py-4 pl-4 h-[450px] w-full"
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 5,
          right: 5,
          bottom: 5,
        }}
      >
        <defs>
          <linearGradient id="gradientPositive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={POSITIVE_COLOR_TO} stopOpacity={1} />
            <stop
              offset="95%"
              stopColor={POSITIVE_COLOR_FROM}
              stopOpacity={0.8}
            />
          </linearGradient>
          <linearGradient id="gradientNegative" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={NEGATIVE_COLOR_FROM}
              stopOpacity={0.8}
            />
            <stop offset="95%" stopColor={NEGATIVE_COLOR_TO} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="hsl(var(--border) / 0.5)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="index"
          tickLine={false}
          tickMargin={10}
          axisLine={{ stroke: "hsl(var(--border) / 0.5)" }}
          tickFormatter={formatXAxis}
        />
        <YAxis
          domain={[-yAxisLength, yAxisLength]}
          ticks={yAxisTicks}
          tickFormatter={(value) => `${value}%`}
          tickLine={false}
          tickMargin={5}
          axisLine={{ stroke: "hsl(var(--border) / 0.5)" }}
          orientation="right"
        />

        <ReferenceLine
          y={0}
          stroke="hsl(var(--foreground) / 0.4)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />

        <ChartTooltip cursor={false} content={<CustomTooltipContent />} />

        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-in-out"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.value >= 0
                  ? "url(#gradientPositive)"
                  : "url(#gradientNegative)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
