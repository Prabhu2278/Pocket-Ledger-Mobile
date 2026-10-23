// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Unified Transactions Ledger Screen
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/components/Header';
import { FilterChips } from '../../src/components/FilterChips';
import { TransactionItem } from '../../src/components/TransactionItem';
import { EmptyState } from '../../src/components/EmptyState';
import { api } from '../../src/services/api';
import { Transaction } from '../../src/types';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { Spacing, Radii, Typography } from '../../src/theme';

export default function TransactionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    transactions,
    currency,
    budget,
    insights,
    monthKey,
    isRefreshing,
    refreshTransactions,
    deleteTransaction,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [exporting, setExporting] = useState(false);

  // Type filter options
  const typeFilterOptions = [
    { id: 'all', label: 'All' },
    { id: 'expense', label: 'Expenses' },
    { id: 'income', label: 'Income' },
    { id: 'transfer', label: 'Transfers' },
  ];

  // Dynamically extract categories present in current month transactions
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return [{ id: 'All', label: 'All Categories' }, ...Array.from(set).map((c) => ({ id: c, label: c }))];
  }, [transactions]);

  // Client-side filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Type match
      if (selectedType !== 'all') {
        if (selectedType === 'expense' && tx.type !== 'expense') return false;
        if (selectedType === 'income' && tx.type !== 'income') return false;
        if (selectedType === 'transfer' && tx.type !== 'transfer') return false;
      }

      // 2. Category match
      if (selectedCategory !== 'All' && tx.category !== selectedCategory) {
        return false;
      }

      // 3. Search match
      if (search.trim()) {
        const q = search.toLowerCase();
        const noteMatch = (tx.note || tx.title || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        const amtMatch = String(tx.amount).includes(q);
        const walletMatch = (tx.wallet_name || '').toLowerCase().includes(q);
        if (!noteMatch && !catMatch && !amtMatch && !walletMatch) return false;
      }

      return true;
    });
  }, [transactions, selectedType, selectedCategory, search]);

  // Expenses-specific metrics matching web Expenses.jsx
  const expenseTransactions = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);
  const totalSpentMonth = useMemo(() => expenseTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0), [expenseTransactions]);
  const budgetTarget = budget?.target_amount || insights?.budget_target || 20000;
  const budgetLeft = budgetTarget - totalSpentMonth;
  const biggestExpenseCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTransactions.forEach((t) => {
      if (t.category) map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
    });
    let maxCat = 'None yet';
    let maxAmt = 0;
    for (const cat in map) {
      if (map[cat] > maxAmt) {
        maxAmt = map[cat];
        maxCat = cat;
      }
    }
    return maxCat;
  }, [expenseTransactions]);

  // Income-specific metrics matching web Income.jsx
  const incomeTransactions = useMemo(() => transactions.filter((t) => t.type === 'income'), [transactions]);
  const totalIncomeMonth = useMemo(() => incomeTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0), [incomeTransactions]);
  const topIncomeSource = useMemo(() => {
    const map: Record<string, number> = {};
    incomeTransactions.forEach((t) => {
      if (t.category) map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
    });
    let maxCat = 'None yet';
    let maxAmt = 0;
    for (const cat in map) {
      if (map[cat] > maxAmt) {
        maxAmt = map[cat];
        maxCat = cat;
      }
    }
    return maxCat;
  }, [incomeTransactions]);
  const avgIncome = incomeTransactions.length > 0 ? totalIncomeMonth / incomeTransactions.length : 0;

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const csvText = await api.transactions.exportCsvText(monthKey);
      const csvFile = new FileSystem.File(FileSystem.Paths.cache, `pocket_ledger_${monthKey}.csv`);
      await csvFile.write(csvText);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(csvFile.uri, {
          mimeType: 'text/csv',
          dialogTitle: `Export Ledger for ${monthKey}`,
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export Complete', `CSV saved to ${csvFile.uri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not export CSV file.');
    } finally {
      setExporting(false);
    }
  };

  const handleTransactionPress = (tx: Transaction) => {
    router.push({
      pathname: '/modal/transaction',
      params: { txId: String(tx.id), txType: tx.type },
    });
  };

  const handleTransactionLongPress = (tx: Transaction) => {
    Alert.alert(
      'Transaction Actions',
      `Delete "${tx.note || tx.category}" for ₹${tx.amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => handleTransactionPress(tx),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(tx.id, tx.type);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header subtitle="Unified Financial Ledger" />

      {/* Search and Action Bar */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search notes, categories, wallets..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Export CSV Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleExportCsv}
          disabled={exporting}
          style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
        >
          <Ionicons name="download-outline" size={18} color={theme.primary} />
        </TouchableOpacity>

        {/* Import CSV Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/modal/csv')}
          style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
        >
          <Ionicons name="cloud-upload-outline" size={18} color={theme.info} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips Bar */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <FilterChips
          options={typeFilterOptions}
          selectedId={selectedType}
          onSelect={setSelectedType}
        />

        {categoryOptions.length > 2 ? (
          <View style={{ marginTop: 4 }}>
            <FilterChips
              options={categoryOptions}
              selectedId={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        ) : null}
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListHeaderComponent={
          selectedType === 'expense' ? (
            <View style={styles.kpiContainer}>
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Spent this month</Text>
                  <Text style={[styles.kpiValue, { color: theme.danger }]}>
                    -{formatCurrency(totalSpentMonth, currency)}
                  </Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Left in budget</Text>
                  <Text style={[styles.kpiValue, { color: budgetLeft >= 0 ? theme.success : theme.danger }]}>
                    {budgetLeft >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(budgetLeft), currency)}
                  </Text>
                </View>
              </View>
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Transactions</Text>
                  <Text style={[styles.kpiValue, { color: theme.text }]}>
                    {expenseTransactions.length}
                  </Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Biggest category</Text>
                  <Text style={[styles.kpiValue, { color: theme.warning }]} numberOfLines={1}>
                    {biggestExpenseCategory}
                  </Text>
                </View>
              </View>
            </View>
          ) : selectedType === 'income' ? (
            <View style={styles.kpiContainer}>
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Income this month</Text>
                  <Text style={[styles.kpiValue, { color: theme.success }]}>
                    +{formatCurrency(totalIncomeMonth, currency)}
                  </Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Top source</Text>
                  <Text style={[styles.kpiValue, { color: theme.primary }]} numberOfLines={1}>
                    {topIncomeSource}
                  </Text>
                </View>
              </View>
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Transactions</Text>
                  <Text style={[styles.kpiValue, { color: theme.text }]}>
                    {incomeTransactions.length}
                  </Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Average income</Text>
                  <Text style={[styles.kpiValue, { color: theme.success }]}>
                    {formatCurrency(avgIncome, currency)}
                  </Text>
                </View>
              </View>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            currency={currency}
            onPress={handleTransactionPress}
            onLongPress={handleTransactionLongPress}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshTransactions}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Matching Transactions"
            description={search ? 'No records match your search filter.' : 'No transactions recorded for this month.'}
            actionTitle="+ New Transaction"
            onAction={() => router.push('/modal/transaction')}
          />
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/modal/transaction')}
        style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    height: '100%',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 90,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  kpiContainer: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  kpiLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.extrabold,
  },
});
