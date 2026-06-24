// WEB-ONLY (recharts/SVG); do not import from React Native — mobile uses a native chart lib.
//
// ImpressionTrendChart — multi-series impression/engagement trend over time (line or area).
// Props-driven: the host supplies `series: Series[]` (from @paxpia/core/analytics, e.g.
// `seriesByEventType(events)` or a CreatorOverview.trend). PURE presentational; no data
// fetching here. Consumed by Paxpia-web (creator analytics) + Paxpia-admin (monitoring).

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { Series } from '@paxpia/core';
import { chartChrome, seriesColor, formatCompact, minuteTickLabel } from './theme';

export interface ImpressionTrendChartProps {
  /** One entry per line. Each `Series.points` is ascending by `unixMinute`. */
  series: Series[];
  /** 'line' (default) or 'area' (stacked-friendly filled). */
  variant?: 'line' | 'area';
  /** Pixel height (width fills the parent via ResponsiveContainer). Default 240. */
  height?: number;
  /** Show the legend (default true when >1 series). */
  showLegend?: boolean;
  /** Optional explicit series→colour override (else the SERIES_PALETTE ramp by index). */
  colorFor?: (label: string, index: number) => string;
}

/** Fold N series into recharts' wide row format: one row per distinct minute, a column
 *  per series label. Missing points are left undefined (recharts draws a gap / `connectNulls`
 *  is off by default — a true gap, which is correct for sparse impression data). */
function toWideRows(series: Series[]): Array<Record<string, number>> {
  const byMinute = new Map<number, Record<string, number>>();
  for (const s of series) {
    for (const p of s.points) {
      let row = byMinute.get(p.unixMinute);
      if (!row) {
        row = { unixMinute: p.unixMinute };
        byMinute.set(p.unixMinute, row);
      }
      row[s.label] = (row[s.label] ?? 0) + p.count;
    }
  }
  return [...byMinute.values()].sort((a, b) => a.unixMinute - b.unixMinute);
}

export function ImpressionTrendChart({
  series,
  variant = 'line',
  height = 240,
  showLegend,
  colorFor,
}: ImpressionTrendChartProps) {
  const rows = useMemo(() => toWideRows(series), [series]);
  const legend = showLegend ?? series.length > 1;
  const color = (label: string, i: number) => colorFor?.(label, i) ?? seriesColor(i);

  const axes = (
    <>
      <CartesianGrid stroke={chartChrome.grid} vertical={false} />
      <XAxis
        dataKey="unixMinute"
        tickFormatter={minuteTickLabel}
        stroke={chartChrome.axis}
        fontSize={11}
        tickLine={false}
        minTickGap={28}
      />
      <YAxis
        stroke={chartChrome.axis}
        fontSize={11}
        tickLine={false}
        width={40}
        tickFormatter={formatCompact}
        allowDecimals={false}
      />
      <Tooltip
        labelFormatter={(v) => minuteTickLabel(Number(v))}
        contentStyle={{
          background: chartChrome.tooltipBg,
          border: `1px solid ${chartChrome.tooltipBorder}`,
          borderRadius: 8,
          color: chartChrome.tooltipText,
        }}
        itemStyle={{ color: chartChrome.tooltipText }}
      />
      {legend ? <Legend wrapperStyle={{ fontSize: 12, color: chartChrome.axis }} /> : null}
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {variant === 'area' ? (
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {axes}
          {series.map((s, i) => (
            <Area
              key={s.label}
              type="monotone"
              dataKey={s.label}
              stroke={color(s.label, i)}
              fill={color(s.label, i)}
              fillOpacity={0.18}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {axes}
          {series.map((s, i) => (
            <Line
              key={s.label}
              type="monotone"
              dataKey={s.label}
              stroke={color(s.label, i)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
