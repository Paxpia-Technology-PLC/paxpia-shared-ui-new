// ParticipationOverlay — the ONE shared poll / quiz / vote-button renderer (§6).
//
// This collapses the forked web `renderers.tsx` (PollOverlay/QuizOverlay/
// VoteButtonOverlay) and mobile `ParticipationOverlays.tsx` into a SINGLE rn-web
// implementation. It is PRESENTATIONAL: results + the viewer's committed choice +
// the vote callback arrive as the shared-core `OverlayViewProps` (voted / mine /
// tallies / total / onVote), and the bar percentages come from core's `pct` — so the
// bars a viewer sees match the streamer's results panel exactly, on every platform.
//
// GESTURE-OWNERSHIP RULE (§6b — the "press registers, nothing happens" fix):
// every vote target is a `Pressable` that OWNS its tap. On mobile the old fork sat
// inside a page-level `GestureDetector`/scene-card pan that swallowed the tap; here
// each option `Pressable` is the gesture owner. We set `pointerEvents="box-only"` on
// the option (so the bar fill / labels never intercept the press) and render the
// participation root with `pointerEvents="box-none"` (taps fall THROUGH the empty
// gaps to whatever is behind, but a press that lands ON an option is the option's).
// No page-level pan can swallow it because the option is the deepest hit target.
//
// ANIMATION (STREAM G2 — web/mobile parity): result bars grow with an animated PIXEL
// width (measured track × p%, NOT an interpolated %-string — see anim.ts for why that
// diverged on rn-web), the count COUNTS UP toward the new tally, and a bar PULSES briefly
// when its tally increments. The hooks live in the shared `./anim` module so the streamer
// preview + every viewer + web + mobile run the EXACT same animation.

import { type ReactNode } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import {
  pct,
  type OverlayInstance,
  type OverlayViewProps,
  type PollPayload,
  type QuizPayload,
  type VoteButtonPayload,
} from '@paxpia/core';
import { colors } from '../theme/tokens';
import { useBarFill, useCountUp, usePulse } from './anim';

const BRAND = colors.brand;

// ── poll ─────────────────────────────────────────────────────────────────────

/** A poll result bar that is ALSO a tap target — a voter can CHANGE their answer by
 *  tapping another bar (single-vote, re-vote allowed). The fill grows + pulses on
 *  increment; `mine` highlights the committed choice. The `Pressable` OWNS its tap
 *  (box-only) so no page-level pan can swallow it (§6b). */
function ResultBar({
  label,
  count,
  t,
  mine,
  onPress,
}: {
  label: string;
  count: number;
  t: number;
  mine?: boolean;
  onPress?: () => void;
}) {
  const shownCount = useCountUp(count);
  const pulsing = usePulse(count);
  const p = pct(count, t);
  const { onTrackLayout, width } = useBarFill(p);
  return (
    <Pressable style={styles.barRow} onPress={onPress} disabled={!onPress} pointerEvents="box-only">
      <View style={styles.barLabelRow}>
        <Text style={[styles.barLabel, mine && styles.barLabelMine]} numberOfLines={1}>
          {label}
          {mine ? ' · you' : ''}
        </Text>
        <Text style={[styles.barPct, pulsing && styles.barPctPulse]}>{pct(shownCount, t)}%</Text>
      </View>
      <View style={styles.barTrack} onLayout={onTrackLayout}>
        <Animated.View
          style={[
            styles.barFill,
            { width, backgroundColor: mine ? BRAND : 'rgba(108,92,231,0.5)', opacity: pulsing ? 1 : 0.92 },
          ]}
        />
      </View>
    </Pressable>
  );
}

