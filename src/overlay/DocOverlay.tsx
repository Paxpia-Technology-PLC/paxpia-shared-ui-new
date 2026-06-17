// DocOverlay — the ONE shared synced-document shell (§6). It collapses the forked
// web `DocOverlay` (Paxpia-web renderers.tsx) and mobile `DocOverlayView` into a
// single rn-web component. It is the doc SHELL: it owns the pan/zoom transform (via
// the shared `@paxpia/core` docViewport math — IDENTICAL to web's wheel-zoom and
// mobile's pinch-pan), the takeover banner + resync, and the ALWAYS-shown `DocChrome`
// (§6c). The thing that decodes a page — a raw PDF, an EPUB, a (possibly animated)
// page image — is the INJECTED `LeafAdapter` (§6a), never imported here.
//
// What it renders, by the shared `resolveDocRender` plan (passed in as `plan`):
//   • 'image'       → the injected `ImageLeaf` under the pan/zoom transform. `loop`
//                     is passed so an animated page (GIF) loops on BOTH platforms.
//   • 'pdf' / 'epub'→ the injected `WebViewHost` (raw PDF / EPUB reader). The host
//                     OWNS its own scroll/zoom (§6b): we render it DIRECTLY with no
//                     wrapping pan detector, and takeover fires from INSIDE via the
//                     host's `onUserInteract` — never stealing the host's scroll.
//   • 'placeholder' → a labelled card (a dev push before a render pipeline).
//   • 'empty'       → "No pages".
//
// GESTURE-OWNERSHIP (§6b): only the IMAGE path is transformable, and its drag-pan +
// the chrome's ± zoom mark a local TAKEOVER (defer the streamer's doc) the moment a
// real transform gesture happens — a plain touch landing on the doc does NOT desync
// (the `docTakeover` machine in core is the single judge; this shell only forwards
// genuine transform gestures). The presenter follow-effect snaps to the streamer's
// pan/zoom when NOT taken over, mirrors web's "persist zoom across page switch".

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  PanResponder,
  StyleSheet,
  type LayoutChangeEvent,
  type PanResponderInstance,
} from 'react-native';
import {
  clampDocZoom,
  clampPan,
  fitViewport,
  panBy,
  zoomByFactor,
  type DocPresenterState,
  type DocRenderPlan,
  type DocViewMode,
  type DocViewport,
} from '@paxpia/core';
import type { LeafAdapter } from './LeafAdapter';
import { DocChrome } from './DocChrome';

export interface DocOverlayProps {
  /** The shared render plan for the CURRENT page (from core `resolveDocRender`). The
   *  platform shell resolves it once (so web + mobile pick the SAME leaf). */
  plan: DocRenderPlan;
  /** The STREAMER's synced pan/zoom. When it changes and the viewer hasn't taken
   *  over, the view SNAPS to it (mirror the presenter). Omitted on the streamer. */
  presenter?: DocPresenterState | null;
  /** VIEWER: true when this viewer has LOCALLY taken over (out of sync). Drives the
   *  banner + resync and tells the follow-effect to STOP snapping to the streamer. */
  takenOver?: boolean;
  /** VIEWER: called the moment the viewer pans/zooms locally → enter local takeover.
   *  Omit on the streamer (it never takes over its own doc). */
  onTakeOver?: () => void;
  /** VIEWER: resync to the streamer — the parent ends takeover; the follow-effect
   *  then re-snaps to the presenter transform. */
  onResync?: () => void;
  /** Page nav (authoring/streamer). Omit on viewers so the page stays server-synced;
   *  the chrome still shows the count. */
  onPageNav?: (nextPage: number) => void;
  /** The single/scroll view mode the streamer is broadcasting (rides the presenter).
   *  When NOT taken over, the local mode mirrors this; absent ⇒ 'single'. */
  mode?: DocViewMode;
  /** Called when the user toggles single ⇆ scroll. On a streamer this rebroadcasts;
   *  on a viewer this is a local takeover (the parent records the local mode). Omit to
   *  HIDE the toggle entirely (e.g. an image doc, where scroll mode is meaningless). */
  onModeChange?: (m: DocViewMode) => void;
  /** Whether the chrome should render its fullscreen/refit control. */
  chrome?: { fullscreen?: boolean };
  /** The injected leaf (image + WebView host). The ONLY per-platform decode. */
  leaf: LeafAdapter;
}

