// BookPicker — the SHARED "go live with one of your books" list (rn-web).
//
// Pure & PROPS-DRIVEN, modelled on messaging/GroupCreateSheet: the host fetches the
// creator's books, decides which are publishable and which can actually be shown
// (`@paxpia/core/bookstore`'s `getPublishableBooks` + its own material lookup), and
// maps them to `BookPickerItem`s. This component only renders and reports a tap via
// `onPick`. It fetches nothing, imports no platform, holds no state, and owns no
// sheet/modal chrome — the host wraps it in whatever its platform calls a sheet.
//
// A row with a `disabledReason` is shown but CANNOT be picked, so a creator never
// selects a book that would fail at launch (e.g. an edition with no PDF attached).
//
// The empty state is a message plus a dismiss — it never falls back to another
// go-live flow on its own. An explicit secondary action (e.g. "Whiteboard only") is
// the host's to offer through `secondaryAction`, and is always a visible choice.
//
// Colours come from `creatorColors` (light + dark, copied from the website's
// creator-theme.css): the picker opens over the Creator Hub, which is light/dark on
// both apps, so the host passes its current `scheme`.

import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { creatorColors, fontSize, radius, spacing, type CreatorPalette, type CreatorScheme } from '../theme/tokens';

/** One pickable book, already shaped by the host. */
export interface BookPickerItem {
  id: string;
  title: string;
  /** A displayable cover url; omit for the placeholder tile. */
  coverUrl?: string;
  /** A short secondary line (author, edition, page count…). */
  subtitle?: string;
  /** When set, the row is shown dimmed with this text and cannot be picked. */
  disabledReason?: string;
}

export interface BookPickerProps {
  items: BookPickerItem[];
  onPick: (id: string) => void;
  onCancel: () => void;
  /** First load in flight — shows a spinner instead of the list or empty state. */
  loading?: boolean;
  /** A readable load failure; shown with a Retry when `onRetry` is supplied. */
  error?: string | null;
  onRetry?: () => void;
  /** The id of the row currently launching; every row is locked while set. */
  busyId?: string | null;
  title?: string;
  emptyTitle?: string;
  emptyText?: string;
  /** An explicit alternative the creator can choose (never taken automatically). */
  secondaryAction?: { label: string; onPress: () => void; disabled?: boolean };
  /** The host screen's colour scheme. Defaults to 'dark'. */
  scheme?: CreatorScheme;
}

export function BookPicker({
  items,
  onPick,
  onCancel,
  loading = false,
  error = null,
  onRetry,
  busyId = null,
  title = 'Go live with a book',
  emptyTitle = 'No published books',
  emptyText = 'Publish a book in the Bookstore first — only your published books can be shown live.',
  secondaryAction,
  scheme = 'dark',
}: BookPickerProps) {
  const locked = !!busyId;
  const palette = creatorColors[scheme];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const body = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.stateTitle}>Couldn’t load your books</Text>
          <Text style={styles.stateText}>{error}</Text>
          {onRetry ? (
            <Pressable style={styles.stateBtn} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry">
              <Text style={styles.stateBtnText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.stateTitle}>{emptyTitle}</Text>
          <Text style={styles.stateText}>{emptyText}</Text>
          <Pressable style={styles.stateBtn} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Dismiss">
            <Text style={styles.stateBtnText}>Dismiss</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const disabled = !!item.disabledReason || locked;
          const busy = busyId === item.id;
          return (
            <Pressable
              style={[styles.row, !!item.disabledReason && styles.rowDisabled]}
              onPress={() => onPick(item.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled, busy }}
              accessibilityLabel={item.disabledReason ? `${item.title}. ${item.disabledReason}` : `Go live with ${item.title}`}
            >
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={styles.coverGlyph}>📖</Text>
                </View>
              )}
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.title || 'Untitled book'}
                </Text>
                {item.disabledReason ? (
                  <Text style={styles.rowReason} numberOfLines={2}>
                    {item.disabledReason}
                  </Text>
                ) : item.subtitle ? (
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              {busy ? <ActivityIndicator color={palette.accent} /> : null}
            </Pressable>
          );
        }}
      />
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.headerAction}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.body}>{body()}</View>
      {secondaryAction ? (
        <Pressable
          style={[styles.secondary, (secondaryAction.disabled || locked) && styles.secondaryDisabled]}
          onPress={secondaryAction.onPress}
          disabled={secondaryAction.disabled || locked}
          accessibilityRole="button"
          accessibilityLabel={secondaryAction.label}
        >
          <Text style={styles.secondaryText}>{secondaryAction.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: CreatorPalette) {
  return StyleSheet.create({
    root: { backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: spacing.lg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.hairline,
    },
    headerTitle: { color: c.ink, fontSize: fontSize.md, fontWeight: '600' },
    headerAction: { color: c.inkMuted, fontSize: fontSize.base },
    body: { minHeight: 200, maxHeight: 460 },
    list: { paddingVertical: spacing.sm },
    center: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
    stateTitle: { color: c.ink, fontSize: fontSize.md, fontWeight: '600', textAlign: 'center' },
    stateText: { color: c.inkMuted, fontSize: fontSize.base, textAlign: 'center', lineHeight: 20 },
    stateBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: c.surfaceAlt },
    stateBtnText: { color: c.ink, fontSize: fontSize.base, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    rowDisabled: { opacity: 0.5 },
    cover: { width: 44, height: 60, borderRadius: radius.sm, backgroundColor: c.surfaceAlt },
    coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    coverGlyph: { fontSize: fontSize.md },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { color: c.ink, fontSize: fontSize.base, fontWeight: '600' },
    rowSub: { color: c.inkMuted, fontSize: fontSize.sm, marginTop: 2 },
    rowReason: { color: c.inkMuted, fontSize: fontSize.sm, marginTop: 2, fontStyle: 'italic' },
    secondary: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.hairline,
      alignItems: 'center',
    },
    secondaryDisabled: { opacity: 0.5 },
    secondaryText: { color: c.ink, fontSize: fontSize.base, fontWeight: '600' },
  });
}
