// BookPagePane — ONE page of a Bookstore book on the live stage (rn-web).
//
// Display only. The caller fetches the page through `@paxpia/core/bookstore`'s
// `getBookPage` and passes the signed `pageUrl` in. This component never fetches,
// never renders a PDF, and never sees any page but the one it is given — which is
// the point: a book page on stage is a single image, so there is nothing else to
// leak.
//
// Host controls (prev/next) appear only when `isHost`. They report the tap; the
// caller does the page turn (fetch the new page, then broadcast it).
//
// Colours come from `creatorColors` (light + dark), same as BookPicker: the Creator
// Hub is light/dark on both apps, so the host passes its current `scheme`.

import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { creatorColors, fontSize, radius, spacing, type CreatorPalette, type CreatorScheme } from '../theme/tokens';

export interface BookPagePaneProps {
  /** The signed URL to this page's image (from `getBookPage`). */
  pageUrl: string;
  totalPages: number;
  /** 1-based. */
  pageNumber: number;
  onNext?: () => void;
  onPrev?: () => void;
  /** Shows the prev/next controls. Viewers see the page and the counter only. */
  isHost: boolean;
  /** The image failed to load (most often an expired signed URL). The caller
   *  re-fetches the same page and passes the new `pageUrl`. */
  onImageError?: () => void;
  /** The host screen's colour scheme. Defaults to 'dark'. */
  scheme?: CreatorScheme;
}

export function BookPagePane({
  pageUrl,
  totalPages,
  pageNumber,
  onNext,
  onPrev,
  isHost,
  onImageError,
  scheme = 'dark',
}: BookPagePaneProps) {
  const palette = creatorColors[scheme];
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [failed, setFailed] = useState(false);

  // A new URL (page turn or re-signed page) gets a fresh attempt.
  useEffect(() => setFailed(false), [pageUrl]);

  const canPrev = pageNumber > 1;
  const canNext = totalPages > 0 && pageNumber < totalPages;
  const counter = totalPages > 0 ? `Page ${pageNumber} / ${totalPages}` : `Page ${pageNumber}`;

  return (
    <View style={styles.root}>
      <View style={styles.page}>
        {failed || !pageUrl ? (
          <Text style={styles.state}>This page couldn’t be loaded.</Text>
        ) : (
          <Image
            key={pageUrl}
            source={{ uri: pageUrl }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={counter}
            onError={() => {
              setFailed(true);
              onImageError?.();
            }}
          />
        )}
      </View>

      <View style={styles.bar}>
        {isHost ? (
          <Pressable
            style={[styles.btn, !canPrev && styles.btnDisabled]}
            onPress={onPrev}
            disabled={!canPrev || !onPrev}
            accessibilityRole="button"
            accessibilityLabel="Previous page"
            accessibilityState={{ disabled: !canPrev || !onPrev }}
          >
            <Text style={styles.btnText}>‹ Prev</Text>
          </Pressable>
        ) : null}
        <Text style={styles.counter}>{counter}</Text>
        {isHost ? (
          <Pressable
            style={[styles.btn, !canNext && styles.btnDisabled]}
            onPress={onNext}
            disabled={!canNext || !onNext}
            accessibilityRole="button"
            accessibilityLabel="Next page"
            accessibilityState={{ disabled: !canNext || !onNext }}
          >
            <Text style={styles.btnText}>Next ›</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: CreatorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
    image: { width: '100%', height: '100%' },
    state: { color: c.inkMuted, fontSize: fontSize.base, textAlign: 'center' },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.hairline,
    },
    counter: { color: c.ink, fontSize: fontSize.sm, fontWeight: '600', minWidth: 96, textAlign: 'center' },
    btn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: c.surfaceAlt },
    btnDisabled: { opacity: 0.4 },
    btnText: { color: c.ink, fontSize: fontSize.sm, fontWeight: '600' },
  });
}
