// WhiteboardChrome — the shared whiteboard chrome, sibling to DocChrome (§3.5).
// ALWAYS shown for every whiteboard, on every platform. Pure presentational rn-web
// (View/Text/Pressable); the SHELL (`WhiteboardOverlay`) owns the transform + board
// state and passes the display values + callbacks in.
//
// Two modes share this strip:
//   • VIEWER  — title + zoom ± + refit + a content-only SCREENSHOT button (§3.5).
//               The screenshot asks the frame to capture only the board (strokes +
//               background) at the viewer's current pan/zoom — chrome lives OUTSIDE
//               the frame, so it can't leak into the PNG.
//   • EDITABLE (streamer/dash author) — additionally a colour swatch row + width
//               cycle + Clear, which drive the frame's authoring pen.
//
// `onZoom`/`onFullscreen`/`onScreenshot` are optional: when omitted that control is
// hidden, but the title ALWAYS shows. Editable controls only render when `editable`.

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

/** The author pen palette swatches (canvas-space colours emitted on the wire). */
export const WB_COLORS = ['#ffffff', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#000000'] as const;
/** The author pen widths the width-cycle steps through. */
export const WB_WIDTHS = [2, 4, 8, 14] as const;

export interface WhiteboardChromeProps {
  /** The board title — ALWAYS shown. */
  title: string;
  /** Current zoom scale (1 = fit). Shown as a % when `onZoom` is supplied. */
  scale?: number;
  /** Zoom by a multiplicative factor (e.g. 1.25 / 0.8). Omit to hide the zoom strip. */
  onZoom?: (factor: number) => void;
  /** Reset to fit (1×, centred) — the refit control. Omit to hide it. */
  onFullscreen?: () => void;
  /** VIEWER: capture a content-only screenshot of the board. Omit to hide the button. */
  onScreenshot?: () => void;
  /** EDITABLE (streamer/dash) author mode — when true the pen controls render. */
  editable?: boolean;
  /** The active pen colour (editable mode). */
  color?: string;
  /** Set the active pen colour (editable mode). */
  onColor?: (c: string) => void;
  /** The active pen width (editable mode). */
  width?: number;
  /** Set the active pen width (editable mode). */
  onWidth?: (w: number) => void;
  /** Clear the whole board (editable mode) — bumps the generation on the wire. */
  onClear?: () => void;
}

export function WhiteboardChrome({
  title,
  scale,
  onZoom,
  onFullscreen,
  onScreenshot,
  editable = false,
  color = WB_COLORS[0],
  onColor,
  width = WB_WIDTHS[1],
  onWidth,
  onClear,
}: WhiteboardChromeProps) {
  const showZoom = !!onZoom;
  const showFullscreen = !!onFullscreen;
  const showShot = !!onScreenshot;
  const cycleWidth = () => {
    const i = WB_WIDTHS.indexOf(width as (typeof WB_WIDTHS)[number]);
    onWidth?.(WB_WIDTHS[(i + 1) % WB_WIDTHS.length]);
  };
  return (
    <View style={styles.bar}>
      {/* LEFT: title (ALWAYS) + the editable pen controls (colour / width / clear). */}
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {editable ? (
          <View style={styles.pen}>
            {WB_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => onColor?.(c)}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: color === c }}
              />
            ))}
            <Pressable onPress={cycleWidth} style={styles.widthBtn} accessibilityRole="button">
              <Text style={styles.widthText}>{width}px</Text>
            </Pressable>
            <Pressable onPress={() => onClear?.()} style={styles.clearBtn} accessibilityRole="button">
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* RIGHT: screenshot (viewer) + zoom/refit. */}
      {showShot || showZoom || showFullscreen ? (
        <View style={styles.right}>
          {showShot ? (
            <Pressable onPress={() => onScreenshot?.()} style={styles.shotBtn} accessibilityRole="button">
              <Text style={styles.shotGlyph}>⤓</Text>
            </Pressable>
          ) : null}
          {showZoom ? (
            <>
              <Pressable onPress={() => onZoom?.(1 / 1.25)} style={styles.zoomBtn}>
                <Text style={styles.zoomGlyph}>−</Text>
              </Pressable>
              <Text style={styles.zoomPct}>{Math.round((scale ?? 1) * 100)}%</Text>
              <Pressable onPress={() => onZoom?.(1.25)} style={styles.zoomBtn}>
                <Text style={styles.zoomGlyph}>+</Text>
              </Pressable>
            </>
          ) : null}
          {showFullscreen ? (
            <Pressable onPress={() => onFullscreen?.()} style={styles.zoomBtn}>
              <Text style={styles.zoomGlyph}>⤢</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
    marginTop: 4,
    minHeight: 24,
  },
  left: { flexDirection: 'row', alignItems: 'center', columnGap: 6, flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center', columnGap: 2 },
  title: { color: 'rgba(255,255,255,0.6)', fontSize: 12, flexShrink: 1 },
  pen: { flexDirection: 'row', alignItems: 'center', columnGap: 4 },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchActive: { borderColor: '#fff', borderWidth: 2 },
  widthBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  widthText: { color: '#fff', fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] },
  clearBtn: {
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  clearText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  shotBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 2,
  },
  shotGlyph: { color: '#fff', fontSize: 13, fontWeight: '700' },
  zoomBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  zoomGlyph: { color: '#fff', fontSize: 13, fontWeight: '700' },
  zoomPct: { color: colors.textMuted, fontSize: 10, width: 34, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
