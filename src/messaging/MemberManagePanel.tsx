// MemberManagePanel — the SHARED thread-membership manager (rn-web): a member list
// with each participant's role and, GATED by the caller's own authority, promote /
// demote / kick affordances. Pure & PROPS-DRIVEN: it renders `@paxpia/core`
// `Participant[]`, reports intents (`onPromote` / `onDemote` / `onKick` / `onAdd`)
// up, and owns NO transport. Authority is decided by core's permission model
// (`canManageThread`, `canPromote`) — the SAME functions the server-side gate mirrors
// (plan §1a) — so the client hides/disables exactly what the API would reject. The
// owner is un-demotable, admins/owner can manage members, a member sees a read-only
// roster.

import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  canManageThread,
  canPromote,
  type Participant,
  type ParticipantRole,
} from '@paxpia/core';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme/tokens';

export interface MemberManagePanelProps {
  /** The thread's participants (host-provided, already hydrated with names/avatars). */
  members: Participant[];
  /** The signed-in caller's user id (to label "You" + never kick self via a normal
   *  kick — leaving is a separate action the host can wire to `onLeave`). */
  selfId?: string;
  /** The caller's role IN this thread — gates every management affordance. */
  callerRole?: ParticipantRole | string;
  /** Promote a `member` → `admin`. Shown only when the caller may act on the target. */
  onPromote?: (userId: string) => void;
  /** Demote an `admin` → `member`. */
  onDemote?: (userId: string) => void;
  /** Remove a participant from the thread (kick). Never offered for the owner. */
  onKick?: (userId: string) => void;
  /** Open the add-member flow (host owns the picker). Shown to managers only. */
  onAdd?: () => void;
  /** Tap a member row (e.g. open their profile). */
  onPressMember?: (userId: string) => void;
  title?: string;
}

function roleLabel(role: ParticipantRole | string | undefined): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'member':
      return 'Member';
    default:
      return '';
  }
}

export function MemberManagePanel({
  members,
  selfId,
  callerRole,
  onPromote,
  onDemote,
  onKick,
  onAdd,
  onPressMember,
  title = 'Members',
}: MemberManagePanelProps) {
  const canManage = canManageThread(callerRole);

  // Owner first, then admins, then members; stable within a tier.
  const rank = (r: string | undefined) => (r === 'owner' ? 0 : r === 'admin' ? 1 : 2);
  const sorted = [...members].sort((a, b) => rank(a.role) - rank(b.role));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {title} · {members.length}
        </Text>
        {canManage && onAdd ? (
          <Pressable style={styles.addBtn} onPress={onAdd} accessibilityLabel="Add member">
            <Text style={styles.addBtnText}>＋ Add</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(m) => m.user_id}
        renderItem={({ item }) => {
          const isSelf = !!selfId && item.user_id === selfId;
          const targetIsOwner = item.role === 'owner';
          const mayActOnTarget = canManage && !isSelf && canPromote(callerRole, item.role);
          const showPromote = mayActOnTarget && item.role === 'member';
          const showDemote = mayActOnTarget && item.role === 'admin';
          const showKick = canManage && !isSelf && !targetIsOwner;
          return (
            <View style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => onPressMember?.(item.user_id)}>
                <Avatar uri={item.avatar_url} name={item.display_name} size={40} />
                <View style={styles.rowBody}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.display_name || `@${item.user_id.slice(0, 8)}`}
                    {isSelf ? ' (You)' : ''}
                  </Text>
                  <View style={styles.metaRow}>
                    {roleLabel(item.role) ? (
                      <Text style={[styles.roleTag, targetIsOwner && styles.roleOwner, item.role === 'admin' && styles.roleAdmin]}>
                        {roleLabel(item.role)}
                      </Text>
                    ) : null}
                    {item.is_online ? <Text style={styles.onlineText}>online</Text> : null}
                  </View>
                </View>
              </Pressable>
              <View style={styles.actions}>
                {showPromote ? (
                  <Pressable style={styles.actBtn} onPress={() => onPromote?.(item.user_id)} accessibilityLabel="Promote to admin">
                    <Text style={styles.actText}>Promote</Text>
                  </Pressable>
                ) : null}
                {showDemote ? (
                  <Pressable style={styles.actBtn} onPress={() => onDemote?.(item.user_id)} accessibilityLabel="Demote to member">
                    <Text style={styles.actText}>Demote</Text>
                  </Pressable>
                ) : null}
                {showKick ? (
                  <Pressable style={[styles.actBtn, styles.actKick]} onPress={() => onKick?.(item.user_id)} accessibilityLabel="Remove from thread">
                    <Text style={[styles.actText, styles.actKickText]}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No members</Text>
          </View>
        }
      />
    </View>
  );
}

const BRAND = colors.brand;

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surface, flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceMuted },
  addBtnText: { color: BRAND, fontSize: 13, fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, columnGap: 8 },
  rowMain: { flexDirection: 'row', alignItems: 'center', columnGap: 12, flex: 1 },
  rowBody: { flex: 1 },
  name: { color: colors.text, fontSize: 14, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8, marginTop: 2 },
  roleTag: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  roleOwner: { color: colors.chatAccent },
  roleAdmin: { color: colors.brand },
  onlineText: { color: colors.online, fontSize: 11 },

  actions: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  actBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  actText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  actKick: { borderColor: colors.live },
  actKickText: { color: colors.live },

  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
