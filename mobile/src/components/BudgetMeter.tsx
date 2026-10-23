// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Budget Tracker & Meter Component
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatCurrency';
import { Spacing, Radii, Typography } from '../theme';

interface BudgetMeterProps {
  budgetTarget: number;
  totalSpent: number;
  currency: string;
  onEditBudget?: () => void;
}

export const BudgetMeter: React.FC<BudgetMeterProps> = ({
  budgetTarget = 20000,
  totalSpent = 0,
  currency,
  onEditBudget,
}) => {
  const { theme } = useTheme();

  const target = budgetTarget > 0 ? budgetTarget : 20000;
  const pct = Math.round((totalSpent / target) * 100);
  const remaining = Math.max(0, target - totalSpent);
  const isOver = totalSpent > target;

  const getMeterColor = () => {
    if (isOver) return theme.danger;
    if (pct >= 85) return theme.warning;
    return theme.success;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: `${getMeterColor()}1A` }]}>
            <Ionicons name="pie-chart-outline" size={18} color={getMeterColor()} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Monthly Budget</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {pct}% utilized
            </Text>
          </View>
        </View>

        {onEditBudget ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onEditBudget}
            style={[styles.editButton, { backgroundColor: theme.surfaceMuted }]}
          >
            <Ionicons name="pencil-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.editText, { color: theme.textSecondary }]}>Edit</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Progress Track */}
      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(100, Math.max(3, pct))}%`,
              backgroundColor: getMeterColor(),
            },
          ]}
        />
      </View>

      {/* Numbers Breakdown */}
      <View style={styles.numbersRow}>
        <View>
          <Text style={[styles.label, { color: theme.textMuted }]}>Spent</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {formatCurrency(totalSpent, currency)}
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Remaining</Text>
          <Text
            style={[
              styles.value,
              { color: isOver ? theme.danger : theme.success },
            ]}
          >
            {isOver ? `Exceeded ${formatCurrency(totalSpent - target, currency)}` : formatCurrency(remaining, currency)}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Target</Text>
          <Text style={[styles.value, { color: theme.textSecondary }]}>
            {formatCurrency(target, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  editText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginLeft: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  value: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
});
