// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Financial Insights & Analytics Screen
// ---------------------------------------------------------------------------

import React from 'react';
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
import { Header } from '../../src/components/Header';
import { BudgetMeter } from '../../src/components/BudgetMeter';
import { BudgetRing } from '../../src/components/BudgetRing';
import { CashFlowOverview } from '../../src/components/CashFlowOverview';
import { CashFlowChart } from '../../src/components/CashFlowChart';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { Spacing, Radii, Typography } from '../../src/theme';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    transactions,
    wallets,
    insights,
    budget,
    currency,
    totalIncome,
    totalSpent,
    netCashFlow,
    isRefreshing,
    refreshInsights,
  } = useApp();

  const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;
  const budgetTarget = budget?.target_amount || insights?.budget_target || 20000;
  const budgetLeft = budgetTarget - totalSpent;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header subtitle="Financial Intelligence & Analytics" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshInsights}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* 4 KPIs matching Insights.jsx: Total Income, Total Expenses, Net Cash Flow, Savings Rate */}
        <View style={styles.kpiGrid}>
          {/* 1. Total Income */}
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Total Income</Text>
            <Text style={[styles.kpiAmount, { color: theme.success }]}>
              +{formatCurrency(totalIncome, currency, { compact: true })}
            </Text>
          </View>

          {/* 2. Total Expenses */}
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Total Expenses</Text>
            <Text style={[styles.kpiAmount, { color: theme.danger }]}>
              -{formatCurrency(totalSpent, currency, { compact: true })}
            </Text>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          {/* 3. Net Cash Flow */}
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Net Cash Flow</Text>
            <Text style={[styles.kpiAmount, { color: netCashFlow >= 0 ? theme.success : theme.danger }]}>
              {netCashFlow >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(netCashFlow), currency, { compact: true })}
            </Text>
          </View>

          {/* 4. Savings Rate */}
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Savings Rate</Text>
            <Text style={[styles.kpiAmount, { color: theme.primary }]}>
              {savingsRate}%
            </Text>
          </View>
        </View>

        {/* Accounts & Wallets Quick Bar (Matching web Insights.jsx) */}
        {wallets.length > 0 ? (
          <View style={[styles.walletsBarCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.walletsBarHeader}>
              <Text style={[styles.walletsBarTitle, { color: theme.textMuted }]}>
                ACCOUNTS & WALLETS
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/wallets')}>
                <Text style={[styles.walletsBarLink, { color: theme.primary }]}>
                  Manage Wallets →
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletsScroll}>
              {wallets.map((w) => {
                const b = Number(w.current_balance ?? w.initial_balance ?? 0);
                return (
                  <View
                    key={w.id}
                    style={[
                      styles.walletBadge,
                      {
                        backgroundColor: theme.surfaceMuted,
                        borderColor: theme.border,
                        borderLeftColor: w.color || theme.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.walletBadgeName, { color: theme.textMuted }]} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text style={[styles.walletBadgeBalance, { color: b >= 0 ? theme.success : theme.danger }]}>
                      {formatCurrency(b, currency, { compact: true })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Budget Ring & Target */}
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Budget Utilization</Text>
          <TouchableOpacity onPress={() => router.push('/modal/budget')}>
            <Text style={[styles.actionLink, { color: theme.primary }]}>Configure Target</Text>
          </TouchableOpacity>
        </View>

        <BudgetRing
          totalSpent={totalSpent}
          budget={budgetTarget}
          budgetLeft={budgetLeft}
          daysLeft={Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())}
          currency={currency}
        />

        {/* Cash Flow Overview Multi-Period */}
        <CashFlowOverview
          transactions={transactions}
          currency={currency}
        />

        {/* Category Trends */}
        <CashFlowChart
          last7Days={insights?.last_7_days || []}
          categoryBreakdown={insights?.category_breakdown || []}
          totalIncome={totalIncome}
          totalSpent={totalSpent}
          currency={currency}
        />

        {/* Income Breakdown */}
        {insights?.income_category_breakdown && insights.income_category_breakdown.length > 0 ? (
          <View
            style={[
              styles.breakdownCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                marginTop: Spacing.md,
              },
            ]}
          >
            <Text style={[styles.breakdownTitle, { color: theme.text }]}>
              Income Sources
            </Text>
            <Text style={[styles.breakdownSubtitle, { color: theme.textMuted }]}>
              Where your money came from this month
            </Text>

            <View style={{ marginTop: Spacing.md }}>
              {insights.income_category_breakdown.map((item, idx) => (
                <View key={`inc-${idx}`} style={styles.incomeItem}>
                  <View style={styles.incomeItemHeader}>
                    <Text style={[styles.incomeName, { color: theme.text }]}>{item.category}</Text>
                    <Text style={[styles.incomeAmt, { color: theme.success }]}>
                      +{formatCurrency(item.amount, currency)}
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.max(5, item.percentage))}%`,
                          backgroundColor: theme.success,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
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
  kpiGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  kpiCard: {
    flex: 1,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  kpiLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  kpiAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  actionLink: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  breakdownCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  breakdownTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  breakdownSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  incomeItem: {
    marginBottom: Spacing.md,
  },
  incomeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  incomeName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  incomeAmt: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  progressTrack: {
    height: 6,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  walletsBarCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  walletsBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  walletsBarTitle: {
    fontSize: 11,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  walletsBarLink: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  walletsScroll: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  walletBadge: {
    borderWidth: 1,
    borderLeftWidth: 3.5,
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 120,
  },
  walletBadgeName: {
    fontSize: 11,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  walletBadgeBalance: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.extrabold,
  },
});
