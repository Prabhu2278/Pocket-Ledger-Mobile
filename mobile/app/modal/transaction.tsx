// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Add / Edit Transaction Modal
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { getTodayIso } from '../../src/utils/dateUtils';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSFER_CATEGORY,
} from '../../src/constants/categories';
import { TransactionType } from '../../src/types';
import { Spacing, Radii, Typography, useResponsive } from '../../src/theme';
import { DatePickerModal } from '../../src/components/modals/DatePickerModal';

export default function TransactionModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ txId?: string; txType?: string; initialType?: string }>();
  const { theme } = useTheme();
  const { isTablet } = useResponsive();
  const {
    wallets,
    transactions,
    currency,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useApp();

  const isEditing = !!params.txId;
  const existingTx = isEditing
    ? transactions.find((t) => String(t.id) === String(params.txId))
    : null;

  // Form states
  const [type, setType] = useState<TransactionType>(
    (existingTx?.type || params.initialType || 'expense') as TransactionType
  );
  const [amount, setAmount] = useState<string>(
    existingTx?.amount !== undefined ? String(existingTx.amount) : ''
  );
  const [category, setCategory] = useState<string>(
    existingTx?.category || (type === 'transfer' ? 'Transfer' : '')
  );
  const [note, setNote] = useState<string>(existingTx?.note || existingTx?.title || '');
  const [date, setDate] = useState<string>(existingTx?.date || getTodayIso());
  const [walletId, setWalletId] = useState<number | null>(
    existingTx?.wallet_id || (wallets.length > 0 ? wallets[0].id : null)
  );
  const [toWalletId, setToWalletId] = useState<number | null>(
    existingTx?.to_wallet_id || (wallets.length > 1 ? wallets[1].id : null)
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Available categories based on selected transaction type
  const availableCategories =
    type === 'income'
      ? INCOME_CATEGORIES
      : type === 'transfer'
      ? [TRANSFER_CATEGORY]
      : EXPENSE_CATEGORIES;

  // Selected category object with icon and color (null if not chosen yet)
  const selectedCatObj = category
    ? availableCategories.find((c) => c.name.toLowerCase() === category.toLowerCase()) || {
        name: category,
        icon: 'pricetag-outline',
        color: theme.primary,
      }
    : null;

  // Filtered categories for dropdown search
  const filteredCategories = availableCategories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  // Switch type effects (Type is locked when editing existing transactions)
  const handleTypeSelect = (newType: TransactionType) => {
    if (isEditing) {
      Alert.alert(
        'Type Cannot Be Changed',
        `This record is an ${type.toUpperCase()}. Existing transactions cannot be changed to a different type. To change the type, please delete this transaction and create a new one.`
      );
      return;
    }
    setType(newType);
    if (newType === 'transfer') {
      setCategory('Transfer');
    } else {
      setCategory(''); // Require manual category selection
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    if (type !== 'transfer' && !category.trim()) {
      setErrorMessage('Please choose a category.');
      return;
    }

    if (type === 'transfer') {
      if (!walletId || !toWalletId) {
        setErrorMessage('Both Source and Destination accounts are required for a transfer.');
        return;
      }
      if (walletId === toWalletId) {
        setErrorMessage('Source and Destination accounts cannot be the same.');
        return;
      }
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      if (isEditing && existingTx) {
        await updateTransaction(existingTx.id, {
          type,
          amount: numAmount,
          category,
          note: note.trim(),
          date,
          wallet_id: walletId,
          to_wallet_id: type === 'transfer' ? toWalletId : undefined,
        });
      } else {
        await createTransaction({
          type,
          amount: numAmount,
          category,
          note: note.trim(),
          date,
          wallet_id: walletId,
          to_wallet_id: type === 'transfer' ? toWalletId : undefined,
        });
      }
      router.back();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!existingTx) return;
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ${existingTx.type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteTransaction(existingTx.id, existingTx.type);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete transaction');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && { maxWidth: 580, alignSelf: 'center', width: '100%' },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} style={{ marginRight: 6 }} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* 1. Transaction Type Segment Picker */}
        <View style={{ marginBottom: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
              Transaction Type
            </Text>
            {isEditing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.sm }}>
                <Ionicons name="lock-closed" size={11} color={theme.textMuted} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600' }}>
                  Locked ({type.toUpperCase()})
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.typeSelector, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            <TouchableOpacity
              activeOpacity={isEditing ? 1 : 0.8}
              onPress={() => handleTypeSelect('expense')}
              disabled={isEditing && type !== 'expense'}
              style={[
                styles.typeTab,
                type === 'expense' && { backgroundColor: theme.danger, shadowColor: theme.danger },
                isEditing && type !== 'expense' && { opacity: 0.25 },
              ]}
            >
              <Ionicons
                name="arrow-up-circle-outline"
                size={16}
                color={type === 'expense' ? '#ffffff' : theme.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.typeTabText,
                  { color: type === 'expense' ? '#ffffff' : theme.textSecondary },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={isEditing ? 1 : 0.8}
              onPress={() => handleTypeSelect('income')}
              disabled={isEditing && type !== 'income'}
              style={[
                styles.typeTab,
                type === 'income' && { backgroundColor: theme.success, shadowColor: theme.success },
                isEditing && type !== 'income' && { opacity: 0.25 },
              ]}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={16}
                color={type === 'income' ? '#ffffff' : theme.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.typeTabText,
                  { color: type === 'income' ? '#ffffff' : theme.textSecondary },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={isEditing ? 1 : 0.8}
              onPress={() => handleTypeSelect('transfer')}
              disabled={isEditing && type !== 'transfer'}
              style={[
                styles.typeTab,
                type === 'transfer' && { backgroundColor: theme.info, shadowColor: theme.info },
                isEditing && type !== 'transfer' && { opacity: 0.25 },
              ]}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={16}
                color={type === 'transfer' ? '#ffffff' : theme.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.typeTabText,
                  { color: type === 'transfer' ? '#ffffff' : theme.textSecondary },
                ]}
              >
                Transfer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Amount Input */}
        <Input
          label={`Amount (${currency})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={styles.amountInput}
          leftIcon={<Ionicons name="pricetag-outline" size={20} color={theme.textMuted} />}
        />

        {/* 3. Category Selector Drop Box */}
        {type !== 'transfer' ? (
          <View style={styles.sectionGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              {!category ? (
                <Text style={[styles.requiredBadge, { color: theme.danger }]}>* Choose category</Text>
              ) : null}
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setCategorySearch('');
                setShowCategoryDropdown(true);
              }}
              style={[
                styles.categoryDropBox,
                {
                  backgroundColor: theme.surface,
                  borderColor: !category ? theme.border : theme.primary,
                },
              ]}
            >
              <View style={styles.categoryDropBoxLeft}>
                {selectedCatObj ? (
                  <>
                    <View
                      style={[
                        styles.categoryIconBadge,
                        { backgroundColor: `${selectedCatObj.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={selectedCatObj.icon as any}
                        size={18}
                        color={selectedCatObj.color}
                      />
                    </View>
                    <Text style={[styles.categoryDropBoxText, { color: theme.text }]}>
                      {selectedCatObj.name}
                    </Text>
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.categoryIconBadge,
                        { backgroundColor: theme.surfaceMuted },
                      ]}
                    >
                      <Ionicons
                        name="pricetag-outline"
                        size={17}
                        color={theme.textMuted}
                      />
                    </View>
                    <Text style={[styles.categoryDropBoxPlaceholder, { color: theme.textMuted }]}>
                      Choose a category...
                    </Text>
                  </>
                )}
              </View>
              <View style={styles.categoryDropBoxRight}>
                <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 4. Wallet Selector(s) */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            {type === 'transfer' ? 'From Account' : 'Account / Wallet'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletScroll}>
            {wallets.map((w) => {
              const isSelected = walletId === w.id;
              return (
                <TouchableOpacity
                  key={`src-${w.id}`}
                  activeOpacity={0.7}
                  onPress={() => setWalletId(w.id)}
                  style={[
                    styles.walletChip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={14}
                    color={isSelected ? '#ffffff' : theme.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.walletChipText,
                      {
                        color: isSelected ? '#ffffff' : theme.text,
                        fontWeight: isSelected ? Typography.weights.bold : Typography.weights.regular,
                      },
                    ]}
                  >
                    {w.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {type === 'transfer' ? (
          <View style={styles.sectionGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>To Account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletScroll}>
              {wallets.map((w) => {
                const isSelected = toWalletId === w.id;
                return (
                  <TouchableOpacity
                    key={`dest-${w.id}`}
                    activeOpacity={0.7}
                    onPress={() => setToWalletId(w.id)}
                    style={[
                      styles.walletChip,
                      {
                        backgroundColor: isSelected ? theme.info : theme.surface,
                        borderColor: isSelected ? theme.info : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={isSelected ? '#ffffff' : theme.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.walletChipText,
                        {
                          color: isSelected ? '#ffffff' : theme.text,
                          fontWeight: isSelected ? Typography.weights.bold : Typography.weights.regular,
                        },
                      ]}
                    >
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* 5. Note / Title Input */}
        <Input
          label="Note or Description"
          placeholder="e.g. Grocery shopping, Salary deposit"
          value={note}
          onChangeText={setNote}
          leftIcon={<Ionicons name="document-text-outline" size={18} color={theme.textMuted} />}
        />

        {/* 6. Date Input with Calendar Picker */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowDatePicker(true)}
        >
          <Input
            label="Date (Tap calendar to select)"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            leftIcon={<Ionicons name="calendar-outline" size={18} color={theme.primary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ padding: 4 }}>
                <Ionicons name="calendar" size={20} color={theme.primary} />
              </TouchableOpacity>
            }
          />
        </TouchableOpacity>

        {/* Action Buttons */}
        <Button
          title={isEditing ? 'Save Changes' : 'Record Transaction'}
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing.md }}
        />

        {isEditing ? (
          <Button
            title="Delete Transaction"
            onPress={handleDelete}
            variant="danger"
            size="md"
            style={{ marginTop: Spacing.md }}
          />
        ) : null}

        {/* Calendar Date Picker Modal */}
        <DatePickerModal
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          title="Select Transaction Date"
          selectedDate={date}
          onSelectDate={(d) => setDate(d || getTodayIso())}
        />

        {/* Category Dropdown Selection Modal */}
        <Modal
          visible={showCategoryDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.dropdownModalOverlay}>
            <TouchableOpacity
              style={styles.dropdownModalBackdrop}
              activeOpacity={1}
              onPress={() => setShowCategoryDropdown(false)}
            />

            <View
              style={[
                styles.dropdownModalContent,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={[styles.dropdownModalHeader, { borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.modalHeaderBadge, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="pricetags-outline" size={16} color={theme.primary} />
                  </View>
                  <Text style={[styles.dropdownModalTitle, { color: theme.text }]}>Select Category</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowCategoryDropdown(false)}
                  style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceMuted }]}
                >
                  <Ionicons name="close" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Search in Dropdown */}
              <View
                style={[
                  styles.dropdownSearchWrapper,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Ionicons name="search-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  placeholder="Search categories..."
                  placeholderTextColor={theme.textMuted}
                  value={categorySearch}
                  onChangeText={setCategorySearch}
                  style={[styles.dropdownSearchInput, { color: theme.text }]}
                  autoCapitalize="none"
                />
                {categorySearch ? (
                  <TouchableOpacity onPress={() => setCategorySearch('')}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Categories List */}
              <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
                {filteredCategories.map((cat) => {
                  const isSelected = category.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCategory(cat.name);
                        setShowCategoryDropdown(false);
                      }}
                      style={[
                        styles.categoryListItem,
                        { borderBottomColor: theme.border },
                        isSelected && { backgroundColor: theme.primarySoft },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View
                          style={[
                            styles.categoryItemBadge,
                            { backgroundColor: `${cat.color}20` },
                          ]}
                        >
                          <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                        </View>
                        <Text
                          style={[
                            styles.categoryListItemText,
                            { color: theme.text },
                            isSelected && { fontWeight: Typography.weights.bold, color: theme.primary },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
                {filteredCategories.length === 0 ? (
                  <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
                    <Text style={{ color: theme.textMuted, fontSize: Typography.sizes.sm }}>
                      No categories found matching "{categorySearch}"
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: Radii.sm,
  },
  typeTabText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  amountInput: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  sectionGroup: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  requiredBadge: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  categoryDropBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 52,
  },
  categoryDropBoxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDropBoxText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  categoryDropBoxPlaceholder: {
    fontSize: Typography.sizes.base,
    fontStyle: 'italic',
  },
  categoryDropBoxRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dropdownModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownModalContent: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalHeaderBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownModalTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    paddingVertical: 2,
  },
  dropdownList: {
    maxHeight: 320,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    marginVertical: 2,
  },
  categoryItemBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryListItemText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  walletScroll: {
    paddingVertical: 4,
    gap: Spacing.xs,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: 6,
  },
  walletChipText: {
    fontSize: Typography.sizes.xs,
  },
});
