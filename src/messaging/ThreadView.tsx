// ThreadView — the SHARED chat pane (rn-web): header (avatar + presence + call /
// video / more) + a scrolling message list (per-kind via MessageRenderer) + the
// composer. Template = the mockup's ChatView. Pure & props-driven over a
// `@paxpia/core` `Thread` + its `Message[]`; the host supplies data + send/react
// callbacks. Also exports `MessagesEmptyState` for the no-selection pane.

import { useMemo, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { canPost, dmPeer, threadTitle, type Message, type ParticipantRole, type Thread } from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';
import { ChannelHeader } from './ChannelHeader';
import { MessageRenderer } from './MessageRenderer';
import { MessageComposer, type ComposerReplyTarget } from './MessageComposer';

export interface ThreadViewProps {
  thread: Thread;
  messages: Message[];
  selfId?: string;
  resolveAvatar?: (t: Thread) => string | undefined;
  senderLabel?: (userId: string) => string;
  onBack?: () => void;
  onSend: (text: string, replyToId?: string) => void;
  onReact?: (messageId: string, reaction: string, currentlyReacted: boolean) => void;
  onLongPressMessage?: (m: Message) => void;
  onPressVideo?: (m: Message) => void;
  onPressRoomInvite?: (m: Message) => void;
  onPressVideoShare?: (m: Message) => void;
  onCall?: (kind: 'voice' | 'video') => void;
  /** The caller's role in this thread. Gates the composer: a channel `member` can
   *  read + react but NOT post (plan §1a) → a read-only notice replaces the input.
   *  dm/group always post. Also drives the channel header's broadcast affordance. */
  callerRole?: ParticipantRole | string;
  /** Channel only: open the broadcast composer (owner/admin). Optional — when omitted
   *  the always-visible composer IS the post affordance, so no separate button shows. */
  onBroadcast?: () => void;
  /** Open thread / channel info (header tap → e.g. member management). */
  onInfo?: () => void;
  onLoadOlder?: () => void;
  replyTo?: ComposerReplyTarget | null;
  onReply?: (m: Message) => void;
  onCancelReply?: () => void;
  authed?: boolean;
  onRequireAuth?: () => void;
  /** Retry an own message that failed to send (`send_status === 'failed'`). */
  onRetry?: (m: Message) => void;
  /** Fire a light haptic on send (mobile injects the native impact; web no-ops). */
  onHapticSend?: () => void;
  /** Composer visual variant — 'overlay' for the compact live-stream chat input. */
  composerVariant?: 'default' | 'overlay';
}

interface ThreadRow {
  m: Message;
  showSender: boolean;
}

export function ThreadView({
  thread,
  messages,
  selfId,
  resolveAvatar,
  senderLabel,
  onBack,
  onSend,
  onReact,
  onLongPressMessage,
  onPressVideo,
  onPressRoomInvite,
  onPressVideoShare,
  onCall,
  callerRole,
  onBroadcast,
  onInfo,
  onLoadOlder,
  replyTo,
  onCancelReply,
  authed = true,
  onRequireAuth,
  onRetry,
  onHapticSend,
  composerVariant = 'default',
}: ThreadViewProps) {
  const listRef = useRef<FlatList<ThreadRow>>(null);
  const peer = dmPeer(thread, selfId);
  const online = peer?.is_online ?? false;
  const title = threadTitle(thread, selfId);
  const isGroup = thread.kind === 'group';
  const isChannel = thread.kind === 'channel';
  // Posting gate (plan §1a): a channel `member` reads + reacts but cannot post → we
  // swap the composer for a read-only notice; dm/group always post. The server
  // re-enforces this (403 `channel_readonly`), so this is UX, not security.
  const canWrite = isChannel ? canPost('channel', callerRole) : true;

  // Read-receipt boundary for OWN messages: the id the OTHER side has read up to.
  // In a DM that's the peer's `last_read_message_id`; in a group we take the
  // furthest-read id across everyone but self (i.e. read once ANY recipient has).
  // Everything sent at-or-before that id, by us, shows a double (read) tick.
  const readUpToId = useMemo(() => {
    const others = (thread.participants ?? []).filter((p) => p.user_id !== selfId);
    for (let i = messages.length - 1; i >= 0; i--) {
      if (others.some((p) => p.last_read_message_id === messages[i].id)) return messages[i].id;
    }
    return undefined;
  }, [thread.participants, messages, selfId]);

  const readIndex = useMemo(
    () => (readUpToId ? messages.findIndex((m) => m.id === readUpToId) : -1),
    [messages, readUpToId],
  );

  // Precompute show-sender flags (group threads, first of a run from a sender).
  const rows = useMemo<ThreadRow[]>(
    () =>
      messages.map((m, i) => {
        const prev = messages[i - 1];
        const showSender = isGroup && (!prev || prev.sender_id !== m.sender_id);
        return { m, showSender };
      }),
    [messages, isGroup],
  );

  return (
    <View style={styles.root}>
      {isChannel ? (
        // A broadcast channel gets its own header (subscriber count + 📢 + owner/admin
        // broadcast affordance) instead of the DM/group presence header.
        <ChannelHeader
          thread={thread}
          selfId={selfId}
          callerRole={callerRole}
          resolveAvatar={resolveAvatar}
          onBack={onBack}
          onBroadcast={onBroadcast}
          onInfo={onInfo}
        />
      ) : (
        <Pressable style={styles.header} onPress={onInfo} disabled={!onInfo} accessibilityLabel="Conversation info">
          {onBack ? (
            <Pressable style={styles.iconBtn} onPress={onBack} accessibilityLabel="Back">
              <Text style={styles.icon}>‹</Text>
            </Pressable>
          ) : null}
          <Avatar uri={resolveAvatar?.(thread) ?? thread.avatar_url} name={title} size={40} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.headerSub, online && styles.headerSubOnline]}>{online ? 'Active now' : isGroup ? `${thread.participants?.length ?? 0} members` : 'Offline'}</Text>
          </View>
          <View style={styles.headerActions}>
            {onCall ? (
              <>
                <Pressable style={styles.iconBtn} onPress={() => onCall('voice')} accessibilityLabel="Call">
                  <Text style={styles.icon}>📞</Text>
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => onCall('video')} accessibilityLabel="Video call">
                  <Text style={styles.icon}>📹</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </Pressable>
      )}

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={rows}
        keyExtractor={(r) => r.m.id}
        onEndReachedThreshold={0.1}
        renderItem={({ item, index }) => (
          <MessageRenderer
            message={item.m}
            mine={!!selfId && item.m.sender_id === selfId}
            showSender={item.showSender}
            senderLabel={senderLabel}
            pending={item.m.id.startsWith('optimistic-') || item.m.send_status === 'sending'}
            read={readIndex >= 0 && index <= readIndex}
            onReactionTap={(r) => onReact?.(item.m.id, r, !!item.m.reactions_summary?.find((x) => x.reaction === r)?.viewer_reacted)}
            onLongPress={onLongPressMessage}
            onPressVideo={onPressVideo}
            onPressRoomInvite={onPressRoomInvite}
            onPressVideoShare={onPressVideoShare}
            onRetry={onRetry}
          />
        )}
        onScroll={({ nativeEvent }) => {
          // Top of the (top-down) list → load older history.
          if (nativeEvent.contentOffset.y <= 8) onLoadOlder?.();
        }}
        scrollEventThrottle={200}
        ListEmptyComponent={
          <View style={styles.emptyThread}>
            <Text style={styles.emptyThreadText}>Say hi 👋</Text>
          </View>
        }
      />

      {canWrite ? (
        <MessageComposer
          onSend={onSend}
          replyTo={replyTo}
          onCancelReply={onCancelReply}
          authed={authed}
          onRequireAuth={onRequireAuth}
          onHaptic={onHapticSend}
          variant={composerVariant}
          onAttachImage={() => {}}
          onAttachVoice={() => {}}
          onAttachMore={() => {}}
        />
      ) : (
        // Channel member (read-only): the server would 403 a post, so we don't show
        // an input — a passive notice instead. They can still react (MessageRenderer).
        <View style={styles.readOnly}>
          <Text style={styles.readOnlyText}>🔒 Only admins can post in this channel</Text>
        </View>
      )}
    </View>
  );
}

/** The empty-pane shown when no conversation is selected (mockup EmptyState). */
export function MessagesEmptyState() {
  return (
    <View style={styles.emptyPane}>
      <View style={styles.emptyIcon}>
        <Text style={{ fontSize: 26 }}>✉️</Text>
      </View>
      <Text style={styles.emptyTitle}>Your messages</Text>
      <Text style={styles.emptySub}>Select a conversation to start messaging</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerText: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  headerSub: { color: colors.textMuted, fontSize: 12 },
  headerSubOnline: { color: '#22c55e' },
  headerActions: { flexDirection: 'row', columnGap: 4 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20, color: colors.text },

  list: { flex: 1 },
  listContent: { paddingVertical: 16 },
  emptyThread: { padding: 48, alignItems: 'center' },
  emptyThreadText: { color: colors.textMuted, fontSize: 14 },

  // Channel read-only notice (shown to a channel `member` in place of the composer).
  readOnly: { paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  readOnlyText: { color: colors.textMuted, fontSize: 13 },

  emptyPane: { flex: 1, alignItems: 'center', justifyContent: 'center', rowGap: 12, backgroundColor: colors.surface },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 220 },
});
