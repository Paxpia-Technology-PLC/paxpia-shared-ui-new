// BookPageView — what `DocOverlay`'s 'book' branch renders: one chapter of a
// written book, as scrolling prose. No pan/zoom (pinching prose is the wrong
// gesture when scrolling is right — the doc shell's `isFrame`/`isImage` paths
// don't apply here at all, this is its own leaf).
//
// `page.images` is carried on the wire for counts/thumbnails only — the SAME
// pictures already appear inline in `page.body` (rewritten to resolved urls by
// `rewriteBookBodyImages`), so this view must not draw them a second time.
//
// Dark, fixed default palette rather than a required injected theme: this
// renders inside the live stage / viewer surfaces (see DocOverlay), which have
// no app theme context to read from and are dark by default like every other
// doc leaf there.

import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { MarkdownView } from './MarkdownView';
import type { BookPage } from '@paxpia/core/books';

export interface BookPageViewProps {
  page: BookPage;
  /** The book's author, shown as a byline under the title. Omit and none shows —
   *  a live pane's payload carries only the chapter, not the book's metadata. */
  author?: string;
  /** Hide the chapter title — for a host whose own chrome already shows it. */
  hideTitle?: boolean;
}

export function BookPageView({ page, author, hideTitle = false }: BookPageViewProps) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {(!hideTitle || author) && (
        <View style={styles.header}>
          {!hideTitle ? <Text style={styles.chapterTitle} numberOfLines={2}>{page.title}</Text> : null}
          {author ? <Text style={styles.author} numberOfLines={1}>{author}</Text> : null}
        </View>
      )}
      <MarkdownView source={page.body} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  author: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4 },
  chapterTitle: { color: 'rgba(255,255,255,0.95)', fontSize: 20, fontWeight: '800' },
});
