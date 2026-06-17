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
import type { DocPresenterState, DocRenderPlan, OverlayInstance, OverlayViewProps } from '@paxpia/core';
import type { LeafAdapter } from './LeafAdapter';
import { ParticipationOverlay } from './ParticipationOverlay';
import { DocOverlay } from './DocOverlay';

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
          leaf={leaf}
        />
      );
    case 'svg':
      // The single-active `svg` overlay slot (the multi-live TTL plane is the separate
      // SvgOverlayLayer). Web parity: a labelled "Live whiteboard" placeholder.
      return (
        <View style={styles.svgRoot}>
          <Text style={styles.svgTitle}>Live whiteboard</Text>
        </View>
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
  svgRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', rowGap: 8 },
  svgTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
});
