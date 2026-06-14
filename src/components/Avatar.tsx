import { useState } from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme/tokens';

export interface AvatarProps {
  /** Remote image URL. When empty/falsey or it fails to load, a monogram fallback shows. */
  uri?: string | null;
  /** Display name — its first letter is the fallback monogram. */
  name?: string;
  /** Diameter in px. */
  size?: number;
  /** Draw a brand ring around the avatar. */
  ring?: boolean;
  style?: ViewStyle;
}

function initial(name?: string): string {
  const c = (name ?? '').trim().charAt(0);
  return c ? c.toUpperCase() : '?';
}

/**
 * Avatar — a circular profile image with a monogram fallback, written ONCE with
 * RN primitives (Image/View/Text) so web (react-native-web) and mobile (React
 * Native) share the exact same component. Self-contained: no app theme/store.
 */
export function Avatar({ uri, name, size = 40, ring = false, style }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;
  const dim = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  return (
    <View
      style={[
        styles.wrap,
        dim,
        ring ? { borderWidth: 2, borderColor: colors.brand } : null,
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          style={[dim, styles.image]}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.monogram, { fontSize: Math.round(size * 0.42) }]}>
          {initial(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    resizeMode: 'cover',
    borderRadius: radius.pill,
  },
  monogram: {
    color: colors.text,
    fontWeight: '700',
  },
});
