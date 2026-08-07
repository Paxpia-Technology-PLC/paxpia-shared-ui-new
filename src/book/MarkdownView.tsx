// MarkdownView — the ONE markdown tokenizer, lifted verbatim out of mobile's
// `readingBuilder/markdownRenderer.tsx` so a book chapter renders IDENTICALLY on
// the writer's phone, the streamer's own screen mid-lesson, and every viewer
// (web included). Keeping a second copy of this dialect parser per platform is
// exactly the drift the shared layer exists to prevent.
//
// Framework-free by design: no theme hook, no app-specific gallery import. The
// two things a caller supplies:
//   • `palette`        — the seven colors this needs (see types.ts). A live
//                        session pane and the reading builder's preview run in
//                        different apps/themes; this makes neither assumption.
//   • `renderImageRun` — how a run of adjacent image lines draws. Omit it and a
//                        run stacks as plain `<Image>`s (the live-pane default —
//                        a swipeable pager in a small tile would fight the doc
//                        viewport's own pan/zoom). The reading builder passes
//                        its swipeable `ImageGallery` instead.
//
// Supported syntax: headings (#/##/###), bullet/numbered lists, fenced code
// blocks, images alone on their own line, and inline bold/italic/underline/code/
// links. No nested inline combinations (e.g. bold+italic together) — a
// deliberate limit for a dependency-free renderer, not a bug. This file is the
// ONE thing that must never break, because it is what readers see.

import React, { useMemo } from 'react';
import { View, Text, Image, Linking, StyleSheet, Platform } from 'react-native';
import type { MarkdownImage, MarkdownPalette } from './types';

type Styles = ReturnType<typeof makeStyles>;

const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;
const INLINE_RE = /(\*\*[^*]+\*\*)|(<u>[^<]+<\/u>)|(\*[^*]+\*)|(_[^_]+_)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;

