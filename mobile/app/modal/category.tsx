// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Category Management Modal
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { api } from '../../src/services/api';
import { Category } from '../../src/types';
import { Spacing, Radii, Typography } from '../../src/theme';

const PALETTE = [
  '#b42c45', '#2563eb', '#15803d', '#b45309', '#0d7a6f',
  '#9333ea', '#ec4899', '#0284c7', '#6366f1', '#d97706',
];

export default function CategoryModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const { categories, refreshCategories } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState('#2563eb');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCategory = async () => {
    if (!name.trim()) {
      setError('Please provide a category name.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.categories.create({
        name: name.trim(),
        type,
        color,
        icon: 'pricetag-outline',
      });
      setName('');
      await refreshCategories();
      Alert.alert('Success', `Category "${name.trim()}" created successfully.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create category.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    if (cat.is_default) {
      Alert.alert('Notice', 'System default categories cannot be removed.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Delete or deactivate "${cat.name}"? Transactions using this category will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.categories.delete(cat.id);
              await refreshCategories();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete category');
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
        {/* Create Category Form Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Add New Category</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
              <Ionicons name="alert-circle" size={16} color={theme.danger} style={{ marginRight: 6 }} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Type Toggle */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setType('expense')}
              style={[
                styles.typeBtn,
                {
                  backgroundColor: type === 'expense' ? theme.danger : theme.surfaceMuted,
                },
              ]}
            >
              <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#ffffff' : theme.textSecondary }]}>
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setType('income')}
              style={[
                styles.typeBtn,
                {
                  backgroundColor: type === 'income' ? theme.success : theme.surfaceMuted,
                },
              ]}
            >
              <Text style={[styles.typeBtnText, { color: type === 'income' ? '#ffffff' : theme.textSecondary }]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Category Name"
            placeholder="e.g. Freelance Client, Gym"
            value={name}
            onChangeText={setName}
            leftIcon={<Ionicons name="pricetag-outline" size={18} color={theme.textMuted} />}
          />

          {/* Color Palette */}
          <Text style={[styles.swatchLabel, { color: theme.textSecondary }]}>Accent Color</Text>
          <View style={styles.paletteRow}>
            {PALETTE.map((c) => (
              <TouchableOpacity
                key={c}
                activeOpacity={0.7}
                onPress={() => setColor(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  color === c && { borderColor: theme.text, borderWidth: 3 },
                ]}
              >
                {color === c ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="+ Add Category"
            onPress={handleCreateCategory}
            loading={loading}
            size="md"
            style={{ marginTop: Spacing.md }}
          />
        </View>

        {/* Categories List */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Existing Categories</Text>

        {categories.map((cat) => (
          <View
            key={`cat-${cat.id}`}
            style={[styles.categoryRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.colorBox, { backgroundColor: cat.color || theme.primary }]} />
              <View>
                <Text style={[styles.catName, { color: theme.text }]}>{cat.name}</Text>
                <Text style={[styles.catType, { color: theme.textMuted }]}>
                  {cat.type.toUpperCase()} • {cat.is_default ? 'System Default' : 'Custom'}
                </Text>
              </View>
            </View>

            {!cat.is_default ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDeleteCategory(cat)}
                style={[styles.deleteBtn, { backgroundColor: theme.dangerSoft }]}
              >
                <Ionicons name="trash-outline" size={16} color={theme.danger} />
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
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
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.md,
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
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  swatchLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBox: {
    width: 14,
    height: 14,
    borderRadius: Radii.pill,
    marginRight: Spacing.md,
  },
  catName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  catType: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
