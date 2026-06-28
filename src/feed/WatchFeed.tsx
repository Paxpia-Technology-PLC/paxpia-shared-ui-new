// WatchFeed — the SHARED vertical watch feed (rn-web). Template = the mockup's
// For-You feed: a snap-scrolling column of full-bleed posts, each with a caption +
// author overlay and a right-side action rail (like / comment / share / save). Pure
// & props-driven over `@paxpia/core` `WatchPost[]`.
//
// PLAYBACK is platform-specific (web `<video>` vs mobile `ReelVideo`/expo-av), so
// the actual media surface is injected via `renderMedia(post, active)` — the shared
// component owns the layout, overlay, action rail, and the active-index tracking;
// the platform owns the decoder. When `renderMedia` is omitted it falls back to a
// static thumbnail (so the feed still renders without a player wired).

import { useCallback, useRef, useState } from 'react';
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatCount, type WatchPost } from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { absoluteFill, colors } from '../theme/tokens';

export interface WatchFeedProps {
  posts: WatchPost[];
  /** Inject the platform video/image surface for a post. `active` is true for the
   *  post currently in view (so the platform can play only it). */
  renderMedia?: (post: WatchPost, active: boolean) => React.ReactNode;
  resolveAvatar?: (post: WatchPost) => string | undefined;
  liked?: Record<string, boolean>;
  saved?: Record<string, boolean>;
  onPressAuthor?: (post: WatchPost) => void;
  onLike?: (post: WatchPost) => void;
  onComment?: (post: WatchPost) => void;
  onShare?: (post: WatchPost) => void;
  onSave?: (post: WatchPost) => void;
  /** Near-end → fetch the next page. */
  onEndReached?: () => void;
  /** Fixed height of each page; defaults to filling the parent (use a fixed value
   *  on web where 100% of an unsized parent is 0). */
  itemHeight?: number;
}

export function WatchFeed({
  posts,
  renderMedia,
  resolveAvatar,
  liked = {},
  saved = {},
  onPressAuthor,
  onLike,
  onComment,
  onShare,
  onSave,
  onEndReached,
  itemHeight,
}: WatchFeedProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [pageH, setPageH] = useState(itemHeight ?? 0);
  const endFired = useRef(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const measured = layoutMeasurement.height || pageH;
      const h = itemHeight ?? measured;
      if (h > 0) setActiveIdx(Math.round(contentOffset.y / h));
      // Near the end → page in more (once per threshold crossing).
      if (contentOffset.y + layoutMeasurement.height >= contentSize.height - layoutMeasurement.height * 1.5) {
        if (!endFired.current) {
          endFired.current = true;
          onEndReached?.();
        }
      } else {
        endFired.current = false;
      }
    },
    [itemHeight, pageH, onEndReached],
  );

  return (
    <ScrollView
      style={styles.root}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onLayout={(e) => {
        if (!itemHeight) setPageH(e.nativeEvent.layout.height);
      }}
    >
      {posts.map((post, i) => {
        const h = itemHeight ?? (pageH || undefined);
        const active = i === activeIdx;
        const isLiked = liked[post.id];
        const isSaved = saved[post.id];
        return (
          <View key={post.id} style={[styles.page, h ? { height: h } : null]}>
            <View style={styles.media}>
              {renderMedia ? (
                renderMedia(post, active)
              ) : post.thumbnailUrl || post.imageUrl ? (
                <Image source={{ uri: post.thumbnailUrl || post.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={styles.mediaPlaceholder} />
              )}

              {/* Caption + author overlay */}
              <View style={styles.captionOverlay}>
                <Pressable onPress={() => onPressAuthor?.(post)}>
                  <Text style={styles.handle}>@{post.username || post.authorId.slice(0, 8)}</Text>
                </Pressable>
                {post.caption ? (
                  <Text style={styles.caption} numberOfLines={2}>
                    {post.caption}
                  </Text>
                ) : null}
                {post.tags.length > 0 ? (
                  <View style={styles.tags}>
                    {post.tags.slice(0, 4).map((t) => (
                      <Text key={t} style={styles.tag}>
                        #{t}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* Action rail */}
              <View style={styles.rail}>
                <Pressable style={styles.railAvatar} onPress={() => onPressAuthor?.(post)}>
                  <Avatar uri={resolveAvatar?.(post) ?? post.avatarUrl} name={post.displayName || post.username} size={48} ring />
                </Pressable>
                <RailButton glyph={isLiked ? '❤️' : '🤍'} label={formatCount(post.likeCount + (isLiked ? 1 : 0))} onPress={() => onLike?.(post)} />
                <RailButton glyph="💬" label={formatCount(post.commentCount)} onPress={() => onComment?.(post)} />
                <RailButton glyph="↪" label="Share" onPress={() => onShare?.(post)} />
                <RailButton glyph={isSaved ? '🔖' : '🏷'} label="Save" onPress={() => onSave?.(post)} />
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function RailButton({ glyph, label, onPress }: { glyph: string; label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.railBtn} onPress={onPress}>
      <Text style={styles.railGlyph}>{glyph}</Text>
      <Text style={styles.railLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  media: { width: '100%', height: '100%', maxWidth: 480, backgroundColor: '#000', position: 'relative' },
  mediaPlaceholder: { ...absoluteFill, backgroundColor: '#111' },
  captionOverlay: { position: 'absolute', left: 0, right: 64, bottom: 0, padding: 20, rowGap: 6 },
  handle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  caption: { color: '#e0e0e0', fontSize: 14, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6 },
  tag: { color: colors.brand, fontSize: 13, fontWeight: '500' },
  rail: { position: 'absolute', right: 8, bottom: 24, alignItems: 'center', rowGap: 18 },
  railAvatar: { marginBottom: 4 },
  railBtn: { alignItems: 'center', rowGap: 2 },
  railGlyph: { fontSize: 26 },
  railLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
