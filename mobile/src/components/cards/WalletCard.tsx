// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Wallet Card Component
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Wallet } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { Spacing, Radii, Typography } from '../../theme';

interface WalletCardProps {
  wallet: Wallet;
  currency: string;
  onEdit?: (wallet: Wallet) => void;
  onDelete?: (wallet: Wallet) => void;
  onPress?: (wallet: Wallet) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  currency,
  onEdit,
  onDelete,
  onPress,
}) => {
  const { theme, isDark } = useTheme();

  const getWalletTypeIcon = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'BANK') return 'business-outline';
    if (t === 'CASH') return 'cash-outline';
    if (t === 'CREDIT_CARD') return 'card-outline';
    return 'phone-portrait-outline'; // UPI / Digital
  };

  const getWalletTypeLabel = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'BANK') return 'Bank Account';
    if (t === 'CASH') return 'Cash Wallet';
    if (t === 'CREDIT_CARD') return 'Credit Card';
    return 'Digital / UPI';
  };

  const getWalletPalette = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'BANK') {
      return {
        bg: isDark ? '#141b30' : '#f0f4ff',
        border: isDark ? '#28355c' : '#c7d2fe',
        iconBg: isDark ? 'rgba(99, 102, 241, 0.22)' : '#e0e7ff',
        iconColor: isDark ? '#818cf8' : '#4f46e5',
      };
    }
    if (t === 'CASH') {
      return {
        bg: isDark ? '#0e2220' : '#ecfdf5',
        border: isDark ? '#134e40' : '#a7f3d0',
        iconBg: isDark ? 'rgba(16, 185, 129, 0.22)' : '#d1fae5',
        iconColor: isDark ? '#34d399' : '#10b981',
      };
    }
    if (t === 'CREDIT_CARD') {
      return {
        bg: isDark ? '#26151c' : '#fff1f2',
        border: isDark ? '#4c1d29' : '#fecdd3',
        iconBg: isDark ? 'rgba(244, 63, 94, 0.22)' : '#ffe4e6',
        iconColor: isDark ? '#fb7185' : '#f43f5e',
      };
    }
    // UPI / Digital / Other
    return {
      bg: isDark ? '#1d1736' : '#f5f3ff',
      border: isDark ? '#3d2e66' : '#ddd6fe',
      iconBg: isDark ? 'rgba(124, 58, 237, 0.22)' : '#ede9fe',
      iconColor: isDark ? '#c084fc' : '#7c3aed',
    };
  };

  const palette = getWalletPalette(wallet.wallet_type);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress ? () => onPress(wallet) : undefined}
      style={[
        styles.card,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1.5,
          shadowColor: theme.cardShadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <View style={[styles.iconBox, { backgroundColor: palette.iconBg }]}>
            <Ionicons name={getWalletTypeIcon(wallet.wallet_type) as any} size={20} color={palette.iconColor} />
          </View>
          <View>
            <Text style={[styles.walletName, { color: theme.text }]}>{wallet.name}</Text>
            <Text style={[styles.walletType, { color: theme.textMuted }]}>
              {getWalletTypeLabel(wallet.wallet_type)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {onEdit ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onEdit(wallet)}
              style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted }]}
            >
              <Ionicons name="pencil-outline" size={15} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}

          {onDelete ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onDelete(wallet)}
              style={[styles.actionBtn, { backgroundColor: theme.dangerSoft, marginLeft: 6 }]}
            >
              <Ionicons name="trash-outline" size={15} color={theme.danger} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={[styles.balanceSub, { color: theme.textMuted }]}>Current Balance</Text>
          <Text
            style={[
              styles.currentBalance,
              {
                color: wallet.current_balance >= 0 ? theme.text : theme.danger,
              },
            ]}
          >
            {formatCurrency(wallet.current_balance, currency)}
          </Text>
        </View>

        {wallet.initial_balance !== undefined ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.balanceSub, { color: theme.textMuted }]}>Initial Balance</Text>
            <Text style={[styles.initialBalance, { color: theme.textSecondary }]}>
              {formatCurrency(wallet.initial_balance, currency)}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  walletName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  walletType: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  balanceSub: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  currentBalance: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
  },
  initialBalance: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});
