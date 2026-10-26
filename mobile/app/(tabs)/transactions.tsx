// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Unified Transactions Ledger Screen
// Features Advanced Filter Drawer matching the web app.
// ---------------------------------------------------------------------------

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/components/ui/Header';
import { AmbientMesh } from '../../src/components/ui/AmbientMesh';
import { FilterChips } from '../../src/components/ui/FilterChips';
import { FilterDrawerModal, FilterState } from '../../src/components/modals/FilterDrawerModal';
import { TransactionItem } from '../../src/components/cards/TransactionItem';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { api } from '../../src/api/api';
import { Transaction } from '../../src/types';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { Spacing, Radii, Typography, useResponsive } from '../../src/theme';

export default function TransactionsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { isSmallPhone, isTablet, contentMaxWidth } = useResponsive();
  const {
    transactions,
    currency,
    wallets,
    categories,
    insights,
    monthKey,
    isRefreshing,
    refreshTransactions,
    deleteTransaction,
  } = useApp();

  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Advanced Filter State matching Web FilterDrawer
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    category: 'All',
    walletId: 'all',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: '',
  });

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.category !== 'All') count++;
    if (filters.walletId !== 'all') count++;
    if (filters.minAmount.trim()) count++;
    if (filters.maxAmount.trim()) count++;
    if (filters.startDate.trim()) count++;
    if (filters.endDate.trim()) count++;
    return count;
  }, [filters]);

  // Combined list of categories
  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(c.name));
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [categories, transactions]);

  // Quick type filter options
  const typeFilterOptions = [
    { id: 'all', label: 'All' },
    { id: 'expense', label: 'Expenses' },
    { id: 'income', label: 'Income' },
    { id: 'transfer', label: 'Transfers' },
  ];

  // Client-side filtering applying all criteria
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Type match
      if (filters.type !== 'all') {
        const tType = (tx.type || '').toLowerCase();
        if (filters.type === 'expense' && tType !== 'expense') return false;
        if (filters.type === 'income' && tType !== 'income') return false;
        if (filters.type === 'transfer' && tType !== 'transfer') return false;
      }

      // 2. Category match
      if (filters.category !== 'All' && tx.category !== filters.category) {
        return false;
      }

      // 3. Wallet match
      if (filters.walletId !== 'all' && String(tx.wallet_id) !== filters.walletId) {
        return false;
      }

      // 4. Min Amount
      if (filters.minAmount.trim()) {
        const min = parseFloat(filters.minAmount);
        if (!isNaN(min) && Number(tx.amount || 0) < min) return false;
      }

      // 5. Max Amount
      if (filters.maxAmount.trim()) {
        const max = parseFloat(filters.maxAmount);
        if (!isNaN(max) && Number(tx.amount || 0) > max) return false;
      }

      // 6. Date Range & Month Scope (matches Web behavior)
      const hasCustomDateRange = Boolean(filters.startDate.trim() || filters.endDate.trim());
      if (hasCustomDateRange) {
        if (filters.startDate.trim() && tx.date) {
          if (tx.date < filters.startDate.trim()) return false;
        }
        if (filters.endDate.trim() && tx.date) {
          if (tx.date > filters.endDate.trim()) return false;
        }
      } else {
        // Default to active month when no custom date range is selected
        if (tx.date && !tx.date.startsWith(monthKey)) return false;
      }

      // 7. Search match
      if (search.trim()) {
        const q = search.toLowerCase();
        const noteMatch = (tx.note || tx.title || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        const amtMatch = String(tx.amount).includes(q);
        const walletMatch = (tx.wallet_name || '').toLowerCase().includes(q);
        if (!noteMatch && !catMatch && !amtMatch && !walletMatch) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort newest date first
      const dateA = a.date || '';
      const dateB = b.date || '';
      const dateDiff = dateB.localeCompare(dateA);
      if (dateDiff !== 0) return dateDiff;
      // If same date, newest ID first
      return (b.id || 0) - (a.id || 0);
    });
  }, [transactions, filters, search, monthKey]);

  // Summary metrics for KPI header cards
  const summaryIncome = useMemo(() => {
    if (activeFilterCount > 0 || search.trim()) {
      return filteredTransactions
        .filter((t) => (t.type || '').toLowerCase() === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }
    return (
      insights?.total_income ??
      transactions
        .filter((t) => (t.type || '').toLowerCase() === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    );
  }, [filteredTransactions, transactions, insights, activeFilterCount, search]);

  const summaryExpense = useMemo(() => {
    if (activeFilterCount > 0 || search.trim()) {
      return filteredTransactions
        .filter((t) => (t.type || '').toLowerCase() === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }
    return (
      insights?.total_spent ??
      transactions
        .filter((t) => (t.type || '').toLowerCase() === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    );
  }, [filteredTransactions, transactions, insights, activeFilterCount, search]);

  const summaryTxCount = useMemo(() => {
    return filteredTransactions.length;
  }, [filteredTransactions]);

  // Pagination State (Default 10, options 10, 20, 50, 80)
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 80] as const;
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPageSizeModalOpen, setIsPageSizeModalOpen] = useState(false);

  // Reset page when filters, search, monthKey or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, search, monthKey, pageSize]);

  // Pagination calculations
  const totalTransactionsCount = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalTransactionsCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, safeCurrentPage, pageSize]);

  const startItemIndex = totalTransactionsCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItemIndex = Math.min(safeCurrentPage * pageSize, totalTransactionsCount);

  // Helper for pagination pills with ellipses
  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
      return [1, 2, 3, 4, '...', total];
    }
    if (current >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const handleResetFilters = () => {
    setFilters({
      type: 'all',
      category: 'All',
      walletId: 'all',
      minAmount: '',
      maxAmount: '',
      startDate: '',
      endDate: '',
    });
  };

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
      <AmbientMesh />
      <Header
        subtitle="Unified Financial Ledger"
        onPressFilter={() => setIsFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      <View style={[{ flex: 1, width: '100%' }, isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center' }]}>
        {/* Search and Action Bar */}
        <View style={styles.searchBarContainer}>
          <View
            style={[
              styles.searchInputWrapper,
              {
                backgroundColor: isDark ? theme.surface : '#edf2f9',
                borderColor: isDark ? theme.border : '#e2e8f0',
              },
            ]}
          >
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

          {/* Filter Button with Funnel Icon and Badge (Matching Web filter-btn) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsFilterModalOpen(true)}
            style={[
              styles.actionBtn,
              styles.filterBtn,
              {
                backgroundColor: activeFilterCount > 0 ? theme.primarySoft : theme.surfaceMuted,
                borderColor: activeFilterCount > 0 ? theme.primary : theme.border,
              },
            ]}
          >
            <Ionicons
              name="filter"
              size={18}
              color={activeFilterCount > 0 ? theme.primary : theme.text}
            />
            <Text
              style={[
                styles.filterBtnText,
                { color: activeFilterCount > 0 ? theme.primary : theme.text },
              ]}
            >
              Filter
            </Text>
            {activeFilterCount > 0 ? (
              <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

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

        {/* Active Filter Banner (Matching Web indicator) */}
        {activeFilterCount > 0 ? (
          <View style={[styles.activeFilterBanner, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="funnel" size={14} color={theme.primary} />
              <Text style={[styles.activeFilterText, { color: theme.text }]} numberOfLines={1}>
                {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active • {filteredTransactions.length} result{filteredTransactions.length === 1 ? '' : 's'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleResetFilters} activeOpacity={0.7}>
              <Text style={[styles.clearFilterText, { color: theme.primary }]}>Clear All</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Quick Type Chips Bar with Page Size Option */}
        <View style={[styles.filtersContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <FilterChips
            options={typeFilterOptions}
            selectedId={filters.type}
            onSelect={(type) => setFilters({ ...filters, type })}
            rightElement={
              <View style={styles.pageSizeChipContainer}>
                <View style={[styles.filterDivider, { backgroundColor: isDark ? '#243048' : '#cbd5e1' }]} />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsPageSizeModalOpen(true)}
                  style={[
                    styles.pageSizeBtn,
                    {
                      backgroundColor: isDark ? '#141c2e' : '#eef2ff',
                      borderColor: isDark ? '#28355c' : '#c7d2fe',
                    },
                  ]}
                >
                  <Ionicons name="documents-outline" size={13} color={isDark ? '#818cf8' : '#4f46e5'} style={{ marginRight: 5 }} />
                  <Text style={[styles.pageSizeBtnText, { color: isDark ? '#c7d2fe' : '#4338ca' }]}>
                    {pageSize} / page
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={isDark ? '#818cf8' : '#4f46e5'} style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </View>
            }
          />
        </View>

        {/* Transaction List */}
        <FlatList
          data={paginatedTransactions}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              currency={currency}
              onPress={() => handleTransactionPress(item)}
              onLongPress={() => handleTransactionLongPress(item)}
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
          ListHeaderComponent={
            (insights || transactions.length > 0) ? (
              <View style={styles.kpiContainer}>
                <View style={styles.kpiRow}>
                  {/* 1. Income Card */}
                  <View
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: isDark ? '#0e2220' : '#ecfdf5',
                        borderColor: isDark ? '#134e40' : '#a7f3d0',
                        borderTopColor: '#10b981',
                        borderTopWidth: 3,
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Ionicons name="arrow-up-circle" size={13} color={isDark ? '#34d399' : '#059669'} />
                      <Text style={[styles.kpiLabel, { color: isDark ? '#6ee7b7' : '#047857' }]}>INCOME</Text>
                    </View>
                    <Text
                      style={[styles.kpiValue, { color: isDark ? '#34d399' : '#047857' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      +{formatCurrency(summaryIncome, currency)}
                    </Text>
                  </View>

                  {/* 2. Expenses Card */}
                  <View
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: isDark ? '#26151c' : '#fff1f2',
                        borderColor: isDark ? '#4c1d29' : '#fecdd3',
                        borderTopColor: '#f43f5e',
                        borderTopWidth: 3,
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Ionicons name="arrow-down-circle" size={13} color={isDark ? '#fb7185' : '#e11d48'} />
                      <Text style={[styles.kpiLabel, { color: isDark ? '#fda4af' : '#be123c' }]}>EXPENSES</Text>
                    </View>
                    <Text
                      style={[styles.kpiValue, { color: isDark ? '#fb7185' : '#e11d48' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      -{formatCurrency(summaryExpense, currency)}
                    </Text>
                  </View>

                  {/* 3. Total Transactions Card */}
                  <View
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: isDark ? '#141b30' : '#eef2ff',
                        borderColor: isDark ? '#28355c' : '#c7d2fe',
                        borderTopColor: '#6366f1',
                        borderTopWidth: 3,
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      <Ionicons name="receipt-outline" size={13} color={isDark ? '#818cf8' : '#4f46e5'} />
                      <Text style={[styles.kpiLabel, { color: isDark ? '#a5b4fc' : '#4338ca' }]}>TOTAL TXNS</Text>
                    </View>
                    <Text
                      style={[styles.kpiValue, { color: isDark ? '#ffffff' : '#3730a3' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {summaryTxCount}
                    </Text>
                  </View>
                </View>
              </View>
            ) : undefined
          }
          ListFooterComponent={
            totalTransactionsCount > 0 ? (
              <View style={styles.paginationContainer}>
                <View style={styles.paginationInfoRow}>
                  <Text style={[styles.paginationInfoText, { color: theme.textMuted }]}>
                    Showing <Text style={{ color: theme.text, fontWeight: '700' }}>{startItemIndex}–{endItemIndex}</Text> of{' '}
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{totalTransactionsCount}</Text>
                  </Text>
                  <View style={[styles.pageNumberBadge, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                    <Text style={[styles.pageNumberBadgeText, { color: theme.textSecondary }]}>
                      Page {safeCurrentPage} of {totalPages}
                    </Text>
                  </View>
                </View>

                {totalPages > 1 && (
                  <View style={styles.paginationNavRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={safeCurrentPage <= 1}
                      onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      style={[
                        styles.pageNavBtn,
                        {
                          backgroundColor: isDark ? '#141c2e' : '#ffffff',
                          borderColor: isDark ? '#243048' : '#e2e8f0',
                          opacity: safeCurrentPage <= 1 ? 0.35 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="chevron-back" size={15} color={theme.text} />
                      <Text style={[styles.pageNavBtnText, { color: theme.text }]}>Prev</Text>
                    </TouchableOpacity>

                    <View style={styles.pagePillsRow}>
                      {getPageNumbers(safeCurrentPage, totalPages).map((pageNum, idx) => {
                        if (pageNum === '...') {
                          return (
                            <View key={`ellipsis-${idx}`} style={styles.ellipsisBox}>
                              <Text style={[styles.ellipsisText, { color: theme.textMuted }]}>...</Text>
                            </View>
                          );
                        }
                        const isCurrent = pageNum === safeCurrentPage;
                        return (
                          <TouchableOpacity
                            key={`page-${pageNum}`}
                            activeOpacity={0.7}
                            onPress={() => setCurrentPage(Number(pageNum))}
                            style={[
                              styles.pagePill,
                              {
                                backgroundColor: isCurrent
                                  ? theme.primary
                                  : (isDark ? '#141c2e' : '#ffffff'),
                                borderColor: isCurrent
                                  ? theme.primary
                                  : (isDark ? '#243048' : '#e2e8f0'),
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pagePillText,
                                {
                                  color: isCurrent ? '#ffffff' : theme.text,
                                  fontWeight: isCurrent ? Typography.weights.bold : Typography.weights.medium,
                                },
                              ]}
                            >
                              {pageNum}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={safeCurrentPage >= totalPages}
                      onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      style={[
                        styles.pageNavBtn,
                        {
                          backgroundColor: isDark ? '#141c2e' : '#ffffff',
                          borderColor: isDark ? '#243048' : '#e2e8f0',
                          opacity: safeCurrentPage >= totalPages ? 0.35 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.pageNavBtnText, { color: theme.text }]}>Next</Text>
                      <Ionicons name="chevron-forward" size={15} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No transactions found"
              description={
                activeFilterCount > 0 || search
                  ? 'Try adjusting your search terms or clearing your filters.'
                  : 'Tap the + button to record your first transaction.'
              }
            />
          }
        />

        {/* Floating Action Button (+ Transaction) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/modal/transaction')}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Page Size Selection Modal (10, 20, 50, 80) */}
      <Modal
        visible={isPageSizeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPageSizeModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsPageSizeModalOpen(false)}
        >
          <Pressable
            style={[
              styles.pageSizeModalCard,
              {
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.pageSizeModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.pageSizeIconBadge,
                    { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff' },
                  ]}
                >
                  <Ionicons name="documents" size={16} color={isDark ? '#818cf8' : '#4f46e5'} />
                </View>
                <Text style={[styles.pageSizeModalTitle, { color: theme.text }]}>Items Per Page</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPageSizeModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.pageSizeModalSubtitle, { color: theme.textMuted }]}>
              Choose default number of transactions to view per page.
            </Text>

            <View style={styles.pageSizeOptionsList}>
              {PAGE_SIZE_OPTIONS.map((size) => {
                const isSelected = pageSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    activeOpacity={0.7}
                    onPress={() => {
                      setPageSize(size);
                      setIsPageSizeModalOpen(false);
                    }}
                    style={[
                      styles.pageSizeOptionItem,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? '#1e1b4b' : '#eef2ff')
                          : (isDark ? '#141c2e' : '#f8fafc'),
                        borderColor: isSelected
                          ? (isDark ? '#6366f1' : '#4f46e5')
                          : (isDark ? '#1e293b' : '#e2e8f0'),
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected ? (isDark ? '#818cf8' : '#4f46e5') : theme.textMuted,
                            backgroundColor: isSelected ? (isDark ? '#818cf8' : '#4f46e5') : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text
                        style={[
                          styles.pageSizeOptionLabel,
                          {
                            color: isSelected ? (isDark ? '#c7d2fe' : '#4338ca') : theme.text,
                            fontWeight: isSelected ? Typography.weights.bold : Typography.weights.medium,
                          },
                        ]}
                      >
                        {size} per page
                      </Text>
                      {size === 10 ? (
                        <View
                          style={[
                            styles.defaultBadge,
                            { backgroundColor: isDark ? '#134e40' : '#dcfce7' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.defaultBadgeText,
                              { color: isDark ? '#34d399' : '#15803d' },
                            ]}
                          >
                            Default
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={isDark ? '#818cf8' : '#4f46e5'}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filter Drawer Modal */}
      <FilterDrawerModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onUpdateFilters={setFilters}
        onResetFilters={handleResetFilters}
        wallets={wallets}
        categories={allCategoryNames}
        totalMatches={filteredTransactions.length}
        currency={currency}
      />
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
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: Typography.sizes.sm,
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 12,
    gap: 6,
    position: 'relative',
  },
  filterBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: Typography.weights.extrabold,
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
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
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
  kpiValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.extrabold,
  },

  // Page Size Button in Filter Chips Bar
  pageSizeChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterDivider: {
    width: 1,
    height: 20,
    marginRight: 10,
    marginLeft: 4,
  },
  pageSizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  pageSizeBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },

  // Pagination Footer
  paginationContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  paginationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  paginationInfoText: {
    fontSize: 12,
  },
  pageNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  pageNumberBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weights.semibold,
  },
  paginationNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  pageNavBtnText: {
    fontSize: 12,
    fontWeight: Typography.weights.semibold,
  },
  pagePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pagePill: {
    minWidth: 34,
    height: 34,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pagePillText: {
    fontSize: 12,
  },
  ellipsisBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ellipsisText: {
    fontSize: 13,
    fontWeight: Typography.weights.bold,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  pageSizeModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  pageSizeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pageSizeIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSizeModalTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  pageSizeModalSubtitle: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  pageSizeOptionsList: {
    gap: 8,
  },
  pageSizeOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  pageSizeOptionLabel: {
    fontSize: Typography.sizes.sm,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    marginLeft: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
});
