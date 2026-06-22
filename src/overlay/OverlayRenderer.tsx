// OverlayRenderer — the ONE shared overlay dispatcher (§6). It collapses the forked
// web `OverlayRenderer.tsx` and mobile `OverlayRenderer.tsx` into a single rn-web
// kind→renderer switch, so web (Vite via react-native-web) and mobile (Metro) render
// the SAME tree. Platform-only DECODE hides behind the injected `LeafAdapter` (§6a);
// the participation model + the doc render plan come from `@paxpia/core`.
//
// Dispatch:
//   • poll / vote-button / quiz → `ParticipationOverlay` (ONE impl; core pct/fold;
//     the gesture-ownership rule §6b baked in so a vote tap is never swallowed).
//   • doc                       → `DocOverlay` (the shared shell + the always-shown
//     `DocChrome` §6c; the injected `leaf` decodes the page).
//   • svg                       → a labelled slot placeholder (the MULTI-LIVE,
//     TTL'd freehand plane is the separate `SvgOverlayLayer`, an absolute layer over
//     the surface; this slot just labels a single-active `svg` overlay instance, web
//     parity).
//   • anything else             → a labelled fallback (never a blank slot).
//
// `view` carries the server-driven results + this viewer's committed choice + the
// vote callback (from `useOverlaySession`). When omitted it falls to a static,
// non-interactive preview (authoring editors) — empty tallies, vote is a no-op.

import { View, Text, StyleSheet } from 'react-native';
import type {
  DocPresenterState,
  DocRenderPlan,
  DocViewMode,
  OverlayInstance,
  OverlayViewProps,
  WbStroke,
  WhiteboardPayload,
} from '@paxpia/core';
import type { LeafAdapter } from './LeafAdapter';
import { ParticipationOverlay } from './ParticipationOverlay';
import { DocOverlay } from './DocOverlay';
import { WhiteboardOverlay } from './WhiteboardOverlay';

/** A non-interactive preview view: no votes recorded, empty tallies, vote is a no-op.
 *  Used when a renderer is shown as a STATIC preview (the studio authoring editors)
 *  with no live data channel behind it. Web parity (`PREVIEW_VIEW`). */
const PREVIEW_VIEW: OverlayViewProps = {
  voted: false,
  mine: undefined,
  tallies: {},
  total: 0,
  onVote: () => {},
};

export interface OverlayRendererProps {
  /** The overlay instance to render. */
  overlay: OverlayInstance;
  /** The participation view-model (voted/mine/tallies/total/onVote). Omit for a
   *  static authoring preview. */
  view?: OverlayViewProps;
  /** The injected leaf (image + WebView host) — the ONLY per-platform decode. */
  leaf: LeafAdapter;
  /** DOC: the shared render plan for the current page (from core `resolveDocRender`,
   *  resolved by the platform shell). Required to render a `doc` overlay. */
  docPlan?: DocRenderPlan;
  /** DOC VIEWER: the streamer's synced doc pan/zoom (mirror the presenter). */
  docPresenter?: DocPresenterState | null;
  /** DOC VIEWER: true when this viewer has locally taken over the doc (out of sync). */
  docTakenOver?: boolean;
  /** DOC VIEWER: called when the viewer pans/zooms locally → enter local takeover. */
  onDocTakeOver?: () => void;
  /** DOC VIEWER: called when the viewer taps resync → follow the streamer again. */
  onDocResync?: () => void;
  /** DOC AUTHORING: enables page nav. Omit on viewers so the page stays server-synced. */
  onDocPageNav?: (nextPage: number) => void;
  /** DOC: the single/scroll view mode (rides the synced presenter). */
  docMode?: DocViewMode;
  /** DOC: called when the user toggles single ⇆ scroll (streamer rebroadcasts; viewer
   *  enters local takeover). Omit to hide the toggle. */
  onDocModeChange?: (m: DocViewMode) => void;
  /** WHITEBOARD: the synced stroke set (core WbBoardState.strokes, folded by `applyWb`
   *  in the shell). Applies regardless of takeover — strokes are content, transform is
   *  view. Required to render a `whiteboard` overlay's content. */
  wbStrokes?: WbStroke[];
  /** WHITEBOARD EDITABLE (streamer/dash author): the frame captures the pen and the
   *  chrome shows colour/width/clear. Viewers omit it. */
  wbEditable?: boolean;
  /** WHITEBOARD EDITABLE: a finished local stroke to broadcast (overlay.wb.stroke). */
  onWbDraw?: (stroke: WbStroke) => void;
  /** WHITEBOARD EDITABLE: clear the board (bump gen + broadcast overlay.wb.wipe). */
  onWbClear?: () => void;
  /** WHITEBOARD VIEWER: a content-only screenshot data url — the shell saves/shares it. */
  onWbCapture?: (dataUrl: string) => void;
}

export function OverlayRenderer({
  overlay,
  view = PREVIEW_VIEW,
  leaf,
  docPlan,
  docPresenter,
  docTakenOver = false,
  onDocTakeOver,
  onDocResync,
  onDocPageNav,
  docMode,
  onDocModeChange,
  wbStrokes,
  wbEditable = false,
  onWbDraw,
  onWbClear,
  onWbCapture,
}: OverlayRendererProps) {
  switch (overlay.kind) {
    case 'poll':
    case 'vote-button':
    case 'quiz':
      return <ParticipationOverlay overlay={overlay} view={view} />;
    case 'doc':
      // A doc without a resolved plan is a shell wiring error, not a render — show a
      // labelled fallback rather than crash.
      if (!docPlan) {
        return (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>doc</Text>
          </View>
        );
      }
      return (
        <DocOverlay
          plan={docPlan}
          presenter={docPresenter}
          takenOver={docTakenOver}
          onTakeOver={onDocTakeOver}
          onResync={onDocResync}
          onPageNav={onDocPageNav}
          mode={docMode}
          onModeChange={onDocModeChange}
          leaf={leaf}
        />
      );
    case 'whiteboard':
      // The synced, takeover-capable freehand board — rendered through the SAME WebView
      // seam as docs (`buildWhiteboardHtml` in the leaf's WebViewHost), with the doc's
      // personal-streamer pan/zoom + takeover/resync model and a content-only screenshot.
      // Reuses the doc takeover/presenter prop names (identical semantics): docPresenter
      // → the publisher's synced transform, docTakenOver/onDocTakeOver/onDocResync → the
      // viewer's local-takeover banner + resync. Strokes ride `wbStrokes` (content, applied
      // regardless of takeover); `wbEditable`/onWbDraw/onWbClear are the streamer/dash pen;
      // onWbCapture surfaces the screenshot data url to the shell.
      return (
        <WhiteboardOverlay
          payload={overlay.payload as WhiteboardPayload}
          strokes={wbStrokes ?? []}
          presenter={docPresenter}
          takenOver={docTakenOver}
          onTakeOver={onDocTakeOver}
          onResync={onDocResync}
          editable={wbEditable}
          onDraw={onWbDraw}
          onClear={onWbClear}
          onCapture={onWbCapture}
          leaf={leaf}
        />
      );
    default:
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>{overlay.kind}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
});
