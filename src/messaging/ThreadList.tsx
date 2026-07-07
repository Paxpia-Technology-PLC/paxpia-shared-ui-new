// ThreadList — the SHARED conversation list (rn-web). Template = the mockup's
// `ConversationList` (search box + online strip + rows with unread badge + last-
// message preview). Pure & props-driven: it renders `@paxpia/core` `Thread[]` + an
// active id, and reports selection + the search query up. Identity (title/avatar/
// preview) is derived via core's `threadTitle`/`messagePreview` so it never shows a
// raw UUID; the host injects the avatar fallback through each thread's `avatar_url`.

import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { messagePreview, threadTitle, type Thread } from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';

export interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string | null;
  selfId?: string;
  /** Local filter text (host owns it so it can scope account-search too). */
  searchQuery?: string;
  onSearch?: (q: string) => void;
  onSelect: (thread: Thread) => void;
  /** Tap the new-conversation (+) affordance. */
  onNewThread?: () => void;
  /** Resolve a thread's avatar url (host applies resolveAvatarUrl). Falls back to
   *  the thread's own `avatar_url`. */
  resolveAvatar?: (t: Thread) => string | undefined;
  /** Header title (default "Messages"). */
  title?: string;
  /** Is this thread PINNED to the top? core carries no pin flag on Thread, so the
   *  host drives it (from its own pin set). Pinned rows sort first + show a pin. */
  isPinned?: (t: Thread) => boolean;
  /** Is the (DM peer / channel) VERIFIED? core carries no verified flag, so the host
   *  resolves it (from the social profile). Shows a verified check by the title. */
  isVerified?: (t: Thread) => boolean;
}

export function ThreadList({
  threads,
  activeThreadId,
  selfId,
  searchQuery = '',
  onSearch,
  onSelect,
  onNewThread,
  resolveAvatar,
  title = 'Messages',
  isPinned,
  isVerified,
}: ThreadListProps) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q ? threads.filter((t) => threadTitle(t, selfId).toLowerCase().includes(q)) : threads;
    if (!isPinned) return base;
    // Pinned threads float to the top; within each group keep the incoming order
    // (host sorts by recency). Stable partition, not a full re-sort.
    const pinned = base.filter((t) => isPinned(t));
    const rest = base.filter((t) => !isPinned(t));
    return [...pinned, ...rest];
  }, [threads, searchQuery, selfId, isPinned]);

  const online = useMemo(
    () => threads.filter((t) => (t.participants ?? []).some((p) => p.user_id !== selfId && p.is_online)),
    [threads, selfId],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{title}</Text>
          {onNewThread ? (
            <Pressable style={styles.newBtn} onPress={onNewThread} accessibilityLabel="New message">
              <Text style={styles.newBtnText}>＋</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={onSearch}
            placeholder="Search messages…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      {online.length > 0 ? (
        <View style={styles.onlineStrip}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={online}
            keyExtractor={(t) => `o-${t.id}`}
            renderItem={({ item }) => (
              <Pressable style={styles.onlineItem} onPress={() => onSelect(item)}>
                <Avatar uri={resolveAvatar?.(item) ?? item.avatar_url} name={threadTitle(item, selfId)} size={52} ring />
                <Text style={styles.onlineName} numberOfLines={1}>
                  {threadTitle(item, selfId).split(' ')[0]}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const active = item.id === activeThreadId;
          const unread = item.unread_count > 0;
          const muted = !!item.notification_muted;
          const pinned = isPinned?.(item) ?? false;
          const verified = isVerified?.(item) ?? false;
          // Online = any NON-self participant currently online (folded from the
          // branch's `is_online` dot; derived from core `Participant.is_online`).
          const online = (item.participants ?? []).some((p) => p.user_id !== selfId && p.is_online);
          // Show a receipt tick when the LAST message is ours (delivered/read).
          const lastMine = !!selfId && item.last_message?.sender_id === selfId;
          return (
            <Pressable style={[styles.rowOuter, active && styles.rowActive]} onPress={() => onSelect(item)}>
              <View>
                <Avatar uri={resolveAvatar?.(item) ?? item.avatar_url} name={threadTitle(item, selfId)} size={52} />
                {online ? <View style={styles.onlineDot} /> : null}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <View style={styles.titleWrap}>
                    <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]} numberOfLines={1}>
                      {threadTitle(item, selfId)}
                    </Text>
                    {verified ? <Text style={styles.verified}> ✓</Text> : null}
                    {muted ? <Text style={styles.muteIcon}> 🔕</Text> : null}
                  </View>
                  <Text style={styles.rowTime}>{relTime(item.last_message_at_unix)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={[styles.rowPreview, unread && !muted && styles.rowPreviewUnread]} numberOfLines={1}>
                    {lastMine ? '✓ ' : ''}
                    {messagePreview(item.last_message)}
                  </Text>
                  <View style={styles.rowTrailing}>
                    {pinned ? <Text style={styles.pinIcon}>📌</Text> : null}
                    {unread ? (
                      <View style={[styles.unreadBadge, muted && styles.unreadBadgeMuted]}>
                        <Text style={[styles.unreadText, muted && styles.unreadTextMuted]}>{item.unread_count}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No conversations</Text>
          </View>
        }
      />
    </View>
  );
}

function relTime(unix: number): string {
  if (!unix) return '';
  const s = Math.floor(Date.now() / 1000 - unix);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const BRAND = colors.chatAccent;

const styles = StyleSheet.create({
  root: { width: 300, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border, backgroundColor: colors.surface, flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  newBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: colors.text, fontSize: 18 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, columnGap: 8 },
  searchIcon: { fontSize: 13, color: colors.textMuted },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },

  onlineStrip: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  onlineItem: { alignItems: 'center', marginRight: 16, width: 56 },
  onlineName: { color: colors.textMuted, fontSize: 11, marginTop: 4, maxWidth: 52 },

  list: { flex: 1 },
  rowOuter: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 16, paddingVertical: 12, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  rowActive: { backgroundColor: colors.surfaceMuted, borderLeftColor: BRAND },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  titleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '500', flexShrink: 1 },
  rowTitleUnread: { fontWeight: '700' },
  verified: { color: colors.chatAccent, fontSize: 12, fontWeight: '800' },
  muteIcon: { fontSize: 11, color: colors.textMuted },
  rowTime: { color: colors.textMuted, fontSize: 11, marginLeft: 6 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowPreview: { color: colors.textMuted, fontSize: 13, flex: 1 },
  rowPreviewUnread: { color: colors.text, fontWeight: '600' },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', columnGap: 6, marginLeft: 6 },
  pinIcon: { fontSize: 11 },
  // Presence dot — folded from the branch's `onlineIndicator`, ringed by the surface.
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.surface },
  unreadBadge: { minWidth: 18, height: 18, borderRadius: 999, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  // A muted thread's unread badge reads as a quiet count, not an alert.
  unreadBadgeMuted: { backgroundColor: colors.surfaceMuted },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  unreadTextMuted: { color: colors.textMuted },

  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
