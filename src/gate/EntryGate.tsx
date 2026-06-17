// EntryGate — the ONE shared pre-join loading shell (§5c, Task F). It renders PURELY
// from the core `GateState` (the two-checklist gate machine's output, Task D) and
// replaces web `WaitingRoom` + `StreamPreloader` AND mobile `WaitingRoom` + the three
// inline overlays in `LivestreamViewerScreen`. Per the addendum it RETAINS all
// features from both: a center avatar circle, the feed title, the Paxpia logo, a
// progress bar, and the in-flight ✓ checklist of the VISIBLE steps (turning green +
// ✓ as each completes).
//
// PURE presentational rn-web (View/Text + the shared Avatar). The gate machine owns
// the lifecycle (clean-up → connect → A/V readiness → hand-off); this shell only
// paints its state. It shows ONLY the `visible:true` steps — the hidden readiness
// gates (decoder reclaim, track subscribe, mute-applied, manifest-ready, first-
// snapshot) advance `canHandOff` without cluttering the UI. The progress bar is the
// real, smoothed download % from the `download` step plus the overall step
// completion, so "100% download ≠ go": the bar can sit at 100% while a hidden step is
// still pending, and only the parent's hand-off on `canHandOff` dismisses the shell.

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type GateState, type GateStep } from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';

export interface EntryGateProps {
  /** The gate machine's current state (steps + phase + canHandOff). */
  gate: GateState;
  /** The feed/streamer avatar URL — the centre circle. */
  avatarUri?: string | null;
  /** The streamer display name — the avatar monogram fallback. */
  name?: string;
  /** The feed title, under the avatar. */
  title?: string;
  /** Branding wordmark (defaults to "Paxpia"). */
  brand?: string;
}

/** Overall progress 0..1 across the gate. We blend the explicit download % (the
 *  `download` step's `progress`, the honest HEAD-size %) with the fraction of ALL
 *  steps done, so the bar advances through join + the hidden readiness gates too —
 *  never snapping to 100% the instant bytes finish. */
function gateProgress(steps: GateStep[]): number {
  if (steps.length === 0) return 0;
  let done = 0;
  for (const s of steps) {
    if (s.status === 'done') done += 1;
    else if (s.id === 'download' && typeof s.progress === 'number') done += Math.max(0, Math.min(1, s.progress));
    else if (s.status === 'active') done += 0.25;
  }
  return Math.max(0, Math.min(1, done / steps.length));
}

/** One visible checklist row — turns green + ✓ when done; a hollow dot while
 *  pending/active. */
function ChecklistRow({ step }: { step: GateStep }) {
  const done = step.status === 'done';
  const active = step.status === 'active';
  const pctText =
    step.id === 'download' && typeof step.progress === 'number' && !done
      ? ` ${Math.round(step.progress * 100)}%`
      : '';
  return (
    <View style={styles.row}>
      <View style={[styles.mark, done && styles.markDone, active && !done && styles.markActive]}>
        <Text style={[styles.markGlyph, done && styles.markGlyphDone]}>{done ? '✓' : ''}</Text>
      </View>
      <Text style={[styles.rowLabel, done && styles.rowLabelDone]} numberOfLines={1}>
        {step.label}
        {pctText}
      </Text>
    </View>
  );
}

export function EntryGate({ gate, avatarUri, name, title, brand = 'Paxpia' }: EntryGateProps) {
  // Only the VISIBLE steps render in the checklist (hidden readiness gates advance
  // canHandOff but don't clutter the UI).
  const visibleSteps = useMemo(() => gate.steps.filter((s) => s.visible), [gate.steps]);
  const progress = useMemo(() => gateProgress(gate.steps), [gate.steps]);
  const failed = gate.phase === 'failed';

  return (
    <View style={styles.root}>
      {/* Center: avatar circle + feed title. */}
      <View style={styles.center}>
        <Avatar uri={avatarUri} name={name} size={96} ring />
        {title ? (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        ) : null}

        {/* Logo / wordmark. */}
        <View style={styles.logoRow}>
          <Text style={styles.logoGlyph}>▶</Text>
          <Text style={styles.wordmark}>{brand}</Text>
        </View>

        {/* Progress bar — real, smoothed % blended across all steps. */}
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }, failed && styles.barFillFailed]} />
        </View>

        {/* The visible ✓ checklist — each turns green + ✓ as it completes. */}
        <View style={styles.checklist}>
          {visibleSteps.map((s) => (
            <ChecklistRow key={s.id} step={s} />
          ))}
        </View>

        {failed ? <Text style={styles.failed}>Couldn't join — retrying…</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0816', overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, rowGap: 14 },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', columnGap: 7 },
  logoGlyph: { color: colors.live, fontSize: 18 },
  wordmark: { color: '#fff', fontSize: 20, fontWeight: '900' },
  barTrack: {
    width: '78%',
    maxWidth: 320,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: colors.brand },
  barFillFailed: { backgroundColor: colors.live },
  checklist: { alignSelf: 'center', rowGap: 6, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markActive: { borderColor: colors.brand },
  markDone: { borderColor: '#10b981', backgroundColor: '#10b981' },
  markGlyph: { fontSize: 10, fontWeight: '900', color: 'transparent' },
  markGlyphDone: { color: '#06281c' },
  rowLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  rowLabelDone: { color: 'rgba(255,255,255,0.9)' },
  failed: { color: colors.live, fontSize: 12, marginTop: 4 },
});
