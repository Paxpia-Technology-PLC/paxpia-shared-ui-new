// CommentsPanel — the SHARED threaded-comments view (rn-web), the view half of the
// comments lift (#2, SHARED-LIFT-BACKLOG §Comments). Template = mobile's `CommentsSheet`
// body: a threaded list (indented replies + thread line) + per-row like/reply/edit/delete +
// expand-replies, plus a composer with a reply/edit banner. Web gains threaded comments for
// the FIRST time by mounting this.
//
// It CONSUMES @paxpia/core/social (CommentNode, likeStateFor, canReplyAt, the
// CommentLikeMap shape) and renders the pre-flattened `items` the host derives via
// `buildCommentTree`. PURE & PROPS-DRIVEN: ALL data + identity hydration + the optimistic
// reducers live in the host (mobile keeps its @gorhom sheet + useResolvedUser; web supplies
// its own). This component owns ONLY the composer's local text + edit/reply banner UI, and
// reports intents up: onSend / onLike / onReply / onDelete / onEdit / onToggleReplies.
// Author name/avatar is injected per row via `resolveAuthor` so core stays platform-free.

import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { canReplyAt, likeStateFor, type CommentLikeMap, type CommentNode } from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';

/** The resolved author identity for a comment row — the host hydrates `UserID` → this
 *  (mobile `useResolvedUser`, web's equivalent). Core never carries it, so the panel asks
 *  the host per row via `resolveAuthor`. */
export interface CommentAuthor {
  username: string;
  name?: string;
  avatarUri?: string | null;
}

/** The composer's active mode banner: replying to / editing a comment, or neither. */
export type ComposerMode =
  | { kind: 'reply'; id: string; username: string }
  | { kind: 'edit'; id: string; parentId: string | null; original: string }
  | null;

export interface CommentsPanelProps {
  /** The flattened display list from `@paxpia/core` `buildCommentTree(...)`. */
  items: CommentNode[];
  /** Per-comment optimistic like store (host-owned; folded with `optimisticLikeToggle`). */
  likeMap: CommentLikeMap;
  /** The signed-in user's id — enables edit/delete on own rows. Undefined ⇒ guest. */
  currentUserId?: string;
  /** Resolve a comment author's display identity from its `UserID`. Returns a neutral
   *  fallback (never a raw UUID) when unknown. */
  resolveAuthor: (userId: string) => CommentAuthor;
  /** The signed-in user's identity for the composer avatar (optional). */
  me?: CommentAuthor;
  /** Whether the viewer is authenticated. When false the composer prompts sign-in via
   *  `onRequireAuth` instead of sending. */
  authed?: boolean;
  /** Max nesting depth (mirrors the value passed to buildCommentTree). Default 3. */
  maxDepth?: number;
  /** Send the composed text. `parentId` set ⇒ a reply; else a top-level comment. */
  onSend: (content: string, parentId?: string) => void;
  /** Commit an edit to an existing comment. */
  onEdit: (commentId: string, content: string) => void;
  /** Toggle a comment's like. `liked` is the CURRENT (pre-tap) state. */
  onLike: (commentId: string, liked: boolean) => void;
  /** Begin a reply to a comment (host sets composer mode / focuses). Optional — when
   *  omitted the panel manages reply mode locally. */
  onReply?: (commentId: string, username: string, depth: number) => void;
  /** Delete a comment. `parentId` lets the host prune the right list. */
  onDelete: (commentId: string, parentId: string | null) => void;
  /** Expand/collapse (and lazy-load) a comment's replies. */
  onToggleReplies: (commentId: string) => void;
  /** Reached the list end — load the next page of top-level comments. */
  onEndReached?: () => void;
  /** Prompt sign-in (guest tried to comment/like). */
  onRequireAuth?: () => void;
  /** Whether the top-level list is currently loading (shows an inline hint). */
  loading?: boolean;
}

const INDENT_PX = 40;

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  if (s < 2592000) return `${Math.floor(s / 604800)}w`;
  if (s < 31536000) return `${Math.floor(s / 2592000)}mo`;
  return `${Math.floor(s / 31536000)}y`;
}

