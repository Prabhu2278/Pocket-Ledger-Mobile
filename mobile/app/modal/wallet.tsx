// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Add / Edit Wallet Modal
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
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
import { Spacing, Radii, Typography } from '../../src/theme';

const WALLET_TYPES = [
  { id: 'BANK', label: 'Bank Account', icon: 'business-outline' },
  { id: 'WALLET', label: 'UPI / Digital', icon: 'phone-portrait-outline' },
  { id: 'CASH', label: 'Cash', icon: 'cash-outline' },
  { id: 'CREDIT_CARD', label: 'Credit Card', icon: 'card-outline' },
];

const COLOR_OPTIONS = [
  '#10b981', // Emerald
  '#2563eb', // Sapphire
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export default function WalletModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ walletId?: string }>();
  const { theme } = useTheme();
  const { wallets, currency, createWallet, updateWallet, deleteWallet } = useApp();

  const isEditing = !!params.walletId;
  const existingWallet = isEditing
    ? wallets.find((w) => String(w.id) === String(params.walletId))
    : null;

  const [name, setName] = useState(existingWallet?.name || '');
  const [walletType, setWalletType] = useState(existingWallet?.wallet_type || 'BANK');
  const [initialBalance, setInitialBalance] = useState(
    existingWallet?.initial_balance !== undefined ? String(existingWallet.initial_balance) : '0'
  );
  const [color, setColor] = useState(existingWallet?.color || '#10b981');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter an account name.');
      return;
    }

    const initBal = parseFloat(initialBalance);
    if (isNaN(initBal)) {
      setErrorMessage('Please enter a valid initial balance (e.g. 0).');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      if (isEditing && existingWallet) {
        await updateWallet(existingWallet.id, {
          name: name.trim(),
          wallet_type: walletType,
          initial_balance: initBal,
          color,
        });
      } else {
        await createWallet({
          name: name.trim(),
          wallet_type: walletType,
          initial_balance: initBal,
          color,
        });
      }
      router.back();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!existingWallet) return;
    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${existingWallet.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteWallet(existingWallet.id);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete wallet');
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

        {/* 1. Wallet Name */}
        <Input
          label="Account Name"
          placeholder="e.g. HDFC Bank, Salary Account, UPI"
          value={name}
          onChangeText={setName}
          leftIcon={<Ionicons name="business-outline" size={18} color={theme.textMuted} />}
        />

        {/* 2. Account Type Selector */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Account Type</Text>
          <View style={styles.typesGrid}>
            {WALLET_TYPES.map((t) => {
              const isSelected = walletType.toUpperCase() === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.75}
                  onPress={() => setWalletType(t.id)}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={20}
                    color={isSelected ? theme.primary : theme.textMuted}
                    style={{ marginBottom: 4 }}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      {
                        color: isSelected ? theme.primary : theme.text,
                        fontWeight: isSelected ? Typography.weights.bold : Typography.weights.medium,
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Initial Balance */}
        <Input
          label={`Initial Opening Balance (${currency})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={initialBalance}
          onChangeText={setInitialBalance}
          leftIcon={<Ionicons name="cash-outline" size={18} color={theme.textMuted} />}
        />

        {/* 4. Color Swatches */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Theme Color</Text>
          <View style={styles.swatchRow}>
            {COLOR_OPTIONS.map((c) => {
              const isSelected = color === c;
              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.7}
                  onPress={() => setColor(c)}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    isSelected && { borderColor: theme.text, borderWidth: 3 },
                  ]}
                >
                  {isSelected ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save & Delete Buttons */}
        <Button
          title={isEditing ? 'Update Account' : 'Create Account'}
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing.md }}
        />

        {isEditing ? (
          <Button
            title="Delete Account"
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
  sectionGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeCard: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: Typography.sizes.xs,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: 4,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
