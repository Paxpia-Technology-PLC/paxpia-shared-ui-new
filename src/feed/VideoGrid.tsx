// VideoGrid — the SHARED post-thumbnail grid (rn-web). Template = the mockup's
// `ProfileVideoGrid` (responsive 3:4 tiles) enriched with the like-count overlay
// from the mockup's profile tabs. Pure & props-driven over `@paxpia/core`
// `WatchPost[]`; reports tile taps up. Used for profile video/repost/liked tabs +
// any thumbnail grid surface.

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCount, type WatchPost } from '@paxpia/core';
import { absoluteFill, colors } from '../theme/tokens';

export interface VideoGridProps {
  posts: WatchPost[];
  onPressPost?: (post: WatchPost) => void;
  /** Minimum tile width in px (the grid wraps to fill). Default 160. */
  minTileWidth?: number;
  /** Shown when there are no posts. */
  emptyLabel?: string;
  loading?: boolean;
}

export function VideoGrid({ posts, onPressPost, emptyLabel = 'No videos yet.', loading }: VideoGridProps) {
  if (posts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{loading ? 'Loading…' : emptyLabel}</Text>
      </View>
    );
  }
  return (
    <View style={styles.grid}>
      {posts.map((p) => {
        const cover = p.thumbnailUrl || p.imageUrl;
        return (
          <Pressable key={p.id} style={styles.tile} onPress={() => onPressPost?.(p)}>
            {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={styles.tilePlaceholder} />}
            <View style={styles.tileOverlay}>
              <Text style={styles.tileGlyph}>{p.isImage ? '🖼' : '▶'}</Text>
              <Text style={styles.tileCount}>{formatCount(p.likeCount)}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8 },
  // RNW renders flexBasis percentages; ~3-up at typical profile widths. The host can
  // wrap in a width-constrained container; tiles keep a 3:4 aspect.
  tile: { width: '31.5%', aspectRatio: 3 / 4, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  tilePlaceholder: { ...absoluteFill, backgroundColor: colors.surfaceMuted },
  tileOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', columnGap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.35)' },
  tileGlyph: { color: '#fff', fontSize: 12 },
  tileCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
