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
import type { DocViewMode } from '@paxpia/core';
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
  /** The active single/scroll view mode. When `onModeChange` is supplied a 2-state
   *  TOGGLE renders (always available — §4); omit `onModeChange` to hide the toggle. */
  mode?: DocViewMode;
  /** Toggle single ⇆ scroll. The streamer's toggle rides the synced presenter so
   *  viewers mirror it; a viewer's toggle is a local takeover. */
  onModeChange?: (m: DocViewMode) => void;
  /** ANNOTATION (STREAMER-ONLY, Message D item 2): whether the whiteboard-on-doc
   *  annotation layer is currently ON. Shown as a pressed/unpressed pen pill. */
  annOn?: boolean;
  /** ANNOTATION (STREAMER-ONLY): toggle the annotation layer on/off. Supplying it is
   *  what marks an OPERATOR doc chrome — a viewer NEVER gets this callback (viewers
   *  render annotations but can't draw), so the pen pill is operator-only by
   *  construction. Omit to hide the pen toggle entirely (every viewer surface). */
  onAnnToggle?: (next: boolean) => void;
}

export function DocChrome({
  filename,
  page,
  total,
  scale,
  onZoom,
  onFullscreen,
  onPageNav,
  mode,
  onModeChange,
  annOn = false,
  onAnnToggle,
}: DocChromeProps) {
  const canPrev = !!onPageNav && page > 0;
  const canNext = !!onPageNav && page < total - 1;
  const showZoom = !!onZoom;
  const showFullscreen = !!onFullscreen;
  const showMode = !!onModeChange;
  // The annotation pen toggle is OPERATOR-ONLY: it shows iff the parent supplies
  // `onAnnToggle` (a viewer surface never does — it renders annotations, can't draw).
  const showAnn = !!onAnnToggle;
  const activeMode: DocViewMode = mode === 'scroll' ? 'scroll' : 'single';
  return (
    <View style={styles.bar}>
      {/* LEFT: filename + "X / Y" — ALWAYS shown (web parity). In single mode the
          prev/next arrows flip the synced page; the count still derives from page. */}
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

      {/* RIGHT: the ANNOTATION pen toggle (operator-only) + the MODE TOGGLE (always
          available — §4) + zoom/fullscreen where it makes sense (omitted when the leaf
          owns its own zoom). */}
      {showAnn || showMode || showZoom || showFullscreen ? (
        <View style={styles.right}>
          {showAnn ? (
            <Pressable
              testID="doc-ann-toggle"
              accessibilityRole="button"
              accessibilityLabel="toggle annotation"
              accessibilityState={{ selected: annOn }}
              onPress={() => onAnnToggle?.(!annOn)}
              style={[styles.annBtn, annOn && styles.annBtnActive]}
            >
              <Text style={[styles.annGlyph, annOn && styles.annGlyphActive]}>✎</Text>
            </Pressable>
          ) : null}
          {showMode ? (
            <View style={styles.modeToggle} accessibilityRole="tablist">
              <Pressable
                testID="doc-mode-single"
                accessibilityRole="tab"
                accessibilityState={{ selected: activeMode === 'single' }}
                onPress={() => onModeChange?.('single')}
                style={[styles.modeBtn, activeMode === 'single' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeGlyph, activeMode === 'single' && styles.modeGlyphActive]}>▣</Text>
              </Pressable>
              <Pressable
                testID="doc-mode-scroll"
                accessibilityRole="tab"
                accessibilityState={{ selected: activeMode === 'scroll' }}
                onPress={() => onModeChange?.('scroll')}
                style={[styles.modeBtn, activeMode === 'scroll' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeGlyph, activeMode === 'scroll' && styles.modeGlyphActive]}>≣</Text>
              </Pressable>
            </View>
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
    // Chrome is a control strip, not copy — never let the filename / "X / Y" /
    // icon glyphs become a text-selection target on web (#1). On react-native-web
    // this emits `user-select: none`, which CSS-inherits to every <Text> below.
    userSelect: 'none',
  },
  left: { flexDirection: 'row', alignItems: 'center', columnGap: 6, flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center', columnGap: 2 },
  count: { color: 'rgba(255,255,255,0.6)', fontSize: 12, flexShrink: 1 },
  // PARITY: every chrome button CENTRES its glyph on both axes — `alignItems/justifyContent`
  // centre the glyph box, and the glyph `<Text>` carries `textAlign:'center'` + a lineHeight so
  // a 1-char icon sits dead-centre on rn-web (a bare <Text> there is left-aligned + uses the UA
  // line-box) exactly as it does on RN. A `minWidth` keeps every icon the same footprint so the
  // strip doesn't reflow differently per platform.
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navGlyph: { color: '#fff', fontSize: 14, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 7,
    padding: 1,
    marginRight: 2,
  },
  modeBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, minWidth: 22, alignItems: 'center', justifyContent: 'center' },
  modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  modeGlyph: { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  modeGlyphActive: { color: '#fff' },
  // The annotation pen pill (operator-only): a quiet outline when off, a bright accent
  // when ON so the streamer can see at a glance that draw-over-doc is engaged.
  annBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annBtnActive: { backgroundColor: '#6d5efc' },
  annGlyph: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  annGlyphActive: { color: '#fff' },
  zoomBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomGlyph: { color: '#fff', fontSize: 13, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  zoomPct: { color: colors.textMuted, fontSize: 10, width: 34, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
