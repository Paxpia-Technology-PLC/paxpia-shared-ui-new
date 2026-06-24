// WEB-ONLY (recharts/SVG); do not import from React Native — mobile uses a native chart lib.
//
// MetricSparkline — a tiny, axis-less line for inline trend context (inside a StatCard or a
// table cell). Props-driven: the host supplies a `Series` (or a bare number[]). No axes, no
// grid, no tooltip — just the line. Consumed by web + admin StatCards.

import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import type { Series } from '@paxpia/core';
import { seriesColor } from './theme';

export interface MetricSparklineProps {
  /** A Series (uses `.points[].count`) or a bare value array. */
  data: Series | number[];
  /** Pixel height. Default 36. */
  height?: number;
  /** Line colour (default the brand series colour). */
  color?: string;
  /** Stroke width. Default 1.5. */
  strokeWidth?: number;
}

function toValues(data: Series | number[]): number[] {
  if (Array.isArray(data)) return data;
  return data.points.map((p) => p.count);
}

export function MetricSparkline({ data, height = 36, color, strokeWidth = 1.5 }: MetricSparklineProps) {
  const rows = useMemo(() => toValues(data).map((v, i) => ({ i, v })), [data]);
  const stroke = color ?? seriesColor(0);
  if (rows.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        {/* Hidden axis just to give the line vertical headroom (domain auto-fits). */}
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={strokeWidth} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
