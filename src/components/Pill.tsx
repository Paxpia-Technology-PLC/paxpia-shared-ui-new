import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors, radius, spacing, fontSize } from '../theme/tokens';

export type PillTone = 'brand' | 'live' | 'neutral';

export interface PillProps {
  /** Text shown inside the pill. */
  label: string;
  /** Visual tone. `live` is the red livestream tag; `brand` the purple accent. */
  tone?: PillTone;
  /** Optional leading dot (e.g. the pulsing "LIVE" indicator look). */
  dot?: boolean;
  /** Style override merged onto the container. */
  style?: ViewStyle;
  /** Style override merged onto the label text. */
  textStyle?: TextStyle;
}

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  brand: { bg: colors.brand, fg: colors.brandText },
  live: { bg: colors.live, fg: colors.liveText },
  neutral: { bg: colors.surfaceMuted, fg: colors.text },
};

/**
 * Pill — a tiny rounded badge written ONCE with RN primitives. Renders on web
 * (react-native-web) and mobile (React Native) from the same source. Intentionally
 * self-contained (no app store/theme) so it is safe to drop anywhere.
 */
export function Pill({ label, tone = 'neutral', dot = false, style, textStyle }: PillProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      <Text style={[styles.label, { color: t.fg }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** LiveTag — the red "LIVE" pill, a convenience preset of {@link Pill}. */
export function LiveTag({ label = 'LIVE', style }: { label?: string; style?: ViewStyle }) {
  return <Pill label={label} tone="live" dot style={style} />;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
