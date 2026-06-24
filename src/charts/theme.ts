// WEB-ONLY (recharts/SVG); do not import from React Native — mobile uses a native chart lib.
//
// Chart palette + small format helpers for @paxpia/ui/charts. Derives every colour from
// the existing @paxpia/ui theme tokens (no new design language) so a chart matches the
// rest of the surface. Plain constants/functions — no React, no recharts import — so this
// file is the safe shared bit the components pull from.

import { colors } from '../theme/tokens';
import type { TrustTier } from '@paxpia/core';

/** The canonical colour per trust tier (best→worst: brand/verified → live/red). Reused by
 *  TrustMixBar's stacks and any tier legend so a tier is ALWAYS the same colour. */
export const TRUST_TIER_COLOR: Record<TrustTier, string> = {
  verified: colors.verified, // blue — known-good
  normal: colors.brand, // brand violet — the default human
  low: '#F5A623', // amber — weak signal
  suspect: '#FF8A3D', // orange — flagged
  adversarial: colors.live, // red — confirmed bad
};

/** Human label per tier for legends/tooltips. */
export const TRUST_TIER_LABEL: Record<TrustTier, string> = {
  verified: 'Verified',
  normal: 'Normal',
  low: 'Low',
  suspect: 'Suspect',
  adversarial: 'Adversarial',
};

/** An ordered colour ramp for multi-series line/area charts (one colour per series). Wraps
 *  if there are more series than colours. */
export const SERIES_PALETTE: readonly string[] = [
  colors.brand,
  colors.verified,
  '#22C55E', // green
  '#F5A623', // amber
  colors.live, // red
  '#A78BFA', // light violet
  '#2DD4BF', // teal
] as const;

/** Colour for the Nth series (wraps). */
export function seriesColor(index: number): string {
  return SERIES_PALETTE[((index % SERIES_PALETTE.length) + SERIES_PALETTE.length) % SERIES_PALETTE.length];
}

/** Shared chart chrome colours (axes, grid, tooltip) pulled from the theme. */
export const chartChrome = {
  axis: colors.textMuted,
  grid: 'rgba(255,255,255,0.07)',
  tooltipBg: colors.surfaceMuted,
  tooltipText: colors.text,
  tooltipBorder: colors.border,
} as const;

/** Compact number formatter for axis ticks / stat values (1.2K, 3.4M). */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

/** A 0..1 fraction as a percent string (e.g. 0.123 → "12.3%"). */
export function formatPct(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** A `unixMinute` (epoch minutes) bucket key → a short HH:MM clock label for an X axis. */
export function minuteTickLabel(unixMinute: number): string {
  const d = new Date(unixMinute * 60_000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
