// GiftPanel — the SHARED gift picker (rn-web), the view half of the gifting lift
// (#1, SHARED-LIFT-BACKLOG §Gifting). Template = mobile's `LiveGiftPanel`: a
// bottom-sheet-style panel with 3 category tabs, a 4-column gift grid, the coin balance +
// a Top-Up button, and a send bar that disables when the selected gift is unaffordable.
//
// It CONSUMES @paxpia/core/wallet (GIFT_CATALOG, GIFT_CATEGORIES, giftEmojiFor, canAfford,
// the WalletState shape) — it does NOT recreate the catalog. PURE presentational: it owns
// only the local "which gift/category is selected" UI state and reports intents
// (`onSend(giftId)`, `onTopUp`, `onClose`) up. NO transport, NO wallet mutation, NO
// platform sheet lib — the host wraps it in its own sheet/modal (mobile @gorhom, web a
// portal) and does the `debitGift` + broadcast on `onSend`. Emoji is ALWAYS resolved via
// `giftEmojiFor` so a gift can never render a generic box glyph.

import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  GIFT_CATALOG,
  GIFT_CATEGORIES,
  giftEmojiFor,
  canAfford,
  type GiftCategory,
  type GiftInfo,
  type WalletState,
} from '@paxpia/core';
import { colors } from '../theme/tokens';

export interface GiftPanelProps {
  /** The current wallet (coin balance) — read-only; the panel never mutates it. The host
   *  passes `useWallet().state`; the send/debit happens in the host's `onSend`. */
  wallet: WalletState;
  /** Send the selected gift. The host runs `debitGift(wallet, giftId)` then broadcasts the
   *  `overlay.gift` toast + pushes a `kind:'gift'` chat row (parity with mobile). */
  onSend: (giftId: string) => void;
  /** Open the coins shop (insufficient balance, or the Top-Up button). */
  onTopUp: () => void;
  /** Optional close affordance (host renders the sheet chrome; this is the header ✕). */
  onClose?: () => void;
  /** Optional initial category tab (default 'popular'). */
  initialCategory?: GiftCategory;
}

/** Compact coin count: 1.2K for ≥1000, else the integer. Mirrors mobile's formatBalance. */
function formatBalance(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.max(0, Math.floor(n)));
}

/** One gift cell in the 4-col grid: emoji + name + coin cost; ring when selected; dimmed
 *  when the wallet can't afford it (still selectable so the host can prompt Top-Up). */
function GiftCell({
  gift,
  selected,
  affordable,
  onSelect,
}: {
  gift: GiftInfo;
  selected: boolean;
  affordable: boolean;
  onSelect: (g: GiftInfo) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cell,
        selected && styles.cellSelected,
        !affordable && styles.cellPoor,
        pressed && styles.pressed,
      ]}
      onPress={() => onSelect(gift)}
      accessibilityRole="button"
      accessibilityLabel={`${gift.name}, ${gift.coinCost} coins`}
    >
      <Text style={styles.cellEmoji}>{giftEmojiFor({ emoji: gift.emoji, id: gift.id })}</Text>
      <Text style={styles.cellName} numberOfLines={1}>
        {gift.name}
      </Text>
      <View style={styles.cellCost}>
        <Text style={styles.coinGlyphSm}>🪙</Text>
        <Text style={styles.cellCostText}>{gift.coinCost}</Text>
      </View>
    </Pressable>
  );
}

/**
 * GiftPanel — the shared gift picker. Renders the catalog from @paxpia/core; the host owns
 * the sheet chrome + the debit/broadcast on send.
 */
