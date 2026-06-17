// THE LEAF-ADAPTER CONTRACT (§6a) — the ONE seam between the shared rn-web overlay
// view layer and the platform code that actually DECODES pixels.
//
// The dispatcher (`OverlayRenderer`), the participation bars (`ParticipationOverlay`),
// the doc shell (`DocOverlay` + `DocChrome`), the SVG host (`SvgOverlayLayer`) and the
// live surface (`LiveSurface`) are ALL pure react-native-web (View/Text/Pressable/
// Image). The thing that genuinely needs a platform decoder — a GIF/animated raster,
// a PDF page, an EPUB book, a SMIL-animated SVG — is INJECTED here as a `LeafAdapter`
// and NEVER imported by this package (hard rule §8: the leaf that decodes pixels is
// injected, never imported here; no raw DOM, no `livekit-client`, no `react-native-
// webview`, no `pdf.js`). Web passes leaves backed by `<img>` + `docLeaves.tsx`
// (pdf.js canvas / epub iframe); mobile passes leaves backed by `<Image>` +
// `DocPdfRenderer`/`DocEpubRenderer` (react-native-webview).
//
// This is what makes the GIF-loop, PDF-blank, doc-chrome, vote-press and zoom/pan
// bugs fix in ONE place: the dispatch + chrome + gesture rules live here, and only
// the leaf differs per platform.

import type { ComponentType } from 'react';

/** The Image/GIF leaf. Web maps to `<img>`, mobile to `<Image>`.
 *
 *  `loop` MUST loop animated images — this is the GIF-loop fix in ONE place (web's
 *  `<img>` loops a GIF by default; RN's `<Image>` does not, so the mobile leaf wires
 *  it through). The doc shell + plain image overlays pass `loop` so an animated slide
 *  / GIF plays continuously on both platforms instead of freezing on the first frame
 *  on mobile.
 *
 *  `onError` reports a decode failure (expired signed URL, undecodable codec) so the
 *  caller can fall back / surface the "stale doc lingers" telemetry. */
export interface ImageLeafProps {
  /** The image/GIF source URL (a CDN/object-storage url; only the url rides the wire). */
  src: string;
  /** When true the leaf MUST loop an animated image (GIF/APNG/WebP). The single
   *  place the GIF-no-loop-on-mobile bug is fixed. */
  loop: boolean;
  /** Reported when the leaf can't decode `src` (so the caller can fall back). */
  onError?(): void;
}

/** The PDF / EPUB / SVG-SMIL leaf — a WebView host. Web maps to an `<iframe>`,
 *  mobile to `react-native-webview`. It runs pdf.js / epub.js / native SVG+SMIL
 *  inside, OWNING all of its own gestures (scroll/zoom/pagination) — the shared doc
 *  shell renders it DIRECTLY with no wrapping pan detector (§6b: WebView leaves own
 *  ALL their gestures), so the "touching the doc breaks it / steals the scroll" bug
 *  can't recur.
 *
 *  Exactly ONE of `html` / `url` is supplied:
 *    • `html` — a self-contained document string to load (web: `srcDoc`; mobile:
 *      `source={{ html }}`). Used for the EPUB reader (epub.js bootstrap doc).
 *    • `url`  — a presigned material URL to open (the raw PDF the host rasterizes).
 *
 *  `onUserInteract` bridges the FIRST genuine touch/scroll INSIDE the WebView out to
 *  the doc shell so a real interaction flips local-takeover WITHOUT the shell wrapping
 *  (and thereby stealing) the WebView's gestures (§6b). */
export interface WebViewHostProps {
  /** A self-contained document to load (EPUB reader bootstrap). Mutually exclusive
   *  with `url`. */
  html?: string;
  /** A presigned material URL to open (raw PDF/EPUB the host renders). Mutually
   *  exclusive with `html`. */
  url?: string;
  /** The view mode for a PDF/EPUB leaf: 'single' renders ONE server-synced page
   *  (prev/next); 'scroll' renders the WHOLE document as one continuous, page-culled
   *  scroll with NO nested scrollbar. The leaf rebuilds its bootstrap on a mode
   *  change. Absent ⇒ 'single' (back-compat). */
  mode?: 'single' | 'scroll';
  /** The server-synced 0-based page (single mode) the leaf should display / scroll to. */
  page?: number;
  /** Total page count (scroll mode lays out this many page slots; single mode clamps). */
  pageCount?: number;
  /** Bridged from INSIDE the WebView on the first real interaction → flips takeover
   *  without the shell stealing the WebView's scroll/zoom. */
  onUserInteract?(): void;
}

/** The leaf adapter a platform shell injects into the shared overlay components. Both
 *  fields are platform `ComponentType`s the shared layer renders but never imports —
 *  the only place per-platform decode lives. */
export interface LeafAdapter {
  /** Image/GIF leaf (web `<img>` / RN `<Image>`). MUST honour `loop` for animated
   *  images (the GIF-loop fix). */
  ImageLeaf: ComponentType<ImageLeafProps>;
  /** PDF/EPUB/SVG-SMIL WebView host (web `<iframe>` / RN `react-native-webview`). */
  WebViewHost: ComponentType<WebViewHostProps>;
}
