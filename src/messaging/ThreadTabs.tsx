// ThreadTabs — the SHARED conversation-filter bar (rn-web): All / Personal / Groups
// / Channels / Pinned. Pure & PROPS-DRIVEN: it renders the active tab + per-tab
// unread/total counts and reports `onChange(tab)` up. It owns NO data and does NO
// filtering itself — the host maps the active tab onto its thread list (a `channel`
// thread → Channels, a `group` → Groups, a `dm` → Personal, a pinned thread →
// Pinned; All is everything). Authored once with RN primitives so web
// (react-native-web) and mobile (RN) render the same bar.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

/** The filter identities. Mirrors the plan's tab set; append-only (never recycle). */
export type ThreadTab = 'all' | 'personal' | 'groups' | 'channels' | 'pinned';

/** The fixed tab order + labels. Kept here (not at call sites) so web + mobile show
 *  the identical bar. */
export const THREAD_TABS: { key: ThreadTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'personal', label: 'Personal' },
  { key: 'groups', label: 'Groups' },
  { key: 'channels', label: 'Channels' },
  { key: 'pinned', label: 'Pinned' },
];

export interface ThreadTabsProps {
  /** The currently-selected filter. */
  activeTab: ThreadTab;
  onChange: (tab: ThreadTab) => void;
  /** Optional per-tab count badge (e.g. unread threads in that bucket). The host
   *  computes it; a `0`/absent count renders no badge. */
  counts?: Partial<Record<ThreadTab, number>>;
  /** Restrict/reorder which tabs show (default = all five, in THREAD_TABS order). */
  tabs?: ThreadTab[];
}

export function ThreadTabs({ activeTab, onChange, counts, tabs }: ThreadTabsProps) {
  const shown = tabs ? THREAD_TABS.filter((t) => tabs.includes(t.key)) : THREAD_TABS;
  return (
    <View style={styles.root}>
      {shown.map(({ key, label }) => {
        const active = key === activeTab;
        const count = counts?.[key] ?? 0;
        return (
          <Pressable
            key={key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {label}
            </Text>
            {count > 0 ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{count > 99 ? '99+' : count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const BRAND = colors.chatAccent;

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', columnGap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.surface },
  tab: { flexDirection: 'row', alignItems: 'center', columnGap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceMuted },
  tabActive: { backgroundColor: BRAND },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.brandText },
  badge: { minWidth: 18, height: 18, borderRadius: 999, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  badgeTextActive: { color: colors.brandText },
});
