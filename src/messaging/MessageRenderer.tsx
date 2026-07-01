// MessageRenderer — the SHARED per-kind message bubble (rn-web), the view half of
// the messaging lift (Stream 1). One dispatcher over `Message.kind` covering all 8
// kinds (text / image / video / voice / video_share / room_invite / call_log /
// system), authored once with RN primitives so web (react-native-web) and mobile
// (RN) render the same bubble. Template = mobile's `MessageBubble` + the frontend's
// `MessageRenderer`, unified.
//
// PURE & PROPS-DRIVEN: it consumes a `@paxpia/core` `Message` + a `mine` flag and
// reports intents up (onPressVideo / onPressRoomInvite / onLongPress / onReplyTap /
// onReactionTap). It owns no data; the host supplies the message + the optimistic
// reducers. call_log / system render as centered chips.

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Message, ReactionSummary } from '@paxpia/core';
import { absoluteFill, colors } from '../theme/tokens';

export interface MessageRendererProps {
  message: Message;
  /** True when the current user is the sender → right-aligned, brand bubble. The
   *  host derives this by comparing `message.sender_id` against the REAL self id —
   *  never a `'me'` literal (the mobile branch's bug this lift fixes). */
  mine: boolean;
  /** Show the sender label (group threads). Resolved name comes via senderLabel. */
  showSender?: boolean;
  /** Resolve a sender id → a display @handle / name (host hydrates). */
  senderLabel?: (userId: string) => string;
  /** Render at reduced opacity for an optimistic / unsent message. */
  pending?: boolean;
  /** For an own (`mine`) message: true once the recipient has READ it → the receipt
   *  renders a double (read) tick vs a single (delivered) tick. The host derives it
   *  from the peer's `last_read_message_id`; core carries no per-message read flag.
   *  Ignored for others' messages. */
  read?: boolean;
  onLongPress?: (m: Message) => void;
  onReactionTap?: (reaction: string) => void;
  onReplyTap?: (replyToMessageId: string) => void;
  onPressVideo?: (m: Message) => void;
  onPressRoomInvite?: (m: Message) => void;
  onPressVideoShare?: (m: Message) => void;
  /** Retry an own message that failed to send (`send_status === 'failed'`). */
  onRetry?: (m: Message) => void;
}

/** The receipt tick for an OWN message, folded from the mobile branch's checkmark:
 *   • sending  → a clock glyph (optimistic, in flight)
 *   • failed   → a retry affordance (tap → onRetry)
 *   • read     → a double tick in the receipt tint
 *   • delivered→ a single tick
 *  Rendered on a white-on-brand bubble, so ticks are light. */
function Receipt({ message, read, onRetry }: { message: Message; read?: boolean; onRetry?: (m: Message) => void }) {
  if (message.send_status === 'sending') {
    return <Text style={styles.receiptMuted}>🕓</Text>;
  }
  if (message.send_status === 'failed') {
    return (
      <Pressable onPress={() => onRetry?.(message)} accessibilityLabel="Retry send" hitSlop={8}>
        <Text style={styles.receiptFailed}>⚠︎ retry</Text>
      </Pressable>
    );
  }
  return <Text style={[styles.receipt, read && styles.receiptRead]}>{read ? '✓✓' : '✓'}</Text>;
}

