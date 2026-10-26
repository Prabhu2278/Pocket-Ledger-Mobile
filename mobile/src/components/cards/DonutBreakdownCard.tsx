// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Donut Breakdown Card
// Modern interactive Donut Chart for Expense Breakdown & Income Sources
// Matching the web design and visual spec
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { Spacing, Radii, Typography } from '../../theme';

export interface DonutItem {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

export interface DonutBreakdownCardProps {
  title: string;
  subtitle: string;
  type: 'expense' | 'income';
  total: number;
  items: DonutItem[];
  currency: string;
  emptyMessage?: string;
}

export const DonutBreakdownCard: React.FC<DonutBreakdownCardProps> = ({
  title,
  subtitle,
  type,
  total,
  items,
  currency,
  emptyMessage,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedSlice, setSelectedSlice] = useState<DonutItem | null>(null);

  // SVG Geometry Constants
  const r = 52;
  const circumference = 2 * Math.PI * r;

  // Toggle selection when tapping a slice or legend row
  const handleToggleSlice = (item: DonutItem) => {
    setSelectedSlice((prev) => (prev && prev.name === item.name ? null : item));
  };

  const clearSelection = () => {
    setSelectedSlice(null);
  };

  // Calculate slice coordinates for tooltip positioning
  const tooltipCoords = useMemo(() => {
    if (!selectedSlice || total <= 0 || items.length === 0) return null;

    let acc = 0;
    for (const item of items) {
      const pct = (item.amount / total) * 100;
      if (item.name === selectedSlice.name) {
        const midPct = (acc + pct / 2) / 100;
        // In SVG rotated -90 deg: 0 rad is at top
        const angle = midPct * 2 * Math.PI - Math.PI / 2;
        const x = 70 + r * Math.cos(angle);
        const y = 70 + r * Math.sin(angle);
        return { x, y };
      }
      acc += pct;
    }
    return null;
  }, [selectedSlice, total, items]);

  // Center display values
  const centerAmount = selectedSlice ? selectedSlice.amount : total;
  const centerAmountColor = selectedSlice
    ? selectedSlice.color
    : isDark
    ? '#ffffff'
    : '#0f172a';

  const centerLabel = selectedSlice
    ? `${selectedSlice.name} (${selectedSlice.percentage}%)`
    : type === 'expense'
    ? 'TOTAL EXPENSES'
    : 'TOTAL INCOME';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {/* 1. Header (Title + Subtitle) */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>

      {/* 2. Donut Graphic & Center Text */}
      <View style={styles.donutContent}>
        <Pressable onPress={clearSelection} style={styles.donutGraphicWrapper}>
          <Svg width={144} height={144} viewBox="0 0 140 140">
            <G rotation="-90" origin="70, 70">
              {/* Background Track Circle */}
              <Circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={isDark ? 'rgba(255, 255, 255, 0.09)' : '#e2e8f0'}
                strokeWidth={16}
                opacity={0.4}
              />

              {/* Slices */}
              {items.length > 0 && total > 0 && (() => {
                let accumulatedPct = 0;
                return items.map((item, idx) => {
                  const pct = (item.amount / total) * 100;
                  const gap = items.length > 1 ? 4.5 : 0;
                  const strokeLength = Math.max((pct / 100) * circumference - gap, 2);
                  const strokeDasharray = `${strokeLength} ${circumference}`;
                  const strokeDashoffset = -((accumulatedPct / 100) * circumference);
                  accumulatedPct += pct;

                  const isSelected = selectedSlice && selectedSlice.name === item.name;
                  const isDimmed = selectedSlice && selectedSlice.name !== item.name;

                  return (
                    <Circle
                      key={item.name || idx}
                      cx="70"
                      cy="70"
                      r={r}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={isSelected ? 22 : 17}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      opacity={isDimmed ? 0.35 : 1}
                      onPress={() => handleToggleSlice(item)}
                    />
                  );
                });
              })()}
            </G>
          </Svg>

          {/* Center Info Text */}
          <View style={styles.donutCenter} pointerEvents="none">
            <Text
              style={[
                styles.donutCenterAmount,
                { color: centerAmountColor },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(centerAmount, currency)}
            </Text>
            <Text
              style={[
                styles.donutCenterLabel,
                { color: isDark ? '#94a3b8' : '#64748b' },
              ]}
              numberOfLines={1}
            >
              {centerLabel}
            </Text>
          </View>

          {/* Floating Dark Popover Tooltip */}
          {selectedSlice && (
            <View
              style={[
                styles.donutTooltip,
                tooltipCoords && tooltipCoords.y <= 65
                  ? styles.tooltipPlacedBelow
                  : styles.tooltipPlacedAbove,
                tooltipCoords
                  ? {
                      left: Math.max(10, Math.min(134, tooltipCoords.x)),
                      top: tooltipCoords.y <= 65
                        ? Math.min(100, tooltipCoords.y + 24)
                        : Math.max(0, tooltipCoords.y - 42),
                    }
                  : { alignSelf: 'center', top: 4 },
              ]}
              pointerEvents="none"
            >
              <View style={styles.donutTooltipHeader}>
                <View
                  style={[
                    styles.donutTooltipDot,
                    { backgroundColor: selectedSlice.color },
                  ]}
                />
                <Text style={styles.donutTooltipTitle} numberOfLines={1}>
                  {selectedSlice.name}
                </Text>
                <Text style={styles.donutTooltipPct}>{selectedSlice.percentage}%</Text>
              </View>
              <Text style={styles.donutTooltipAmount}>
                {type === 'income' ? '+' : '-'}{formatCurrency(selectedSlice.amount, currency)}
              </Text>
              <View
                style={
                  tooltipCoords && tooltipCoords.y <= 65
                    ? styles.tooltipArrowUp
                    : styles.tooltipArrowDown
                }
              />
            </View>
          )}
        </Pressable>

        {/* 3. Legend List */}
        <View style={styles.legendContainer}>
          {items.length > 0 ? (
            items.map((item, idx) => {
              const isSelected = selectedSlice && selectedSlice.name === item.name;
              const isDimmed = selectedSlice && selectedSlice.name !== item.name;

              return (
                <TouchableOpacity
                  key={item.name || idx}
                  activeOpacity={0.7}
                  onPress={() => handleToggleSlice(item)}
                  style={[
                    styles.legendItem,
                    isSelected && {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.07)'
                        : 'rgba(99, 102, 241, 0.06)',
                    },
                    { opacity: isDimmed ? 0.4 : 1 },
                  ]}
                >
                  {/* Left: Dot + Category Name */}
                  <View style={styles.legendLeft}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: item.color },
                        isSelected && styles.legendDotSelected,
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendName,
                        { color: isDark ? '#f1f5f9' : '#1e293b' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>

                  {/* Right: Percentage Pill Badge + Bold Amount */}
                  <View style={styles.legendRight}>
                    <View
                      style={[
                        styles.legendPctBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : '#f1f5f9',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.legendPctText,
                          { color: isDark ? '#94a3b8' : '#475569' },
                        ]}
                      >
                        {item.percentage}%
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.legendAmount,
                        { color: isDark ? '#ffffff' : '#0f172a' },
                      ]}
                    >
                      {formatCurrency(item.amount, currency)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                {emptyMessage ||
                  (type === 'expense'
                    ? 'No expenses recorded this month'
                    : 'No income recorded this month')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  donutContent: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  donutGraphicWrapper: {
    position: 'relative',
    width: 144,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    paddingHorizontal: 2,
  },
  donutCenterAmount: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  donutCenterLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 3,
    textAlign: 'center',
  },
  donutTooltip: {
    position: 'absolute',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f293d',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 11,
    minWidth: 115,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 50,
    gap: 3,
  },
  tooltipPlacedAbove: {
    transform: [{ translateX: -50 }],
  },
  tooltipPlacedBelow: {
    transform: [{ translateX: -50 }],
  },
  donutTooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipArrowDown: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#111827',
  },
  tooltipArrowUp: {
    position: 'absolute',
    top: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#111827',
  },
  donutTooltipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  donutTooltipTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  donutTooltipPct: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 'auto',
    paddingLeft: 10,
  },
  donutTooltipAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'right',
    marginTop: 2,
  },
  legendContainer: {
    width: '100%',
    marginTop: Spacing.md,
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotSelected: {
    transform: [{ scale: 1.25 }],
  },
  legendName: {
    fontSize: 15,
    fontWeight: '600',
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendPctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendPctText: {
    fontSize: 12,
    fontWeight: '700',
  },
  legendAmount: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },
  emptyContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
});
