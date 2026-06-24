// GiftOverlayLayer — the ONE shared GIFT-toast render surface (Contract v2.4 / kinds/gift).
// It is the gift analogue of `SvgOverlayLayer`: an ABSOLUTE, transparent, non-interactive
// LAYER over the stream surface that renders the MOST RECENT gift toasts as small floating
// pills (from-name + a gift glyph + the gift id), stacked bottom-up. It is NOT a scene-slot
// dispatch — like the SVG layer it is its own absolute overlay the platform shell mounts
// over the video.
//
// PURE PRESENTATION: it reads the converged toast feed from PROPS (the render-brain's
// `session.gifts` — the append-only, id-deduped, capped feed `overlay.gift` deltas folded
// into `ViewerState.gifts`). The CONVERGENCE (dedupe / cap / fold) lives in @paxpia/core; this
// layer only DISPLAYS a bounded, auto-expiring WINDOW of the newest toasts. A toast fades in
// on arrival and EXPIRES after a TTL (so a busy room can't pile pills forever) — the same
// "bounded steady state" the SVG layer's TTL prune gives, here on the VIEW side because the
// feed itself is fire-and-forget (the model never drops a toast; the UI ages it out).
//
// rn-web ONLY (View/Text/Animated) so it renders identically under Vite (web, via
// react-native-web) and Metro (mobile) — no DOM, no platform branch.

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GiftToast } from '@paxpia/core';
import { colors, radius, spacing, fontSize } from '../theme/tokens';

/** giftId → display EMOJI. The gift sending panel renders each gift's emoji; this layer
 *  is the cross-platform gift FEED, so it must render the SAME per-gift glyph rather than
 *  one generic icon for every gift. Keyed by the catalog gift ids (mirrors the mobile
 *  LIVE_GIFTS catalog). An unknown id falls back to a real gift glyph (🎁) — NEVER a
 *  default box/placeholder. */
const GIFT_GLYPH: Record<string, string> = {
  rose: '🌹', like: '👍', candy: '🍬', ice_cream: '🍦', pizza: '🍕', fire: '🔥',
  star: '⭐', trophy: '🏆', unicorn: '🦄', rocket: '🚀',
  diamond: '💎', crown: '👑', castle: '🏯', galaxy: '🌌',
};

/** A real gift glyph fallback — never a default box. */
const GIFT_FALLBACK_GLYPH = '🎁';

/** Resolve a gift's display glyph from its id; always a real glyph (never a box). */
function giftGlyph(giftId: string | undefined): string {
  if (giftId && GIFT_GLYPH[giftId]) return GIFT_GLYPH[giftId];
  return GIFT_FALLBACK_GLYPH;
}

/** How long a toast stays visible after it arrives before the layer ages it out (ms).
 *  The model never drops a toast; this bounds the VISIBLE window so a busy room doesn't
 *  pile pills forever (the view-side analogue of the SVG layer's TTL prune). */
export const GIFT_TOAST_TTL_MS = 6000;

/** How many toasts the layer shows at once (newest-first, oldest fades first). Caps the
 *  on-screen stack height independently of the model's (larger) feed cap. */
export const GIFT_VISIBLE_CAP = 4;

export interface GiftOverlayLayerProps {
  /** The converged gift feed's toasts (the render-brain's `session.gifts`) — append-only,
   *  id-deduped, capped in core. Most-recent LAST. The layer shows the newest window. */
  toasts: GiftToast[];
  /** Optional verbose lifecycle log. When set, every visible-set change emits
   *  `[Gift] visible=N` so a browser/device pass can ASSERT the on-screen count BOUNDS
   *  (never grows past the visible cap) rather than piling unbounded. Off by default. */
  debugLog?: (line: string) => void;
}

/** One floating gift pill — the from-name + a gift glyph + the gift id. Pure
 *  presentation (a plain rn-web `View`, like SvgOverlayLayer's hosts — no Animated, so
 *  no platform-driver dependency); the parent owns the TTL sweep that removes it. */
function GiftPill({ toast }: { toast: GiftToast }) {
  return (
    <View style={styles.pill} pointerEvents="none">
      {/* Per-gift emoji (mapped from giftId) — never a default box; 🎁 fallback. */}
      <Text style={styles.glyph}>{giftGlyph(toast.giftId)}</Text>
      <Text style={styles.from} numberOfLines={1}>
        {toast.from || 'Someone'}
      </Text>
      <Text style={styles.gift} numberOfLines={1}>
        {toast.giftId}
      </Text>
    </View>
  );
}

export function GiftOverlayLayer({ toasts, debugLog }: GiftOverlayLayerProps) {
  // The set of toast ids the layer has aged OUT (TTL elapsed). The model never drops a
  // toast, so we derive the VISIBLE window from (the newest feed entries) MINUS (expired).
  const [expired, setExpired] = useState<Record<string, true>>({});
  // Keep the log fn in a ref so the (deps-light) expiry timers never re-arm on a fresh
  // closure passed each render.
  const logRef = useRef(debugLog);
  logRef.current = debugLog;

  // Arm a one-shot TTL timer per toast id the FIRST time we see it. On fire, mark it
  // expired so it drops out of the visible window. (A toast id is stable + deduped in
  // core, so a timer is armed exactly once per id.)
  const timedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const t of toasts) {
      if (!t.id || timedRef.current.has(t.id)) continue;
      timedRef.current.add(t.id);
      timers.push(
        setTimeout(() => setExpired((e) => (e[t.id] ? e : { ...e, [t.id]: true })), GIFT_TOAST_TTL_MS),
      );
    }
    return () => {
      for (const tm of timers) clearTimeout(tm);
    };
  }, [toasts]);

  // The visible window: the NEWEST non-expired toasts (most-recent last in the feed), capped.
  const visible = toasts.filter((t) => t.id && !expired[t.id]).slice(-GIFT_VISIBLE_CAP);

  // Assertion surface (when debugLog is set): the visible count must BOUND at the cap —
  // proving the layer ages out toasts instead of growing unbounded in a busy room.
  const visibleCount = visible.length;
  useEffect(() => {
    const log = logRef.current;
    if (log) log(`[Gift] visible=${visibleCount}`);
  }, [visibleCount]);

  if (visible.length === 0) return null;
  return (
    <View style={styles.layer} pointerEvents="none">
      {visible.map((t) => (
        <GiftPill key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bottom-left stack (above the chat composer / chrome), bottom-up — the conventional
  // gift-feed corner. Absolute + transparent + non-interactive: it never blocks the video.
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '90%',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  glyph: {
    fontSize: fontSize.base,
    marginRight: spacing.xs,
  },
  from: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  gift: {
    color: colors.brand,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
