// StreamStatus — the ONE shared "room status" screen for the blocking, non-live states
// of a live room: {not-found, offline, error} (plus connecting/reconnecting/unavailable),
// with Retry + Go-home actions. It centralizes what MOBILE already has (LiveStatusOverlay)
// but WEB lacks: web's StreamView re-derived ad-hoc booleans per screen and often just sat
// on a black frame. This shell renders PURELY from the core RoomStatus model, so both
// platforms show the SAME chrome for the SAME state (#9, SHARED-LIFT-BACKLOG §New shared).
//
// It models its states off @paxpia/core's `RoomStatus` (deriveRoomStatus) + the disconnect
// taxonomy (classifyDisconnect): the caller passes the derived `status`; we map it to copy
// + which actions to offer. `canRejoin(status)` decides the Retry button; a Go-home action
// is offered for the terminal states so a dead/missing room isn't a one-way street.
//
// PURE presentational rn-web (View/Text/Pressable + StyleSheet), self-contained (no
// app theme/store, no icon lib — emoji glyphs keep it bundler-free). Mobile mounts it in
// LivestreamViewerScreen (retiring the local LiveStatusOverlay); web mounts it in
// StreamView/StreamWatch as the connection-chrome overlay.

import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { canRejoin, type RoomStatus } from '@paxpia/core';
import { colors } from '../theme/tokens';

/** The status set this shell paints. A superset of core's `RoomStatus` blocking states
 *  plus `'not-found'` — the "this room/stream id doesn't exist" case web hits on a bad
 *  deep-link, which has no LiveKit ConnectionState to derive from. Callers that only have
 *  a `RoomStatus` pass it straight through; the deep-link/404 path passes `'not-found'`. */
export type StreamStatusKind = RoomStatus | 'not-found';

export interface StreamStatusProps {
  /** The status to render. Derive from `@paxpia/core` `deriveRoomStatus(...)` for live
   *  rooms, or pass `'not-found'` for a missing/404 room id. `'live'`/`'idle'` render
   *  nothing (the room is fine / nothing started). */
  status: StreamStatusKind;
  /** Re-attempt the connection (the host's retry/reconnect). Shown as the PRIMARY action
   *  for the rejoinable terminal/failed states (offline/unavailable/error/not-found). */
  onRetry?: () => void;
  /** Leave to home/feed (host navigation). Shown as a SECONDARY action for the terminal
   *  states so a dead/missing room isn't a dead end. */
  onHome?: () => void;
  /** Override the default subtitle copy for the current state (e.g. surface a backend
   *  error reason). When omitted the built-in per-state copy is used. */
  message?: string;
  /** When false, the `'connecting'` state renders nothing — for hosts that show their own
   *  preparing UI (e.g. the EntryGate). Default true. */
  showConnecting?: boolean;
}

interface StatusUI {
  spinner: boolean;
  glyph?: string;
  title: string;
  subtitle?: string;
  /** Primary (retry) action label. Absent ⇒ no retry button even if onRetry is supplied. */
  retryLabel?: string;
}

/** Map a status to its copy + which affordances it wants. The retry button is gated BOTH
 *  on a `retryLabel` here AND on `canRejoin(status)` (core's terminal/failed predicate) so
 *  the "offer a manual rejoin" decision stays owned by core, not re-derived in the view. */
function uiFor(status: StreamStatusKind): StatusUI | null {
  switch (status) {
    case 'connecting':
      return { spinner: true, title: 'Connecting…' };
    case 'reconnecting':
      return {
        spinner: true,
        title: 'Reconnecting…',
        subtitle: 'The connection dropped — trying to restore it automatically.',
      };
    case 'not-found':
      return {
        spinner: false,
        glyph: '🔍',
        title: 'Stream not found',
        subtitle: "This stream doesn't exist or the link is no longer valid.",
        retryLabel: 'Try again',
      };
    case 'unavailable':
      return {
        spinner: false,
        glyph: '📡',
        title: 'Stream unavailable',
        subtitle: 'This live stream has ended or is no longer available.',
        retryLabel: 'Try again',
      };
    case 'offline':
      return {
        spinner: false,
        glyph: '🔌',
        title: 'Connection lost',
        subtitle: "You're no longer connected to this stream. Check your network and reconnect.",
        retryLabel: 'Reconnect',
      };
    case 'error':
      return {
        spinner: false,
        glyph: '⚠️',
        title: "Couldn't connect",
        subtitle: 'Something went wrong joining this stream.',
        retryLabel: 'Try again',
      };
    // 'live' and 'idle' render nothing.
    default:
      return null;
  }
}

/**
 * StreamStatus — the shared room-status screen. Renders nothing for `'live'`/`'idle'`.
 * For the blocking states it shows a centered glyph/spinner + title + subtitle and, for the
 * rejoinable terminal states, a Retry primary + Go-home secondary. Both web and mobile
 * mount this same component over the (black) video surface.
 */
export function StreamStatus({
  status,
  onRetry,
  onHome,
  message,
  showConnecting = true,
}: StreamStatusProps) {
  const ui = useMemo(() => uiFor(status), [status]);
  if (status === 'connecting' && !showConnecting) return null;
  if (!ui) return null;

  // Core owns the "can the user manually rejoin?" decision. `'not-found'` isn't a
  // RoomStatus, so treat it as rejoinable (a refetch can resolve a transient 404).
  const rejoinable = status === 'not-found' || canRejoin(status as RoomStatus);
  const showRetry = !!ui.retryLabel && !!onRetry && rejoinable;
  const showHome = !ui.spinner && !!onHome;
  const subtitle = message ?? ui.subtitle;

  // Spinner states stay fully pass-through (live controls keep working while
  // (re)connecting); terminal states use 'box-none' so the dim backdrop paints but only
  // the buttons capture touches.
  return (
    <View style={styles.overlay} pointerEvents={ui.spinner ? 'none' : 'box-none'}>
      {ui.spinner ? (
        <ActivityIndicator color={colors.text} />
      ) : ui.glyph ? (
        <Text style={styles.glyph}>{ui.glyph}</Text>
      ) : null}

      <Text style={styles.title}>{ui.title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {showRetry || showHome ? (
        <View style={styles.actions}>
          {showRetry ? (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={onRetry}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={ui.retryLabel}
            >
              <Text style={styles.primaryText}>{ui.retryLabel}</Text>
            </Pressable>
          ) : null}
          {showHome ? (
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={onHome}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go home"
            >
              <Text style={styles.secondaryText}>Go home</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 10,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  glyph: { fontSize: 44, marginBottom: 2 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 360,
  },
  actions: { flexDirection: 'row', alignItems: 'center', columnGap: 10, marginTop: 8 },
  primaryBtn: {
    backgroundColor: colors.text,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryText: { color: '#03151A', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
