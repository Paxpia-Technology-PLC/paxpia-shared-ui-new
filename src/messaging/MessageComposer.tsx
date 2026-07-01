// MessageComposer — the SHARED chat input bar (rn-web). Layout folded from the
// mobile branch's `ChatComposer` (emoji + rounded input + attach inside a pill, a
// mic⇄send toggle button) unified with the existing attach/reply seams. Pure &
// props-driven: it owns ONLY the local draft text + an optional reply banner and
// reports `onSend(text)` / attach / voice-record intents up. The host owns the
// actual send (optimistic), the media pickers, and — via the injected `onHaptic`
// seam — any NATIVE haptic (the branch's `ReactNativeHapticFeedback` import lives
// in the mobile host now, NOT in this platform-free component).

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
  /** Start a voice-note recording (the mic affordance when the input is empty). */
  onAttachVoice?: () => void;
  onAttachMore?: () => void;
  /** Open the emoji picker (host owns the sheet). Shows the emoji affordance. */
  onEmoji?: () => void;
  /** Fired as the draft goes non-empty ↔ empty (drives WS typing indicators). */
  onTypingChange?: (typing: boolean) => void;
  placeholder?: string;
  /** When false, tapping send prompts sign-in via onRequireAuth. */
  authed?: boolean;
  onRequireAuth?: () => void;
  /** INJECTED native haptic seam (web-safe): mobile passes the real impact trigger;
   *  web/default is a no-op. Called on a successful send. NEVER import a native
   *  haptic module in this component. */
  onHaptic?: () => void;
  /** Visual variant: 'default' = the full-surface message bar; 'overlay' = the
   *  compact, transparent input for the live-stream chat overlay. */
  variant?: 'default' | 'overlay';
}

export function MessageComposer({
  onSend,
  replyTo,
  onCancelReply,
  onAttachImage,
  onAttachVoice,
  onAttachMore,
  onEmoji,
  onTypingChange,
  placeholder = 'Message…',
  authed = true,
  onRequireAuth,
  onHaptic,
  variant = 'default',
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const overlay = variant === 'overlay';

  const setDraft = (v: string) => {
    setText(v);
    onTypingChange?.(v.trim().length > 0);
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    if (!authed) {
      onRequireAuth?.();
      return;
    }
    onHaptic?.();
    onSend(t, replyTo?.messageId);
    setText('');
    onTypingChange?.(false);
  };

  const canSend = text.trim().length > 0;

  return (
    <View style={[styles.root, overlay && styles.rootOverlay]}>
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
        {onAttachMore && !overlay ? (
          <Pressable style={styles.iconBtn} onPress={onAttachMore} accessibilityLabel="More">
            <Text style={styles.icon}>＋</Text>
          </Pressable>
        ) : null}
        <View style={[styles.inputWrap, overlay && styles.inputWrapOverlay]}>
          {onEmoji ? (
            <Pressable style={styles.pillIcon} onPress={onEmoji} accessibilityLabel="Emoji">
              <Text style={styles.icon}>🙂</Text>
            </Pressable>
          ) : null}
          <TextInput
            value={text}
            onChangeText={setDraft}
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
          {onAttachImage && !overlay ? (
            <Pressable style={styles.pillIcon} onPress={onAttachImage} accessibilityLabel="Image">
              <Text style={styles.icon}>🖼</Text>
            </Pressable>
          ) : null}
          {onAttachMore ? (
            <Pressable style={styles.pillIcon} onPress={onAttachMore} accessibilityLabel="Attach">
              <Text style={styles.icon}>📎</Text>
            </Pressable>
          ) : null}
        </View>
        {/* Mic⇄Send toggle (folded from the branch): mic when the draft is empty
            (tap → onAttachVoice), send when there's text. */}
        <Pressable
          style={[styles.sendBtn, canSend ? styles.sendBtnOn : styles.sendBtnMic]}
          onPress={canSend ? send : onAttachVoice}
          accessibilityLabel={canSend ? 'Send' : 'Record voice message'}
        >
          <Text style={[styles.sendIcon, { color: '#fff' }]}>{canSend ? '➤' : '🎤'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const BRAND = colors.brand;
const ACCENT = colors.chatAccent;

const styles = StyleSheet.create({
  root: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  rootOverlay: { borderTopWidth: 0, backgroundColor: 'transparent' },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 6 },
  bannerText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  bannerClose: { color: colors.textMuted, fontSize: 14, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', columnGap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18, color: colors.textMuted },
  // The input is a rounded pill with inline emoji / attach icons (branch look).
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', columnGap: 4, backgroundColor: colors.surfaceMuted, borderRadius: 24, paddingHorizontal: 8, paddingVertical: 6, minHeight: 44 },
  inputWrapOverlay: { backgroundColor: 'rgba(0,0,0,0.35)' },
  pillIcon: { paddingHorizontal: 6, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, color: colors.text, fontSize: 14, maxHeight: 120, paddingVertical: 6, paddingHorizontal: 4 },
  // Round send/mic button — the branch's `#249dd9` accent, tokenized. Send tint uses
  // the shared brand; the mic (empty-draft) rest state uses the chat accent.
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnOn: { backgroundColor: BRAND },
  sendBtnMic: { backgroundColor: ACCENT },
  sendIcon: { fontSize: 16, fontWeight: '700' },
});