export function PollOverlay({ overlay, view }: { overlay: OverlayInstance<PollPayload>; view: OverlayViewProps }) {
  const { voted, mine, tallies, total, onVote } = view;
  // Re-vote is offered only on a real VIEWER surface (a committed `mine`); the
  // producer preview has mine=undefined so its bars stay static (web/mobile parity).
  const canRevote = mine != null;
  return (
    <View style={styles.stack} pointerEvents="box-none">
      <Text style={styles.question}>{overlay.payload.question}</Text>
      {overlay.payload.options.map((o) =>
        voted ? (
          <ResultBar
            key={o.id}
            label={o.label}
            count={tallies[o.id] ?? 0}
            t={total}
            mine={o.id === mine}
            onPress={canRevote && o.id !== mine ? () => onVote(o.id) : undefined}
          />
        ) : (
          <Pressable
            key={o.id}
            onPress={() => onVote(o.id)}
            pointerEvents="box-only"
            style={({ pressed }) => [styles.optionBtn, pressed && styles.optionBtnPressed]}
          >
            <Text style={styles.optionLabel}>{o.label}</Text>
          </Pressable>
        ),
      )}
      {voted ? <Text style={styles.footerNote}>You voted · {total} votes · tap another to change</Text> : null}
    </View>
  );
}

// ── vote-button ────────────────────────────────────────────────────────────────

/** One side of a two-sided vote button — fill grows + pulses on increment. After
 *  voting the OTHER side stays tappable so a viewer can switch (re-vote); your side
 *  is a no-op. The `Pressable` owns its tap (§6b). */
function VoteSide({
  side,
  i,
  count,
  total,
  voted,
  mine,
  canRevote,
  onVote,
}: {
  side: { id: string; label: string };
  i: number;
  count: number;
  total: number;
  voted: boolean;
  mine?: string;
  canRevote: boolean;
  onVote: (choice: string) => void;
}) {
  const pulsing = usePulse(count);
  const p = pct(count, total);
  const { onTrackLayout, width } = useBarFill(p);
  const isMine = mine === side.id;
  const clickable = !voted || (canRevote && !isMine);
  const sideBg = i === 0 ? 'rgba(244,63,94,0.2)' : 'rgba(56,189,248,0.2)';
  const fillBg = i === 0 ? 'rgba(244,63,94,0.35)' : 'rgba(56,189,248,0.35)';
  return (
    <Pressable
      disabled={!clickable}
      onPress={() => onVote(side.id)}
      pointerEvents="box-only"
      onLayout={onTrackLayout}
      style={[styles.voteSide, { backgroundColor: sideBg }, isMine && styles.voteSideMine]}
    >
      {voted ? (
        <Animated.View style={[styles.voteFill, { width, backgroundColor: fillBg, opacity: pulsing ? 1 : 0.85 }]} />
      ) : null}
      <Text style={styles.voteLabel}>{side.label}</Text>
      {voted ? <Text style={styles.votePct}>{p}%</Text> : null}
    </Pressable>
  );
}

export function VoteButtonOverlay({
  overlay,
  view,
}: {
  overlay: OverlayInstance<VoteButtonPayload>;
  view: OverlayViewProps;
}) {
  const { voted, mine, tallies, total, onVote } = view;
  const { a, b, prompt } = overlay.payload;
  const canRevote = mine != null;
  return (
    <View style={styles.stack} pointerEvents="box-none">
      <Text style={[styles.question, styles.center]}>{prompt}</Text>
      <View style={styles.voteRow}>
        {[a, b].map((side, i) => (
          <VoteSide
            key={side.id}
            side={side}
            i={i}
            count={tallies[side.id] ?? 0}
            total={total}
            voted={voted}
            mine={mine}
            canRevote={canRevote}
            onVote={onVote}
          />
        ))}
      </View>
      <Text style={[styles.footerNote, styles.center]}>{voted ? 'Tap the other side to switch' : 'Tap a side to vote'}</Text>
    </View>
  );
}

// ── quiz ─────────────────────────────────────────────────────────────────────

/** One quiz answer row with a live-tally fill behind it. Before reveal a committed
 *  answer can be CHANGED; once revealed the option locks. The `Pressable` owns its
 *  tap (§6b). */
