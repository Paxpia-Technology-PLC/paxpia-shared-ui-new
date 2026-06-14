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
