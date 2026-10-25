// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Dashboard Screen
// Faithfully matching frontend/src/pages/Dashboard.jsx
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/components/ui/Header';
import { CashFlowOverview } from '../../src/components/cards/CashFlowOverview';
import { formatCurrency, formatCompactCurrency } from '../../src/utils/formatCurrency';
import { getCategoryColor } from '../../src/constants/categories';
import { Spacing, Radii, Typography, useResponsive } from '../../src/theme';

// Helper for human-readable wallet type names
function getWalletTypeLabel(type?: string) {
  const t = (type || '').toUpperCase();
  if (t === 'BANK') return 'Bank Account';
  if (t === 'WALLET' || t === 'UPI' || t === 'DIGITAL') return 'Digital Wallet';
  if (t === 'CASH') return 'Cash Wallet';
  if (t === 'CREDIT_CARD') return 'Credit Card';
  return 'Personal Account';
}

function getWalletIconName(type?: string): keyof typeof Ionicons.glyphMap {
  const t = (type || '').toUpperCase();
  if (t === 'BANK') return 'business-outline';
  if (t === 'CASH') return 'cash-outline';
  if (t === 'CREDIT_CARD') return 'card-outline';
  return 'wallet-outline';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { isSmallPhone, isTablet, contentMaxWidth } = useResponsive();
  const {
    wallets,
    transactions,
    currency,
    monthState,
    totalBalance,
    totalIncome,
    totalSpent,
    netCashFlow,
    isRefreshing,
    refreshAll,
  } = useApp();

  const [period, setPeriod] = useState<'7D' | '3M' | '6M' | '1Y'>('7D');

  // Month transactions (filtered by current monthState)
  const monthTransactions = useMemo(() => {
    const y = monthState.year;
    const m = monthState.month + 1;
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    return transactions.filter((t) => {
      const d = t.date || '';
      return d.startsWith(prefix);
    });
  }, [transactions, monthState]);

  // Dual Bar Chart Data based on selected period
  const chartData = useMemo(() => {
    if (period === '3M' || period === '6M' || period === '1Y') {
      const monthCount = period === '3M' ? 3 : period === '6M' ? 6 : 12;
      const months = [];
      const curr = new Date(monthState.year, monthState.month, 1);

      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;

        const inc = transactions
          .filter((t) => (t.date || '').startsWith(prefix) && (t.type || '').toLowerCase() === 'income')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const exp = transactions
          .filter((t) => (t.date || '').startsWith(prefix) && (t.type || '').toLowerCase() === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        months.push({ label, displayDate: `${label} ${y}`, income: inc, expense: exp });
      }
      return months;
    }

    // Default: '7D' (Last 7 days)
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const displayDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

      const inc = transactions
        .filter((t) => (t.date || '').startsWith(dateStr) && (t.type || '').toLowerCase() === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const exp = transactions
        .filter((t) => (t.date || '').startsWith(dateStr) && (t.type || '').toLowerCase() === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      days.push({ label, displayDate, income: inc, expense: exp });
    }
    return days;
  }, [period, transactions, monthState]);

  // Max value in chart data to scale bar heights
  const maxChartVal = useMemo(() => {
    let max = 0;
    chartData.forEach((d) => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
    });
    return Math.max(max, 1000);
  }, [chartData]);

  // Expense Breakdown
  const expenseBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    monthTransactions
      .filter((t) => (t.type || '').toLowerCase() === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Other';
        const val = Number(t.amount || 0);
        totals[cat] = (totals[cat] || 0) + val;
      });

    const sorted = Object.keys(totals)
      .map((cat) => ({
        name: cat,
        amount: totals[cat],
        color: getCategoryColor(cat),
      }))
      .sort((a, b) => b.amount - a.amount);

    if (sorted.length === 0) return [];

    const top = sorted.slice(0, 4);
    const remaining = sorted.slice(4);

    if (remaining.length > 0) {
      const remainingSum = remaining.reduce((s, c) => s + c.amount, 0);
      top.push({
        name: 'Others',
        amount: remainingSum,
        color: '#64748b',
      });
    }

    return top.map((item) => ({
      ...item,
      percentage: totalSpent > 0 ? Math.round((item.amount / totalSpent) * 100) : 0,
    }));
  }, [monthTransactions, totalSpent]);

  // Income Sources
  const incomeBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    monthTransactions
      .filter((t) => (t.type || '').toLowerCase() === 'income')
      .forEach((t) => {
        const cat = t.category || 'Salary';
        const val = Number(t.amount || 0);
        totals[cat] = (totals[cat] || 0) + val;
      });

    const sorted = Object.keys(totals)
      .map((cat) => ({
        name: cat,
        amount: totals[cat],
        color: getCategoryColor(cat),
      }))
      .sort((a, b) => b.amount - a.amount);

    if (sorted.length === 0) return [];

    const top = sorted.slice(0, 4);
    const remaining = sorted.slice(4);

    if (remaining.length > 0) {
      const remainingSum = remaining.reduce((s, c) => s + c.amount, 0);
      top.push({
        name: 'Other',
        amount: remainingSum,
        color: '#64748b',
      });
    }

    return top.map((item) => ({
      ...item,
      percentage: totalIncome > 0 ? Math.round((item.amount / totalIncome) * 100) : 0,
    }));
  }, [monthTransactions, totalIncome]);

  // Recent Transactions Filter ('all' | 'expense' | 'income' | 'transfer')
  const [recentFilter, setRecentFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');

  // Recent 6 Transactions
  const recentTransactions = useMemo(() => {
    const source = monthTransactions.length > 0 ? monthTransactions : transactions;
    return [...source]
      .filter((t) => {
        if (recentFilter === 'all') return true;
        return (t.type || 'expense').toLowerCase() === recentFilter;
      })
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA) || (b.id || 0) - (a.id || 0);
      })
      .slice(0, 6);
  }, [monthTransactions, transactions, recentFilter]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshAll}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* ---------------------------------------------------------------------
            Row 1: Four Top Summary Cards (TOTAL INCOME, TOTAL EXPENSES, TOTAL BALANCE, NET CASH FLOW)
            --------------------------------------------------------------------- */}
        <View style={styles.kpisGrid}>
          {/* Card 1: Total Income (Green) */}
          <View
            style={[
              styles.kpiCard,
              isTablet && { minWidth: '22%' },
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderTopColor: '#10b981',
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>TOTAL INCOME</Text>
            <Text style={[styles.kpiAmount, { color: '#10b981' }]} numberOfLines={1}>
              +{formatCurrency(totalIncome, currency)}
            </Text>
          </View>

          {/* Card 2: Total Expenses (Red) */}
          <View
            style={[
              styles.kpiCard,
              isTablet && { minWidth: '22%' },
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderTopColor: '#ef4444',
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>TOTAL EXPENSES</Text>
            <Text style={[styles.kpiAmount, { color: '#ef4444' }]} numberOfLines={1}>
              -{formatCurrency(totalSpent, currency)}
            </Text>
          </View>

          {/* Card 3: Total Balance (Blue) */}
          <View
            style={[
              styles.kpiCard,
              isTablet && { minWidth: '22%' },
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderTopColor: '#2563eb',
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>TOTAL BALANCE</Text>
            <Text style={[styles.kpiAmount, { color: theme.text }]} numberOfLines={1}>
              {formatCurrency(totalBalance, currency)}
            </Text>
          </View>

          {/* Card 4: Net Cash Flow (Purple) */}
          <View
            style={[
              styles.kpiCard,
              isTablet && { minWidth: '22%' },
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderTopColor: '#8b5cf6',
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>NET CASH FLOW</Text>
            <Text
              style={[
                styles.kpiAmount,
                { color: netCashFlow >= 0 ? '#10b981' : '#ef4444' },
              ]}
              numberOfLines={1}
            >
              {netCashFlow >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(netCashFlow), currency)}
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------------------------------
            Row 2: Your Wallets Section (Matching web .dashboard-section-card)
            --------------------------------------------------------------------- */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleGroup}>
              <View style={[styles.headerIconBox, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="card-outline" size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Your Wallets</Text>
                <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                  Manage your wallets and accounts
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/(tabs)/wallets')}>
              <Text style={[styles.dashboardLink, { color: theme.primary }]}>View All Wallets →</Text>
            </TouchableOpacity>
          </View>

          {wallets && wallets.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletsScroll}>
              {wallets.map((w, idx) => {
                const bal = Number(w.current_balance ?? w.balance ?? w.initial_balance ?? 0);
                const typeLabel = getWalletTypeLabel(w.wallet_type);
                const accentColor = w.color || (idx === 0 ? '#10b981' : idx === 1 ? '#2563eb' : '#8b5cf6');
                const isPrimary = idx === 0 || w.is_default;

                return (
                  <TouchableOpacity
                    key={w.id}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/modal/wallet', params: { walletId: String(w.id) } })}
                    style={[
                      styles.walletTile,
                      {
                        backgroundColor: isDark ? '#161e2e' : '#f8fafc',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.walletTileTop}>
                      <View style={[styles.walletTileIcon, { backgroundColor: accentColor }]}>
                        <Ionicons name={getWalletIconName(w.wallet_type)} size={16} color="#ffffff" />
                      </View>
                      <View style={styles.walletTileMeta}>
                        <Text style={[styles.walletTileName, { color: theme.text }]} numberOfLines={1}>
                          {w.name}
                        </Text>
                        <Text style={[styles.walletTileType, { color: theme.textMuted }]}>{typeLabel}</Text>
                      </View>
                      <Text style={[styles.walletChevron, { color: theme.textMuted }]}>›</Text>
                    </View>

                    <View style={styles.walletTileBottom}>
                      <Text style={[styles.walletTileBalance, { color: theme.text }]}>
                        {formatCurrency(bal, currency)}
                      </Text>
                      {isPrimary && (
                        <View style={[styles.primaryTag, { backgroundColor: theme.primarySoft }]}>
                          <Text style={[styles.primaryTagText, { color: theme.primary }]}>Primary</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No wallets found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Connect your bank, cash, or digital wallets to track balances accurately.
              </Text>
            </View>
          )}
        </View>

        {/* ---------------------------------------------------------------------
            Row 3: Full-Width Cash Flow Overview Chart
            --------------------------------------------------------------------- */}
        <CashFlowOverview
          transactions={transactions}
          currency={currency}
          month={monthState}
        />

        {/* ---------------------------------------------------------------------
            Row 4: Analytics Row (Dual Bar Chart, Expense Breakdown, Income Sources)
            --------------------------------------------------------------------- */}
        {/* Chart A: Income vs Expenses Dual-Bar Chart */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeaderWrap}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Income vs Expenses</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                Track your monthly financial flow
              </Text>
            </View>

            <View style={styles.periodPills}>
              {(['7D', '3M', '6M', '1Y'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[
                    styles.periodBtn,
                    period === p && { backgroundColor: theme.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.periodBtnText,
                      { color: period === p ? '#ffffff' : theme.textSecondary },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Expenses</Text>
            </View>
          </View>

          {/* Bar Chart Plot Area */}
          <View style={styles.barChartContainer}>
            <View style={styles.barsRow}>
              {chartData.map((d, idx) => {
                const incHeight = Math.max((d.income / maxChartVal) * 110, 4);
                const expHeight = Math.max((d.expense / maxChartVal) * 110, 4);

                return (
                  <View key={idx} style={styles.barGroup}>
                    <View style={styles.barPair}>
                      <View style={[styles.bar, { height: incHeight, backgroundColor: '#10b981' }]} />
                      <View style={[styles.bar, { height: expHeight, backgroundColor: '#ef4444' }]} />
                    </View>
                    <Text style={[styles.barLabel, { color: theme.textMuted }]} numberOfLines={1}>
                      {d.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Chart B: Expense Breakdown */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Expense Breakdown</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                Where your money goes
              </Text>
            </View>
            <Text style={[styles.totalSpentText, { color: '#ef4444' }]}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          </View>

          <View style={styles.breakdownList}>
            {expenseBreakdown.length > 0 ? (
              expenseBreakdown.map((item, idx) => (
                <View key={idx} style={[styles.breakdownRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.breakdownName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={[styles.pctBadge, { backgroundColor: theme.surfaceMuted }]}>
                      <Text style={[styles.pctText, { color: theme.textSecondary }]}>{item.percentage}%</Text>
                    </View>
                    <Text style={[styles.breakdownAmt, { color: theme.text }]}>
                      {formatCurrency(item.amount, currency)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  No expenses recorded this month
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chart C: Income Sources */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Income Sources</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                Where your money comes from
              </Text>
            </View>
            <Text style={[styles.totalSpentText, { color: '#10b981' }]}>
              {formatCurrency(totalIncome, currency)}
            </Text>
          </View>

          <View style={styles.breakdownList}>
            {incomeBreakdown.length > 0 ? (
              incomeBreakdown.map((item, idx) => (
                <View key={idx} style={[styles.breakdownRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.breakdownName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={[styles.pctBadge, { backgroundColor: theme.surfaceMuted }]}>
                      <Text style={[styles.pctText, { color: theme.textSecondary }]}>{item.percentage}%</Text>
                    </View>
                    <Text style={[styles.breakdownAmt, { color: theme.text }]}>
                      {formatCurrency(item.amount, currency)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  No income recorded this month
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ---------------------------------------------------------------------
            Row 5: Recent Transactions (Matching web Recent Transactions Table)
            --------------------------------------------------------------------- */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Recent Transactions</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                Your latest financial activities
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/transactions')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="filter-outline" size={14} color={theme.primary} />
              <Text style={[styles.dashboardLink, { color: theme.primary }]}>View Ledger →</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills on Transaction Box */}
          <View style={{ flexDirection: 'row', gap: 6, marginHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
            {(['all', 'expense', 'income', 'transfer'] as const).map((f) => {
              const labels: Record<string, string> = { all: 'All', expense: 'Expenses', income: 'Income', transfer: 'Transfers' };
              const isSelected = recentFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  activeOpacity={0.7}
                  onPress={() => setRecentFilter(f)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: Radii.pill,
                    borderWidth: 1,
                    backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                    borderColor: isSelected ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? '#ffffff' : theme.textSecondary,
                    }}
                  >
                    {labels[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.recentTxList}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => {
                const tType = (tx.type || 'expense').toLowerCase();
                const isIncome = tType === 'income';
                const isTransfer = tType === 'transfer';
                const cat = tx.category || (isIncome ? 'Salary' : isTransfer ? 'Transfer' : 'Other');
                const catColor = getCategoryColor(cat);
                const desc = tx.note || cat;
                const amountVal = Number(tx.amount || 0);
                const walletName = tx.wallet_name || 'Main Wallet';

                return (
                  <TouchableOpacity
                    key={`${tx.type}-${tx.id}`}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: '/modal/transaction', params: { txId: String(tx.id), txType: tx.type } })}
                    style={[styles.recentTxItem, { borderBottomColor: theme.border }]}
                  >
                    <View style={styles.recentTxLeft}>
                      <View
                        style={[
                          styles.recentTxIconBox,
                          {
                            backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.12)' : isTransfer ? 'rgba(37, 99, 235, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.recentTxDirection,
                            { color: isIncome ? '#10b981' : isTransfer ? '#2563eb' : '#ef4444' },
                          ]}
                        >
                          {isIncome ? '↑' : isTransfer ? '⇄' : '↓'}
                        </Text>
                      </View>

                      <View style={styles.recentTxMeta}>
                        <Text style={[styles.recentTxDesc, { color: theme.text }]} numberOfLines={1}>
                          {desc}
                        </Text>
                        <View style={styles.recentTxSubRow}>
                          <View style={[styles.categoryBadge, { backgroundColor: `${catColor}1a` }]}>
                            <Text style={[styles.categoryBadgeText, { color: catColor }]}>{cat}</Text>
                          </View>
                          <Text style={[styles.recentTxWallet, { color: theme.textMuted }]} numberOfLines={1}>
                            • {walletName}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.recentTxRight}>
                      <Text
                        style={[
                          styles.recentTxAmount,
                          { color: isIncome ? '#10b981' : isTransfer ? theme.text : '#ef4444' },
                        ]}
                      >
                        {isIncome ? `+${formatCurrency(amountVal, currency)}` : isTransfer ? formatCurrency(amountVal, currency) : `-${formatCurrency(amountVal, currency)}`}
                      </Text>
                      <Text style={[styles.recentTxDate, { color: theme.textMuted }]}>
                        {tx.date || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No recent transactions</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  Income and expenses you record will appear here in chronological order.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  // Row 1: KPIs Grid
  kpisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    padding: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderTopWidth: 3.5,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  // Section Cards
  sectionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardHeaderWrap: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  cardSubtitle: {
    fontSize: Typography.sizes.xs,
  },
  dashboardLink: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  totalSpentText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  // Wallets Section
  walletsScroll: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  walletTile: {
    width: 200,
    padding: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  walletTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  walletTileIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  walletTileMeta: {
    flex: 1,
  },
  walletTileName: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  walletTileType: {
    fontSize: 10,
  },
  walletChevron: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  walletTileBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletTileBalance: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  primaryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  primaryTagText: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
  },
  // Chart Periods & Legend
  periodPills: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  periodBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
  legendText: {
    fontSize: Typography.sizes.xs,
  },
  // Bar Chart
  barChartContainer: {
    marginTop: Spacing.sm,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  // Breakdown List
  breakdownList: {
    marginTop: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: Radii.pill,
  },
  breakdownName: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  pctText: {
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
  },
  breakdownAmt: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  // Recent Transactions List
  recentTxList: {
    marginTop: Spacing.xs,
  },
  recentTxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  recentTxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  recentTxIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTxDirection: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentTxMeta: {
    flex: 1,
  },
  recentTxDesc: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  recentTxSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radii.sm,
  },
  categoryBadgeText: {
    fontSize: 9.5,
    fontWeight: Typography.weights.bold,
  },
  recentTxWallet: {
    fontSize: 10,
  },
  recentTxRight: {
    alignItems: 'flex-end',
  },
  recentTxAmount: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  recentTxDate: {
    fontSize: 9.5,
    marginTop: 2,
  },
  // Empty states
  emptyContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
});
