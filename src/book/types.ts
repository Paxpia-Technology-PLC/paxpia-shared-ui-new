// @paxpia/ui/book — one markdown renderer, two audiences: the reading builder's
// preview (with the app's theme + swipeable gallery) and a live class pane (no
// theme hook, stacked pictures). See MarkdownView.tsx / BookPageView.tsx headers.

/** The seven colors `MarkdownView` needs, injected rather than read off a theme
 *  hook — this layer is framework-free (no React Context, no app theme import)
 *  and a book is the one surface a reader may want on white regardless of the
 *  app's own dark/light mode. */
export interface MarkdownPalette {
  ink: string;
  inkMuted: string;
  inkFaint: string;
  accent: string;
  surfaceAlt: string;
  code: string;
}

/** One picture in a run of adjacent image lines — deliberately the minimal
 *  shape (not importing a host app's gallery type) so any caller's own image
 *  type satisfies this structurally. */
export interface MarkdownImage {
  uri: string;
  caption?: string;
}
