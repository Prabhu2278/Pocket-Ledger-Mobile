// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Financial Cash Flow & Category Breakdown Chart
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { CategorySpending, DaySpending } from '../../types';
import { Spacing, Radii, Typography } from '../../theme';

interface CashFlowChartProps {
  last7Days?: DaySpending[];
  categoryBreakdown?: CategorySpending[];
  totalIncome: number;
  totalSpent: number;
  currency: string;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  last7Days = [],
  categoryBreakdown = [],
  totalIncome,
  totalSpent,
  currency,
}) => {
  const { theme } = useTheme();

  // Max value calculation for bar chart height
  const maxDayAmount = Math.max(...last7Days.map((d) => d.amount), 100);

  return (
    <View style={styles.container}>
      {/* 1. Daily Spending Bar Chart (Last 7 Days) */}
      {last7Days.length > 0 ? (
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Last 7 Days Activity</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Daily spending trends
            </Text>
          </View>

          <View style={styles.barChartContainer}>
            {last7Days.map((day, idx) => {
              const heightPct = Math.min(100, Math.max(8, (day.amount / maxDayAmount) * 100));
              const isToday = day.is_today;

              return (
                <View key={`day-${idx}`} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: isToday ? theme.primary : theme.primarySoft,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: isToday ? theme.primary : theme.textMuted,
                        fontWeight: isToday ? Typography.weights.bold : Typography.weights.medium,
                      },
                    ]}
                  >
                    {day.day_name.slice(0, 3)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* 2. Top Category Spending Breakdown */}
      {categoryBreakdown.length > 0 ? (
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              marginTop: Spacing.md,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Category Breakdown</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Highest expense allocations
            </Text>
          </View>

          <View style={styles.categoryList}>
            {categoryBreakdown.slice(0, 5).map((cat, idx) => {
              const barColor = cat.color || theme.primary;

              return (
                <View key={`cat-${idx}`} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryTitleRow}>
                      <View style={[styles.colorDot, { backgroundColor: barColor }]} />
                      <Text style={[styles.categoryName, { color: theme.text }]}>
                        {cat.category}
                      </Text>
                    </View>
                    <View style={styles.categoryAmountRow}>
                      <Text style={[styles.categoryAmount, { color: theme.text }]}>
                        {formatCurrency(cat.amount, currency)}
                      </Text>
                      <Text style={[styles.categoryPct, { color: theme.textMuted }]}>
                        ({cat.percentage.toFixed(0)}%)
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar Track */}
                  <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceMuted }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(3, cat.percentage))}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  chartCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  cardSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: Spacing.sm,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 90,
    width: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: Radii.sm,
  },
  dayLabel: {
    fontSize: Typography.sizes.xs,
  },
  categoryList: {
    marginTop: Spacing.xs,
  },
  categoryItem: {
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    marginRight: 8,
  },
  categoryName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  categoryAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryAmount: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginRight: 4,
  },
  categoryPct: {
    fontSize: Typography.sizes.xs,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
});
