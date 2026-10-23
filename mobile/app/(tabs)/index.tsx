// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Dashboard Screen
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
import { TotalBalanceCard, IncomeExpenseRow } from '../../src/components/StatCard';
import { WalletCard } from '../../src/components/WalletCard';
import { TransactionItem } from '../../src/components/TransactionItem';
import { CashFlowChart } from '../../src/components/CashFlowChart';
import { BudgetMeter } from '../../src/components/BudgetMeter';
import { BudgetRing } from '../../src/components/BudgetRing';
import { CashFlowOverview } from '../../src/components/CashFlowOverview';
import { EmptyState } from '../../src/components/EmptyState';
import { Spacing, Radii, Typography } from '../../src/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    wallets,
    transactions,
    insights,
    budget,
    currency,
    totalBalance,
    totalIncome,
    totalSpent,
    isRefreshing,
    refreshAll,
  } = useApp();

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* 1. Total Net Balance Card */}
        <TotalBalanceCard
          balance={totalBalance}
          currency={currency}
          walletCount={wallets.length}
        />

        {/* 2. Monthly Income vs Expenses Row */}
        <IncomeExpenseRow
          income={totalIncome}
          spent={totalSpent}
          currency={currency}
        />

        {/* 3. Quick Action Buttons */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push({ pathname: '/modal/transaction', params: { initialType: 'expense' } })}
            style={[styles.quickActionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: theme.dangerSoft }]}>
              <Ionicons name="arrow-up" size={16} color={theme.danger} />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push({ pathname: '/modal/transaction', params: { initialType: 'income' } })}
            style={[styles.quickActionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: theme.successSoft }]}>
              <Ionicons name="arrow-down" size={16} color={theme.success} />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push({ pathname: '/modal/transaction', params: { initialType: 'transfer' } })}
            style={[styles.quickActionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: theme.infoSoft }]}>
              <Ionicons name="swap-horizontal" size={16} color={theme.info} />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Monthly Budget Ring (Matching Web BudgetRing.jsx) */}
        <BudgetRing
          totalSpent={totalSpent}
          budget={budget?.target_amount || insights?.budget_target || 20000}
          budgetLeft={(budget?.target_amount || insights?.budget_target || 20000) - totalSpent}
          daysLeft={Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())}
          currency={currency}
        />

        {/* 5. Interactive Cash Flow Overview Chart (Matching Web CashFlowOverview.jsx) */}
        <CashFlowOverview
          transactions={transactions}
          currency={currency}
        />

        {/* 6. Last 7 Days & Top Category Allocations */}
        <CashFlowChart
          last7Days={insights?.last_7_days || []}
          categoryBreakdown={insights?.category_breakdown || []}
          totalIncome={totalIncome}
          totalSpent={totalSpent}
          currency={currency}
        />

        {/* 6. Accounts / Wallets Overview */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Accounts & Wallets</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/wallets')}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>View All ({wallets.length})</Text>
          </TouchableOpacity>
        </View>

        {wallets.length > 0 ? (
          wallets.slice(0, 2).map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              currency={currency}
              onPress={() => router.push({ pathname: '/modal/wallet', params: { walletId: String(wallet.id) } })}
            />
          ))
        ) : (
          <EmptyState
            icon="wallet-outline"
            title="No Accounts Found"
            description="Add your first bank, UPI, or cash account to track balances."
            actionTitle="+ Add Account"
            onAction={() => router.push('/modal/wallet')}
          />
        )}

        {/* 7. Recent Transactions */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.md }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>See Ledger</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx) => (
            <TransactionItem
              key={`${tx.type}-${tx.id}`}
              transaction={tx}
              currency={currency}
              onPress={() => router.push({ pathname: '/modal/transaction', params: { txId: String(tx.id), txType: tx.type } })}
            />
          ))
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No Transactions Yet"
            description="Record your income, expenses, or transfers for this month."
            actionTitle="+ Add Transaction"
            onAction={() => router.push('/modal/transaction')}
          />
        )}
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
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickIconCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  quickActionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  sectionHeader: {
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
  seeAllText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
});
