"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ui } from "@/components/layout/stats-ui";
import type {
  TooltipContentProps,
  TooltipValueType
} from "recharts";
import type { ServerDailyPlayersSnapshot } from "@/src/server/repositories/server-details-repository";

type DailyPlayerTrendChartProps = {
  data: ServerDailyPlayersSnapshot[];
};

type TrendDatum = ServerDailyPlayersSnapshot & {
  shortDate: string;
  longDate: string;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...options
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function trendDeltaLabel(latest: TrendDatum, previous: TrendDatum | null): string {
  if (!previous) {
    return "First day shown";
  }

  const delta = latest.averagePlayers - previous.averagePlayers;
  if (Math.abs(delta) < 0.05) {
    return "Even with prior day";
  }

  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${formatNumber(delta)} vs prior day`;
}

function valueDomain(maxValue: number): [number, number] {
  return [0, Math.max(10, Math.ceil(maxValue / 10) * 10)];
}

function CustomTooltip({
  active,
  payload
}: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload as TrendDatum | undefined;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded-sm border border-slate-600/70 bg-slate-950/95 px-3 py-2 text-xs shadow-xl shadow-slate-950/40">
      <p className="font-semibold text-slate-100">{point.longDate}</p>
      <div className="mt-2 grid grid-cols-3 gap-3 text-slate-400">
        <span>
          Avg peak
          <strong className="mt-0.5 block text-sm text-slate-100">
            {formatNumber(point.averagePlayers)}
          </strong>
        </span>
        <span>
          Day peak
          <strong className="mt-0.5 block text-sm text-slate-100">
            {formatInteger(point.peakPlayers)}
          </strong>
        </span>
        <span>
          Rounds
          <strong className="mt-0.5 block text-sm text-slate-100">
            {formatInteger(point.roundCount)}
          </strong>
        </span>
      </div>
    </div>
  );
}

export function DailyPlayerTrendChart({ data }: DailyPlayerTrendChartProps) {
  const chart = useMemo(() => {
    const points = data
      .filter((entry) => entry.date && Number.isFinite(entry.averagePlayers))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map<TrendDatum>((entry) => ({
        ...entry,
        shortDate: formatDate(entry.date, { month: "short", day: "numeric" }),
        longDate: formatDate(entry.date, {
          weekday: "short",
          month: "short",
          day: "numeric"
        })
      }));

    if (points.length === 0) {
      return null;
    }

    const latestIndex = points.length - 1;
    const latest = points[latestIndex];
    const previous = latestIndex > 0 ? points[latestIndex - 1] : null;
    const bestAverage = points.reduce((best, point) =>
      point.averagePlayers > best.averagePlayers ? point : best
    );
    const bestPeak = points.reduce((best, point) =>
      point.peakPlayers > best.peakPlayers ? point : best
    );
    const trendAverage =
      points.reduce((sum, point) => sum + point.averagePlayers, 0) / points.length;
    const totalRounds = points.reduce((sum, point) => sum + point.roundCount, 0);
    const maxPlayers = Math.max(
      1,
      ...points.map((point) => Math.max(point.averagePlayers, point.peakPlayers))
    );
    const maxRounds = Math.max(1, ...points.map((point) => point.roundCount));

    return {
      bestAverage,
      bestPeak,
      latest,
      maxPlayers,
      maxRounds,
      points,
      previous,
      totalRounds,
      trendAverage
    };
  }, [data]);

  if (!chart) {
    return (
      <section className={`mt-6 ${ui.panel}`}>
        <h2 className={ui.sectionTitle}>Daily Player Trend</h2>
        <p className="mt-3 text-sm text-slate-400">No daily trend data found.</p>
      </section>
    );
  }

  return (
    <section className={`mt-6 ${ui.panel}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className={ui.sectionTitle}>Daily Player Trend</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Last {chart.points.length} active days. Average peak players with round volume.
          </p>
        </div>
        <div className="grid gap-x-6 gap-y-3 border-y border-slate-700/55 py-3 text-sm sm:grid-cols-4 lg:min-w-[34rem] lg:border-y-0 lg:py-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Latest Avg
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {formatNumber(chart.latest.averagePlayers)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {trendDeltaLabel(chart.latest, chart.previous)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Trend Avg
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {formatNumber(chart.trendAverage)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Across shown days</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Best Avg
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {formatNumber(chart.bestAverage.averagePlayers)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{chart.bestAverage.shortDate}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Rounds
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {formatInteger(chart.totalRounds)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Peak {formatInteger(chart.bestPeak.peakPlayers)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-sm border border-slate-700/50 bg-slate-950/45 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-1 pb-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">{chart.latest.longDate}</p>
            <p className="mt-1 text-xs text-slate-500">
              {trendDeltaLabel(chart.latest, chart.previous)}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
            <span>
              Avg peak{" "}
              <strong className="font-semibold text-slate-100">
                {formatNumber(chart.latest.averagePlayers)}
              </strong>
            </span>
            <span>
              Day peak{" "}
              <strong className="font-semibold text-slate-100">
                {formatInteger(chart.latest.peakPlayers)}
              </strong>
            </span>
            <span>
              Rounds{" "}
              <strong className="font-semibold text-slate-100">
                {formatInteger(chart.latest.roundCount)}
              </strong>
            </span>
          </div>
        </div>

        <div className="h-[300px] min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={300}
            initialDimension={{ width: 720, height: 300 }}
          >
            <ComposedChart
              accessibilityLayer
              data={chart.points}
              margin={{ top: 18, right: 12, bottom: 8, left: -18 }}
            >
              <defs>
                <linearGradient id="daily-player-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="shortDate"
                minTickGap={22}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#1e293b" }}
              />
              <YAxis
                yAxisId="players"
                domain={valueDomain(chart.maxPlayers)}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <YAxis
                yAxisId="rounds"
                orientation="right"
                domain={valueDomain(chart.maxRounds)}
                hide
              />
              <Tooltip
                cursor={{ stroke: "#bae6fd", strokeDasharray: "4 5", strokeOpacity: 0.55 }}
                content={(props) => <CustomTooltip {...props} />}
              />
              <ReferenceLine
                yAxisId="players"
                y={chart.trendAverage}
                stroke="#facc15"
                strokeDasharray="5 6"
                strokeOpacity={0.75}
                label={{
                  value: "Average",
                  fill: "#fde68a",
                  fontSize: 11,
                  position: "right"
                }}
              />
              <Bar
                yAxisId="rounds"
                dataKey="roundCount"
                fill="#334155"
                fillOpacity={0.72}
                maxBarSize={16}
                radius={[2, 2, 0, 0]}
              />
              <Area
                yAxisId="players"
                type="monotone"
                dataKey="averagePlayers"
                fill="url(#daily-player-area)"
                stroke="#67e8f9"
                strokeWidth={3}
                activeDot={{
                  fill: "#020617",
                  r: 6,
                  stroke: "#e0f2fe",
                  strokeWidth: 3
                }}
                dot={{
                  fill: "#67e8f9",
                  r: 3,
                  stroke: "#020617",
                  strokeWidth: 2
                }}
              />
              <Line
                yAxisId="players"
                type="monotone"
                dataKey="peakPlayers"
                dot={false}
                stroke="#94a3b8"
                strokeDasharray="3 5"
                strokeOpacity={0.42}
                strokeWidth={1.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