function QuizOption({
  option,
  count,
  total,
  showTally,
  voted,
  canRevote,
  isMine,
  isCorrect,
  isWrongMine,
  onVote,
}: {
  option: { id: string; label: string };
  count: number;
  total: number;
  showTally: boolean;
  voted: boolean;
  canRevote: boolean;
  isMine: boolean;
  isCorrect: boolean;
  isWrongMine: boolean;
  onVote: (choice: string) => void;
}) {
  const pulsing = usePulse(count);
  const shownCount = useCountUp(count);
  const p = pct(count, total);
  const { onTrackLayout, width } = useBarFill(p);
  const clickable = !voted || (canRevote && !isMine);
  return (
    <Pressable
      disabled={!clickable}
      onPress={() => onVote(option.id)}
      pointerEvents="box-only"
      onLayout={onTrackLayout}
      style={[styles.quizOption, isCorrect && styles.quizOptionCorrect, isWrongMine && styles.quizOptionWrong]}
    >
      {showTally ? <Animated.View style={[styles.quizFill, { width, opacity: pulsing ? 0.22 : 0.12 }]} /> : null}
      <View style={styles.quizOptionInner}>
        <Text style={styles.quizLabel} numberOfLines={2}>
          {option.label}
          {isCorrect ? '  ✓' : ''}
        </Text>
        {showTally ? <Text style={[styles.quizPct, pulsing && styles.barPctPulse]}>{pct(shownCount, total)}%</Text> : null}
      </View>
    </Pressable>
  );
}

export function QuizOverlay({ overlay, view }: { overlay: OverlayInstance<QuizPayload>; view: OverlayViewProps }) {
  const { voted, mine, tallies, total, onVote } = view;
  // The correct option is only revealed once the streamer closes/reveals.
  const revealed = overlay.phase === 'closed' || (overlay.phase as string) === 'revealed';
  const correct = revealed ? overlay.payload.correctOptionId : undefined;
  const showTally = voted || revealed;
  const canRevote = mine != null && !revealed;
  return (
    <View style={styles.stack} pointerEvents="box-none">
      <Text style={styles.quizKicker}>QUIZ</Text>
      <Text style={styles.question}>{overlay.payload.question}</Text>
      {overlay.payload.options.map((o) => (
        <QuizOption
          key={o.id}
          option={o}
          count={tallies[o.id] ?? 0}
          total={total}
          showTally={showTally}
          voted={voted}
          canRevote={canRevote}
          isMine={mine === o.id}
          isCorrect={correct === o.id}
          isWrongMine={revealed && mine === o.id && correct !== o.id}
          onVote={onVote}
        />
      ))}
      {voted && !revealed ? <Text style={styles.footerNote}>Answer in — tap another to change before reveal.</Text> : null}
      {revealed ? (
        <Text style={styles.footerNote}>{mine === correct ? 'Correct!' : 'The highlighted answer is correct.'}</Text>
      ) : null}
    </View>
  );
}

/** The ONE participation dispatcher — poll / quiz / vote-button. Consumed by
 *  `OverlayRenderer`. Non-participation kinds are not this component's concern.
 *
 *  OPERATOR affordances (additive, viewer is unaffected when both are omitted): pass
 *  `onRefresh` to show a `↻` reset button in a compact title bar, and `onExpand` to make
 *  that bar tappable → a fullscreen results view (the vote options keep their own taps, so
 *  the header is the "press inside the overlay" target). Keeping the count + reset + expand
 *  INSIDE the overlay is the limited-real-estate design (Noel): the component carries its
 *  own controls, and the fullscreen view is where future detail (voter lists, members) goes.
 *  `expanded` marks the fullscreen instance (it drops the expand icon). */