function renderInline(line: string, keyPrefix: string, s: Styles): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = INLINE_RE.exec(line)) !== null) {
    if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}_${i++}`;
    if (token.startsWith('**')) {
      nodes.push(<Text key={key} style={s.bold}>{token.slice(2, -2)}</Text>);
    } else if (token.startsWith('<u>')) {
      nodes.push(<Text key={key} style={s.underline}>{token.slice(3, -4)}</Text>);
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<Text key={key} style={s.italic}>{token.slice(1, -1)}</Text>);
    } else if (token.startsWith('`')) {
      nodes.push(<Text key={key} style={s.inlineCode}>{token.slice(1, -1)}</Text>);
    } else {
      const m = LINK_RE.exec(token);
      if (m) {
        const url = m[2];
        nodes.push(
          <Text key={key} style={s.link} onPress={() => Linking.openURL(url).catch(() => {})}>
            {m[1]}
          </Text>,
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
  return nodes;
}

/** The live-pane default: adjacent pictures stack as plain, full-width images —
 *  no gallery, no pager. Used whenever a caller doesn't supply `renderImageRun`. */
function StackedImages({ images, s }: { images: MarkdownImage[]; s: Styles }) {
  return (
    <>
      {images.map((img, i) => (
        <Image key={i} source={{ uri: img.uri }} style={s.image} resizeMode="cover" />
      ))}
    </>
  );
}

/** A neutral dark default so a bare `<MarkdownView source={...} />` (no theme to
 *  inject — a live pane, a quick preview) still renders legibly. Callers with an
 *  app theme (the reading builder) pass their own palette instead. */
export const DEFAULT_MARKDOWN_PALETTE: MarkdownPalette = {
  ink: 'rgba(255,255,255,0.92)',
  inkMuted: 'rgba(255,255,255,0.72)',
  inkFaint: 'rgba(255,255,255,0.45)',
  accent: '#5AA9FF',
  surfaceAlt: 'rgba(255,255,255,0.08)',
  code: '#8CE99A',
};

export interface MarkdownViewProps {
  source: string;
  /** Defaults to `DEFAULT_MARKDOWN_PALETTE` when omitted. */
  palette?: MarkdownPalette;
  /** How a run of adjacent image lines renders. Omit for the stacked default. */
  renderImageRun?: (images: MarkdownImage[], key: string) => React.ReactNode;
}

/** Lightweight, dependency-free Markdown → React Native renderer. */
export function MarkdownView({ source, palette = DEFAULT_MARKDOWN_PALETTE, renderImageRun }: MarkdownViewProps) {
  const s = useMemo(() => makeStyles(palette), [palette]);

  const lines = source.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <View key={`code_${key++}`} style={s.codeBlock}>
          <Text style={s.codeBlockText}>{codeLines.join('\n')}</Text>
        </View>,
      );
      continue;
    }

    const imageMatch = IMAGE_LINE_RE.exec(trimmed);
    if (imageMatch) {
      // Sweep up every image that follows, blank lines included — a writer who
      // separates their pictures with an empty line still means "these go
      // together", and requiring them to be flush would be a syntax trap.
      const run: MarkdownImage[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (next.length === 0) {
          const after = lines.slice(i + 1).findIndex((l) => l.trim().length > 0);
          if (after < 0 || !IMAGE_LINE_RE.test(lines[i + 1 + after].trim())) break;
          i++;
          continue;
        }
        const m = IMAGE_LINE_RE.exec(next);
        if (!m) break;
        run.push({ uri: m[2], caption: m[1]?.trim() || undefined });
        i++;
      }
      const galleryKey = `gal_${key++}`;
      blocks.push(
        renderImageRun ? (
          <React.Fragment key={galleryKey}>{renderImageRun(run, galleryKey)}</React.Fragment>
        ) : (
          <StackedImages key={galleryKey} images={run} s={s} />
        ),
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(<Text key={`h_${key++}`} style={s.h3}>{renderInline(trimmed.slice(4), `h${key}`, s)}</Text>);
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push(<Text key={`h_${key++}`} style={s.h2}>{renderInline(trimmed.slice(3), `h${key}`, s)}</Text>);
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push(<Text key={`h_${key++}`} style={s.h1}>{renderInline(trimmed.slice(2), `h${key}`, s)}</Text>);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length && (/^[-*]\s+/.test(lines[i].trim()) || /^\d+\.\s+/.test(lines[i].trim()))) {
        items.push(lines[i].trim().replace(/^([-*]|\d+\.)\s+/, ''));
        i++;
      }
      blocks.push(
        <View key={`list_${key++}`} style={s.list}>
          {items.map((item, idx) => (
            <View key={idx} style={s.listRow}>
              <Text style={s.listBullet}>{ordered ? `${idx + 1}.` : '•'}</Text>
              <Text style={s.paragraph}>{renderInline(item, `li${idx}`, s)}</Text>
            </View>
          ))}
        </View>,
      );
      continue;
    }

    if (trimmed.length === 0) {
      blocks.push(<View key={`sp_${key++}`} style={s.spacer} />);
      i++;
      continue;
    }

    blocks.push(<Text key={`p_${key++}`} style={s.paragraph}>{renderInline(trimmed, `p${key}`, s)}</Text>);
    i++;
  }

  return <View>{blocks}</View>;
}

const makeStyles = (C: MarkdownPalette) => StyleSheet.create({
  h1: { color: C.ink, fontSize: 24, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  h2: { color: C.ink, fontSize: 20, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  h3: { color: C.ink, fontSize: 17, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  paragraph: { color: C.inkMuted, fontSize: 15, lineHeight: 22 },
  bold: { color: C.ink, fontWeight: '700' },
  italic: { color: C.inkMuted, fontStyle: 'italic' },
  underline: { color: C.ink, textDecorationLine: 'underline' },
  inlineCode: {
    color: C.code, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: C.surfaceAlt, fontSize: 13,
  },
  link: { color: C.accent, textDecorationLine: 'underline' },
  codeBlock: { backgroundColor: C.surfaceAlt, borderRadius: 8, padding: 12, marginVertical: 8 },
  codeBlockText: {
    color: C.code, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13, lineHeight: 19,
  },
  image: { width: '100%', height: 180, borderRadius: 10, marginVertical: 8, backgroundColor: C.surfaceAlt },
  list: { marginVertical: 4 },
  listRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  listBullet: { color: C.inkFaint, fontSize: 15, minWidth: 18 },
  spacer: { height: 8 },
});
