// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Transaction List Item Component
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatRelativeDate } from '../../utils/dateUtils';
import { getCategoryColor, getCategoryIcon } from '../../constants/categories';
import { Spacing, Radii, Typography } from '../../theme';

interface TransactionItemProps {
  transaction: Transaction;
  currency: string;
  onPress?: (tx: Transaction) => void;
  onLongPress?: (tx: Transaction) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  currency,
  onPress,
  onLongPress,
}) => {
  const { theme } = useTheme();

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const categoryColor = getCategoryColor(transaction.category);
  const categoryIcon = isTransfer ? 'swap-horizontal-outline' : getCategoryIcon(transaction.category);

  const displayTitle = transaction.note?.trim() || transaction.title?.trim() || transaction.category || 'Transaction';

  const getAmountColor = () => {
    if (isIncome) return theme.success;
    if (isTransfer) return theme.info;
    return theme.text;
  };

  const getAmountPrefix = () => {
    if (isIncome) return '+';
    if (isTransfer) return '';
    return '-';
  };

  // Build wallet info
  let walletLabel = transaction.wallet_name || 'Default';
  if (isTransfer && transaction.to_wallet_name) {
    walletLabel = `${walletLabel} → ${transaction.to_wallet_name}`;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress ? () => onPress(transaction) : undefined}
      onLongPress={onLongPress ? () => onLongPress(transaction) : undefined}
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.leftRow}>
        <View style={[styles.iconBox, { backgroundColor: `${categoryColor}1F` }]}>
          <Ionicons name={categoryIcon as any} size={20} color={categoryColor} />
        </View>

        <View style={styles.details}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {displayTitle}
          </Text>

          <View style={styles.subRow}>
            <Text style={[styles.categoryBadge, { color: categoryColor }]}>
              {transaction.category}
            </Text>
            <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
            <Text style={[styles.walletText, { color: theme.textMuted }]} numberOfLines={1}>
              {walletLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightColumn}>
        <Text style={[styles.amount, { color: getAmountColor() }]}>
          {getAmountPrefix()}
          {formatCurrency(transaction.amount, currency)}
        </Text>
        <Text style={[styles.dateText, { color: theme.textMuted }]}>
          {formatRelativeDate(transaction.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  dot: {
    marginHorizontal: 4,
    fontSize: Typography.sizes.xs,
  },
  walletText: {
    fontSize: Typography.sizes.xs,
    flexShrink: 1,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  dateText: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
});
