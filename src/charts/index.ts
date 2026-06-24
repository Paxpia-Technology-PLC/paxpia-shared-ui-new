// WEB-ONLY (recharts/SVG); do not import from React Native — mobile uses a native chart lib.
//
// @paxpia/ui/charts — the reusable recharts impression-metric chart set (WS5 / D6,
// 2026-06-24). Consumes typed props from @paxpia/core/analytics; renders with theme tokens.
// Shared by Paxpia-web (creator analytics) + Paxpia-admin (monitoring).
//
// SEPARATE ENTRYPOINT, NOT in the main @paxpia/ui barrel: this subpath pulls in `recharts`
// (a heavy DOM/SVG dep). The mobile app imports @paxpia/ui (the RN barrel) and must NEVER
// transitively pull recharts; web apps import `@paxpia/ui/charts` explicitly. See the
// package.json `exports` map and paxpia-docs/impressions-tokens-ip-2026-06-24.md.

export { ImpressionTrendChart } from './ImpressionTrendChart';
export type { ImpressionTrendChartProps } from './ImpressionTrendChart';
export { TrustMixBar } from './TrustMixBar';
export type { TrustMixBarProps } from './TrustMixBar';
export { WatchPulseChart } from './WatchPulseChart';
export type { WatchPulseChartProps } from './WatchPulseChart';
export { MetricSparkline } from './MetricSparkline';
export type { MetricSparklineProps } from './MetricSparkline';
export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';
// Chart palette + format helpers (derived from @paxpia/ui theme tokens), re-exported so a
// host can colour custom legends/tooltips consistently.
export {
  TRUST_TIER_COLOR,
  TRUST_TIER_LABEL,
  SERIES_PALETTE,
  seriesColor,
  chartChrome,
  formatCompact,
  formatPct,
  minuteTickLabel,
} from './theme';
