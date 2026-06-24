// WhiteboardOverlay — the ONE shared synced-WHITEBOARD shell (§3.3), the sibling of
// DocOverlay. It consumes the SAME injected `LeafAdapter.WebViewHost` the doc shell
// uses (web `<iframe>` / mobile `react-native-webview`) and renders the board through
// the core `buildWhiteboardHtml` builder, so dashboard + web-viewer + mobile-viewer
// paint a byte-identical board at 60fps (strokes composite into the live frame DOM,
// not a per-stroke RN re-render — this kills the old inline-SVG ~5fps problem).
//
// ── WHAT IT OWNS (identical to DocOverlay) ───────────────────────────────────
//   • the {scale,panX,panY} viewport via the shared `docViewport` math (clampDocZoom
//     / clampPan / panBy / zoomByFactor) — SAME transform model as docs/images, so
//     pan/zoom + presenter-sync + takeover behave identically.
//   • the doc TAKEOVER / RESYNC model, reusing `docTakeover` VERBATIM: while FOLLOWING
//     the viewer mirrors the publisher's transform 1:1; the first local pinch/pan
//     inside the frame emits {e:'tf'} → markTakeover() → onTakeOver(), the "Out of
//     sync — Resync" banner shows, and the publisher transform STOPS being applied.
//     Resync → onResync() → snap to the publisher's current transform.
//   • the ALWAYS-shown `WhiteboardChrome` (zoom ± / refit / screenshot; pen controls
//     in editable mode).
//
// ── STROKES ARE CONTENT, THE TRANSFORM IS VIEW ───────────────────────────────
// Incoming wb.add/del/wipe/set apply to the board content REGARDLESS of takeover (a
// taken-over viewer still sees the publisher's new strokes, just at their own
// zoom/offset). The shell holds the synced board (the core WbBoardState, folded by
// `applyWb` in the platform shell) and feeds its strokes in as the `strokes` prop;
// they are baked into the frame via `buildWhiteboardHtml({ initialStrokes })`. The
// frame reloads with the latest snapshot when the strokes change — the LeafAdapter
// seam carries no per-stroke push channel, so the snapshot IS the content wire.
//
// ── EDITABLE (streamer/dash author) ──────────────────────────────────────────
// `editable` builds the authoring frame (pointer → finished stroke). A finished
// stroke arrives as {e:'wb.draw'} → forwarded to `onDraw` so the shell broadcasts it
// (overlay.wb.stroke) and echoes it back into the board. The chrome's pen colour/
// width/clear drive the local authoring state; `onClear` bumps the board generation.

import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import {
  buildWhiteboardHtml,
  clampDocZoom,
  clampPan,
  fitViewport,
  zoomByFactor,
  type DocFrameReport,
  type DocPresenterState,
  type DocViewport,
  type WbStroke,
  type WhiteboardPayload,
} from '@paxpia/core';
import type { LeafAdapter } from './LeafAdapter';
import { WhiteboardChrome, WB_COLORS, WB_WIDTHS, type WhiteboardRole } from './WhiteboardChrome';

