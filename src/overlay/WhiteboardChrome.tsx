// WhiteboardChrome — the shared whiteboard control RAIL, sibling to DocChrome (§3.5).
// ALWAYS shown for every whiteboard, on every platform, and — per Noel's Message D —
// it lives ON THE OVERLAY WINDOW'S OWN EDGE, not as a detached sidebar. The shell
// (`WhiteboardOverlay`) absolutely-positions this rail against the board's edge so the
// whiteboard is a self-contained world: the SAME overlay (chrome + board) renders in
// dash-preview, dash live-controls and the web viewer — only the ROLE differs.
//
// Pure presentational rn-web (View/Text/Pressable); the shell owns the transform +
// board state and passes the display values + callbacks in. The rail is a compact
// translucent strip (it floats over a top corner of the board, never a sibling column),
// so it works identically whether the board fills the screen or a small scene tile.
//
// ── ROLE drives WHICH controls show (the one knob Noel asked for) ──────────────
//   • operator (editable author) — colour swatches (WB_COLORS), stroke-width cycle
//       (WB_WIDTHS), zoom/pan ±, refit, undo, clear, screenshot, AND the transparent-
//       background toggle. The frame's authoring pen is driven by these.
//   • viewer — pan/zoom ± + refit + screenshot ONLY. NO draw controls (no swatches,
//       no width, no undo/clear/transparent). A viewer can navigate + grab a PNG, but
//       never mutate the board.
//
// The role is derived from `editable` (operator ⇔ editable) so existing call sites keep
// working; callers may also pass `role` explicitly. `onZoom`/`onScreenshot`/etc. are
// optional — an omitted callback hides that one control — but the rail itself always
// renders (the board is never chrome-less).

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

