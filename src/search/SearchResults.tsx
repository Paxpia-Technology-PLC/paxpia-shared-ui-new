// SearchResults — the SHARED grouped results list (rn-web): ACCOUNTS, DMs, and
// CONTENT sections from `@paxpia/core` `SearchResults`. Pure & props-driven: rows
// report taps up (onPressAccount / onPressDm / onPressContent). Account avatars +
// content thumbnails are resolved by the host (it owns the CDN base + avatar
// fallback) via the optional `resolveAvatar`/`resolveThumb` props.

import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatCount, type AccountResult, type ContentResult, type DmResult, type SearchResults as SearchResultsModel } from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';

export interface SearchResultsProps {
  results: SearchResultsModel;
  loading?: boolean;
  query?: string;
  onPressAccount?: (r: AccountResult) => void;
  onPressDm?: (r: DmResult) => void;
  onPressContent?: (r: ContentResult) => void;
  /** Resolve an account's avatar (host applies resolveAvatarUrl). */
  resolveAvatar?: (r: AccountResult) => string | undefined;
  /** Resolve a content row's thumbnail URL from its bare key (host owns CDN base). */
  resolveThumb?: (r: ContentResult) => string | undefined;
  /** Hide a whole section (e.g. when the bar is scoped to one kind). */
  show?: { accounts?: boolean; dms?: boolean; content?: boolean };
}

export function SearchResults({
  results,
  loading,
  query,
  onPressAccount,
  onPressDm,
  onPressContent,
  resolveAvatar,
  resolveThumb,
  show = { accounts: true, dms: true, content: true },
}: SearchResultsProps) {
  const empty = results.accounts.length === 0 && results.dms.length === 0 && results.content.length === 0;

  if (loading && empty) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Searching…</Text>
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>{query ? `No results for "${query}"` : 'Search accounts, messages and videos'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} keyboardShouldPersistTaps="handled">
      {show.accounts && results.accounts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Accounts</Text>
          {results.accounts.map((r) => (
            <Pressable key={`a-${r.userId}`} style={styles.row} onPress={() => onPressAccount?.(r)}>
              <Avatar uri={resolveAvatar?.(r) ?? r.avatarUrl} name={r.displayName || r.username} size={40} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {r.displayName || r.username}
                  {r.isVerified ? ' ✓' : ''}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  @{r.username || r.userId.slice(0, 8)}
                  {r.bio ? ` · ${r.bio}` : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {show.dms && results.dms.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Messages</Text>
          {results.dms.map((r) => (
            <Pressable key={`d-${r.threadId}`} style={styles.row} onPress={() => onPressDm?.(r)}>
              <Avatar uri={r.avatarUrl} name={r.title} size={40} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {r.preview}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {show.content && results.content.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Videos</Text>
          {results.content.map((r) => {
            const thumb = resolveThumb?.(r);
            return (
              <Pressable key={`c-${r.videoId}`} style={styles.row} onPress={() => onPressContent?.(r)}>
                <View style={styles.thumb}>{thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.thumbGlyph}>▶</Text>}</View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {formatCount(r.viewCount)} views · {formatCount(r.likeCount)} likes
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { maxHeight: 420 },
  center: { padding: 24, alignItems: 'center' },
  hint: { color: colors.textMuted, fontSize: 14 },
  section: { paddingVertical: 6 },
  sectionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  thumb: { width: 56, height: 40, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  thumbGlyph: { color: colors.textMuted, fontSize: 16 },
});