export interface WhiteboardOverlayProps {
  /** The board identity + canvas geometry every front renders in (from the overlay
   *  instance payload). Strokes do NOT live here — they arrive via `strokes`. */
  payload: WhiteboardPayload;
  /** The synced stroke set (the core WbBoardState.strokes, folded by `applyWb` in the
   *  platform shell). Baked into the frame as the current snapshot; rebuilt on change.
   *  Applies REGARDLESS of takeover (strokes are content, the transform is view). */
  strokes: WbStroke[];
  /** The STREAMER's synced pan/zoom. When it changes and the viewer hasn't taken over,
   *  the view SNAPS to it (mirror the presenter). Omitted on the streamer. */
  presenter?: DocPresenterState | null;
  /** VIEWER: true when this viewer has LOCALLY taken over (out of sync). Drives the
   *  banner + resync and tells the follow-effect to STOP snapping to the streamer. */
  takenOver?: boolean;
  /** VIEWER: called the moment the viewer pans/zooms locally → enter local takeover.
   *  Omit on the streamer (it never takes over its own board). */
  onTakeOver?: () => void;
  /** VIEWER: resync to the streamer — the parent ends takeover; the follow-effect then
   *  re-snaps to the presenter transform. */
  onResync?: () => void;
  /** STREAMER/PRODUCER: called when THIS surface's local transform changes, so the
   *  studio can broadcast the presenter pan/zoom to viewers (dash == viewer). Viewers
   *  omit it. */
  onPresenter?: (p: DocPresenterState) => void;
  /** EDITABLE (streamer/dash) author mode — the frame captures the pen and the chrome
   *  shows colour/width/clear. Viewers omit it. */
  editable?: boolean;
  /** The CONTROL ROLE driving which chrome shows. Defaults to operator ⇔ `editable`, else
   *  viewer. The SAME overlay renders in dash-preview / live-controls / web-viewer; only
   *  this role differs — operator gets draw + transparent toggle, viewer gets nav only. */
  role?: WhiteboardRole;
  /** TRANSPARENT BACKGROUND (operator toggle): when true the board page is alpha-0 so the
   *  underlying scene sources composite through. Default opaque white-on-ink. Threaded into
   *  `buildWhiteboardHtml({transparent})`; strokes stay fully visible either way. */
  transparent?: boolean;
  /** Set the transparent-background state (operator). When omitted the chrome shows the
   *  toggle uncontrolled-internal; supply it to lift the state to the studio. */
  onTransparentChange?: (next: boolean) => void;
  /** EDITABLE: a finished local stroke to broadcast ({e:'wb.draw'} from the frame). */
  onDraw?: (stroke: WbStroke) => void;
  /** EDITABLE: undo the last LOCAL stroke (the chrome Undo button). Omit to hide it. */
  onUndo?: () => void;
  /** EDITABLE: redo the last UNDONE local stroke (the chrome Redo button). Omit to hide it. */
  onRedo?: () => void;
  /** EDITABLE: whether a redo is currently possible (the parent owns the redo stack). The
   *  Redo button greys out when false. Undo greys automatically when there are no strokes. */
  canRedo?: boolean;
  /** EDITABLE: clear the board (the chrome Clear button) — the shell bumps the gen and
   *  broadcasts overlay.wb.wipe. */
  onClear?: () => void;
  /** OPERATOR: viewer-visibility state — true ⇒ the overlay is HIDDEN from viewers (the
   *  streamer still sees a ghosted/greyed copy). Controlled when supplied; else owned
   *  locally so the toggle works standalone. */
  hidden?: boolean;
  /** OPERATOR: flip the viewer-visibility state. When omitted the overlay owns it locally
   *  (and still ghosts itself on the operator surface). */
  onHiddenChange?: (next: boolean) => void;
  /** VIEWER: a content-only screenshot ({e:'capture'} from the frame) — a base64 PNG
   *  data url. The platform shell saves/shares it (mobile: CameraRoll/share; web: <a
   *  download>). Omit to hide the screenshot button. */
  onCapture?: (dataUrl: string) => void;
  /** NAV-MODE (operator): true ⇒ NAVIGATE (pan/zoom) instead of DRAW. Controlled when
   *  supplied (the DocOverlay annotation drives it so it can toggle the layer's pointer
   *  pass-through); else owned locally so a placed board's draw/move toggle works standalone.
   *  In nav mode the frame is non-editable so the shared pan/zoom gestures take over. */
  navMode?: boolean;
  /** Flip draw ⇆ navigate (operator). Supplying it lifts nav-mode to the parent. */
  onNavModeChange?: (next: boolean) => void;
  /** ANNOTATION MODE (whiteboard-on-doc, Message D item 2): forces a TRANSPARENT background
   *  (it overlays the doc), HIDES the transparent + visibility toggles (the doc-chrome pen IS
   *  the visibility control + transparency is decided), and makes drawing work at ANY doc zoom
   *  (the DOC owns pan/zoom). Default false (a normal placed board). */
  annotation?: boolean;
  /** Whether the chrome should render its refit control. */
  chrome?: { fullscreen?: boolean };
  /** The injected leaf (the WebView host). The ONLY per-platform decode. */
  leaf: LeafAdapter;
}

