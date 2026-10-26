// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Filter Chips Component
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Spacing, Radii, Typography } from '../../theme';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  rightElement?: React.ReactNode;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selectedId,
  onSelect,
  rightElement,
}) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;

        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.7}
            onPress={() => onSelect(option.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? theme.primary : theme.surface,
                borderColor: isSelected ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected ? '#ffffff' : theme.textSecondary,
                  fontWeight: isSelected ? Typography.weights.bold : Typography.weights.medium,
                },
              ]}
            >
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : theme.surfaceMuted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: isSelected ? '#ffffff' : theme.textMuted },
                  ]}
                >
                  {option.count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
      {rightElement}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: 6,
  },
  chipText: {
    fontSize: Typography.sizes.xs,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  countText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
});
