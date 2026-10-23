// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Stat & KPI Card Components
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatCurrency';
import { Spacing, Radii, Typography } from '../theme';

interface TotalBalanceCardProps {
  balance: number;
  currency: string;
  walletCount: number;
}

export const TotalBalanceCard: React.FC<TotalBalanceCardProps> = ({
  balance,
  currency,
  walletCount,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.balanceCard,
        {
          backgroundColor: isDark ? '#131926' : '#ffffff',
          borderColor: theme.border,
          shadowColor: theme.cardShadow,
        },
      ]}
    >
      <View style={styles.balanceHeader}>
        <View style={styles.balanceLabelContainer}>
          <View style={[styles.balanceIcon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
          </View>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
            Total Net Balance
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.badgeText, { color: theme.textMuted }]}>
            {walletCount} {walletCount === 1 ? 'Account' : 'Accounts'}
          </Text>
        </View>
      </View>

      <Text style={[styles.balanceAmount, { color: theme.text }]}>
        {formatCurrency(balance, currency)}
      </Text>

      <Text style={[styles.balanceSubtext, { color: theme.textMuted }]}>
        Aggregated balance across bank, cash, and digital wallets
      </Text>
    </View>
  );
};

interface IncomeExpenseRowProps {
  income: number;
  spent: number;
  currency: string;
}

export const IncomeExpenseRow: React.FC<IncomeExpenseRowProps> = ({
  income,
  spent,
  currency,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.metricsRow}>
      {/* Income Card */}
      <View
        style={[
          styles.metricCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIconBox, { backgroundColor: theme.successSoft }]}>
            <Ionicons name="arrow-down-circle" size={18} color={theme.success} />
          </View>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Income</Text>
        </View>
        <Text style={[styles.metricAmount, { color: theme.success }]}>
          +{formatCurrency(income, currency)}
        </Text>
      </View>

      {/* Expense Card */}
      <View
        style={[
          styles.metricCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIconBox, { backgroundColor: theme.dangerSoft }]}>
            <Ionicons name="arrow-up-circle" size={18} color={theme.danger} />
          </View>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Expenses</Text>
        </View>
        <Text style={[styles.metricAmount, { color: theme.danger }]}>
          -{formatCurrency(spent, currency)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  balanceCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  balanceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  balanceLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  balanceAmount: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  balanceSubtext: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  metricIconBox: {
    width: 26,
    height: 26,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  metricLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  metricAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginTop: 2,
  },
});