export function WhiteboardOverlay({
  payload,
  strokes,
  presenter = null,
  takenOver = false,
  onTakeOver,
  onResync,
  onPresenter,
  editable = false,
  role,
  transparent: transparentProp,
  onTransparentChange,
  onDraw,
  onUndo,
  onRedo,
  canRedo = false,
  onClear,
  hidden: hiddenProp,
  onHiddenChange,
  onCapture,
  navMode: navModeProp,
  onNavModeChange,
  annotation: annotationMode = false,
  chrome,
  leaf,
}: WhiteboardOverlayProps) {
  const { WebViewHost } = leaf;

  // Role resolution: explicit `role` wins; else operator ⇔ editable. The chrome below
  // renders draw controls + the transparent toggle ONLY for an operator.
  const resolvedRole: WhiteboardRole = role ?? (editable ? 'operator' : 'viewer');
  const isOperator = resolvedRole === 'operator';

  // NAV-MODE (operator): navigate (pan/zoom) vs draw. Controlled when the parent supplies it
  // (the annotation lifts it to toggle the doc's pointer pass-through); else owned locally so
  // a placed board's toggle works standalone. In nav mode the frame is NON-editable so the
  // shared transform gestures pan/zoom; in draw mode the pen captures.
  const [navModeLocal, setNavModeLocal] = useState(false);
  const navMode = navModeProp ?? navModeLocal;
  const toggleNavMode = () => {
    const next = !navMode;
    if (onNavModeChange) onNavModeChange(next);
    else setNavModeLocal(next);
  };

  // Transparent-background state. Controlled when `transparentProp` is supplied (the studio
  // lifts it); otherwise the overlay owns it locally so the toggle works standalone (demo).
  const [transparentLocal, setTransparentLocal] = useState<boolean>(!!transparentProp);
  // Annotation mode is ALWAYS transparent (it overlays the doc) — the toggle is hidden, so the
  // flag is forced rather than controlled.
  const transparent = annotationMode ? true : (transparentProp ?? transparentLocal);
  const toggleTransparent = () => {
    const next = !transparent;
    if (onTransparentChange) onTransparentChange(next);
    else setTransparentLocal(next);
  };

  // Viewer-visibility state (operator toggle). Controlled when `hiddenProp` is supplied (the
  // studio lifts it + drops the overlay from viewers over the wire); else owned locally so
  // the toggle works standalone. On the OPERATOR surface a hidden board is GHOSTED (greyed,
  // still drawable) rather than removed — the streamer keeps authoring while viewers see
  // nothing. A viewer surface never renders a hidden board (the parent omits it).
  const [hiddenLocal, setHiddenLocal] = useState<boolean>(!!hiddenProp);
  const hidden = hiddenProp ?? hiddenLocal;
  const toggleHidden = () => {
    const next = !hidden;
    if (onHiddenChange) onHiddenChange(next);
    else setHiddenLocal(next);
  };

  // A viewer surface = one that can take over (onTakeOver supplied). The streamer/dash
  // author surface passes `editable` and never takes over its own board.
  const isViewer = !!onTakeOver;

  // The screenshot is viewer-facing. The button bumps `captureSignal`; the host watches
  // it and posts {t:'capture'} into the frame; the result returns via onReport({e:'capture'})
  // → onCapture. The whole capture is content-only by construction (chrome lives OUTSIDE
  // the frame, so it can't leak into the PNG). Hidden when onCapture isn't wired.
  const [captureSignal, setCaptureSignal] = useState(0);
  const requestCapture = () => setCaptureSignal((n) => n + 1);
  const showScreenshot = !!onCapture;

  // The pan/zoom transform is ONE { scale, panX, panY } driven by the shared core
  // docViewport math, IDENTICAL to DocOverlay's image/frame path.
  const [vp, setVp] = useState<DocViewport>(fitViewport);
  const takenOverRef = useRef(takenOver);
  takenOverRef.current = takenOver;
  const onTakeOverRef = useRef(onTakeOver);
  onTakeOverRef.current = onTakeOver;

  // Measured container size (px) — pan bounds / zoom focal. The streamer's pan rides the
  // wire in container px (zoom is portable), so we clamp it to OUR container.
  const [container, setContainer] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const containerRef = useRef(container);
  containerRef.current = container;
  const onViewportLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainer({ width: width || 1, height: height || 1 });
  };

  // Pen authoring state (editable mode) — pushed to the frame's window.__wbSetColor /
  // __wbSetWidth via the WebViewHost is the platform shell's job; here we just hold it
  // for the chrome. (The frame defaults colour/width on its own until the host pushes.)
  const [penColor, setPenColor] = useState<string>(WB_COLORS[0]);
  const [penWidth, setPenWidth] = useState<number>(WB_WIDTHS[1]);

  // A viewer interacting locally = a local takeover (defer the streamer's view). Fired
  // ONLY on a genuine transform gesture (the frame's {e:'tf'}) or a ± zoom, never a bare
  // touch. Identical rule to DocOverlay.
  const markTakeover = () => {
    if (isViewer && !takenOverRef.current) onTakeOverRef.current?.();
  };

  // VIEWER: apply the streamer's presenter transform when it changes while NOT taken
  // over, so the view mirrors what the streamer shows. With no presenter, snap to fit.
  // Skipped while taken over (honour the viewer's own focus). Mirrors DocOverlay.
  const lastPresenter = useRef<string>('');
  useEffect(() => {
    if (takenOver) return;
    if (presenter) {
      const key = `${presenter.zoom}:${presenter.panX}:${presenter.panY}`;
      if (key === lastPresenter.current) return;
      lastPresenter.current = key;
      setVp(
        clampPan(
          { scale: clampDocZoom(presenter.zoom), panX: presenter.panX, panY: presenter.panY },
          containerRef.current,
        ),
      );
    } else {
      setVp((v) => clampPan(v, containerRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenter, takenOver, container.width, container.height]);

  // STREAMER/PRODUCER direction: when a producer surface (onPresenter supplied) changes
  // its local transform, broadcast it so viewers mirror it. Viewers omit onPresenter.
  useEffect(() => {
    onPresenter?.({ page: 0, zoom: vp.scale, panX: vp.panX, panY: vp.panY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.scale, vp.panX, vp.panY]);

  // ± zoom (the chrome buttons) — zoom about the container CENTRE + mark takeover.
  const buttonZoom = (factor: number) => {
    markTakeover();
    setVp((v) => zoomByFactor(v, factor, containerRef.current));
  };
  // Refit — a taken-over viewer resyncs; otherwise reset to fit.
  const refit = () => {
    if (isViewer && takenOverRef.current) onResync?.();
    else setVp(fitViewport());
  };

  // Frame→host reports. 'tf' is a LOCAL gesture inside the frame → record it as our
  // viewport (so the chrome % tracks it + it can be rebroadcast) and, on a viewer, flip
  // to local takeover. 'wb.draw' (editable) is a finished local stroke to broadcast.
  // 'capture' is the content-only screenshot result. A bare tap never produces 'tf', so
  // touching the board does NOT desync — matching the doc rule.
  const handleReport = (r: DocFrameReport) => {
    if (r.e === 'tf') {
      markTakeover();
      setVp(clampPan({ scale: clampDocZoom(r.s), panX: r.x, panY: r.y }, containerRef.current));
    } else if (r.e === 'wb.draw') {
      onDraw?.(r.stroke);
    } else if (r.e === 'capture') {
      onCapture?.(r.dataUrl);
    }
  };

  // Build the board HTML from the current snapshot. Rebuilt when the strokes / canvas /
  // background / editability change — the host reloads the frame with the new snapshot
  // (the LeafAdapter seam carries no per-stroke push, so the snapshot is the content
  // wire). Strokes apply regardless of takeover (content, not view).
  // The frame is EDITABLE (the pen captures) in DRAW mode; in NAV mode it's non-editable so
  // the shared pan/zoom gestures take over. A viewer frame is never editable.
  const frameEditable = (editable || isOperator) && !navMode;
  const html = useMemo(
    () =>
      buildWhiteboardHtml({
        canvas: payload.canvas,
        backgroundUrl: payload.backgroundUrl,
        initialStrokes: strokes,
        editable: frameEditable,
        transparent,
        // DRAW mode ALWAYS draws — even when zoomed + dragging (panning is NAV mode, not a
        // zoomed-drag hijack). So a pointer-down starts a stroke regardless of scale whenever
        // the frame is editable (placed board OR annotation).
        alwaysDraw: frameEditable,
        // The chrome's active swatch/width seed the authoring pen; selecting either rebuilds
        // the frame so the NEXT stroke carries the new colour/width (the wire IS the snapshot).
        penColor,
        penWidth,
      }),
    [payload.canvas, payload.backgroundUrl, strokes, frameEditable, transparent, penColor, penWidth],
  );

  // Undo greys out when there's nothing to undo; redo is parent-driven (it owns the stack).
  const canUndo = (strokes?.length ?? 0) > 0;
  // The operator keeps a GHOSTED copy of a hidden board (still drawable); viewers never
  // render a hidden board (the parent omits the overlay), so ghosting is operator-only.
  const ghosted = isOperator && hidden;

  return (
    // The overlay is ONE self-contained window: the board fills it edge-to-edge and the
    // control rails float ABSOLUTELY on the window's own edges (NOT a sibling column).
    // Same overlay in dash-preview / live-controls / web-viewer — only the role differs.
    <View style={[styles.root, annotationMode && styles.rootTransparent]} onLayout={onViewportLayout}>
      {/* The board frame fills the whole overlay (stretch, never center — a flex frame
          with no intrinsic width collapses to 0 under alignItems:center). The frame
          applies the shared {scale,panX,panY} transform internally and reports local
          gestures + draws + capture back via onReport. Ghosted (greyed) when the operator
          has hidden the overlay from viewers — they still author it. */}
      <View style={[styles.frameFill, ghosted && styles.frameGhosted]}>
        <WebViewHost
          html={html}
          transform={vp}
          onReport={handleReport}
          captureSignal={showScreenshot ? captureSignal : undefined}
        />
      </View>

      {/* GHOSTED badge — only the operator sees it; tells the streamer the overlay is
          currently hidden from viewers (they still see the greyed board to keep drawing). */}
      {ghosted ? (
        <View style={styles.ghostBadge} pointerEvents="none">
          <Text style={styles.ghostBadgeText}>Hidden from viewers</Text>
        </View>
      ) : null}

      {/* TOP DRAW RAIL (operator only) — absolutely positioned on the overlay's own top
          edge, so the chrome belongs to the board window itself (Noel: it is its own
          contained world, NOT a detached sidebar). box-none lets a click that MISSES a
          button fall through to the board (so drawing/panning under the rail still works).
          The colour dropdown, width, undo/redo, clear, transparent + visibility toggles
          live here; a viewer never renders this rail. */}
      {isOperator ? (
        <View style={styles.chromeTop} pointerEvents="box-none">
          <WhiteboardChrome
            placement="top"
            role={resolvedRole}
            editable={isOperator}
            color={penColor}
            onColor={setPenColor}
            width={penWidth}
            onWidth={setPenWidth}
            onUndo={onUndo}
            canUndo={canUndo}
            onRedo={onRedo}
            canRedo={canRedo}
            onClear={onClear}
            // NAV-MODE toggle (draw ⇆ navigate) — always available to the operator.
            navMode={navMode}
            onNavModeToggle={toggleNavMode}
            // Transparent + visibility toggles are HIDDEN in annotation mode (it's always
            // transparent + its visibility is the doc-chrome pen) — omit the callbacks so the
            // chrome doesn't render them. A placed board keeps both.
            transparent={transparent}
            onTransparentToggle={annotationMode ? undefined : toggleTransparent}
            hidden={hidden}
            onVisibilityToggle={annotationMode ? undefined : toggleHidden}
          />
        </View>
      ) : null}

      {/* BOTTOM NAV RAIL (both roles) — zoom + screenshot split onto their OWN bottom edge
          (Message F#1) so they never push/clip the draw rail or the board. Centred; box-none
          so misses fall through to the board. */}
      <View style={styles.chromeBottom} pointerEvents="box-none">
        <WhiteboardChrome
          placement="bottom"
          role={resolvedRole}
          scale={vp.scale}
          onZoom={buttonZoom}
          onFullscreen={chrome?.fullscreen !== false ? refit : undefined}
          onScreenshot={showScreenshot ? requestCapture : undefined}
        />
      </View>

      {/* OUT-OF-SYNC banner (viewer only) — a coloured pill near the TOP when the viewer has
          locally taken over (kept clear of the bottom nav rail), with a resync button that
          snaps them back to the streamer's transform. */}
      {isViewer && takenOver ? (
        <View style={styles.banner} pointerEvents="box-none">
          <Pressable style={styles.resyncBtn} onPress={() => onResync?.()} hitSlop={8}>
            <Text style={styles.resyncText}>↻ Resync</Text>
          </Pressable>
          <View style={styles.outOfSyncPill}>
            <Text style={styles.outOfSyncText}>Out of sync with streamer</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The root IS the overlay window: the board fills it edge-to-edge and the rail floats on
  // its edge. It FILLS its container by SIZE (`width/height:100%`), not only `flex:1` — so it
  // fills whether the parent is a flex column (mobile slot / the demos) OR a plain block div
  // (the web studio tiles: GoLive/ScenesEditor/StreamView wrap it in `h-full` block divs where
  // `flex:1` alone collapses to content height → the "mostly empty space + bottom rail in the
  // middle" bug). The canvas = the container, no forced aspect (the SVG `__fitBoard`s to the
  // measured rect). `minHeight:0` keeps it shrinkable inside a flex parent.
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  // ANNOTATION mode (whiteboard-over-doc): NO root tint + no rounding — the layer must be
  // fully see-through so the doc underneath shows (the strokes are the only opaque pixels).
  // Pairs with the transparent frame (bgOverride) + the transparent iframe element (web leaf).
  rootTransparent: { backgroundColor: 'transparent', borderRadius: 0 },
  // The board frame (WebView/iframe) must fill the window — stretch, never center
  // (centering collapses a flex frame's width to 0 → the historic blank-frame bug).
  frameFill: { flex: 1, alignSelf: 'stretch', width: '100%' },
  // A hidden-from-viewers board is greyed on the operator surface (still drawable).
  frameGhosted: { opacity: 0.4 },
  ghostBadge: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(11,14,22,0.85)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    zIndex: 6,
  },
  ghostBadgeText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700' },
  // The TOP DRAW rail: pinned to the overlay's own TOP edge (left/right inset so the pill
  // never touches the corners). This is what makes the chrome part of the board window, not
  // a sibling column. box-none on the wrapper lets misses fall to the board.
  chromeTop: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    zIndex: 5,
  },
  // The BOTTOM NAV rail: pinned to the overlay's own BOTTOM edge, centred (zoom + screenshot
  // on their own edge so they never push/clip the draw rail or the board — Message F#1).
  chromeBottom: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 5,
  },
  // The viewer takeover banner sits at the TOP (the viewer has no top draw rail), clear of
  // the bottom nav rail.
  banner: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  resyncBtn: { backgroundColor: '#f59e0b', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  resyncText: { color: '#000', fontSize: 10, fontWeight: '800' },
  outOfSyncPill: { backgroundColor: 'rgba(245,158,11,0.9)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  outOfSyncText: { color: '#000', fontSize: 10, fontWeight: '700' },
});