export function ParticipationOverlay({
  overlay,
  view,
  onRefresh,
  onExpand,
  expanded = false,
}: {
  overlay: OverlayInstance;
  view: OverlayViewProps;
  onRefresh?: () => void;
  onExpand?: () => void;
  expanded?: boolean;
}) {
  let body: ReactNode = null;
  switch (overlay.kind) {
    case 'poll':
      body = <PollOverlay overlay={overlay as OverlayInstance<PollPayload>} view={view} />;
      break;
    case 'vote-button':
      body = <VoteButtonOverlay overlay={overlay as OverlayInstance<VoteButtonPayload>} view={view} />;
      break;
    case 'quiz':
      body = <QuizOverlay overlay={overlay as OverlayInstance<QuizPayload>} view={view} />;
      break;
    default:
      return null;
  }

  // Viewer (no operator callbacks): render the body exactly as before.
  if (!onRefresh && !onExpand) return body;

  // Operator: a compact title bar (live count + ↻ reset + ⤢ expand) above the body. The bar
  // is the tap target for fullscreen; the ↻ is a nested Pressable that owns its own tap.
  const votes = `${view.total} ${view.total === 1 ? 'vote' : 'votes'}`;
  return (
    <View style={[styles.opStack, expanded && styles.opStackExpanded]} pointerEvents="box-none">
      <Pressable style={styles.opHeader} onPress={onExpand} disabled={!onExpand}>
        <View style={styles.opCount}>
          <View style={styles.opLiveDot} />
          <Text style={styles.opCountText}>{votes}</Text>
        </View>
        <View style={styles.opActions}>
          {onExpand && !expanded ? <Text style={styles.opGlyph}>⤢</Text> : null}
          {onRefresh ? (
            <Pressable onPress={onRefresh} hitSlop={12} style={styles.opRefreshBtn} accessibilityRole="button" accessibilityLabel="Reset poll">
              <Text style={styles.opRefreshGlyph}>↻</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  // PARITY: an RN View defaults to flexDirection:'column' + alignItems:'stretch', but a
  // rn-web wrapper <div> can inherit a row/center context from its parent. Pin the column +
  // stretch + full width EXPLICITLY so the participation content fills its rect the same way
  // on both — its children (question, bars, rows) then span the full width identically.
  stack: { width: '100%', alignSelf: 'stretch', flexDirection: 'column', alignItems: 'stretch', rowGap: 8 },

  // Operator wrapper: the title bar + the participation body. `box-none` so taps pass to the
  // header / vote options as appropriate.
  opStack: { width: '100%', alignSelf: 'stretch', flexDirection: 'column', alignItems: 'stretch', rowGap: 8 },
  opStackExpanded: { rowGap: 14 },
  opHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 6, marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  opCount: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  opLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND },
  opCountText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  opActions: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  opGlyph: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  opRefreshBtn: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  opRefreshGlyph: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 18 },
  center: { textAlign: 'center' },
  question: { color: '#fff', fontSize: 14, fontWeight: '700' },
  optionBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionBtnPressed: { backgroundColor: 'rgba(255,255,255,0.16)' },
  optionLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  footerNote: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },

  // ResultBar — full-width rows so the track measures the SAME px width on both platforms
  // (the px-based fill in anim.ts depends on a stable measured track).
  barRow: { width: '100%', alignSelf: 'stretch', rowGap: 3 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, flex: 1, marginRight: 8 },
  barLabelMine: { color: BRAND, fontWeight: '700' },
  barPct: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontVariant: ['tabular-nums'] },
  barPctPulse: { color: BRAND },
  barTrack: { width: '100%', alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  // The fill height fills the track via top/bottom:0 (an absolute fill anchored to the
  // track's left edge) — width is the animated PIXEL value from useBarFill, so it grows
  // left→right identically on rn-web + RN. `left:0` anchors it; no %-string width.
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },

  // VoteButton
  voteRow: { width: '100%', alignSelf: 'stretch', flexDirection: 'row', columnGap: 8 },
  voteSide: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  voteSideMine: { borderColor: BRAND },
  voteFill: { position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 0 },
  // PARITY: on rn-web an absolutely-positioned sibling (the fill) paints ABOVE in-flow
  // siblings unless they're given a stacking context; RN paints purely in document order.
  // Pin the label/pct above the fill with zIndex on BOTH so the text never gets covered on
  // web (it was always on top on mobile).
  voteLabel: { color: '#fff', fontSize: 16, fontWeight: '800', zIndex: 1 },
  votePct: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4, zIndex: 1 },

  // Quiz
  quizKicker: { color: BRAND, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  quizOption: {
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  quizOptionCorrect: { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(52,211,153,0.9)' },
  quizOptionWrong: { backgroundColor: 'rgba(244,63,94,0.2)', borderColor: 'rgba(251,113,133,0.9)' },
  quizFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fff', zIndex: 0 },
  // PARITY: keep the answer row above the absolute tally fill on web (zIndex), matching the
  // document-order layering RN gives for free.
  quizOptionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    columnGap: 8,
    zIndex: 1,
  },
  quizLabel: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  quizPct: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontVariant: ['tabular-nums'] },
});