export function GiftPanel({
  wallet,
  onSend,
  onTopUp,
  onClose,
  initialCategory = 'popular',
}: GiftPanelProps) {
  const [activeCategory, setActiveCategory] = useState<GiftCategory>(initialCategory);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const gifts = useMemo(
    () => GIFT_CATALOG.filter((g) => g.category === activeCategory),
    [activeCategory],
  );
  // Chunk into rows of 4 for a stable grid that lays out identically on web + RN (no
  // FlatList numColumns dependency — this is a small fixed catalog).
  const rows = useMemo(() => {
    const out: GiftInfo[][] = [];
    for (let i = 0; i < gifts.length; i += 4) out.push(gifts.slice(i, i + 4));
    return out;
  }, [gifts]);

  const selected = useMemo(
    () => (selectedId ? GIFT_CATALOG.find((g) => g.id === selectedId) ?? null : null),
    [selectedId],
  );
  const affordSelected = selected ? canAfford(wallet, selected.id) : false;

  const handleSend = () => {
    if (!selected) return;
    if (!affordSelected) {
      onTopUp();
      return;
    }
    onSend(selected.id);
    setSelectedId(null);
  };

  const sendLabel = !selected ? 'Select a Gift' : !affordSelected ? 'Not Enough Coins' : 'Send Gift';

  return (
    <View style={styles.root}>
      {/* Header: title + coin balance + Top-Up. */}
      <View style={styles.header}>
        <Text style={styles.title}>Send a Gift</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.coinGlyph}>🪙</Text>
          <Text style={styles.balanceText}>{formatBalance(wallet.coinBalance)}</Text>
          <Pressable
            style={({ pressed }) => [styles.topUpBtn, pressed && styles.pressed]}
            onPress={onTopUp}
            accessibilityRole="button"
            accessibilityLabel="Top up coins"
          >
            <Text style={styles.topUpPlus}>＋</Text>
            <Text style={styles.topUpText}>Top Up</Text>
          </Pressable>
          {onClose ? (
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close gift panel"
            >
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category tabs. */}
      <View style={styles.tabs}>
        {GIFT_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveCategory(cat.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{cat.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Gift grid (4 per row). */}
      <View style={styles.grid}>
        {rows.map((rowGifts, ri) => (
          <View key={ri} style={styles.gridRow}>
            {rowGifts.map((g) => (
              <GiftCell
                key={g.id}
                gift={g}
                selected={selectedId === g.id}
                affordable={canAfford(wallet, g.id)}
                onSelect={(gift) => setSelectedId(gift.id)}
              />
            ))}
            {/* Pad the last row to 4 so cells keep their width. */}
            {rowGifts.length < 4
              ? Array.from({ length: 4 - rowGifts.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={styles.cellPad} />
                ))
              : null}
          </View>
        ))}
      </View>

      {/* Send bar: selected gift summary + send button (disabled when unaffordable). */}
      <View style={styles.sendBar}>
        {selected ? (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedEmoji}>
              {giftEmojiFor({ emoji: selected.emoji, id: selected.id })}
            </Text>
            <Text style={styles.selectedName} numberOfLines={1}>
              {selected.name}
            </Text>
            <View style={styles.selectedCost}>
              <Text style={styles.coinGlyphSm}>🪙</Text>
              <Text style={styles.selectedCostText}>{selected.coinCost}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.selectedInfo} />
        )}
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            (!selected || !affordSelected) && styles.sendBtnDisabled,
            pressed && styles.pressed,
          ]}
          onPress={handleSend}
          disabled={!selected}
          accessibilityRole="button"
          accessibilityLabel={sendLabel}
        >
          <Text style={styles.sendBtnGlyph}>🎁</Text>
          <Text style={styles.sendBtnText}>{sendLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ACCENT = '#FE2C55';
const GOLD = '#FFD700';

const styles = StyleSheet.create({
  root: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', columnGap: 4 },
  coinGlyph: { fontSize: 16 },
  balanceText: { color: GOLD, fontSize: 14, fontWeight: '700' },
  topUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    marginLeft: 6,
  },
  topUpPlus: { color: GOLD, fontSize: 13, fontWeight: '900' },
  topUpText: { color: GOLD, fontSize: 12, fontWeight: '600' },
  closeBtn: { marginLeft: 8, paddingHorizontal: 4 },
  closeGlyph: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '700' },

  tabs: { flexDirection: 'row', paddingHorizontal: 12, columnGap: 8, marginBottom: 10 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  tabActive: { backgroundColor: ACCENT },
  tabText: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.text },

  grid: { paddingHorizontal: 12, paddingBottom: 8, rowGap: 8 },
  gridRow: { flexDirection: 'row', columnGap: 8 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 4,
  },
  cellSelected: { borderColor: ACCENT, backgroundColor: 'rgba(254,44,85,0.12)' },
  cellPoor: { opacity: 0.45 },
  cellPad: { flex: 1 },
  cellEmoji: { fontSize: 28 },
  cellName: { color: colors.text, fontSize: 11, fontWeight: '600' },
  cellCost: { flexDirection: 'row', alignItems: 'center', columnGap: 2 },
  coinGlyphSm: { fontSize: 11 },
  cellCostText: { color: GOLD, fontSize: 11, fontWeight: '700' },

  sendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 8,
    columnGap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  selectedInfo: { flexDirection: 'row', alignItems: 'center', columnGap: 6, flex: 1 },
  selectedEmoji: { fontSize: 22 },
  selectedName: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  selectedCost: { flexDirection: 'row', alignItems: 'center', columnGap: 2 },
  selectedCostText: { color: GOLD, fontSize: 13, fontWeight: '700' },

  sendBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: ACCENT,
  },
  sendBtnDisabled: { backgroundColor: '#4a4a52' },
  sendBtnGlyph: { fontSize: 15 },
  sendBtnText: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },

  pressed: { opacity: 0.7 },
});
