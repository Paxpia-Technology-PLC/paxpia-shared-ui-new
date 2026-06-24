// WEB-ONLY (recharts/SVG); do not import from React Native — mobile uses a native chart lib.
//
// WatchPulseChart — a filled area of watch-pulses / concurrent viewers over time (one
// series). Props-driven: the host supplies a single `Series` (e.g. a LiveMetrics
// concurrency or watch_pulse series from @paxpia/core/analytics). Thin wrapper over an
// area chart tuned for a single dense pulse line. Consumed by web (live recap) + admin.

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { Series } from '@paxpia/core';
import { chartChrome, formatCompact, minuteTickLabel, seriesColor } from './theme';

export interface WatchPulseChartProps {
  series: Series;
  /** Pixel height. Default 200. */
  height?: number;
  /** Override the fill/stroke colour (default the brand series colour). */
  color?: string;
}

export function WatchPulseChart({ series, height = 200, color }: WatchPulseChartProps) {
  const data = useMemo(() => series.points.map((p) => ({ unixMinute: p.unixMinute, value: p.count })), [series]);
  const stroke = color ?? seriesColor(0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="watchPulseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          formatter={(value: number) => [formatCompact(value), series.label]}
          contentStyle={{
            background: chartChrome.tooltipBg,
            border: `1px solid ${chartChrome.tooltipBorder}`,
            borderRadius: 8,
            color: chartChrome.tooltipText,
          }}
          itemStyle={{ color: chartChrome.tooltipText }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fill="url(#watchPulseFill)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