function fmtTime(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtSecs(ms?: number): string {
  if (!ms) return '';
  return `${Math.round(ms / 1000)}s`;
}

/** Centered system / call-log chip. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.chipRow}>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{children}</Text>
      </View>
    </View>
  );
}

function ReplyQuote({ m, senderLabel }: { m: Message; senderLabel?: (id: string) => string }) {
  const label = senderLabel ? senderLabel(m.sender_id) : `@${m.sender_id.slice(0, 6)}`;
  return (
    <View style={styles.replyQuote}>
      <Text style={styles.replyName} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.replyBody} numberOfLines={1}>
        {m.body_text || `(${m.kind})`}
      </Text>
    </View>
  );
}

function ReactionStrip({ summaries, onTap }: { summaries: ReactionSummary[]; onTap?: (r: string) => void }) {
  if (summaries.length === 0) return null;
  return (
    <View style={styles.reactions}>
      {summaries.map((r) => (
        <Pressable
          key={r.reaction}
          onPress={() => onTap?.(r.reaction)}
          style={[styles.reactionChip, r.viewer_reacted && styles.reactionChipOn]}
        >
          <Text style={styles.reactionText}>
            {r.reaction} {r.count > 1 ? r.count : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function VoiceNote({ durationMs, waveform, tint }: { durationMs?: number; waveform?: number[]; tint: string }) {
  const bars = waveform && waveform.length > 0 ? waveform.slice(0, 32) : Array.from({ length: 24 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 0.7)));
  return (
    <View style={styles.voiceRow}>
      <View style={[styles.voicePlay, { backgroundColor: tint + '33' }]}>
        <Text style={{ color: tint, fontSize: 13 }}>▶</Text>
      </View>
      <View style={styles.voiceBars}>
        {bars.map((amp, i) => (
          <View key={i} style={[styles.voiceBar, { height: 4 + Math.min(20, Math.round(amp * 22)), backgroundColor: tint + '88' }]} />
        ))}
      </View>
      <Text style={[styles.voiceDur, { color: tint }]}>{fmtSecs(durationMs)}</Text>
    </View>
  );
}

/**
 * The shared per-kind message renderer. Dispatches on `message.kind`; tombstoned
 * messages render as a disabled bubble. Reports taps/long-press up.
 */
export function MessageRenderer({
  message,
  mine,
  showSender,
  senderLabel,
  pending,
  read,
  onLongPress,
  onReactionTap,
  onReplyTap,
  onPressVideo,
  onPressRoomInvite,
  onPressVideoShare,
  onRetry,
}: MessageRendererProps) {
  const m = message;

  // call_log / system are centered chips regardless of sender.
  if (m.kind === 'system') return <Chip>{m.body_text ?? ''}</Chip>;
  if (m.kind === 'call_log') {
    const c = m.call_log;
    return (
      <Chip>
        📞 {c?.kind ?? 'call'} · {c?.status ?? 'ended'}
        {c?.duration_ms ? ` · ${fmtSecs(c.duration_ms)}` : ''}
      </Chip>
    );
  }

  const tint = mine ? '#FFFFFF' : colors.text;
  const bubbleStyle = [
    styles.bubble,
    mine ? styles.bubbleMine : styles.bubbleTheirs,
    pending && styles.pending,
    (m.kind === 'image' || m.kind === 'video') && styles.bubbleMedia,
  ];

  let body: React.ReactNode;
  if (m.deleted_for_everyone) {
    body = <Text style={[styles.deleted, { color: tint + '99' }]}>This message was deleted</Text>;
  } else {
    switch (m.kind) {
      case 'text':
        body = <Text style={[styles.text, { color: tint }]}>{m.body_text ?? ''}</Text>;
        break;
      case 'image':
        body = (
          <View style={styles.media}>
            {m.media_url ? <Image source={{ uri: m.media_meta?.thumb_url || m.media_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.placeholder}>📷</Text>}
          </View>
        );
        break;
      case 'video':
        body = (
          <Pressable style={styles.media} onPress={() => onPressVideo?.(m)}>
            {m.media_meta?.thumb_url || m.media_url ? (
              <Image source={{ uri: m.media_meta?.thumb_url || m.media_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}
            <View style={styles.playOverlay}>
              <View style={styles.playBadge}>
                <Text style={{ color: '#fff', fontSize: 22 }}>▶</Text>
              </View>
            </View>
          </Pressable>
        );
        break;
      case 'voice':
        body = <VoiceNote durationMs={m.media_meta?.duration_ms} waveform={m.media_meta?.waveform} tint={tint} />;
        break;
      case 'video_share': {
        const v = m.video_share;
        body = (
          <Pressable style={styles.card} onPress={() => onPressVideoShare?.(m)}>
            <View style={styles.cardThumb}>
              {v?.thumb_url ? <Image source={{ uri: v.thumb_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              <View style={styles.playOverlay}>
                <Text style={{ color: '#fff', fontSize: 24 }}>▶</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{v?.title || 'Shared video'}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{v?.owner_display_name || ''}</Text>
            </View>
          </Pressable>
        );
        break;
      }
      case 'room_invite': {
        const r = m.room_invite;
        const isLive = !!r?.started_at_unix && r.started_at_unix > 0;
        body = (
          <Pressable style={styles.card} onPress={() => onPressRoomInvite?.(m)}>
            <View style={[styles.cardThumb, styles.roomThumb]}>
              {r?.cover_url || r?.host_avatar_url ? <Image source={{ uri: r.cover_url || r.host_avatar_url }} style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} resizeMode="cover" /> : null}
              <Text style={{ color: '#fff', fontSize: 22 }}>📺</Text>
              {isLive ? (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{r?.title || 'Live room'}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {r?.host_display_name || ''}
                {r?.room_kind ? ` · ${r.room_kind}` : ''}
              </Text>
            </View>
          </Pressable>
        );
        break;
      }
      default:
        body = <Text style={[styles.text, { color: tint }]}>{m.body_text ?? `[${m.kind}]`}</Text>;
    }
  }

  return (
    <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      <View style={styles.column}>
        {showSender && !mine ? (
          <Text style={styles.sender} numberOfLines={1}>
            {senderLabel ? senderLabel(m.sender_id) : `@${m.sender_id.slice(0, 8)}`}
          </Text>
        ) : null}
        {m.reply_to ? (
          <Pressable onPress={() => m.reply_to_id && onReplyTap?.(m.reply_to_id)}>
            <ReplyQuote m={m.reply_to} senderLabel={senderLabel} />
          </Pressable>
        ) : null}
        <Pressable onLongPress={() => !m.deleted_for_everyone && onLongPress?.(m)} delayLongPress={300} style={bubbleStyle}>
          {body}
          {m.edited_at_unix ? <Text style={[styles.edited, { color: tint + 'AA' }]}>edited</Text> : null}
        </Pressable>
        <View style={[styles.metaRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
          {!m.deleted_for_everyone ? <Text style={styles.time}>{fmtTime(m.created_at_unix)}</Text> : null}
          {/* Receipt tick — own messages only (folded from the branch's checkmark). */}
          {mine && !m.deleted_for_everyone ? <Receipt message={m} read={read} onRetry={onRetry} /> : null}
        </View>
        <ReactionStrip summaries={m.reactions_summary ?? []} onTap={onReactionTap} />
      </View>
    </View>
  );
}

const BRAND = colors.chatAccent;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 12, marginVertical: 2 },
  column: { maxWidth: '78%' },
  sender: { color: colors.textMuted, fontSize: 11, marginBottom: 2, marginLeft: 8 },

  // Bubble geometry folded from the mobile branch's `ChatMessageBubble`: fully
  // rounded top corners, and a FLAT bottom corner on the sender's side (a subtle
  // chat "tail"). The mine/theirs tint is theme-tokenized (brand vs surfaceMuted).
  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' },
  bubbleMine: { backgroundColor: BRAND, borderBottomRightRadius: 0 },
  bubbleTheirs: { backgroundColor: colors.card, borderBottomLeftRadius: 0 },
  bubbleMedia: { paddingHorizontal: 4, paddingVertical: 4 },
  pending: { opacity: 0.6 },

  text: { fontSize: 15, lineHeight: 20 },
  deleted: { fontSize: 14, fontStyle: 'italic' },
  edited: { fontSize: 10, marginTop: 2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', columnGap: 4, marginTop: 3, paddingHorizontal: 4 },
  time: { color: colors.textMuted, fontSize: 10 },
  // Receipt ticks (own messages). `receipt` tint reads as delivered; `receiptRead`
  // brightens the double-tick to the chat accent; failed uses the live/danger tone.
  receipt: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  receiptRead: { color: colors.receipt },
  receiptMuted: { color: colors.textMuted, fontSize: 10 },
  receiptFailed: { color: colors.live, fontSize: 11, fontWeight: '700' },

  media: { width: 220, aspectRatio: 1.2, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(127,127,127,0.18)', alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontSize: 28, color: colors.textMuted },
  playOverlay: { ...absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },

  card: { width: 240, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(127,127,127,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardThumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  roomThumb: { backgroundColor: '#2A2A4A' },
  cardBody: { padding: 10 },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  cardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  liveBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.live, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  voiceRow: { flexDirection: 'row', alignItems: 'center', minWidth: 180 },
  voicePlay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  voiceBars: { flexDirection: 'row', alignItems: 'center', flex: 1, height: 26 },
  voiceBar: { width: 2, borderRadius: 1, marginHorizontal: 1 },
  voiceDur: { fontSize: 11, marginLeft: 8, minWidth: 28, textAlign: 'right' },

  reactions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  reactionChip: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, backgroundColor: colors.surface },
  reactionChipOn: { backgroundColor: BRAND + '33', borderColor: BRAND },
  reactionText: { fontSize: 12, color: colors.text },

  chipRow: { alignItems: 'center', marginVertical: 8, paddingHorizontal: 24 },
  chip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  chipText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },

  replyQuote: { borderLeftWidth: 3, borderLeftColor: BRAND, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 3 },
  replyName: { color: colors.text, fontSize: 11, fontWeight: '700' },
  replyBody: { color: colors.textMuted, fontSize: 11 },
});
