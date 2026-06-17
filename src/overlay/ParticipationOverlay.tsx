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
// ANIMATION: result bars grow with an Animated width and the count COUNTS UP toward
// the new tally; a bar PULSES briefly when its tally increments. Same model on the
// streamer preview + every viewer, so a vote visibly "lands". The MODEL (tallies/
// total) is identical to web; only the Animated primitive differs from web's CSS.

import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import {
  pct,
  type OverlayInstance,
  type OverlayViewProps,
  type PollPayload,
  type QuizPayload,
  type VoteButtonPayload,
} from '@paxpia/core';
import { colors } from '../theme/tokens';

const BRAND = colors.brand;

// ── shared count-up + pulse hooks (rn-web Animated, the cross-platform primitive
//    that maps to web's CSS transition + RN's Animated.timing) ──────────────────

/** Smoothly count a displayed number toward `target`. easeOutCubic so increments
 *  feel snappy. Animated value read in JS (useNativeDriver:false) to render text. */
function useCountUp(target: number, ms = 450): number {
  const [shown, setShown] = useState(target);
  const anim = useRef(new Animated.Value(target)).current;
  const shownRef = useRef(target);
  shownRef.current = shown;
  useEffect(() => {
    if (target === shownRef.current) return;
    anim.setValue(shownRef.current);
    const id = anim.addListener(({ value }) => setShown(Math.round(value)));
    const a = Animated.timing(anim, {
      toValue: target,
      duration: ms,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => {
      a.stop();
      anim.removeListener(id);
    };
    // Only re-run when the TARGET changes (shown read via ref, not a dep).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return shown;
}

/** True briefly right after `count` INCREASES — drives the pulse when a vote lands. */
function usePulse(count: number, ms = 500): boolean {
  const prev = useRef(count);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (count > prev.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), ms);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count, ms]);
  return pulsing;
}

/** An Animated width %, kept in sync with `p` (the live percentage). */
function useWidthPct(p: number) {
  const anim = useRef(new Animated.Value(p)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: p, duration: 500, useNativeDriver: false }).start();
  }, [p, anim]);
  return anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
}

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
  const width = useWidthPct(p);
  return (
    <Pressable style={styles.barRow} onPress={onPress} disabled={!onPress} pointerEvents="box-only">
      <View style={styles.barLabelRow}>
        <Text style={[styles.barLabel, mine && styles.barLabelMine]} numberOfLines={1}>
          {label}
          {mine ? ' · you' : ''}
        </Text>
        <Text style={[styles.barPct, pulsing && styles.barPctPulse]}>{pct(shownCount, t)}%</Text>
      </View>
      <View style={styles.barTrack}>
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
  const width = useWidthPct(p);
  const isMine = mine === side.id;
  const clickable = !voted || (canRevote && !isMine);
  const sideBg = i === 0 ? 'rgba(244,63,94,0.2)' : 'rgba(56,189,248,0.2)';
  const fillBg = i === 0 ? 'rgba(244,63,94,0.35)' : 'rgba(56,189,248,0.35)';
  return (
    <Pressable
      disabled={!clickable}
      onPress={() => onVote(side.id)}
      pointerEvents="box-only"
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
  const width = useWidthPct(p);
  const clickable = !voted || (canRevote && !isMine);
  return (
    <Pressable
      disabled={!clickable}
      onPress={() => onVote(option.id)}
      pointerEvents="box-only"
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
 *  `OverlayRenderer`. Non-participation kinds are not this component's concern. */
export function ParticipationOverlay({ overlay, view }: { overlay: OverlayInstance; view: OverlayViewProps }) {
  switch (overlay.kind) {
    case 'poll':
      return <PollOverlay overlay={overlay as OverlayInstance<PollPayload>} view={view} />;
    case 'vote-button':
      return <VoteButtonOverlay overlay={overlay as OverlayInstance<VoteButtonPayload>} view={view} />;
    case 'quiz':
      return <QuizOverlay overlay={overlay as OverlayInstance<QuizPayload>} view={view} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  stack: { rowGap: 8 },
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

  // ResultBar
  barRow: { rowGap: 3 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, flex: 1, marginRight: 8 },
  barLabelMine: { color: BRAND, fontWeight: '700' },
  barPct: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontVariant: ['tabular-nums'] },
  barPctPulse: { color: BRAND },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  // VoteButton
  voteRow: { flexDirection: 'row', columnGap: 8 },
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
  voteFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  voteLabel: { color: '#fff', fontSize: 16, fontWeight: '800' },
  votePct: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

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
  quizFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fff' },
  quizOptionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    columnGap: 8,
  },
  quizLabel: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  quizPct: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontVariant: ['tabular-nums'] },
});
