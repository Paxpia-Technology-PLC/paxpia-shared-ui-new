// WEB-ONLY (recharts/SVG); do not import from React Native — mobile uses a native chart lib.
//
// TrustMixBar — a single stacked horizontal bar showing a TrustMix distribution (verified →
// adversarial), with the botty share highlighted. Props-driven: the host supplies a
// `TrustMix` (from @paxpia/core/analytics `trustMix(...)`). Pairs with `botPct` for the
// quality gauge. Consumed by Paxpia-web (creator quality card) + Paxpia-admin (trust board).

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { TRUST_TIERS, type TrustMix } from '@paxpia/core';
import { chartChrome, formatCompact, TRUST_TIER_COLOR, TRUST_TIER_LABEL } from './theme';

export interface TrustMixBarProps {
  mix: TrustMix;
  /** Pixel height. Default 64 (a single slim bar). */
  height?: number;
  /** Show the per-tier legend (default true). */
  showLegend?: boolean;
  /** Stack as percentages of the total instead of raw counts (default false). */
  asPercent?: boolean;
}

export function TrustMixBar({ mix, height = 64, showLegend = true, asPercent = false }: TrustMixBarProps) {
  const { row, total } = useMemo(() => {
    const t = TRUST_TIERS.reduce((sum, tier) => sum + (mix[tier] ?? 0), 0);
    const r: Record<string, number | string> = { name: 'trust' };
    for (const tier of TRUST_TIERS) {
      const v = mix[tier] ?? 0;
      r[tier] = asPercent && t > 0 ? (v / t) * 100 : v;
    }
    return { row: r, total: t };
  }, [mix, asPercent]);

  return (
    <ResponsiveContainer width="100%" height={showLegend ? height + 28 : height}>
      <BarChart
        layout="vertical"
        data={[row]}
        margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
        stackOffset={asPercent ? 'expand' : 'none'}
      >
        <XAxis type="number" hide domain={asPercent ? [0, 100] : [0, total || 1]} />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip
          formatter={(value: number, name: string) =>
            [asPercent ? `${value.toFixed(1)}%` : formatCompact(value), TRUST_TIER_LABEL[name as keyof typeof TRUST_TIER_LABEL] ?? name]
          }
          contentStyle={{
            background: chartChrome.tooltipBg,
            border: `1px solid ${chartChrome.tooltipBorder}`,
            borderRadius: 8,
            color: chartChrome.tooltipText,
          }}
          itemStyle={{ color: chartChrome.tooltipText }}
        />
        {showLegend ? (
          <Legend
            formatter={(value: string) => TRUST_TIER_LABEL[value as keyof typeof TRUST_TIER_LABEL] ?? value}
            wrapperStyle={{ fontSize: 11, color: chartChrome.axis }}
          />
        ) : null}
        {TRUST_TIERS.map((tier, i) => (
          <Bar
            key={tier}
            dataKey={tier}
            stackId="trust"
            fill={TRUST_TIER_COLOR[tier]}
            radius={i === 0 ? [4, 0, 0, 4] : i === TRUST_TIERS.length - 1 ? [0, 4, 4, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
