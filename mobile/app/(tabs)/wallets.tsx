// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Wallets & Accounts Management Screen
// ---------------------------------------------------------------------------

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/components/ui/Header';
import { WalletCard } from '../../src/components/cards/WalletCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { Wallet } from '../../src/types';
import { Spacing, Radii, Typography } from '../../src/theme';

export default function WalletsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    wallets,
    currency,
    isRefreshing,
    refreshWallets,
    deleteWallet,
    totalBalance,
  } = useApp();

  // Aggregate breakdown
  const bankTotal = useMemo(() => {
    return wallets
      .filter((w) => (w.wallet_type || 'BANK').toUpperCase() === 'BANK')
      .reduce((sum, w) => sum + Number(w.current_balance ?? w.initial_balance ?? 0), 0);
  }, [wallets]);

  const digitalTotal = useMemo(() => {
    return wallets
      .filter((w) => {
        const t = (w.wallet_type || '').toUpperCase();
        return t === 'WALLET' || t === 'UPI' || t === 'DIGITAL';
      })
      .reduce((sum, w) => sum + Number(w.current_balance ?? w.initial_balance ?? 0), 0);
  }, [wallets]);

  const cashTotal = useMemo(() => {
    return wallets
      .filter((w) => (w.wallet_type || '').toUpperCase() === 'CASH')
      .reduce((sum, w) => sum + Number(w.current_balance ?? w.initial_balance ?? 0), 0);
  }, [wallets]);

  const handleEditWallet = (wallet: Wallet) => {
    router.push({
      pathname: '/modal/wallet',
      params: { walletId: String(wallet.id) },
    });
  };

  const handleDeleteWallet = (wallet: Wallet) => {
    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name}"? Transactions associated with this wallet will remain in your history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWallet(wallet.id);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header title="Wallets & Accounts" showMonthSwitcher={false} subtitle="Multi-wallet liquidity balance" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshWallets}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Total Liquidity Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="card-outline" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>
              Total Net Portfolio
            </Text>
          </View>
          <Text style={[styles.heroAmount, { color: theme.text }]}>
            {formatCurrency(totalBalance, currency)}
          </Text>

          {/* Quick Sub-allocations */}
          <View style={[styles.allocationsRow, { borderTopColor: theme.borderSubtle }]}>
            <View style={styles.allocItem}>
              <Text style={[styles.allocLabel, { color: theme.textMuted }]}>Bank</Text>
              <Text style={[styles.allocValue, { color: theme.text }]}>
                {formatCurrency(bankTotal, currency, { compact: true })}
              </Text>
            </View>
            <View style={styles.allocItem}>
              <Text style={[styles.allocLabel, { color: theme.textMuted }]}>UPI / Digital</Text>
              <Text style={[styles.allocValue, { color: theme.text }]}>
                {formatCurrency(digitalTotal, currency, { compact: true })}
              </Text>
            </View>
            <View style={styles.allocItem}>
              <Text style={[styles.allocLabel, { color: theme.textMuted }]}>Cash</Text>
              <Text style={[styles.allocValue, { color: theme.text }]}>
                {formatCurrency(cashTotal, currency, { compact: true })}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Title with Add Account button */}
        <View style={styles.listHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Accounts ({wallets.length})
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/modal/wallet')}
            style={[styles.addAccountBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addAccountBtnText}>Add Account</Text>
          </TouchableOpacity>
        </View>

        {/* Wallets List */}
        {wallets.length > 0 ? (
          wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              currency={currency}
              onEdit={handleEditWallet}
              onDelete={handleDeleteWallet}
            />
          ))
        ) : (
          <EmptyState
            icon="wallet-outline"
            title="No Accounts Created"
            description="Create your first bank account, UPI digital wallet, or cash fund."
            actionTitle="+ Create Account"
            onAction={() => router.push('/modal/wallet')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  heroCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  heroIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  heroLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  heroAmount: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.extrabold,
    marginVertical: 4,
  },
  allocationsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  allocItem: {
    flex: 1,
  },
  allocLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  allocValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.pill,
  },
  addAccountBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
});