/** One comment row: avatar + author + body + actions (reply/like) + replies toggle. */
function CommentRow({
  node,
  author,
  like,
  isOwn,
  maxDepth,
  onLike,
  onReply,
  onDelete,
  onEdit,
  onToggleReplies,
}: {
  node: CommentNode;
  author: CommentAuthor;
  like: { count: number; liked: boolean };
  isOwn: boolean;
  maxDepth: number;
  onLike: (id: string, liked: boolean) => void;
  onReply: (id: string, username: string, depth: number) => void;
  onDelete: (id: string, parentId: string | null) => void;
  onEdit: (id: string, parentId: string | null, original: string) => void;
  onToggleReplies: (id: string) => void;
}) {
  const { comment, depth, expanded, replyCount } = node;
  const canReply = canReplyAt(depth, maxDepth);
  const canHaveChildren = canReply;

  let repliesLabel: string | null = null;
  if (canHaveChildren) {
    if (expanded) {
      repliesLabel = `Hide ${replyCount ?? ''} ${(replyCount ?? 0) === 1 ? 'reply' : 'replies'}`.trim();
    } else if (replyCount !== undefined) {
      repliesLabel = replyCount === 0 ? null : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
    } else {
      repliesLabel = 'View replies';
    }
  }

  const indent = Math.min(depth * INDENT_PX, maxDepth * INDENT_PX);

  return (
    <View style={[styles.rowOuter, { marginLeft: indent }]}>
      {depth > 0 ? <View style={styles.threadLine} /> : null}
      <View style={styles.rowWrap}>
        <Avatar uri={author.avatarUri} name={author.name ?? author.username} size={depth === 0 ? 36 : 28} />
        <View style={styles.rowBody}>
          <View style={styles.nameRow}>
            <Text style={[styles.username, depth > 0 && styles.usernameSmall]}>@{author.username}</Text>
            <Text style={styles.time}>{timeAgo(comment.CreatedAt)}</Text>
          </View>
          <Text style={[styles.content, depth > 0 && styles.contentSmall]}>{comment.Content}</Text>

          <View style={styles.actions}>
            {canReply ? (
              <Pressable onPress={() => onReply(comment.ID, author.username, depth)} hitSlop={6}>
                <Text style={styles.actionText}>Reply</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.likeBtn}
              onPress={() => onLike(comment.ID, like.liked)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={like.liked ? 'Unlike comment' : 'Like comment'}
            >
              <Text style={[styles.heart, like.liked && styles.heartOn]}>{like.liked ? '♥' : '♡'}</Text>
              {like.count > 0 ? (
                <Text style={[styles.actionText, like.liked && styles.likeCountOn]}>{like.count}</Text>
              ) : null}
            </Pressable>
            {isOwn ? (
              <Pressable onPress={() => onEdit(comment.ID, comment.ParentID, comment.Content)} hitSlop={6}>
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
            ) : null}
            {isOwn ? (
              <Pressable onPress={() => onDelete(comment.ID, comment.ParentID)} hitSlop={6}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>

          {canHaveChildren && repliesLabel !== null ? (
            <Pressable style={styles.viewRepliesBtn} onPress={() => onToggleReplies(comment.ID)} hitSlop={6}>
              <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
              <Text style={styles.viewRepliesText}>{repliesLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * CommentsPanel — the shared threaded comment list + composer. Renders the host's
 * `buildCommentTree(...)` output; reports every mutation up; owns only the composer's local
 * text + reply/edit banner.
 */
export function CommentsPanel({
  items,
  likeMap,
  currentUserId,
  resolveAuthor,
  me,
  authed = true,
  maxDepth = 3,
  onSend,
  onEdit,
  onLike,
  onReply,
  onDelete,
  onToggleReplies,
  onEndReached,
  onRequireAuth,
  loading = false,
}: CommentsPanelProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ComposerMode>(null);

  const placeholder = useMemo(() => {
    if (mode?.kind === 'edit') return 'Edit comment…';
    return authed ? 'Add a comment…' : 'Sign in to comment…';
  }, [mode, authed]);

  const beginReply = (id: string, username: string, depth: number) => {
    if (onReply) onReply(id, username, depth);
    setMode({ kind: 'reply', id, username });
    setText((t) => (t.startsWith(`@${username} `) ? t : `@${username} `));
    onToggleReplies(id); // surface existing replies in context (host de-dupes)
  };

  const beginEdit = (id: string, parentId: string | null, original: string) => {
    setMode({ kind: 'edit', id, parentId, original });
    setText(original);
  };

  const clearComposer = () => {
    setMode(null);
    setText('');
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;
    if (!authed) {
      onRequireAuth?.();
      return;
    }
    if (mode?.kind === 'edit') {
      onEdit(mode.id, content);
    } else if (mode?.kind === 'reply') {
      onSend(content, mode.id);
    } else {
      onSend(content);
    }
    clearComposer();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comments</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScroll={({ nativeEvent }) => {
          const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 80) onEndReached?.();
        }}
        scrollEventThrottle={200}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>💬</Text>
            <Text style={styles.emptyText}>{loading ? 'Loading…' : 'No comments yet'}</Text>
            {!loading ? <Text style={styles.emptySub}>Be the first to comment</Text> : null}
          </View>
        ) : (
          items.map((node) => (
            <CommentRow
              key={node.comment.ID}
              node={node}
              author={resolveAuthor(node.comment.UserID)}
              like={likeStateFor(likeMap, node.comment)}
              isOwn={!!currentUserId && node.comment.UserID === currentUserId}
              maxDepth={maxDepth}
              onLike={(id, liked) => (authed ? onLike(id, liked) : onRequireAuth?.())}
              onReply={beginReply}
              onDelete={onDelete}
              onEdit={beginEdit}
              onToggleReplies={onToggleReplies}
            />
          ))
        )}
        {loading && items.length > 0 ? <Text style={styles.loadingMore}>Loading…</Text> : null}
      </ScrollView>

      {/* Composer — reply/edit banner + input + send. */}
      <View style={styles.composer}>
        {mode ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              {mode.kind === 'reply' ? `Replying to @${mode.username}` : 'Editing comment'}
            </Text>
            <Pressable onPress={clearComposer} hitSlop={8} accessibilityLabel="Cancel">
              <Text style={styles.bannerClose}>✕</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <Avatar uri={me?.avatarUri} name={me?.name ?? me?.username} size={32} />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            maxLength={500}
            onFocus={() => {
              if (!authed) onRequireAuth?.();
            }}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              !text.trim() && styles.sendBtnDisabled,
              pressed && styles.pressed,
            ]}
            onPress={handleSend}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
          >
            <Text style={styles.sendGlyph}>➤</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const ACCENT = colors.brand;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1C1C1E' },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 24 },

  empty: { alignItems: 'center', paddingTop: 48, rowGap: 8 },
  emptyGlyph: { fontSize: 34 },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  emptySub: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  loadingMore: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', paddingVertical: 12 },

  rowOuter: { position: 'relative' },
  threadLine: {
    position: 'absolute',
    left: -20,
    top: 8,
    bottom: 8,
    width: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
  },
  rowWrap: {
    flexDirection: 'row',
    columnGap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowBody: { flex: 1, rowGap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  username: { color: colors.text, fontSize: 13, fontWeight: '700' },
  usernameSmall: { fontSize: 12 },
  time: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  content: { color: 'rgba(255,255,255,0.88)', fontSize: 13.5, lineHeight: 19 },
  contentSmall: { fontSize: 13, lineHeight: 18 },

  actions: { flexDirection: 'row', alignItems: 'center', columnGap: 14, marginTop: 3 },
  actionText: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600' },
  deleteText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', columnGap: 3 },
  heart: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  heartOn: { color: '#FF4D4D' },
  likeCountOn: { color: '#FF4D4D' },

  viewRepliesBtn: { flexDirection: 'row', alignItems: 'center', columnGap: 4, marginTop: 6 },
  chevron: { color: ACCENT, fontSize: 9 },
  viewRepliesText: { color: ACCENT, fontSize: 12, fontWeight: '600' },

  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1C1C1E',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  bannerText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  bannerClose: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    columnGap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#3a3a42' },
  sendGlyph: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
