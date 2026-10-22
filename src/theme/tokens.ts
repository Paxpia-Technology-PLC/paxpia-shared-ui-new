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
  card: '#1E1E33',
  text: '#FFFFFF',
  textMuted: '#A0A0AD',
  textSecondary: '#B0B0D0',
  border: 'rgba(255,255,255,0.08)',
  // Chat accent — the mobile `Chat_Messaging_Camera` bubble/send/verified/receipt
  // tint (`#249dd9`), lifted OUT of the component files into the token library so
  // the branch look is preserved in ONE place (plan §1i: theme-tokenize #249dd9).
  // Kept distinct from `brand` so a future re-theme can converge or diverge them
  // without touching component code.
  chatAccent: '#249DD9',
  chatAccentText: '#FFFFFF',
  // Presence dot (participant is_online) — a calm green, distinct from `live`.
  online: '#4CAF50',
  // A "delivered/read" receipt tick when it should read as confirmed (channel/DM
  // read state); the sending/failed states derive from textMuted / live.
  receipt: '#249DD9',
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
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

// ── Creator Hub palette (light + dark) ───────────────────────────────────────
// The Creator Hub is NOT dark-only on either app: the website's
// `src/creator/creator-theme.css` defines a `[data-theme='light']` twin for every
// colour (and its header forbids going back to an always-dark hub), and mobile's
// `creatorTheme` switches on `isDark`. Components rendered INSIDE the Creator Hub
// (e.g. book/BookPicker) take a `scheme` and read from here, so they match the
// screen they open over. Values are copied 1:1 from creator-theme.css (website),
// `--c-*` → camelCase; keep the two in step. The `colors` above stay as they are
// for the live-stage/overlay surfaces, which are dark by design.
export const creatorColors = {
  dark: {
    bg: '#14121C',
    surface: '#1E1B2A',
    surfaceAlt: '#2A2638',
    ink: '#F4F2FA',
    inkMuted: '#A39CBE',
    inkFaint: '#6F678A',
    hairline: 'rgba(255, 255, 255, 0.09)',
    accent: '#429ef5',
    accentInk: '#7FC0FF',
    accentWash: 'rgba(66, 158, 245, 0.18)',
    onAccent: '#14121C',
    danger: '#ff4d6d',
  },
  light: {
    bg: '#F5F4FB',
    surface: '#ffffff',
    surfaceAlt: '#EFEAFE',
    ink: '#14121C',
    inkMuted: '#736C8C',
    inkFaint: '#A39CBE',
    hairline: '#E8E4F4',
    accent: '#1f6fd1',
    accentInk: '#0e4fa3',
    accentWash: 'rgba(31, 111, 209, 0.1)',
    onAccent: '#ffffff',
    danger: '#dc2626',
  },
} as const;

export type CreatorScheme = keyof typeof creatorColors;
export type CreatorPalette = (typeof creatorColors)[CreatorScheme];
