// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Replicated Budget Ring Component
// Matching frontend/src/components/BudgetRing.jsx
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatCurrency';
import { Spacing, Radii, Typography } from '../theme';

export interface BudgetRingProps {
  totalSpent?: number;
  budget?: number;
  budgetLeft?: number;
  budgetPercent?: number;
  daysLeft?: string | number;
  currency?: string;
}

export const BudgetRing: React.FC<BudgetRingProps> = ({
  totalSpent = 0,
  budget = 20000,
  budgetLeft,
  budgetPercent,
  daysLeft = 'Active',
  currency = 'INR',
}) => {
  const { theme } = useTheme();

  // If budgetLeft isn't explicitly passed, compute it
  const calculatedBudgetLeft = budgetLeft !== undefined ? budgetLeft : budget - totalSpent;
  const calculatedPercent =
    budgetPercent !== undefined
      ? budgetPercent
      : budget > 0
      ? totalSpent / budget
      : 0;

  const pct = Math.max(calculatedPercent, 0);
  const clampedPct = Math.min(pct, 1);
  const circumference = 326.7; // 2 * PI * 52 ≈ 326.72
  const strokeOffset = circumference * (1 - clampedPct);

  const strokeColor =
    pct >= 1
      ? theme.danger
      : pct >= 0.8
      ? theme.warning
      : theme.primary;

  const isOver = calculatedBudgetLeft < 0;

  return (
    <View
      style={[
        styles.ringBox,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Circular SVG Gauge */}
      <View style={styles.gaugeContainer}>
        <Svg width={130} height={130} viewBox="0 0 120 120">
          {/* Background Track Circle */}
          <Circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={theme.border}
            strokeWidth="11"
          />
          {/* Active Progress Circle */}
          <Circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={strokeColor}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeOffset}
            transform="rotate(-90 60 60)"
          />
        </Svg>

        {/* Center Label inside Ring */}
        <View style={styles.gaugeCenter}>
          <Text
            style={[
              styles.gaugeCenterAmount,
              { color: isOver ? theme.danger : theme.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {isOver ? '-' : ''}
            {formatCurrency(Math.abs(calculatedBudgetLeft), currency, { compact: true })}
          </Text>
          <Text style={[styles.gaugeCenterSubtitle, { color: theme.textMuted }]}>
            {isOver ? 'over budget' : 'left to spend'}
          </Text>
        </View>
      </View>

      {/* Right Stats Breakdown */}
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Spent</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {formatCurrency(totalSpent, currency)}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Budget</Text>
          <Text style={[styles.statValue, { color: theme.textSecondary }]}>
            {formatCurrency(budget, currency)}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Days left</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {String(daysLeft)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ringBox: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  gaugeContainer: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  gaugeCenterAmount: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.extrabold,
    textAlign: 'center',
  },
  gaugeCenterSubtitle: {
    fontSize: 10,
    fontWeight: Typography.weights.medium,
    marginTop: 2,
    textTransform: 'lowercase',
  },
  statsContainer: {
    flex: 1,
    marginLeft: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  statValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
});

export default BudgetRing;
