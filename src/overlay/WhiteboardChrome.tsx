// WhiteboardChrome — the shared whiteboard control RAIL, sibling to DocChrome (§3.5).
// ALWAYS shown for every whiteboard, on every platform, and — per Noel's Message D —
// it lives ON THE OVERLAY WINDOW'S OWN EDGE, not as a detached sidebar. The shell
// (`WhiteboardOverlay`) absolutely-positions the rails against the board's edges so the
// whiteboard is a self-contained world: the SAME overlay (chrome + board) renders in
// dash-preview, dash live-controls and the web viewer — only the ROLE differs.
//
// ── TWO RAILS (Noel's Message F#1) ───────────────────────────────────────────
// The controls are split across TWO rails so they stop scrolling off / clipping / shifting
// the drawing area:
//   • placement="top"    — the DRAW rail (operator): a compact COLOUR DROPDOWN (not an
//       inline swatch list — Message F#2), stroke-width cycle, UNDO + REDO (both greyed
//       when inapplicable — Message E#4), clear, the TRANSPARENT-bg toggle (now actually
//       on the rail — Message E#4), and a VISIBILITY toggle off at the trailing edge
//       (hides the overlay from viewers; the streamer keeps a ghosted copy — Message E#4).
//   • placement="bottom" — the NAV rail (BOTH roles): zoom ± / refit / screenshot. Kept
//       on its OWN bottom edge so zoom+screenshot never push the draw rail or the board.
// The shell mounts this component twice (one per edge). A viewer mounts only the bottom
// rail (no draw controls at all).
//
// ── ROLE drives WHICH controls show (the one knob Noel asked for) ──────────────
//   • operator (editable author) — top rail: colour dropdown, width, undo/redo, clear,
//       transparent toggle, visibility toggle. bottom rail: zoom/pan ±, refit, screenshot.
//   • viewer — bottom rail ONLY: pan/zoom ± + refit + screenshot. NO draw controls.
//
// The role is derived from `editable` (operator ⇔ editable) so existing call sites keep
// working; callers may also pass `role` explicitly. An omitted callback hides that one
// control — but the rail itself always renders (the board is never chrome-less).

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

