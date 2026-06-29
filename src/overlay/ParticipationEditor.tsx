// ParticipationEditor — the ONE shared poll / quiz / vote-button AUTHORING surface
// (WI-7e). Web and mobile both render THIS (rn-web on web via the react-native
// alias, React Native on mobile), so the create/edit flow can't diverge.
//
// It is the editor counterpart to `ParticipationOverlay` (the viewer renderer):
//   • a SEGMENTED TYPE PICKER (Poll · Vote A/B · Quiz),
//   • a question / prompt field,
//   • the OPTIONS editor (add / edit / remove rows; quiz rows carry a "correct"
//     toggle; vote-button is fixed at exactly two sides A / B),
//   • a LIVE PREVIEW that renders the EXACT `ParticipationOverlay` viewers will see,
//     built from core's `previewInstance` — what the tutor builds is what ships.
//
// It is CONTROLLED: the host owns the `ParticipationDraft` (so it can persist drafts,
// pre-fill for editing, etc.) and passes `draft` + `onChange`. All draft mutation goes
// through the PURE `@paxpia/core` authoring helpers (`setDraftKind`/`addDraftOption`/…)
// — this component holds NO model logic. `onSave` fires with the finalized overlay blob
// (`{ kind, title, payload }`, ready for `scheduling addOverlayItem`) and is disabled
// until `validateParticipationDraft` passes; inline field hints come from the validator.
//
// The host supplies the id generator (`idGen`) — web Math.random, RN uuid/same — so
// core stays free of an id scheme, exactly like the scheduling reducers.

import { useMemo } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import {
  previewInstance,
  addDraftOption,
  editDraftOption,
  removeDraftOption,
  setDraftCorrect,
  setDraftKind,
  setDraftQuestion,
  validateParticipationDraft,
  finalizeParticipationOverlay,
  MAX_PARTICIPATION_OPTIONS,
  type ParticipationDraft,
  type ParticipationKind,
  type ParticipationPayload,
} from '@paxpia/core';
import { colors } from '../theme/tokens';
import { ParticipationOverlay } from './ParticipationOverlay';

const BRAND = colors.brand;

const KINDS: ParticipationKind[] = ['poll', 'vote-button', 'quiz'];
const KIND_LABEL: Record<ParticipationKind, string> = {
  poll: 'Poll',
  'vote-button': 'Vote A/B',
  quiz: 'Quiz',
};

/** The finalized authored-overlay blob the editor emits on save (the
 *  `TimelineOverlayItem['overlay']` shape scheduling's `addOverlayItem` accepts). */
export interface AuthoredOverlayBlob {
  kind: ParticipationKind;
  title: string;
  payload: ParticipationPayload;
}

export interface ParticipationEditorProps {
  /** The current draft (host-owned, so drafts can persist + pre-fill for editing). */
  draft: ParticipationDraft;
  /** Report a NEW draft after any edit (the host stores it + re-renders). */
  onChange: (next: ParticipationDraft) => void;
  /** Mint a new option-row id (web: Math.random; RN: uuid or same). */
  idGen: () => string;
  /** Commit the finalized overlay blob (only callable once the draft validates). The
   *  host appends it to the class timeline (scheduling `addOverlayItem`). */
  onSave: (overlay: AuthoredOverlayBlob) => void;
  /** Optional cancel affordance — renders a Cancel button beside Save when supplied. */
  onCancel?: () => void;
  /** Save button copy (default "Add to timeline"). */
  saveLabel?: string;
  /** Hide the built-in live preview pane (a host that renders its own preview). */
  hidePreview?: boolean;
}

