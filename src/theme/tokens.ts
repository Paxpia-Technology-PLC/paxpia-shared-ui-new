// Self-contained design tokens for @paxpia/ui.
//
// These are deliberately framework-free constants (no import of either app's
// theme) so a shared component renders identically under Vite (web) and Metro
// (mobile) without pulling in app-specific stores/hooks. As the shared layer
// grows, a `ThemeProvider` (React context) can be introduced here and consumed
// by both apps; until then components read these defaults directly.

export const colors = {
  brand: '#6C5CE7',
  brandText: '#FFFFFF',
  live: '#FF3B5C',
  liveText: '#FFFFFF',
  verified: '#3B82F6',
  surface: '#1A1A22',
  surfaceMuted: '#2A2A35',
  text: '#FFFFFF',
  textMuted: '#A0A0AD',
  border: 'rgba(255,255,255,0.08)',
} as const;

export const radius = {
  sm: 6,
  md: 10,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
} as const;

export type PaxpiaColors = typeof colors;

// `absoluteFill` — a framework-free replacement for `StyleSheet.absoluteFillObject`.
//
// `StyleSheet.absoluteFillObject` exists at RUNTIME in both react-native and
// react-native-web, but the RN 0.84 type surface this package compiles against
// (Paxpia-mobile's vendored `react-native/types`) doesn't declare it on `typeof
// StyleSheet`, so `...StyleSheet.absoluteFillObject` raised TS2551 under the
// mobile tsconfig (Metro-safe at runtime, but a type error for the release
// baseline). This literal is byte-identical to RN's own `absoluteFillObject`
// value, is a plain ViewStyle (type-clean under both shared-ui's and mobile's
// tsconfig), and renders identically on web + mobile. Spread it where the code
// previously spread `StyleSheet.absoluteFillObject`, or use it directly as a
// style value where it previously used `StyleSheet.absoluteFill`.
export const absoluteFill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;