export function DocOverlay({
  plan,
  presenter = null,
  takenOver = false,
  onTakeOver,
  onResync,
  onPageNav,
  mode,
  onModeChange,
  chrome,
  leaf,
}: DocOverlayProps) {
  const { ImageLeaf, WebViewHost } = leaf;
  const { title, page, pageCount, src, kind } = plan;
  const isPdf = kind === 'pdf';
  const isEpub = kind === 'epub';
  const isImage = kind === 'image';
  // PDF + EPUB leaves own their own scroll/zoom, so the pan/zoom transform applies
  // only to the image path (web parity: `transformable`).
  const transformable = isImage;
  // The single/scroll toggle only makes sense for the paged WebView leaves (PDF/EPUB);
  // an image doc has nothing to scroll, so the toggle is hidden there.
  const supportsMode = isPdf || isEpub;
  // Effective mode: the streamer's synced mode (mirrored) unless a viewer has locally
  // toggled. We honour the prop `mode` (the source of truth the parent owns) and fall
  // back to 'single'. When the parent doesn't manage mode (no onModeChange), keep a
  // local mode so the toggle still works on a standalone surface (DevDocTest).
  const [localMode, setLocalMode] = useState<DocViewMode>(mode ?? 'single');
  // Mirror the prop when the parent drives it (and we're not locally diverging).
  useEffect(() => {
    if (mode) setLocalMode(mode);
  }, [mode]);
  const viewMode: DocViewMode = supportsMode ? localMode : 'single';
  const changeMode = (m: DocViewMode) => {
    if (m === viewMode) return;
    setLocalMode(m);
    // A viewer toggling mode = a local takeover (defer the streamer); the parent also
    // records the chosen mode so it can rebroadcast (streamer) or remember (viewer).
    if (isViewer && !takenOverRef.current) onTakeOverRef.current?.();
    onModeChange?.(m);
  };

  // A viewer surface = one that can take over (onTakeOver supplied; the streamer
  // passes onPageNav and never takes over its own doc).
  const isViewer = !!onTakeOver;

  // The pan/zoom transform is ONE { scale, panX, panY } driven by the shared core
  // docViewport math. We feed it container size + gesture deltas; the result applies
  // to the image transform identically to web's wheel/drag and mobile's pinch/pan.
  const [vp, setVp] = useState<DocViewport>(fitViewport);
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const takenOverRef = useRef(takenOver);
  takenOverRef.current = takenOver;
  const onTakeOverRef = useRef(onTakeOver);
  onTakeOverRef.current = onTakeOver;

  // Measured container size (px) — pan bounds / zoom focal. The streamer's pan rides
  // the wire in container px (zoom is portable), so we clamp it to OUR container.
  const [container, setContainer] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const containerRef = useRef(container);
  containerRef.current = container;
  const onViewportLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainer({ width: width || 1, height: height || 1 });
  };

  // A viewer interacting locally = a local takeover (defer the streamer's doc). Fired
  // ONLY on a genuine transform gesture (drag-pan / ± zoom), never on a bare touch.
  const markTakeover = () => {
    if (isViewer && !takenOverRef.current) onTakeOverRef.current?.();
  };

  // VIEWER: apply the streamer's presenter transform when it changes (and on page
  // change) while NOT taken over, so the view mirrors what the streamer shows. With
  // no presenter, snap to fit. Skipped while taken over (honour the viewer's focus).
  const lastPresenter = useRef<string>('');
  useEffect(() => {
    if (takenOver) return;
    if (presenter) {
      const key = `${presenter.zoom}:${presenter.panX}:${presenter.panY}:${page}`;
      if (key === lastPresenter.current) return;
      lastPresenter.current = key;
      setVp(
        clampPan(
          { scale: clampDocZoom(presenter.zoom), panX: presenter.panX, panY: presenter.panY },
          containerRef.current,
        ),
      );
    } else {
      // No presenter: persist the scale across a page switch (web P1.3 — a zoomed
      // reader stays zoomed on the next page) and only re-clamp the pan.
      setVp((v) => clampPan(v, containerRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenter, takenOver, page, container.width, container.height]);

  // Drag-pan via PanResponder (the cross-platform pointer/touch drag). Only pans when
  // zoomed in (web onPointerDown guard) and marks takeover on a real drag. Bound once
  // with refs so the latest vp/container are read without re-creating the responder.
  // `lastDrag` tracks the cumulative dx/dy the responder reported so we can pan by the
  // per-frame delta (PanResponder gives cumulative offsets from grant).
  const lastDrag = useRef({ x: 0, y: 0 });
  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Claim the gesture only when zoomed in AND the finger actually MOVES — a tap
      // (no move) is never claimed, so it falls through (e.g. double-tap to refit).
      onMoveShouldSetPanResponder: (_e, g) =>
        vpRef.current.scale > 1 && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
      onPanResponderGrant: () => markTakeover(),
      onPanResponderMove: (_e, g) => {
        // PanResponder reports CUMULATIVE dx/dy from grant; pan by the per-frame delta.
        const dx = g.dx - lastDrag.current.x;
        const dy = g.dy - lastDrag.current.y;
        lastDrag.current = { x: g.dx, y: g.dy };
        setVp((v) => panBy(v, dx, dy, containerRef.current));
      },
      onPanResponderRelease: () => {
        lastDrag.current = { x: 0, y: 0 };
      },
      onPanResponderTerminate: () => {
        lastDrag.current = { x: 0, y: 0 };
      },
    }),
  ).current;

  // ± zoom (the chrome buttons) — zoom about the container CENTRE + mark takeover.
  const buttonZoom = (factor: number) => {
    markTakeover();
    setVp((v) => zoomByFactor(v, factor, containerRef.current));
  };
  // Fullscreen/refit — a taken-over viewer resyncs; otherwise reset to fit.
  const refit = () => {
    if (isViewer && takenOverRef.current) onResync?.();
    else setVp(fitViewport());
  };

  const transformStyle = {
    transform: [{ translateX: vp.panX }, { translateY: vp.panY }, { scale: vp.scale }],
  };
  // From INSIDE a WebView leaf: a real interaction → local takeover (no scroll theft).
  const onLeafInteract = isViewer ? markTakeover : undefined;

  return (
    <View style={styles.root}>
      <View style={styles.viewport} onLayout={onViewportLayout}>
        {isPdf && src ? (
          // RAW PDF: the injected WebView host rasterizes the synced page (single mode)
          // or the whole doc as one culled scroll (scroll mode). It owns its own
          // scroll/zoom, so it's rendered DIRECTLY (no pan wrapper). Takeover is
          // signalled from inside via onUserInteract (§6b). The view MODE + the synced
          // page + pageCount drive which bootstrap the leaf builds.
          <View style={styles.leafFill}>
            <WebViewHost url={src} mode={viewMode} page={page} pageCount={pageCount} onUserInteract={onLeafInteract} />
          </View>
        ) : isEpub && src ? (
          // RAW EPUB: the injected WebView host opens the reader. Single mode paginates
          // by section (prev/next + page-sync); scroll mode is one continuous reader
          // with NO nested scrollbar. Rendered directly; takeover from inside.
          <View style={styles.leafFill}>
            <WebViewHost url={src} mode={viewMode} page={page} pageCount={pageCount} onUserInteract={onLeafInteract} />
          </View>
        ) : isImage && src ? (
          // IMAGE (a pre-rendered page JPEG, an uploaded slide, or a raw image) — the
          // fast path. The pan/zoom transform applies here only; the leaf MUST loop an
          // animated image (GIF) — that flag is the GIF-loop fix in ONE place (§6a).
          <Animated.View style={styles.leafFill} {...panResponder.panHandlers}>
            <Animated.View style={[styles.imageWrap, transformStyle]}>
              <ImageLeaf src={src} loop />
            </Animated.View>
          </Animated.View>
        ) : kind === 'placeholder' ? (
          // A non-URL placeholder page (a dev push before a render pipeline) — a
          // labelled card, never a blank slot.
          <View style={styles.placeholder}>
            <Text style={styles.phPage}>Page {page + 1}</Text>
            <Text style={styles.phTitle} numberOfLines={2}>
              {title}
            </Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pages</Text>
          </View>
        )}

        {/* OUT-OF-SYNC banner (viewer only) — a colored pill at the TOP when the
            viewer has locally taken over, with a resync button on the LEFT that snaps
            them back to following the streamer's doc + page + transform. */}
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

      {/* The ALWAYS-shown chrome: filename + "X / Y" + the single/scroll TOGGLE (for
          PDF/EPUB) + (image-only) zoom/fullscreen. PDF/EPUB leaves own their own zoom,
          so the zoom strip is hidden for them — but the filename + count + mode toggle
          ALWAYS show (web parity §6c). */}
      <DocChrome
        filename={title}
        page={page}
        total={pageCount}
        scale={vp.scale}
        onZoom={transformable ? buttonZoom : undefined}
        onFullscreen={transformable && chrome?.fullscreen !== false ? refit : undefined}
        onPageNav={onPageNav}
        mode={viewMode}
        onModeChange={supportsMode ? changeMode : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewport: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  leafFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageWrap: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  phPage: { color: 'rgba(255,255,255,0.85)', fontSize: 30, fontWeight: '900' },
  phTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
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