export function ParticipationEditor({
  draft,
  onChange,
  idGen,
  onSave,
  onCancel,
  saveLabel = 'Add to timeline',
  hidePreview = false,
}: ParticipationEditorProps) {
  const validation = useMemo(() => validateParticipationDraft(draft), [draft]);
  const isVote = draft.kind === 'vote-button';
  const canAddOption = !isVote && draft.options.length < MAX_PARTICIPATION_OPTIONS;

  // Build the live-preview instance off the SAME finalize path the save uses, so the
  // preview only paints once the draft is valid (matches what viewers will get).
  const previewOverlay = useMemo(() => {
    const finalized = finalizeParticipationOverlay(draft);
    if (!finalized) return null;
    return previewInstance(finalized);
  }, [draft]);

  const save = () => {
    const finalized = finalizeParticipationOverlay(draft);
    if (!finalized) return;
    onSave(finalized);
  };

  return (
    <View style={styles.root}>
      {/* ── Form ── */}
      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        {/* Segmented type picker */}
        <View style={styles.segment}>
          {KINDS.map((k) => {
            const on = draft.kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => onChange(setDraftKind(draft, k, idGen))}
                style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{KIND_LABEL[k]}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Question / prompt */}
        <TextInput
          value={draft.question}
          onChangeText={(t) => onChange(setDraftQuestion(draft, t))}
          placeholder={isVote ? 'Prompt (e.g. Which side?)' : 'Question'}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
        {validation.errors.question ? <Text style={styles.error}>{validation.errors.question}</Text> : null}

        {/* Options editor */}
        <View style={styles.options}>
          {draft.options.map((o, i) => {
            const isCorrect = draft.kind === 'quiz' && draft.correctOptionId === o.id;
            return (
              <View key={o.id} style={styles.optionRow}>
                <TextInput
                  value={o.label}
                  onChangeText={(t) => onChange(editDraftOption(draft, o.id, t))}
                  placeholder={isVote ? (i === 0 ? 'Side A' : 'Side B') : `Option ${i + 1}`}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.optionInput]}
                />
                {/* Quiz only: mark the correct answer. */}
                {draft.kind === 'quiz' ? (
                  <Pressable
                    onPress={() => onChange(setDraftCorrect(draft, o.id))}
                    style={[styles.correctBtn, isCorrect && styles.correctBtnOn]}
                    accessibilityRole="button"
                    accessibilityLabel={isCorrect ? 'Correct answer' : 'Mark as correct answer'}
                  >
                    <Text style={[styles.correctText, isCorrect && styles.correctTextOn]}>
                      {isCorrect ? '✓ correct' : 'correct'}
                    </Text>
                  </Pressable>
                ) : null}
                {/* poll/quiz can drop rows above the minimum; vote-button is fixed at two. */}
                {!isVote && draft.options.length > 2 ? (
                  <Pressable
                    onPress={() => onChange(removeDraftOption(draft, o.id))}
                    style={styles.removeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Remove option"
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {canAddOption ? (
            <Pressable onPress={() => onChange(addDraftOption(draft, idGen))} style={styles.addBtn} accessibilityRole="button">
              <Text style={styles.addText}>＋ Add option</Text>
            </Pressable>
          ) : null}
          {validation.errors.options ? <Text style={styles.error}>{validation.errors.options}</Text> : null}
          {validation.errors.correct ? <Text style={styles.error}>{validation.errors.correct}</Text> : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={save}
            disabled={!validation.ok}
            style={[styles.saveBtn, !validation.ok && styles.saveBtnOff]}
            accessibilityRole="button"
          >
            <Text style={styles.saveText}>{saveLabel}</Text>
          </Pressable>
          {onCancel ? (
            <Pressable onPress={onCancel} style={styles.cancelBtn} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Live preview ── exactly what viewers will see. */}
      {!hidePreview ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Live preview</Text>
          <View style={styles.previewBody}>
            {previewOverlay ? (
              <ParticipationOverlay overlay={previewOverlay} view={PREVIEW_VIEW} />
            ) : (
              <Text style={styles.previewHint}>Fill the form to preview.</Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** A non-interactive preview: nobody has voted, empty tallies, vote is a no-op — so the
 *  authoring preview shows the pristine pre-vote state the streamer will serve. */
const PREVIEW_VIEW = { voted: false, mine: undefined, tallies: {}, total: 0, onVote: () => {} };

const styles = StyleSheet.create({
  // Column on narrow (mobile), the host can wrap it however it likes; the preview sits
  // under the form. (Web's modal lays the two side-by-side via its own shell.)
  root: { width: '100%', rowGap: 16 },
  form: { width: '100%' },
  formContent: { rowGap: 12 },

  segment: { flexDirection: 'row', columnGap: 8 },
  segmentBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surfaceMuted },
  segmentBtnOn: { backgroundColor: BRAND },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segmentTextOn: { color: '#fff', fontWeight: '700' },

  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  options: { rowGap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  optionInput: { flex: 1, paddingVertical: 8 },

  correctBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surfaceMuted },
  correctBtnOn: { backgroundColor: 'rgba(16,185,129,0.25)' },
  correctText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  correctTextOn: { color: '#6ee7b7', fontWeight: '700' },

  removeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  removeText: { color: colors.textMuted, fontSize: 14 },

  addBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  addText: { color: BRAND, fontSize: 13, fontWeight: '700' },

  error: { color: '#fda4af', fontSize: 12 },

  actions: { flexDirection: 'row', alignItems: 'center', columnGap: 10, paddingTop: 4 },
  saveBtn: { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  saveBtnOff: { opacity: 0.4 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelBtn: { backgroundColor: colors.surfaceMuted, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { color: colors.text, fontSize: 14 },

  preview: { rowGap: 8 },
  previewLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  previewBody: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  previewHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 24 },
});
