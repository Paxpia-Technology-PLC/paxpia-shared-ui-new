// DocChrome — the shared doc chrome (§6c): filename + "page X / Y" + zoom +
// fullscreen, ALWAYS shown for every doc, on every platform.
//
// This is web parity by construction: the web `DocOverlay` always rendered the
// filename + page count + zoom/fullscreen controls; mobile's `DocOverlayView` hid
// the count for PDF/EPUB and showed no filename/zoom strip. Promoting the chrome to
// ONE rn-web component means the "doc chrome missing on mobile" bug can't recur —
// both platforms render the identical strip.
//
// Pure presentational rn-web (View/Text/Pressable). The doc SHELL (`DocOverlay`)
// owns the transform + takeover state and passes the display values + callbacks in.
// `onZoom`/`onFullscreen` are optional: when omitted (e.g. a reflowable EPUB whose
// reader owns its own zoom, or a context without fullscreen) that control is hidden,
// but the filename + page count ALWAYS show.

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

export interface DocChromeProps {
  /** The doc filename / title — ALWAYS shown. */
  filename: string;
  /** Current 0-based page index (rendered as `page + 1`). */
  page: number;
  /** Total page count — `page + 1 / total` ALWAYS shows when total > 0. */
  total: number;
  /** Current zoom scale (1 = fit). Shown as a % when `onZoom` is supplied. */
  scale?: number;
  /** Zoom by a multiplicative factor (e.g. 1.25 / 0.8). Omit to hide the zoom strip
   *  (e.g. PDF/EPUB whose leaf owns its own zoom). */
  onZoom?: (factor: number) => void;
  /** Reset to fit (1×, centred) — the fullscreen/refit control. Omit to hide it. */
  onFullscreen?: () => void;
  /** Page nav (authoring/streamer). Omit on viewers so the page stays server-synced;
   *  the count still shows. */
  onPageNav?: (nextPage: number) => void;
}

export function DocChrome({ filename, page, total, scale, onZoom, onFullscreen, onPageNav }: DocChromeProps) {
  const canPrev = !!onPageNav && page > 0;
  const canNext = !!onPageNav && page < total - 1;
  const showZoom = !!onZoom;
  const showFullscreen = !!onFullscreen;
  return (
    <View style={styles.bar}>
      {/* LEFT: filename + "X / Y" — ALWAYS shown (web parity). */}
      <View style={styles.left}>
        {onPageNav ? (
          <Pressable
            disabled={!canPrev}
            onPress={() => onPageNav(page - 1)}
            style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
          >
            <Text style={styles.navGlyph}>‹</Text>
          </Pressable>
        ) : null}
        <Text style={styles.count} numberOfLines={1}>
          {filename}
          {total > 0 ? ` · ${page + 1} / ${total}` : ''}
        </Text>
        {onPageNav ? (
          <Pressable
            disabled={!canNext}
            onPress={() => onPageNav(page + 1)}
            style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
          >
            <Text style={styles.navGlyph}>›</Text>
          </Pressable>
        ) : null}
      </View>

      {/* RIGHT: zoom +/− + the live % + fullscreen/refit — shown where it makes
          sense (omitted when the leaf owns its own zoom). */}
      {showZoom || showFullscreen ? (
        <View style={styles.right}>
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
  count: { color: 'rgba(255,255,255,0.6)', fontSize: 12, flexShrink: 1 },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  navBtnDisabled: { opacity: 0.3 },
  navGlyph: { color: '#fff', fontSize: 14, fontWeight: '700' },
  zoomBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  zoomGlyph: { color: '#fff', fontSize: 13, fontWeight: '700' },
  zoomPct: { color: colors.textMuted, fontSize: 10, width: 34, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