/** The author pen palette swatches (canvas-space colours emitted on the wire). */
export const WB_COLORS = ['#ffffff', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#000000'] as const;
/** The author pen widths the width-cycle steps through. */
export const WB_WIDTHS = [2, 4, 8, 14] as const;

/** The chrome ROLE — operator (full draw + transparent toggle) vs viewer (nav only). */
export type WhiteboardRole = 'operator' | 'viewer';

export interface WhiteboardChromeProps {
  /** The board title — ALWAYS shown. */
  title: string;
  /** The control role. Defaults to operator when `editable`, else viewer — so the
   *  same overlay differs only by this knob across dash-preview / live / web-viewer. */
  role?: WhiteboardRole;
  /** Current zoom scale (1 = fit). Shown as a % when `onZoom` is supplied. */
  scale?: number;
  /** Zoom by a multiplicative factor (e.g. 1.25 / 0.8). Omit to hide the zoom strip. */
  onZoom?: (factor: number) => void;
  /** Reset to fit (1×, centred) — the refit control. Omit to hide it. */
  onFullscreen?: () => void;
  /** Capture a content-only screenshot of the board (BOTH roles). Omit to hide it. */
  onScreenshot?: () => void;
  /** EDITABLE (operator) author mode — when true the pen controls render. Back-compat
   *  alias for `role==='operator'`; when omitted the role is taken from `role`. */
  editable?: boolean;
  /** The active pen colour (operator). */
  color?: string;
  /** Set the active pen colour (operator). */
  onColor?: (c: string) => void;
  /** The active pen width (operator). */
  width?: number;
  /** Set the active pen width (operator). */
  onWidth?: (w: number) => void;
  /** Undo the last local stroke (operator) — omit to hide the button. */
  onUndo?: () => void;
  /** Clear the whole board (operator) — bumps the generation on the wire. */
  onClear?: () => void;
  /** TRANSPARENT-BACKGROUND state (operator) — true ⇒ the board page is alpha-0 so the
   *  underlying scene shows through. When `onTransparentToggle` is supplied a toggle
   *  pill renders showing this state. */
  transparent?: boolean;
  /** Flip the transparent-background toggle (operator). Omit to hide the toggle. */
  onTransparentToggle?: () => void;
}

export function WhiteboardChrome({
  title,
  role,
  scale,
  onZoom,
  onFullscreen,
  onScreenshot,
  editable,
  color = WB_COLORS[0],
  onColor,
  width = WB_WIDTHS[1],
  onWidth,
  onUndo,
  onClear,
  transparent = false,
  onTransparentToggle,
}: WhiteboardChromeProps) {
  // Role resolution: explicit `role` wins; else operator ⇔ editable (back-compat).
  const resolvedRole: WhiteboardRole = role ?? (editable ? 'operator' : 'viewer');
  const isOperator = resolvedRole === 'operator';

  const showZoom = !!onZoom;
  const showFullscreen = !!onFullscreen;
  const showShot = !!onScreenshot;
  // Draw controls are OPERATOR-ONLY by construction — a viewer never gets them even if a
  // callback leaks in, so the role is the single source of truth for "can mutate".
  const showColors = isOperator && !!onColor;
  const showWidth = isOperator && !!onWidth;
  const showUndo = isOperator && !!onUndo;
  const showClear = isOperator && !!onClear;
  const showTransparent = isOperator && !!onTransparentToggle;

  const cycleWidth = () => {
    const i = WB_WIDTHS.indexOf(width as (typeof WB_WIDTHS)[number]);
    onWidth?.(WB_WIDTHS[(i + 1) % WB_WIDTHS.length]);
  };

  return (
    // The rail: a compact, translucent, rounded strip. The shell places it absolutely on
    // the board edge; its own background gives it contrast over any underlying source.
    <View style={styles.rail} accessibilityRole="toolbar">
      {/* Title + zoom/refit + screenshot are shared by BOTH roles. */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* OPERATOR-ONLY draw controls: colour swatches + width cycle + undo + clear. */}
      {showColors ? (
        <View style={styles.group}>
          {WB_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => onColor?.(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
              accessibilityRole="button"
              accessibilityLabel={`color ${c}`}
              accessibilityState={{ selected: color === c }}
            />
          ))}
        </View>
      ) : null}
      {showWidth ? (
        <Pressable onPress={cycleWidth} style={styles.pillBtn} accessibilityRole="button" accessibilityLabel="stroke width">
          <Text style={styles.pillText}>{width}px</Text>
        </Pressable>
      ) : null}
      {showUndo ? (
        <Pressable onPress={() => onUndo?.()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="undo">
          <Text style={styles.iconGlyph}>↶</Text>
        </Pressable>
      ) : null}
      {showClear ? (
        <Pressable onPress={() => onClear?.()} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="clear board">
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
      {showTransparent ? (
        <Pressable
          onPress={() => onTransparentToggle?.()}
          style={[styles.pillBtn, transparent && styles.pillBtnActive]}
          accessibilityRole="button"
          accessibilityLabel="toggle transparent background"
          accessibilityState={{ selected: transparent }}
        >
          <Text style={[styles.pillText, transparent && styles.pillTextActive]}>
            {transparent ? '▦ Clear bg' : '▦ Solid bg'}
          </Text>
        </Pressable>
      ) : null}

      {/* Spacer pushes the nav cluster to the rail's trailing edge. */}
      <View style={styles.spacer} />

      {/* SHARED nav: screenshot + zoom ± + refit (both roles). */}
      {showShot ? (
        <Pressable onPress={() => onScreenshot?.()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="screenshot">
          <Text style={styles.iconGlyph}>⤓</Text>
        </Pressable>
      ) : null}
      {showZoom ? (
        <>
          <Pressable onPress={() => onZoom?.(1 / 1.25)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="zoom out">
            <Text style={styles.iconGlyph}>−</Text>
          </Pressable>
          <Text style={styles.zoomPct}>{Math.round((scale ?? 1) * 100)}%</Text>
          <Pressable onPress={() => onZoom?.(1.25)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="zoom in">
            <Text style={styles.iconGlyph}>+</Text>
          </Pressable>
        </>
      ) : null}
      {showFullscreen ? (
        <Pressable onPress={() => onFullscreen?.()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="refit">
          <Text style={styles.iconGlyph}>⤢</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The rail is laid out as a single horizontal strip. The shell positions it (absolute
  // on the board edge); here it just packs its controls and gives itself a translucent
  // backing so it reads over any underlying scene source.
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    rowGap: 4,
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(11,14,22,0.82)',
    borderRadius: 999,
  },
  title: { color: 'rgba(255,255,255,0.6)', fontSize: 11, maxWidth: 110, flexShrink: 1 },
  group: { flexDirection: 'row', alignItems: 'center', columnGap: 4 },
  spacer: { flexGrow: 1, minWidth: 4 },
  swatch: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchActive: { borderColor: '#fff', borderWidth: 2 },
  pillBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pillBtnActive: { backgroundColor: colors.brand },
  pillText: { color: '#fff', fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pillTextActive: { color: '#fff' },
  iconBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  iconGlyph: { color: '#fff', fontSize: 13, fontWeight: '700' },
  clearBtn: {
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clearText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  zoomPct: { color: colors.textMuted, fontSize: 10, width: 34, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
