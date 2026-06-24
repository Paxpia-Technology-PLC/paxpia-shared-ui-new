// CoinsShop — the SHARED coin-purchase sheet (rn-web), the second view of the gifting
// lift (#1, SHARED-LIFT-BACKLOG §Gifting). Template = mobile's `LiveCoinsShop`: a header
// with the live coin balance, then the COIN_PACKAGES list (face + bonus coins, price,
// BEST-VALUE badge on the popular pack), each row a buy button.
//
// It CONSUMES @paxpia/core/wallet (COIN_PACKAGES, coinsForPackage, the WalletState shape)
// — it does NOT recreate the package list. PURE presentational: it reports `onPurchase(pkgId)`
// up and does NO wallet mutation and NO IAP/payment transport. The host runs the real
// purchase (Telebirr/Chapa/store IAP) then `creditCoins`/`purchasePackage` (idempotent by
// purchaseId). Self-contained rn-web; the host supplies the surrounding sheet chrome.

import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  COIN_PACKAGES,
  coinsForPackage,
  type CoinPackage,
  type WalletState,
} from '@paxpia/core';
import { colors } from '../theme/tokens';

export interface CoinsShopProps {
  /** The current wallet — read-only; the shop shows the balance and never mutates it. */
  wallet: WalletState;
  /** Purchase a package by id. The host runs the payment flow then credits the wallet
   *  (`purchasePackage`, idempotent by a purchase id). */
  onPurchase: (pkgId: string) => void;
  /** Optional close affordance (host renders the sheet chrome; this is the header ✕). */
  onClose?: () => void;
}

function formatBalance(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.max(0, Math.floor(n)));
}

/** One package card: coin total (+bonus), price button, BEST-VALUE badge when popular. */
function PackageCard({ pkg, onPurchase }: { pkg: CoinPackage; onPurchase: (id: string) => void }) {
  const total = coinsForPackage(pkg);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pkg.isPopular && styles.cardPopular, pressed && styles.pressed]}
      onPress={() => onPurchase(pkg.id)}
      accessibilityRole="button"
      accessibilityLabel={`Buy ${total} coins for ${pkg.price}`}
    >
      {pkg.isPopular ? (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>BEST VALUE</Text>
        </View>
      ) : null}
      <View style={styles.cardLeft}>
        <View style={styles.coinIcon}>
          <Text style={styles.coinIconGlyph}>🪙</Text>
        </View>
        <View>
          <Text style={styles.cardCoins}>{total.toLocaleString()} Coins</Text>
          {pkg.bonusCoins ? <Text style={styles.cardBonus}>+{pkg.bonusCoins} bonus</Text> : null}
        </View>
      </View>
      <View style={[styles.priceBtn, pkg.isPopular && styles.priceBtnPopular]}>
        <Text style={styles.priceText}>{pkg.price}</Text>
      </View>
    </Pressable>
  );
}

/**
 * CoinsShop — the shared coin-purchase list. Renders COIN_PACKAGES from @paxpia/core; the
 * host owns the payment flow + the credit on success.
 */
export function CoinsShop({ wallet, onPurchase, onClose }: CoinsShopProps) {
  return (
    <View style={styles.root}>
      {/* Header: icon + title + balance. */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconGlyph}>🪙</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Get Coins</Text>
          <Text style={styles.subtitle}>Use coins to send gifts</Text>
        </View>
        <View style={styles.balanceWrap}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.coinGlyphSm}>🪙</Text>
            <Text style={styles.balanceText}>{formatBalance(wallet.coinBalance)}</Text>
          </View>
        </View>
        {onClose ? (
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close coins shop"
          >
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.divider} />
      <Text style={styles.packagesTitle}>Choose a Package</Text>

      <View style={styles.packagesList}>
        {COIN_PACKAGES.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} onPurchase={onPurchase} />
        ))}
      </View>

      <Text style={styles.disclaimer}>Purchases are processed securely. Coins are non-refundable.</Text>
    </View>
  );
}

const ACCENT = '#FE2C55';
const GOLD = '#FFD700';

const styles = StyleSheet.create({
  root: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 8 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, columnGap: 12 },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.16)',
  },
  headerIconGlyph: { fontSize: 26 },
  headerText: {},
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  balanceWrap: { marginLeft: 'auto', alignItems: 'flex-end' },
  balanceLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', columnGap: 4 },
  coinGlyphSm: { fontSize: 13 },
  balanceText: { color: GOLD, fontSize: 16, fontWeight: '800' },
  closeBtn: { marginLeft: 8, paddingHorizontal: 4 },
  closeGlyph: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '700' },

  divider: { height: 1, marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  packagesTitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },

  packagesList: { paddingHorizontal: 16, rowGap: 10, paddingBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardPopular: { borderColor: ACCENT, backgroundColor: 'rgba(254,44,85,0.1)' },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
  },
  popularText: { color: colors.text, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  coinIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIconGlyph: { fontSize: 22 },
  cardCoins: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardBonus: { color: '#66BB6A', fontSize: 11, fontWeight: '600', marginTop: 2 },
  priceBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2B90ED' },
  priceBtnPopular: { backgroundColor: ACCENT },
  priceText: { color: colors.text, fontSize: 14, fontWeight: '800' },

  disclaimer: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 6,
  },

  pressed: { opacity: 0.7 },
});
