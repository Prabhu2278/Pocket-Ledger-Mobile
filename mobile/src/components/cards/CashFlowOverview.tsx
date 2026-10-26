// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Replicated Cash Flow Overview Component
// Matching frontend/src/components/CashFlowOverview.jsx
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { Transaction } from '../../types';
import { Spacing, Radii, Typography } from '../../theme';

interface CashFlowOverviewProps {
  transactions: Transaction[];
  currency?: string;
  month?: { year: number; month: number };
}

export const CashFlowOverview: React.FC<CashFlowOverviewProps> = ({
  transactions = [],
  currency = 'INR',
  month,
}) => {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<'7D' | '1M' | '3M' | '6M' | '1Y'>('6M');

  // Compute period data points based on transactions
  const chartData = useMemo(() => {
    const now = new Date();
    const anchor =
      month && typeof month.year === 'number' && typeof month.month === 'number'
        ? new Date(month.year, month.month, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);

    if (period === '7D') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const dt = d.getDate();
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(dt).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { weekday: 'short' });

        let inc = 0;
        let exp = 0;
        transactions.forEach((tx) => {
          if (!tx.date || !tx.date.startsWith(iso)) return;
          const a = Number(tx.amount) || 0;
          if (tx.type === 'income') inc += a;
          else if (tx.type === 'expense') exp += a;
        });

        days.push({ label, displayDate: iso, income: inc, expense: exp });
      }
      return days;
    }

    const monthCount = period === '1M' ? 1 : period === '3M' ? 3 : period === '6M' ? 6 : 12;
    const months = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      let inc = 0;
      let exp = 0;
      transactions.forEach((tx) => {
        if (!tx.date || !tx.date.startsWith(prefix)) return;
        const a = Number(tx.amount) || 0;
        if (tx.type === 'income') inc += a;
        else if (tx.type === 'expense') exp += a;
      });

      months.push({ label, displayDate: label, income: inc, expense: exp });
    }

    return months;
  }, [transactions, period, month]);

  // Aggregate totals for the active period
  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0);
  const netCashFlow = totalIncome - totalExpense;

  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.income, d.expense)),
    1000
  );

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
      {/* Header with Title and Period Filter Pills */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Cash Flow Overview</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Income vs. Expenses across {period}
          </Text>
        </View>

        {/* Net Cash Flow Pill - Replicating SSL/Status pill from Web (Pic 2) */}
        <View
          style={[
            styles.netPill,
            {
              backgroundColor: netCashFlow >= 0 ? '#ecfdf5' : '#fff1f2',
              borderColor: netCashFlow >= 0 ? '#a7f3d0' : '#fecdd3',
              borderWidth: 1,
            },
          ]}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: netCashFlow >= 0 ? '#10b981' : '#f43f5e',
              marginRight: 5,
            }}
          />
          <Text
            style={[
              styles.netPillText,
              { color: netCashFlow >= 0 ? '#059669' : '#e11d48' },
            ]}
          >
            {netCashFlow >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(netCashFlow), currency, { compact: true })} Net
          </Text>
        </View>
      </View>

      {/* Period Selection Tabs - Soft Lavender Track with Vibrant Indigo Active Pill */}
      <View
        style={[
          styles.periodTabsRow,
          {
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            borderWidth: 1,
          },
        ]}
      >
        {(['7D', '1M', '3M', '6M', '1Y'] as const).map((p) => {
          const isActive = period === p;
          return (
            <TouchableOpacity
              key={p}
              activeOpacity={0.8}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodTab,
                isActive && {
                  backgroundColor: '#4f46e5',
                  shadowColor: '#4f46e5',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodTabText,
                  {
                    color: isActive ? '#ffffff' : '#6366f1',
                    fontWeight: isActive ? Typography.weights.bold : Typography.weights.semibold,
                  },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bar Chart Plot Area */}
      <View style={styles.plotContainer}>
        {chartData.map((d, idx) => {
          const incHeight = Math.max(4, (d.income / maxVal) * 90);
          const expHeight = Math.max(4, (d.expense / maxVal) * 90);

          return (
            <View key={idx} style={styles.barGroup}>
              <View style={styles.barsContainer}>
                {/* Income Bar (Green) */}
                <View
                  style={[
                    styles.bar,
                    {
                      height: incHeight,
                      backgroundColor: theme.success,
                    },
                  ]}
                />
                {/* Expense Bar (Red) */}
                <View
                  style={[
                    styles.bar,
                    {
                      height: expHeight,
                      backgroundColor: theme.danger,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: theme.textMuted }]}>{d.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Bottom Summary Legend Row */}
      <View style={[styles.legendRow, { borderTopColor: theme.borderSubtle }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Income: {formatCurrency(totalIncome, currency, { compact: true })}
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Spent: {formatCurrency(totalExpense, currency, { compact: true })}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  netPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  netPillText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
  periodTabsRow: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 3,
    marginVertical: Spacing.sm,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
  },
  periodTabText: {
    fontSize: Typography.sizes.xs,
  },
  plotContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 95,
    gap: 3,
  },
  bar: {
    width: 10,
    borderRadius: Radii.xs,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
    marginRight: 6,
  },
  legendText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
});

export default CashFlowOverview;
