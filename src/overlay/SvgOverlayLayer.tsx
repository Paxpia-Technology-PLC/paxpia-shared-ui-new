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

import { useEffect, useRef, useState, type ComponentType } from 'react';
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

/** Count the live set BEFORE/AFTER a prune so we can log how many expired this sweep.
 *  Pure helper kept here (not in core) so the log format stays a view-layer concern. */
function countMap(s: SvgOverlayState): number {
  return Object.keys(s).length;
}

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
  /** Optional verbose lifecycle log. When set, every prune sweep emits
   *  `[Svg] live=N pruned=M` so a device/emulator pass can ASSERT the live count
   *  bounds (converges) rather than growing unbounded. Off by default (silent). */
  debugLog?: (line: string) => void;
}

export function SvgOverlayLayer({ source, SvgHost, debugLog }: SvgOverlayLayerProps) {
  const [state, setState] = useState<SvgOverlayState>(emptySvgOverlays);
  // Keep the log fn in a ref so the (deps-empty) prune effect never re-subscribes when
  // the caller passes a fresh closure each render.
  const logRef = useRef(debugLog);
  logRef.current = debugLog;

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
      // Prune-on-arrival as well as on the interval: even if the JS thread is busy
      // enough to delay the prune timer, a new SET/DELETE always reconciles the set, so
      // it can never drift far past the bounded steady state (defence vs timer starvation).
      setState((s) => {
        const pruned = pruneExpiredSvgOverlays(s, now);
        return m.t === 'overlay.svg' ? setSvgOverlay(pruned, m, now) : deleteSvgOverlay(pruned, m.id);
      });
    });
    return off;
  }, [source]);

  // TTL pruner: drop expired ids on a steady interval (render-free on an idle tick).
  // The `[Svg] live=N pruned=M` line (when debugLog is set) is the assertion surface:
  // in a jazz room the live count must CONVERGE/BOUND as overlays expire, never grow
  // unbounded — proving mobile now matches web's shared-TTL behaviour.
  useEffect(() => {
    const t = setInterval(() => {
      setState((s) => {
        const before = countMap(s);
        const next = pruneExpiredSvgOverlays(s, Date.now());
        const after = countMap(next);
        const log = logRef.current;
        if (log) log(`[Svg] live=${after} pruned=${before - after}`);
        return next;
      });
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
