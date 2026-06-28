// SearchBar — the SHARED search input + dropdown (rn-web). Template = the mockup's
// sidebar search (focus ring + suggestions + recent-search history + a clear ✕).
// Pure & props-driven: it owns the input's focus state + reports query / submit /
// suggestion-tap up. The dropdown contents (suggestions OR recent history OR a
// results preview) are driven by props from `@paxpia/core` `useSearch`.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/tokens';

export interface SearchBarProps {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmit?: (q: string) => void;
  /** Autocomplete suggestions for the current (non-empty) query. */
  suggestions?: string[];
  /** Recent searches, shown when the query is empty + focused. */
  recent?: string[];
  onPickSuggestion?: (s: string) => void;
  onRemoveRecent?: (s: string) => void;
  placeholder?: string;
  /** Optional results preview rendered below the suggestion list (e.g. the shared
   *  SearchResults). When present it shows instead of plain suggestions for a
   *  non-empty query. */
  resultsPreview?: React.ReactNode;
  /** Auto-open the dropdown on focus (default true). */
  openOnFocus?: boolean;
}

export function SearchBar({
  query,
  onChangeQuery,
  onSubmit,
  suggestions = [],
  recent = [],
  onPickSuggestion,
  onRemoveRecent,
  placeholder = 'Search…',
  resultsPreview,
  openOnFocus = true,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const open = focused && openOnFocus;
  const hasQuery = query.trim().length > 0;

  return (
    <View style={styles.root}>
      <View style={[styles.box, focused && styles.boxFocused]}>
        <Pressable onPress={() => onSubmit?.(query)} accessibilityLabel="Search">
          <Text style={[styles.icon, focused && styles.iconFocused]}>🔍</Text>
        </Pressable>
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onSubmitEditing={() => onSubmit?.(query)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="search"
        />
        {hasQuery ? (
          <Pressable onPress={() => onChangeQuery('')} accessibilityLabel="Clear">
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View style={styles.dropdown}>
          {hasQuery ? (
            resultsPreview ? (
              resultsPreview
            ) : suggestions.length > 0 ? (
              suggestions.map((s, i) => (
                <Pressable key={`s-${i}`} style={styles.dropRow} onPress={() => onPickSuggestion?.(s)}>
                  <Text style={styles.dropIcon}>🔍</Text>
                  <Text style={styles.dropText} numberOfLines={1}>
                    {s}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyHint}>Search for "{query}"</Text>
            )
          ) : recent.length > 0 ? (
            <View>
              <Text style={styles.sectionLabel}>Recent searches</Text>
              {recent.map((s, i) => (
                <Pressable key={`r-${i}`} style={styles.dropRow} onPress={() => onPickSuggestion?.(s)}>
                  <Text style={styles.dropIcon}>🕘</Text>
                  <Text style={[styles.dropText, { flex: 1 }]} numberOfLines={1}>
                    {s}
                  </Text>
                  {onRemoveRecent ? (
                    <Pressable onPress={() => onRemoveRecent(s)} accessibilityLabel="Remove">
                      <Text style={styles.dropRemove}>✕</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>No recent searches</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const BRAND = colors.brand;

const styles = StyleSheet.create({
  root: { position: 'relative', zIndex: 50 },
  box: { flexDirection: 'row', alignItems: 'center', columnGap: 10, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  boxFocused: { borderColor: BRAND },
  icon: { fontSize: 15, color: colors.textMuted },
  iconFocused: { color: BRAND },
  input: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
  clear: { color: colors.textMuted, fontSize: 14 },

  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 8, maxHeight: 360, overflow: 'hidden' },
  sectionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 4, textTransform: 'uppercase' },
  dropRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  dropIcon: { fontSize: 14, color: colors.textMuted },
  dropText: { color: colors.text, fontSize: 14 },
  dropRemove: { color: colors.textMuted, fontSize: 13 },
  emptyHint: { color: colors.textMuted, fontSize: 14, paddingHorizontal: 16, paddingVertical: 12 },
});
