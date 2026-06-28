// MessageComposer — the SHARED chat input bar (rn-web). Template = the mockup's
// MessagesPage input row (+ / image / mic affordances + a rounded input + send).
// Pure & props-driven: it owns ONLY the local draft text + an optional reply banner
// and reports `onSend(text)` / attach intents up. The host owns the actual send
// (optimistic) + media pickers.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/tokens';

export interface ComposerReplyTarget {
  messageId: string;
  label: string;
}

export interface MessageComposerProps {
  onSend: (text: string, replyToId?: string) => void;
  /** Reply banner ("Replying to @x"); host sets/clears it. */
  replyTo?: ComposerReplyTarget | null;
  onCancelReply?: () => void;
  onAttachImage?: () => void;
  onAttachVoice?: () => void;
  onAttachMore?: () => void;
  placeholder?: string;
  /** When false, tapping send prompts sign-in via onRequireAuth. */
  authed?: boolean;
  onRequireAuth?: () => void;
}

export function MessageComposer({
  onSend,
  replyTo,
  onCancelReply,
  onAttachImage,
  onAttachVoice,
  onAttachMore,
  placeholder = 'Message…',
  authed = true,
  onRequireAuth,
}: MessageComposerProps) {
  const [text, setText] = useState('');

  const send = () => {
    const t = text.trim();
    if (!t) return;
    if (!authed) {
      onRequireAuth?.();
      return;
    }
    onSend(t, replyTo?.messageId);
    setText('');
  };

  const canSend = text.trim().length > 0;

  return (
    <View style={styles.root}>
      {replyTo ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} numberOfLines={1}>
            Replying to {replyTo.label}
          </Text>
          <Pressable onPress={onCancelReply} accessibilityLabel="Cancel reply">
            <Text style={styles.bannerClose}>✕</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        {onAttachMore ? (
          <Pressable style={styles.iconBtn} onPress={onAttachMore} accessibilityLabel="More">
            <Text style={styles.icon}>＋</Text>
          </Pressable>
        ) : null}
        {onAttachImage ? (
          <Pressable style={styles.iconBtn} onPress={onAttachImage} accessibilityLabel="Image">
            <Text style={styles.icon}>🖼</Text>
          </Pressable>
        ) : null}
        {onAttachVoice ? (
          <Pressable style={styles.iconBtn} onPress={onAttachVoice} accessibilityLabel="Voice">
            <Text style={styles.icon}>🎤</Text>
          </Pressable>
        ) : null}
        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={authed ? placeholder : 'Sign in to message…'}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            onSubmitEditing={send}
            blurOnSubmit={false}
            onFocus={() => {
              if (!authed) onRequireAuth?.();
            }}
          />
        </View>
        <Pressable
          style={[styles.sendBtn, canSend ? styles.sendBtnOn : styles.sendBtnOff]}
          onPress={send}
          disabled={!canSend}
          accessibilityLabel="Send"
        >
          <Text style={[styles.sendIcon, { color: canSend ? '#fff' : colors.textMuted }]}>➤</Text>
        </Pressable>
      </View>
    </View>
  );
}

const BRAND = colors.brand;

const styles = StyleSheet.create({
  root: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 6 },
  bannerText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  bannerClose: { color: colors.textMuted, fontSize: 14, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', columnGap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18, color: colors.textMuted },
  inputWrap: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  input: { color: colors.text, fontSize: 14, maxHeight: 120, padding: 0 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sendBtnOn: { backgroundColor: BRAND },
  sendBtnOff: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  sendIcon: { fontSize: 15, fontWeight: '700' },
});
