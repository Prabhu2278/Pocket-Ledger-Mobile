// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Empty State Component
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Button } from './Button';
import { Spacing, Radii, Typography } from '../theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'document-text-outline',
  title,
  description,
  actionTitle,
  onAction,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={icon as any} size={36} color={theme.textMuted} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text>
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          size="sm"
          style={{ marginTop: Spacing.md }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginVertical: Spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