/** The author pen palette swatches (canvas-space colours emitted on the wire). */
export const WB_COLORS = ['#ffffff', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#000000'] as const;
/** The author pen widths the width-cycle steps through. */
export const WB_WIDTHS = [2, 4, 8, 14] as const;

/** The chrome ROLE — operator (full draw + transparent toggle) vs viewer (nav only). */
export type WhiteboardRole = 'operator' | 'viewer';

/** Which edge this rail instance renders for. The shell mounts the component once per
 *  edge: 'top' = draw controls (operator, horizontal), 'left' = the SAME draw controls
 *  as a VERTICAL rail on the LEFT edge (mobile studio — Noel's WI-4 ask: tool controls
 *  on the vertical, on the left, not a top bar), 'bottom' = nav/zoom/screenshot (both
 *  roles). 'top' and 'left' are the same DRAW rail; only the axis differs. */
export type WhiteboardRailPlacement = 'top' | 'left' | 'bottom';

export interface WhiteboardChromeProps {
  /** Which rail to render — 'top'/'left' (the DRAW rail; 'left' is the vertical variant
   *  for mobile) or 'bottom' (nav). Defaults to a single combined rail behaviour ('top')
   *  for back-compat callers that don't split. */
  placement?: WhiteboardRailPlacement;
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
  /** Whether undo is currently possible (≥1 local stroke). Greys the button when false. */
  canUndo?: boolean;
  /** Redo the last undone local stroke (operator) — omit to hide the button. */
  onRedo?: () => void;
  /** Whether redo is currently possible (≥1 undone stroke). Greys the button when false. */
  canRedo?: boolean;
  /** Clear the whole board (operator) — bumps the generation on the wire. */
  onClear?: () => void;
  /** TRANSPARENT-BACKGROUND state (operator) — true ⇒ the board page is alpha-0 so the
   *  underlying scene shows through. When `onTransparentToggle` is supplied a toggle
   *  pill renders showing this state. */
  transparent?: boolean;
  /** Flip the transparent-background toggle (operator). Omit to hide the toggle. */
  onTransparentToggle?: () => void;
  /** VISIBILITY state (operator) — true ⇒ the overlay is HIDDEN from viewers (the streamer
   *  still sees a ghosted copy). When `onVisibilityToggle` is supplied an eye toggle renders. */
  hidden?: boolean;
  /** Flip the viewer-visibility toggle (operator). Omit to hide the toggle. */
  onVisibilityToggle?: () => void;
  /** NAV-MODE state (operator, Message E#3 / 2026-06-23): true ⇒ NAVIGATE (pan/zoom) instead
   *  of DRAW. For a placed board, nav mode pans/zooms the board; for an annotation-over-doc,
   *  nav mode makes the layer pointer-transparent so the DOC underneath pans/zooms. When
   *  `onNavModeToggle` is supplied a draw/move toggle renders (leading, operator). */
  navMode?: boolean;
  /** Flip draw ⇆ navigate (operator). Omit to hide the toggle. */
  onNavModeToggle?: () => void;
}

export function WhiteboardChrome({
  placement = 'top',
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
  canUndo = true,
  onRedo,
  canRedo = true,
  onClear,
  transparent = false,
  onTransparentToggle,
  hidden = false,
  onVisibilityToggle,
  navMode = false,
  onNavModeToggle,
}: WhiteboardChromeProps) {
  // Role resolution: explicit `role` wins; else operator ⇔ editable (back-compat).
  const resolvedRole: WhiteboardRole = role ?? (editable ? 'operator' : 'viewer');
  const isOperator = resolvedRole === 'operator';
  const isBottom = placement === 'bottom';
  // The LEFT rail is the SAME draw rail as 'top', laid out VERTICALLY (mobile studio).
  const isLeft = placement === 'left';

  // The colour dropdown open state (Message F#2 — a compact dropdown, not an inline list).
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Draw controls are OPERATOR-ONLY by construction — a viewer never gets them even if a
  // callback leaks in, so the role is the single source of truth for "can mutate".
  const showColors = isOperator && !!onColor;
  const showWidth = isOperator && !!onWidth;
  const showUndo = isOperator && !!onUndo;
  const showRedo = isOperator && !!onRedo;
  const showClear = isOperator && !!onClear;
  const showTransparent = isOperator && !!onTransparentToggle;
  const showVisibility = isOperator && !!onVisibilityToggle;
  const showNavMode = isOperator && !!onNavModeToggle;

  const showZoom = !!onZoom;
  const showFullscreen = !!onFullscreen;
  const showShot = !!onScreenshot;

  const cycleWidth = () => {
    const i = WB_WIDTHS.indexOf(width as (typeof WB_WIDTHS)[number]);
    onWidth?.(WB_WIDTHS[(i + 1) % WB_WIDTHS.length]);
  };

  // ── BOTTOM (nav) rail — zoom ± / refit / screenshot, shared by BOTH roles ──────
  if (isBottom) {
    if (!showZoom && !showFullscreen && !showShot) return null;
    return (
      <View style={[styles.rail, styles.railBottom]} accessibilityRole="toolbar">
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

  // ── TOP / LEFT (draw) rail — operator only. A viewer never renders this rail. ──
  // 'top' lays the controls out horizontally; 'left' is the SAME rail laid out as a
  // VERTICAL column on the left edge (mobile studio — Noel's WI-4 ask). One component.
  if (!isOperator) return null;

  return (
    <View style={[styles.rail, isLeft ? styles.railLeft : styles.railTop]} accessibilityRole="toolbar">
      {/* A SMALL board icon stands in for the removed full-component-name header
          (Message E#3) — it never obscures the controls (it's the first compact glyph). */}
      <View style={styles.brandIcon} accessibilityRole="image" accessibilityLabel="whiteboard">
        <Text style={styles.brandGlyph}>✎</Text>
      </View>

      {/* NAV-MODE toggle (draw ⇆ navigate): the leading control so the operator can switch
          between drawing and panning/zooming (a placed board pans/zooms itself; an annotation
          lets the DOC underneath pan/zoom). Active styling when navigating. */}
      {showNavMode ? (
        <Pressable
          onPress={() => onNavModeToggle?.()}
          style={[styles.pillBtn, navMode && styles.pillBtnActive]}
          accessibilityRole="button"
          accessibilityLabel={navMode ? 'switch to draw' : 'switch to navigate'}
          accessibilityState={{ selected: navMode }}
        >
          <Text style={[styles.pillText, navMode && styles.pillTextActive]}>{navMode ? '✋ Move' : '✎ Draw'}</Text>
        </Pressable>
      ) : null}

      {/* COLOUR DROPDOWN (Message F#2): a single swatch button that toggles a tight popup
          of the palette, instead of an always-expanded inline list. */}
      {showColors ? (
        <View style={styles.dropdownWrap}>
          <Pressable
            onPress={() => setPaletteOpen((o) => !o)}
            style={styles.colorTrigger}
            accessibilityRole="button"
            accessibilityLabel="pen color"
            accessibilityState={{ expanded: paletteOpen }}
          >
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <Text style={styles.caret}>{paletteOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {paletteOpen ? (
            <View style={[styles.dropdownMenu, isLeft && styles.dropdownMenuLeft]}>
              {WB_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    onColor?.(c);
                    setPaletteOpen(false);
                  }}
                  style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`color ${c}`}
                  accessibilityState={{ selected: color === c }}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {showWidth ? (
        <Pressable onPress={cycleWidth} style={styles.pillBtn} accessibilityRole="button" accessibilityLabel="stroke width">
          <Text style={styles.pillText}>{width}px</Text>
        </Pressable>
      ) : null}

      {/* UNDO + REDO — both greyed (disabled) when inapplicable (Message E#4). */}
      {showUndo ? (
        <Pressable
          onPress={() => canUndo && onUndo?.()}
          disabled={!canUndo}
          style={[styles.iconBtn, !canUndo && styles.iconBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="undo"
          accessibilityState={{ disabled: !canUndo }}
        >
          <Text style={[styles.iconGlyph, !canUndo && styles.iconGlyphDisabled]}>↶</Text>
        </Pressable>
      ) : null}
      {showRedo ? (
        <Pressable
          onPress={() => canRedo && onRedo?.()}
          disabled={!canRedo}
          style={[styles.iconBtn, !canRedo && styles.iconBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="redo"
          accessibilityState={{ disabled: !canRedo }}
        >
          <Text style={[styles.iconGlyph, !canRedo && styles.iconGlyphDisabled]}>↷</Text>
        </Pressable>
      ) : null}

      {showClear ? (
        <Pressable onPress={() => onClear?.()} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="clear board">
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}

      {/* TRANSPARENT-bg toggle — now reliably on the rail (Message E#4). */}
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

      {/* Spacer pushes the visibility toggle to the rail's trailing edge. */}
      <View style={styles.spacer} />

      {/* VISIBILITY toggle off at the edge (Message E#4): hides the overlay from viewers;
          the streamer keeps a ghosted copy (the shell greys the board when hidden). */}
      {showVisibility ? (
        <Pressable
          onPress={() => onVisibilityToggle?.()}
          style={[styles.iconBtn, hidden && styles.pillBtnActive]}
          accessibilityRole="button"
          accessibilityLabel="toggle viewer visibility"
          accessibilityState={{ selected: hidden }}
        >
          <Text style={styles.iconGlyph}>{hidden ? '🚫' : '👁'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // A rail is a compact, translucent, rounded strip. The shell positions it (absolute on a
  // board edge); here it just packs its controls and gives itself a translucent backing.
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
  railTop: {},
  // The LEFT (draw) rail — the SAME draw controls laid out as a VERTICAL column hugging the
  // left edge (mobile studio). Column direction + a centred cross-axis so every pill/icon
  // stacks tidily; it sizes to its content height (alignSelf:flex-start) so it never
  // stretches the board. Same translucent backing as the horizontal rail.
  railLeft: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'center',
    alignSelf: 'flex-start',
    columnGap: 0,
    rowGap: 6,
    paddingHorizontal: 5,
    paddingVertical: 8,
    borderRadius: 18,
  },
  // The bottom (nav) rail hugs its own edge and only sizes to its content (centred by the
  // shell), so zoom+screenshot never widen/shift the draw rail or the board.
  railBottom: { alignSelf: 'center' },
  brandIcon: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  brandGlyph: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800' },
  spacer: { flexGrow: 1, minWidth: 4 },
  // The colour dropdown: a trigger swatch + caret, and an absolutely-positioned popup so it
  // doesn't push the rail wider when open.
  dropdownWrap: { position: 'relative' },
  colorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  caret: { color: '#fff', fontSize: 9, fontWeight: '700' },
  dropdownMenu: {
    position: 'absolute',
    top: 26,
    left: 0,
    flexDirection: 'row',
    columnGap: 5,
    rowGap: 5,
    flexWrap: 'wrap',
    maxWidth: 120,
    padding: 6,
    backgroundColor: 'rgba(11,14,22,0.96)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 20,
  },
  // On the VERTICAL (left) rail the colour popup opens to the RIGHT of the trigger (beside
  // the rail) instead of below it, so it doesn't cover the controls stacked underneath.
  dropdownMenuLeft: { top: 0, left: 26, maxWidth: 96 },
  swatch: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchActive: { borderColor: '#fff', borderWidth: 2 },
  // PARITY: pill + icon buttons centre their label/glyph on BOTH axes so the rail reads the
  // same on rn-web (where a bare <Text> is left-aligned + uses the UA line-box) and RN. The
  // glyph carries `textAlign:'center'` + a lineHeight; icon buttons also `justifyContent`.
  pillBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnActive: { backgroundColor: colors.brand },
  pillText: { color: '#fff', fontSize: 10, lineHeight: 14, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  pillTextActive: { color: '#fff' },
  iconBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.03)' },
  iconGlyph: { color: '#fff', fontSize: 13, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  iconGlyphDisabled: { color: 'rgba(255,255,255,0.28)' },
  clearBtn: {
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { color: '#fff', fontSize: 10, lineHeight: 14, fontWeight: '800', textAlign: 'center' },
  zoomPct: { color: colors.textMuted, fontSize: 10, width: 34, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
