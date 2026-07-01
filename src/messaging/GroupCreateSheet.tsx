// GroupCreateSheet — the SHARED "new group / channel" creation sheet (rn-web):
// a name field + an (optional) avatar affordance + a searchable member picker +
// a Create action. Pure & PROPS-DRIVEN: the host supplies the candidate directory
// (`candidates`) and owns ALL transport — this component only collects
// {kind, title, avatar_url, memberIds} and reports it up via `onCreate`. It fetches
// nothing, imports no platform, and holds only local form state (name + selection +
// query). Reused for both `group` and `channel` (the `kind` prop flips the copy);
// the plan (§1a) makes the creator the `owner` server-side, so no role is collected
// here.

import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ThreadKind } from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';

/** A pickable member (a lightweight directory row; NOT a thread Participant — the
 *  thread doesn't exist yet). The host maps its social/search directory → this. */
export interface MemberCandidate {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  handle?: string;
}

/** The collected payload handed up on Create. `kind` echoes the sheet's mode so the
 *  host can call `createGroup` vs `createChannel`. `avatar_url` is whatever the host
 *  resolved via `onPickAvatar` (a CDN url); this component never uploads. */
export interface GroupCreateResult {
  kind: Extract<ThreadKind, 'group' | 'channel'>;
  title: string;
  avatar_url?: string;
  memberIds: string[];
}

export interface GroupCreateSheetProps {
  /** 'group' (everyone posts) or 'channel' (broadcast). Flips copy/validation. */
  kind: Extract<ThreadKind, 'group' | 'channel'>;
  /** The directory of people the creator may add (host-provided; already scoped to
   *  who they can message). */
  candidates: MemberCandidate[];
  /** Called with the collected payload. The host performs the create + closes. */
  onCreate: (result: GroupCreateResult) => void;
  onCancel?: () => void;
  /** Open the platform avatar picker; resolves to a CDN url (or undefined if
   *  cancelled). The host owns the image pipeline — this sheet only stores the url. */
  onPickAvatar?: () => Promise<string | undefined> | void;
  /** A pre-resolved avatar url (when the host drives the picker externally). */
  avatarUrl?: string;
  /** Require at least one member before Create enables (default true). */
  requireMember?: boolean;
  busy?: boolean;
}

export function GroupCreateSheet({
  kind,
  candidates,
  onCreate,
  onCancel,
  onPickAvatar,
  avatarUrl,
  requireMember = true,
  busy = false,
}: GroupCreateSheetProps) {
  const isChannel = kind === 'channel';
  const [title, setTitle] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(avatarUrl);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) => (c.display_name ?? '').toLowerCase().includes(q) || (c.handle ?? '').toLowerCase().includes(q),
    );
  }, [candidates, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canCreate = title.trim().length > 0 && (!requireMember || selected.size > 0) && !busy;

  const pickAvatar = async () => {
    const url = await onPickAvatar?.();
    if (typeof url === 'string' && url) setAvatar(url);
  };

  const create = () => {
    if (!canCreate) return;
    onCreate({ kind, title: title.trim(), avatar_url: avatar, memberIds: [...selected] });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {onCancel ? (
          <Pressable onPress={onCancel} accessibilityLabel="Cancel">
            <Text style={styles.headerAction}>Cancel</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.headerTitle}>{isChannel ? 'New channel' : 'New group'}</Text>
        <Pressable onPress={create} disabled={!canCreate} accessibilityLabel="Create">
          <Text style={[styles.headerAction, styles.headerCreate, !canCreate && styles.headerDisabled]}>Create</Text>
        </Pressable>
      </View>

      <View style={styles.identityRow}>
        <Pressable style={styles.avatarBtn} onPress={pickAvatar} accessibilityLabel="Set image">
          <Avatar uri={avatar} name={title || (isChannel ? 'Channel' : 'Group')} size={56} />
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>＋</Text>
          </View>
        </Pressable>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={isChannel ? 'Channel name' : 'Group name'}
          placeholderTextColor={colors.textMuted}
          style={styles.nameInput}
        />
      </View>

      <View style={styles.pickerHeader}>
        <Text style={styles.pickerLabel}>{isChannel ? 'Subscribers' : 'Members'}</Text>
        {selected.size > 0 ? <Text style={styles.pickerCount}>{selected.size} selected</Text> : null}
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search people…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(c) => c.user_id}
        renderItem={({ item }) => {
          const on = selected.has(item.user_id);
          return (
            <Pressable style={styles.candidateRow} onPress={() => toggle(item.user_id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Avatar uri={item.avatar_url} name={item.display_name ?? item.handle} size={40} />
              <View style={styles.candidateBody}>
                <Text style={styles.candidateName} numberOfLines={1}>
                  {item.display_name || item.handle || `@${item.user_id.slice(0, 8)}`}
                </Text>
                {item.handle ? (
                  <Text style={styles.candidateHandle} numberOfLines={1}>
                    @{item.handle}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.check, on && styles.checkOn]}>{on ? <Text style={styles.checkMark}>✓</Text> : null}</View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No people found</Text>
          </View>
        }
      />
    </View>
  );
}

const BRAND = colors.brand;

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%', paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerSpacer: { width: 54 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  headerAction: { color: colors.textMuted, fontSize: 14 },
  headerCreate: { color: BRAND, fontWeight: '700' },
  headerDisabled: { color: colors.textMuted, opacity: 0.5 },

  identityRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  avatarBtn: { position: 'relative' },
  avatarBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  avatarBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  nameInput: { flex: 1, color: colors.text, fontSize: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 6 },

  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  pickerLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerCount: { color: BRAND, fontSize: 12, fontWeight: '600' },

  searchBox: { flexDirection: 'row', alignItems: 'center', columnGap: 8, marginHorizontal: 16, backgroundColor: colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  searchIcon: { fontSize: 13, color: colors.textMuted },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },

  list: { flexGrow: 0 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  candidateBody: { flex: 1 },
  candidateName: { color: colors.text, fontSize: 14, fontWeight: '500' },
  candidateHandle: { color: colors.textMuted, fontSize: 12 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: BRAND, borderColor: BRAND },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },

  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
