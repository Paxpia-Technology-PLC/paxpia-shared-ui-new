// ChannelHeader — the SHARED header for a `channel` (broadcast) thread (rn-web):
// avatar + title (+ verified) + subscriber count, and a BROADCAST affordance that
// only owner/admin see (a channel `member` reads + reacts but cannot post — plan
// §1a). Pure & PROPS-DRIVEN over a `@paxpia/core` `Thread`; posting authority is
// decided by core's `canPost(thread.kind, callerRole)` — the same gate the server
// mirrors — so the compose button is hidden for exactly the roles the API would
// 403. It owns no data; the host wires the callbacks. (For a `dm`/`group` header,
// use ThreadView's own header; this is the channel-specific chrome.)

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canPost, threadTitle, type ParticipantRole, type Thread } from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';

export interface ChannelHeaderProps {
  thread: Thread;
  selfId?: string;
  /** The caller's role in this channel — gates the broadcast affordance. */
  callerRole?: ParticipantRole | string;
  resolveAvatar?: (t: Thread) => string | undefined;
  /** Is this channel verified? (core carries no flag — host resolves it.) */
  verified?: boolean;
  onBack?: () => void;
  /** Open the broadcast composer (owner/admin only). */
  onBroadcast?: () => void;
  /** Open channel info / member management. */
  onInfo?: () => void;
  /** Subscriber count override; defaults to the thread's participant count. */
  subscriberCount?: number;
}

export function ChannelHeader({
  thread,
  selfId,
  callerRole,
  resolveAvatar,
  verified = false,
  onBack,
  onBroadcast,
  onInfo,
  subscriberCount,
}: ChannelHeaderProps) {
  const title = threadTitle(thread, selfId);
  const count = subscriberCount ?? thread.participants?.length ?? 0;
  const mayBroadcast = canPost(thread.kind, callerRole);

  return (
    <View style={styles.root}>
      {onBack ? (
        <Pressable style={styles.iconBtn} onPress={onBack} accessibilityLabel="Back">
          <Text style={styles.icon}>‹</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.identity} onPress={onInfo} accessibilityLabel="Channel info">
        <Avatar uri={resolveAvatar?.(thread) ?? thread.avatar_url} name={title} size={40} />
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {verified ? <Text style={styles.verified}> ✓</Text> : null}
            <Text style={styles.broadcastTag}> 📢</Text>
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {count} {count === 1 ? 'subscriber' : 'subscribers'}
            {thread.notification_muted ? ' · muted' : ''}
          </Text>
        </View>
      </Pressable>
      <View style={styles.actions}>
        {mayBroadcast && onBroadcast ? (
          <Pressable style={styles.broadcastBtn} onPress={onBroadcast} accessibilityLabel="Broadcast a message">
            <Text style={styles.broadcastBtnText}>📢 Broadcast</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const BRAND = colors.chatAccent;

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.surface },
  iconBtn: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20, color: colors.text },
  identity: { flexDirection: 'row', alignItems: 'center', columnGap: 12, flex: 1 },
  text: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  verified: { color: colors.chatAccent, fontSize: 12, fontWeight: '800' },
  broadcastTag: { fontSize: 12 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  broadcastBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: BRAND },
  broadcastBtnText: { color: colors.brandText, fontSize: 12, fontWeight: '700' },
});
