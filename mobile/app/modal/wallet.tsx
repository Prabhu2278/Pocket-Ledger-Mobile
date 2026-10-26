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
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Spacing, Radii, Typography, useResponsive } from '../../src/theme';

const WALLET_TYPES = [
  { id: 'BANK', label: 'Bank Account', icon: 'business-outline' },
  { id: 'WALLET', label: 'UPI / Digital', icon: 'phone-portrait-outline' },
  { id: 'CASH', label: 'Cash', icon: 'cash-outline' },
  { id: 'CREDIT_CARD', label: 'Credit Card', icon: 'card-outline' },
];

const CURATED_WALLET_COLORS = [
  '#3b82f6', // Bright Blue
  '#10b981', // Emerald Green
  '#8b5cf6', // Violet
  '#f59e0b', // Amber / Orange
  '#ec4899', // Pink
  '#06b6d4', // Cyan / Teal
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#84cc16', // Lime
  '#e11d48', // Crimson
  '#0ea5e9', // Sky Blue
  '#d946ef', // Fuchsia
  '#f97316', // Tangerine
  '#a855f7', // Purple
  '#22c55e', // Green
  '#0284c7', // Ocean Blue
  '#7c3aed', // Deep Violet
  '#db2777', // Magenta
  '#059669', // Mint
  '#ca8a04', // Golden
  '#4f46e5', // Royal Indigo
];

// Helper to convert HSL to Hex for infinite distinct fallback colors
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const col = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * col)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Generate a random color that does not already exist in any other wallet
function getRandomUniqueColor(existingWallets: { color?: string }[]): string {
  const usedColors = new Set(
    existingWallets
      .map((w) => (w.color || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const availableCurated = CURATED_WALLET_COLORS.filter(
    (c) => !usedColors.has(c.toLowerCase())
  );

  if (availableCurated.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableCurated.length);
    return availableCurated[randomIndex];
  }

  // Fallback: Generate a random pleasant HSL color that is not already used
  for (let attempt = 0; attempt < 50; attempt++) {
    const hue = Math.floor(Math.random() * 360);
    const hex = hslToHex(hue, 75, 50);
    if (!usedColors.has(hex.toLowerCase())) {
      return hex;
    }
  }

  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

export default function WalletModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ walletId?: string }>();
  const { theme } = useTheme();
  const { wallets, currency, createWallet, updateWallet, deleteWallet } = useApp();
  const { isTablet } = useResponsive();

  const isEditing = !!params.walletId;
  const existingWallet = isEditing
    ? wallets.find((w) => String(w.id) === String(params.walletId))
    : null;

  const [name, setName] = useState(existingWallet?.name || '');
  const [walletType, setWalletType] = useState(existingWallet?.wallet_type || 'BANK');
  const [initialBalance, setInitialBalance] = useState(
    existingWallet?.initial_balance !== undefined ? String(existingWallet.initial_balance) : '0'
  );
  // Auto-assign random unique color that does not already exist
  const [color] = useState<string>(() => {
    if (existingWallet?.color) {
      return existingWallet.color;
    }
    return getRandomUniqueColor(wallets);
  });

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
});
