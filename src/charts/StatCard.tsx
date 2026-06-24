// WEB-ONLY (recharts/SVG); do not import from React Native — mobile uses a native chart lib.
//
// StatCard — a headline metric tile: big number + an optional delta chip (▲/▼ + percent) +
// an optional inline MetricSparkline. Authored in plain DOM (div/span) — NOT React Native
// primitives — because the whole @paxpia/ui/charts subpath is web-only (recharts already
// renders DOM/SVG); keeping it DOM avoids pulling react-native-web into this entrypoint.
// Props-driven; the host computes the value/delta/series. Consumed by web + admin overview.

import type { CSSProperties, ReactNode } from 'react';
import type { Series } from '@paxpia/core';
import { colors, radius, spacing } from '../theme/tokens';
import { MetricSparkline } from './MetricSparkline';
import { formatCompact, formatPct } from './theme';

export interface StatCardProps {
  /** The metric name (e.g. "Impressions"). */
  label: string;
  /** The headline value. A number is compact-formatted (1.2K); a string is shown as-is. */
  value: number | string;
  /** Period-over-period change as a fraction (0.12 → +12.0%). Sign drives the colour/arrow.
   *  Omit for no delta chip. */
  deltaPct?: number;
  /** Whether a positive delta is "good" (green) — false inverts (e.g. bot %). Default true. */
  higherIsBetter?: boolean;
  /** Optional inline sparkline series (or raw value array). */
  spark?: Series | number[];
  /** A small unit/suffix after the value (e.g. "views"). */
  unit?: ReactNode;
  /** Override the card width (else fills its grid/flex parent). */
  style?: CSSProperties;
}

export function StatCard({
  label,
  value,
  deltaPct,
  higherIsBetter = true,
  spark,
  unit,
  style,
}: StatCardProps) {
  const displayValue = typeof value === 'number' ? formatCompact(value) : value;

  let deltaNode: ReactNode = null;
  if (deltaPct !== undefined && Number.isFinite(deltaPct) && deltaPct !== 0) {
    const up = deltaPct > 0;
    const good = up === higherIsBetter;
    const deltaColor = good ? '#22C55E' : colors.live;
    deltaNode = (
      <span style={{ ...chipStyle, color: deltaColor, background: `${deltaColor}1A` }}>
        {up ? '▲' : '▼'} {formatPct(Math.abs(deltaPct))}
      </span>
    );
  }

  return (
    <div style={{ ...cardStyle, ...style }}>
      <div style={headerRow}>
        <span style={labelStyle}>{label}</span>
        {deltaNode}
      </div>
      <div style={valueRow}>
        <span style={valueStyle}>{displayValue}</span>
        {unit ? <span style={unitStyle}>{unit}</span> : null}
      </div>
      {spark ? (
        <div style={{ marginTop: spacing.sm }}>
          <MetricSparkline data={spark} height={32} />
        </div>
      ) : null}
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  padding: spacing.lg,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};
const headerRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.sm,
};
const labelStyle: CSSProperties = {
  color: colors.textMuted,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
};
const chipStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  borderRadius: radius.pill,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};
const valueRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 6,
  marginTop: 6,
};
const valueStyle: CSSProperties = {
  color: colors.text,
  fontSize: 28,
  fontWeight: 800,
  lineHeight: 1.1,
};
const unitStyle: CSSProperties = {
  color: colors.textMuted,
  fontSize: 13,
  fontWeight: 600,
};
