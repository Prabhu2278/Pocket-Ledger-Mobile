// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Advanced Transaction Filter Drawer Modal
// Features Category Dropdown Picker and Interactive Calendar Date Picker.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Wallet } from '../types';
import { Spacing, Radii, Typography } from '../theme';
import { DatePickerModal } from './DatePickerModal';
import { getCategoryColor } from '../constants/categories';

export interface FilterState {
  type: string;             // 'all' | 'expense' | 'income' | 'transfer'
  category: string;         // 'All' or specific category
  walletId: string;         // 'all' or wallet id string
  minAmount: string;
  maxAmount: string;
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
}

interface FilterDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onUpdateFilters: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  wallets: Wallet[];
  categories: string[];
  totalMatches: number;
  currency: string;
}

export const FilterDrawerModal: React.FC<FilterDrawerModalProps> = ({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  onResetFilters,
  wallets,
  categories,
  totalMatches,
  currency,
}) => {
  const { theme } = useTheme();

  // State for category dropdown modal
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // State for calendar picker modal
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);

  const typeOptions = [
    { id: 'all', label: 'All Types' },
    { id: 'expense', label: 'Expenses' },
    { id: 'income', label: 'Income' },
    { id: 'transfer', label: 'Transfers' },
  ];

  // Filtered categories in dropdown search
  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

          <View style={[styles.drawerContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.filterIconBadge, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="filter" size={18} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.title, { color: theme.text }]}>Filter Transactions</Text>
                  <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                    {totalMatches} matching record{totalMatches === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              {/* 1. Transaction Type */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Transaction Type</Text>
                <View style={styles.chipsWrap}>
                  {typeOptions.map((opt) => {
                    const isSelected = filters.type === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        activeOpacity={0.7}
                        onPress={() => onUpdateFilters({ ...filters, type: opt.id })}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isSelected ? '#ffffff' : theme.text },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. Wallet / Account Dropdown/Scroll */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Account / Wallet</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onUpdateFilters({ ...filters, walletId: 'all' })}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: filters.walletId === 'all' ? theme.primary : theme.surfaceMuted,
                        borderColor: filters.walletId === 'all' ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: filters.walletId === 'all' ? '#ffffff' : theme.text }]}>
                      All Wallets
                    </Text>
                  </TouchableOpacity>

                  {wallets.map((w) => {
                    const isSelected = filters.walletId === String(w.id);
                    return (
                      <TouchableOpacity
                        key={w.id}
                        activeOpacity={0.7}
                        onPress={() => onUpdateFilters({ ...filters, walletId: String(w.id) })}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.walletDot,
                            { backgroundColor: w.color || theme.primary },
                          ]}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            { color: isSelected ? '#ffffff' : theme.text },
                          ]}
                        >
                          {w.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 3. Category - DROP BOX SELECTOR */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                    Category
                  </Text>
                  {filters.category !== 'All' ? (
                    <TouchableOpacity onPress={() => onUpdateFilters({ ...filters, category: 'All' })}>
                      <Text style={[styles.resetInlineText, { color: theme.primary }]}>Reset</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Dropdown Trigger Box */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowCategoryDropdown(true)}
                  style={[
                    styles.dropdownTrigger,
                    {
                      backgroundColor: theme.background,
                      borderColor: filters.category !== 'All' ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <View style={styles.dropdownLeft}>
                    <View
                      style={[
                        styles.categoryDot,
                        {
                          backgroundColor:
                            filters.category === 'All'
                              ? theme.primary
                              : getCategoryColor(filters.category),
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dropdownValueText,
                        { color: theme.text },
                        filters.category !== 'All' && { fontWeight: Typography.weights.bold },
                      ]}
                    >
                      {filters.category === 'All' ? 'All Categories (Drop to select)' : filters.category}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* 4. Date Range with CALENDAR PICKERS */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                    Date Range (Calendar)
                  </Text>
                  {filters.startDate || filters.endDate ? (
                    <TouchableOpacity
                      onPress={() => onUpdateFilters({ ...filters, startDate: '', endDate: '' })}
                    >
                      <Text style={[styles.resetInlineText, { color: theme.danger }]}>Clear Dates</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.inputsRow}>
                  {/* From Date Calendar Trigger */}
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputSublabel, { color: theme.textMuted }]}>From Date</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setActiveDatePicker('start')}
                      style={[
                        styles.dateTrigger,
                        {
                          backgroundColor: theme.background,
                          borderColor: filters.startDate ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={filters.startDate ? theme.primary : theme.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.dateTriggerText,
                          { color: filters.startDate ? theme.text : theme.textMuted },
                          filters.startDate ? { fontWeight: Typography.weights.semibold } : null,
                        ]}
                      >
                        {filters.startDate || 'Select date'}
                      </Text>
                      {filters.startDate ? (
                        <TouchableOpacity
                          onPress={() => onUpdateFilters({ ...filters, startDate: '' })}
                          style={{ marginLeft: 'auto', padding: 2 }}
                        >
                          <Ionicons name="close-circle" size={14} color={theme.textMuted} />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputDivider}>
                    <Text style={{ color: theme.textMuted, fontSize: 16 }}>—</Text>
                  </View>

                  {/* To Date Calendar Trigger */}
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputSublabel, { color: theme.textMuted }]}>To Date</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setActiveDatePicker('end')}
                      style={[
                        styles.dateTrigger,
                        {
                          backgroundColor: theme.background,
                          borderColor: filters.endDate ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={filters.endDate ? theme.primary : theme.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.dateTriggerText,
                          { color: filters.endDate ? theme.text : theme.textMuted },
                          filters.endDate ? { fontWeight: Typography.weights.semibold } : null,
                        ]}
                      >
                        {filters.endDate || 'Select date'}
                      </Text>
                      {filters.endDate ? (
                        <TouchableOpacity
                          onPress={() => onUpdateFilters({ ...filters, endDate: '' })}
                          style={{ marginLeft: 'auto', padding: 2 }}
                        >
                          <Ionicons name="close-circle" size={14} color={theme.textMuted} />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 5. Amount Range */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Amount Range ({currency})</Text>
                <View style={styles.inputsRow}>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputSublabel, { color: theme.textMuted }]}>Min</Text>
                    <TextInput
                      placeholder="0"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                      value={filters.minAmount}
                      onChangeText={(val) => onUpdateFilters({ ...filters, minAmount: val })}
                      style={[
                        styles.amountInput,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.inputDivider}>
                    <Text style={{ color: theme.textMuted, fontSize: 16 }}>—</Text>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputSublabel, { color: theme.textMuted }]}>Max</Text>
                    <TextInput
                      placeholder="No max"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                      value={filters.maxAmount}
                      onChangeText={(val) => onUpdateFilters({ ...filters, maxAmount: val })}
                      style={[
                        styles.amountInput,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onResetFilters}
                style={[styles.resetBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
              >
                <Ionicons name="refresh-outline" size={16} color={theme.text} style={{ marginRight: 6 }} />
                <Text style={[styles.resetBtnText, { color: theme.text }]}>Reset All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                style={[styles.applyBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.applyBtnText}>
                  Apply ({totalMatches})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Dropdown Selection Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <View style={styles.dropdownModalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowCategoryDropdown(false)}
          />

          <View style={[styles.dropdownModalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.dropdownModalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dropdownModalTitle, { color: theme.text }]}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryDropdown(false)}
                style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Search in Dropdown */}
            <View style={[styles.dropdownSearchWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                placeholder="Search categories..."
                placeholderTextColor={theme.textMuted}
                value={categorySearch}
                onChangeText={setCategorySearch}
                style={[styles.dropdownSearchInput, { color: theme.text }]}
              />
              {categorySearch ? (
                <TouchableOpacity onPress={() => setCategorySearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Categories List */}
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {/* All Categories Option */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  onUpdateFilters({ ...filters, category: 'All' });
                  setShowCategoryDropdown(false);
                }}
                style={[
                  styles.categoryListItem,
                  { borderBottomColor: theme.border },
                  filters.category === 'All' && { backgroundColor: theme.primarySoft },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.categoryDot, { backgroundColor: theme.primary }]} />
                  <Text
                    style={[
                      styles.categoryListItemText,
                      { color: theme.text },
                      filters.category === 'All' && { fontWeight: Typography.weights.bold, color: theme.primary },
                    ]}
                  >
                    All Categories
                  </Text>
                </View>
                {filters.category === 'All' ? (
                  <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                ) : null}
              </TouchableOpacity>

              {filteredCategories.map((cat) => {
                const isSelected = filters.category === cat;
                const catColor = getCategoryColor(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.7}
                    onPress={() => {
                      onUpdateFilters({ ...filters, category: cat });
                      setShowCategoryDropdown(false);
                    }}
                    style={[
                      styles.categoryListItem,
                      { borderBottomColor: theme.border },
                      isSelected && { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                      <Text
                        style={[
                          styles.categoryListItemText,
                          { color: theme.text },
                          isSelected && { fontWeight: Typography.weights.bold, color: theme.primary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Calendar Date Picker Modal for From Date */}
      <DatePickerModal
        isOpen={activeDatePicker === 'start'}
        onClose={() => setActiveDatePicker(null)}
        title="Select From Date"
        selectedDate={filters.startDate}
        onSelectDate={(d) => onUpdateFilters({ ...filters, startDate: d })}
      />

      {/* Calendar Date Picker Modal for To Date */}
      <DatePickerModal
        isOpen={activeDatePicker === 'end'}
        onClose={() => setActiveDatePicker(null)}
        title="Select To Date"
        selectedDate={filters.endDate}
        onSelectDate={(d) => onUpdateFilters({ ...filters, endDate: d })}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawerContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  resetInlineText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horizontalScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownValueText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  inputSublabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  inputDivider: {
    paddingTop: 16,
    alignItems: 'center',
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  dateTriggerText: {
    fontSize: Typography.sizes.xs,
  },
  amountInput: {
    height: 42,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: Typography.sizes.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  resetBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  applyBtn: {
    flex: 2,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  dropdownModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: Spacing.lg,
  },
  dropdownModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '75%',
    elevation: 10,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  dropdownModalTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  dropdownSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dropdownSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: Typography.sizes.xs,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryListItemText: {
    fontSize: Typography.sizes.sm,
  },
});
