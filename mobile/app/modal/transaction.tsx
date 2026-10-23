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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { getTodayIso } from '../../src/utils/dateUtils';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSFER_CATEGORY,
} from '../../src/constants/categories';
import { TransactionType } from '../../src/types';
import { Spacing, Radii, Typography } from '../../src/theme';

export default function TransactionModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ txId?: string; txType?: string; initialType?: string }>();
  const { theme } = useTheme();
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
    existingTx?.category || (type === 'income' ? 'Salary' : type === 'transfer' ? 'Transfer' : 'Food')
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

  // Available categories based on selected transaction type
  const availableCategories =
    type === 'income'
      ? INCOME_CATEGORIES
      : type === 'transfer'
      ? [TRANSFER_CATEGORY]
      : EXPENSE_CATEGORIES;

  // Switch type effects
  const handleTypeSelect = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory('Salary');
    } else if (newType === 'transfer') {
      setCategory('Transfer');
    } else {
      setCategory('Food');
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} style={{ marginRight: 6 }} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* 1. Transaction Type Segment Picker */}
        <View style={[styles.typeSelector, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleTypeSelect('expense')}
            style={[
              styles.typeTab,
              type === 'expense' && { backgroundColor: theme.danger, shadowColor: theme.danger },
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
            activeOpacity={0.8}
            onPress={() => handleTypeSelect('income')}
            style={[
              styles.typeTab,
              type === 'income' && { backgroundColor: theme.success, shadowColor: theme.success },
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
            activeOpacity={0.8}
            onPress={() => handleTypeSelect('transfer')}
            style={[
              styles.typeTab,
              type === 'transfer' && { backgroundColor: theme.info, shadowColor: theme.info },
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

        {/* 3. Category Selector Chips */}
        {type !== 'transfer' ? (
          <View style={styles.sectionGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {availableCategories.map((cat) => {
                const isSelected = category.toLowerCase() === cat.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat.name}
                    activeOpacity={0.7}
                    onPress={() => setCategory(cat.name)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? cat.color : theme.surface,
                        borderColor: isSelected ? cat.color : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={15}
                      color={isSelected ? '#ffffff' : cat.color}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color: isSelected ? '#ffffff' : theme.text,
                          fontWeight: isSelected ? Typography.weights.bold : Typography.weights.regular,
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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

        {/* 6. Date Input */}
        <Input
          label="Date (YYYY-MM-DD)"
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          leftIcon={<Ionicons name="calendar-outline" size={18} color={theme.textMuted} />}
        />

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
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: Spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: Typography.sizes.xs,
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
