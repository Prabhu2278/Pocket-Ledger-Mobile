// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Monthly Budget Target Modal
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { formatMonthLabel } from '../../src/utils/dateUtils';
import { Spacing, Radii, Typography } from '../../src/theme';

export default function BudgetModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const { budget, monthState, currency, totalSpent, updateBudget } = useApp();

  const [targetAmount, setTargetAmount] = useState<string>(
    budget?.target_amount ? String(budget.target_amount) : '20000'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numTarget = parseFloat(targetAmount) || 0;
  const utilization = numTarget > 0 ? Math.round((totalSpent / numTarget) * 100) : 0;

  const handleSave = async () => {
    if (numTarget <= 0) {
      setError('Please enter a target amount greater than 0.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await updateBudget(numTarget);
      router.back();
    } catch (err: any) {
      setError(err?.message || 'Failed to save monthly budget.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Month Indicator Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              {formatMonthLabel(monthState)} Target
            </Text>
            <Text style={[styles.infoSub, { color: theme.textMuted }]}>
              Current Month's Total Outflow: {formatCurrency(totalSpent, currency)}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} style={{ marginRight: 6 }} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          </View>
        ) : null}

        <Input
          label={`Target Spending Limit (${currency})`}
          placeholder="e.g. 25000"
          keyboardType="decimal-pad"
          value={targetAmount}
          onChangeText={setTargetAmount}
          leftIcon={<Ionicons name="cash-outline" size={18} color={theme.textMuted} />}
        />

        {/* Live Calculation Preview */}
        <View style={[styles.previewCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Utilization Forecast</Text>
          <Text style={[styles.previewValue, { color: utilization > 100 ? theme.danger : theme.success }]}>
            {utilization}% utilized with current spending
          </Text>
          <Text style={[styles.previewSub, { color: theme.textMuted }]}>
            {numTarget >= totalSpent
              ? `You have ${formatCurrency(numTarget - totalSpent, currency)} remaining this month.`
              : `Current spending exceeds this target by ${formatCurrency(totalSpent - numTarget, currency)}.`}
          </Text>
        </View>

        <Button
          title="Save Budget Target"
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing.xl }}
        />
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
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  infoSub: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
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
  previewCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  previewLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  previewValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginVertical: 4,
  },
  previewSub: {
    fontSize: Typography.sizes.xs,
  },
});
