// SvgOverlayLayer — the ONE shared SVG-overlay render surface (§6). It collapses the
// forked web `SvgOverlayLayer.tsx` and mobile `SvgOverlayLayer.tsx` into a single
// rn-web component: an ABSOLUTE, non-interactive layer over the stream surface where
// each live `overlay.svg` id paints into its own inset-0 host and the SVG's own
// viewBox/coords place its content within the frame. Multiple stack (later sets on
// top). Auto-removal is driven by the SHARED `@paxpia/core` svg reducer — the SAME
// TTL prune the web + mobile copies used — so both platforms drop expired ids
// identically.
//
// THE SEAM (§6a/§8): the part that actually DECODES + injects the SVG (sanitize →
// DOM `innerHTML` on web; sanitize → `SvgXml` + SMIL bake on mobile) needs a platform
// decoder, so it is INJECTED as `SvgHost` and NEVER imported here. This component owns
// only the PURE set: it folds incoming `overlay.svg` / `overlay.svg.delete` events
// through the core reducer, prunes expired ids on a steady interval, and renders the
// live set stacked — handing each id's raw svg string to the injected host. Renders
// nothing when no SVGs are live.

import { useEffect, useState, type ComponentType } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  emptySvgOverlays,
  setSvgOverlay,
  deleteSvgOverlay,
  pruneExpiredSvgOverlays,
  liveSvgOverlays,
  type SvgOverlay,
  type SvgOverlayMsg,
  type SvgOverlayState,
} from '@paxpia/core';

/** How often the TTL pruner sweeps the live set — mirrors web + mobile's 1s cadence.
 *  `pruneExpiredSvgOverlays` returns the SAME ref when nothing expired, so an idle
 *  tick triggers no re-render (React bails on an identical state reference). */
const PRUNE_INTERVAL_MS = 1000;

/** The thin channel the layer subscribes to for `overlay.svg` events. The platform
 *  shell binds this to its overlay data channel; the layer never touches the SDK. */
export interface SvgOverlaySource {
  /** Subscribe to decoded SVG-overlay messages; returns an unsubscribe fn. */
  onSvgOverlay(cb: (m: SvgOverlayMsg) => void): () => void;
}

/** The injected, platform-specific SVG host — the ONLY per-platform decode (§6a).
 *  Web injects sanitized markup via `dangerouslySetInnerHTML`; mobile sanitizes +
 *  bakes SMIL and renders `SvgXml`. It receives the RAW svg string (it sanitizes). */
export interface SvgHostProps {
  /** The raw SVG document string off the wire (the host sanitizes before injecting). */
  svg: string;
}

export interface SvgOverlayLayerProps {
  /** The overlay channel to subscribe to (null → empty set, e.g. between rooms). */
  source: SvgOverlaySource | null;
  /** The injected SVG host (sanitize + inject) — never imported here. */
  SvgHost: ComponentType<SvgHostProps>;
}

export function SvgOverlayLayer({ source, SvgHost }: SvgOverlayLayerProps) {
  const [state, setState] = useState<SvgOverlayState>(emptySvgOverlays);

  // Subscribe to the channel. Re-subscribes when the source instance changes (a room
  // switch hands a fresh channel); a fresh channel ⇒ fresh (empty) set.
  useEffect(() => {
    if (!source) {
      setState(emptySvgOverlays());
      return;
    }
    setState(emptySvgOverlays());
    const off = source.onSvgOverlay((m: SvgOverlayMsg) => {
      const now = Date.now();
      setState((s) => (m.t === 'overlay.svg' ? setSvgOverlay(s, m, now) : deleteSvgOverlay(s, m.id)));
    });
    return off;
  }, [source]);

  // TTL pruner: drop expired ids on a steady interval (render-free on an idle tick).
  useEffect(() => {
    const t = setInterval(() => {
      setState((s) => pruneExpiredSvgOverlays(s, Date.now()));
    }, PRUNE_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const live: SvgOverlay[] = liveSvgOverlays(state);
  if (live.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {live.map((o) => (
        <View key={o.id} style={StyleSheet.absoluteFill} pointerEvents="none">
          <SvgHost svg={o.svg} />
        </View>
      ))}
    </View>
  );
}
