// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Replicated Cash Flow Overview Component
// Matching frontend/src/components/CashFlowOverview.jsx and Dashboard spec
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
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
  const { theme, isDark } = useTheme();
  const [period, setPeriod] = useState<'7D' | '1M' | '3M' | '6M' | '1Y'>('7D');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

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
        const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        let inc = 0;
        let exp = 0;
        transactions.forEach((tx) => {
          if (!tx.date || !tx.date.startsWith(iso)) return;
          const a = Number(tx.amount) || 0;
          if (tx.type === 'income') inc += a;
          else if (tx.type === 'expense') exp += a;
        });

        days.push({ label, displayDate, income: inc, expense: exp });
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
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      let inc = 0;
      let exp = 0;
      transactions.forEach((tx) => {
        if (!tx.date || !tx.date.startsWith(prefix)) return;
        const a = Number(tx.amount) || 0;
        if (tx.type === 'income') inc += a;
        else if (tx.type === 'expense') exp += a;
      });

      months.push({ label, displayDate, income: inc, expense: exp });
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

  const activeItem = selectedBarIndex !== null ? chartData[selectedBarIndex] : null;

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      onPress={() => setSelectedBarIndex(null)}
    >
      {/* Header with Title and Period Filter Pills */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Income vs Expenses</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Track your monthly financial flow
          </Text>
        </View>

        {/* Net Cash Flow Pill */}
        <View
          style={[
            styles.netPill,
            {
              backgroundColor: isDark
                ? (netCashFlow >= 0 ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)')
                : (netCashFlow >= 0 ? '#ecfdf5' : '#fff1f2'),
              borderColor: isDark
                ? (netCashFlow >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)')
                : (netCashFlow >= 0 ? '#a7f3d0' : '#fecdd3'),
              borderWidth: 1,
            },
          ]}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: netCashFlow >= 0 ? (isDark ? '#34d399' : '#10b981') : (isDark ? '#fb7185' : '#f43f5e'),
              marginRight: 5,
            }}
          />
          <Text
            style={[
              styles.netPillText,
              { color: netCashFlow >= 0 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#fb7185' : '#e11d48') },
            ]}
          >
            {netCashFlow >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(netCashFlow), currency, { compact: true })} Net
          </Text>
        </View>
      </View>

      {/* Period Selection Tabs */}
      <View
        style={[
          styles.periodTabsRow,
          {
            backgroundColor: isDark ? '#141c2e' : '#eef2ff',
            borderColor: isDark ? '#24304f' : '#c7d2fe',
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
              onPress={() => {
                setPeriod(p);
                setSelectedBarIndex(null);
              }}
              style={[
                styles.periodTab,
                isActive && {
                  backgroundColor: '#6366f1',
                  shadowColor: '#6366f1',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.35,
                  shadowRadius: 3,
                  elevation: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodTabText,
                  {
                    color: isActive ? '#ffffff' : (isDark ? '#94a3b8' : '#6366f1'),
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
        {/* Floating Tooltip matching image */}
        {activeItem && selectedBarIndex !== null && (
          <View
            style={[
              styles.tooltipBox,
              selectedBarIndex === 0
                ? { left: 4 }
                : selectedBarIndex === chartData.length - 1
                ? { right: 4 }
                : {
                    left: `${Math.max(
                      4,
                      Math.min(
                        70,
                        (selectedBarIndex / (chartData.length - 1)) * 100 - 20
                      )
                    )}%`,
                  },
            ]}
          >
            <Text style={styles.tooltipHeader}>{activeItem.displayDate || activeItem.label}</Text>
            
            <View style={styles.tooltipRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.tooltipDot, { backgroundColor: '#34d399' }]} />
                <Text style={styles.tooltipLabel}>Income</Text>
              </View>
              <Text style={[styles.tooltipValue, { color: '#34d399' }]}>
                +{formatCurrency(activeItem.income, currency)}
              </Text>
            </View>

            <View style={styles.tooltipRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.tooltipDot, { backgroundColor: '#f87171' }]} />
                <Text style={styles.tooltipLabel}>Expenses</Text>
              </View>
              <Text style={[styles.tooltipValue, { color: '#f87171' }]}>
                -{formatCurrency(activeItem.expense, currency)}
              </Text>
            </View>

            <View style={styles.tooltipDivider} />

            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipNetLabel}>Net</Text>
              <Text
                style={[
                  styles.tooltipValue,
                  { color: activeItem.income >= activeItem.expense ? '#34d399' : '#f87171' },
                ]}
              >
                {activeItem.income >= activeItem.expense ? '+' : '-'}
                {formatCurrency(Math.abs(activeItem.income - activeItem.expense), currency)}
              </Text>
            </View>

            {/* Caret pointing down */}
            <View
              style={[
                styles.tooltipCaret,
                selectedBarIndex === 0
                  ? { left: 24 }
                  : selectedBarIndex === chartData.length - 1
                  ? { right: 24 }
                  : { alignSelf: 'center' },
              ]}
            />
          </View>
        )}

        {/* Bars Row */}
        <View style={styles.barsRow}>
          {chartData.map((d, idx) => {
            const incHeight = Math.max(5, (d.income / maxVal) * 95);
            const expHeight = Math.max(5, (d.expense / maxVal) * 95);
            const isSelected = selectedBarIndex === idx;

            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => setSelectedBarIndex(selectedBarIndex === idx ? null : idx)}
                style={[
                  styles.barGroup,
                  isSelected && {
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.09)',
                    borderRadius: Radii.sm,
                  },
                ]}
              >
                <View style={styles.barsContainer}>
                  {/* Income Bar (Green) */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: incHeight,
                        backgroundColor: '#10b981',
                      },
                    ]}
                  />
                  {/* Expense Bar (Red) */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: expHeight,
                        backgroundColor: '#f43f5e',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    {
                      color: isSelected ? (isDark ? '#ffffff' : '#312e81') : theme.textMuted,
                      fontWeight: isSelected ? Typography.weights.bold : Typography.weights.medium,
                    },
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bottom Summary Legend Row */}
      <View style={[styles.legendRow, { borderTopColor: theme.borderSubtle }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Income: {formatCurrency(totalIncome, currency, { compact: true })}
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f43f5e' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Expenses: {formatCurrency(totalExpense, currency, { compact: true })}
          </Text>
        </View>
      </View>
    </Pressable>
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
    marginBottom: Spacing.xs,
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
    position: 'relative',
    paddingTop: 84, // Room for floating tooltip
    paddingBottom: Spacing.xs,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 125,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingVertical: 4,
    marginHorizontal: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 3,
  },
  bar: {
    width: 10,
    borderRadius: Radii.xs,
  },
  barLabel: {
    fontSize: 11,
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
  tooltipBox: {
    position: 'absolute',
    top: 4,
    zIndex: 99,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f293d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 156,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  tooltipHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 1,
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tooltipLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  tooltipValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 3,
  },
  tooltipNetLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tooltipCaret: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#111827',
  },
});

export default CashFlowOverview;
