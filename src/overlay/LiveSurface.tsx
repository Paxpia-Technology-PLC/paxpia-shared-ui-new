// LiveSurface — the ONE shared "what's behind the overlays" surface (§7b). It is the
// final LiveStream renderer's BASE layer: the gate hands off a connected room, and
// this decides — from the single shared `expectVideo` signal — whether to paint a
// VIDEO surface or a branded AUDIO surface, then stacks the overlay/doc/SVG layer on
// top.
//
//   • expectVideo === true  → the VIDEO surface: the injected `video` node fills the
//     frame (the platform passes its LiveKit video view; this package never imports
//     `livekit-client`). Overlays sit above it.
//   • expectVideo === false → the AUDIO surface: a branded avatar + title (NOT a
//     black "waiting for video" frame). This is the audio-only / jazz docroom shape,
//     where the doc/overlay/SVG layer renders over the avatar surface.
//
// THE PLAIN-FEED FIX (§7b): there is NO mobile-only gradient here. The old mobile
// screen bled a black→transparent gradient onto plain feeds; this shared surface
// paints a flat branded backdrop for the audio case and nothing extra for the video
// case, so the gradient-on-plain-feeds bug can't recur. Nothing paints until the gate
// hands off (§5d), so no stray overlay/gradient appears pre-hand-off either.

import { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';

export interface LiveSurfaceProps {
  /** The single shared signal (from the gate / `manifestHasVideoSource`). True ⇒
   *  video surface; false ⇒ branded audio surface (no boot-loop, no black frame). */
  expectVideo: boolean;
  /** The streamer's display title (feed title) — shown on the audio surface. */
  title?: string;
  /** The streamer's avatar URL — the centre of the audio surface. */
  avatarUri?: string | null;
  /** The streamer's display name — the avatar monogram fallback. */
  name?: string;
  /** The injected VIDEO node (the platform's LiveKit video view). Rendered only when
   *  `expectVideo` is true; never imported here (no `livekit-client` in ui). */
  video?: ReactNode;
  /** The overlay / doc / SVG layer to stack ABOVE the surface (the overlay renderer +
   *  SvgOverlayLayer the shell composes). */
  children?: ReactNode;
}

export function LiveSurface({ expectVideo, title, avatarUri, name, video, children }: LiveSurfaceProps) {
  return (
    <View style={styles.root}>
      {expectVideo ? (
        // VIDEO surface — the injected video node fills the frame.
        <View style={styles.fill}>{video}</View>
      ) : (
        // AUDIO surface — a branded avatar + title (NOT a black waiting frame). A flat
        // backdrop, NO gradient (the plain-feed gradient fix §7b).
        <View style={styles.audioSurface}>
          <Avatar uri={avatarUri} name={name} size={112} ring />
          {title ? (
            <Text style={styles.audioTitle} numberOfLines={2}>
              {title}
            </Text>
          ) : null}
        </View>
      )}
      {/* Overlay / doc / SVG layer, above the surface. box-none so taps fall through
          empty regions to the surface, but a press on an overlay control is owned by
          that control (§6b). */}
      {children ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  fill: { ...StyleSheet.absoluteFillObject },
  audioSurface: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
  },
  audioTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
