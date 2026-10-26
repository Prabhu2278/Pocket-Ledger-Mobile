// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Month & Year Calendar Picker Modal
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { Spacing, Radii, Typography } from '../../theme';

interface MonthPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentYear: number;
  currentMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  onSelectMonth: (year: number, month: number) => void;
}

const MONTHS = [
  { id: 0, short: 'Jan', full: 'January' },
  { id: 1, short: 'Feb', full: 'February' },
  { id: 2, short: 'Mar', full: 'March' },
  { id: 3, short: 'Apr', full: 'April' },
  { id: 4, short: 'May', full: 'May' },
  { id: 5, short: 'Jun', full: 'June' },
  { id: 6, short: 'Jul', full: 'July' },
  { id: 7, short: 'Aug', full: 'August' },
  { id: 8, short: 'Sep', full: 'September' },
  { id: 9, short: 'Oct', full: 'October' },
  { id: 10, short: 'Nov', full: 'November' },
  { id: 11, short: 'Dec', full: 'December' },
];

export const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  isOpen,
  onClose,
  currentYear,
  currentMonth,
  onSelectMonth,
}) => {
  const { theme, isDark } = useTheme();

  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (isOpen) {
      setSelectedYear(currentYear);
    }
  }, [isOpen, currentYear]);

  if (!isOpen) return null;

  const now = new Date();
  const actualYear = now.getFullYear();
  const actualMonth = now.getMonth();

  const handlePickMonth = (monthIndex: number) => {
    onSelectMonth(selectedYear, monthIndex);
    onClose();
  };

  const handleSelectCurrentMonth = () => {
    onSelectMonth(actualYear, actualMonth);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.dialogContainer,
            {
              backgroundColor: isDark ? '#111827' : theme.surface,
              borderColor: isDark ? '#1f293d' : theme.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={styles.titleGroup}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.22)' : '#e0e7ff' },
                ]}
              >
                <Ionicons name="calendar" size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Select Month & Year</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  Browse ledger financial data
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#1e293b' : theme.surfaceMuted }]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Year Navigator */}
          <View
            style={[
              styles.yearBar,
              {
                backgroundColor: isDark ? '#172033' : '#f1f5f9',
                borderColor: isDark ? '#26344d' : '#e2e8f0',
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setSelectedYear((y) => y - 1)}
              style={styles.yearArrow}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
            </TouchableOpacity>

            <View style={styles.yearCenterWrap}>
              <Text style={[styles.yearText, { color: theme.text }]}>{selectedYear}</Text>
              {selectedYear === actualYear ? (
                <View style={[styles.thisYearBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.25)' : '#e0e7ff' }]}>
                  <Text style={[styles.thisYearText, { color: isDark ? '#a5b4fc' : '#4f46e5' }]}>This Year</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={() => setSelectedYear((y) => y + 1)}
              style={styles.yearArrow}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
            </TouchableOpacity>
          </View>

          {/* 12 Months Grid */}
          <View style={styles.monthsGrid}>
            {MONTHS.map((m) => {
              const isSelected = selectedYear === currentYear && m.id === currentMonth;
              const isCurrentActual = selectedYear === actualYear && m.id === actualMonth;

              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.75}
                  onPress={() => handlePickMonth(m.id)}
                  style={[
                    styles.monthCell,
                    isSelected
                      ? {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        }
                      : {
                          backgroundColor: isDark ? '#161f30' : '#ffffff',
                          borderColor: isDark ? '#23304a' : '#e2e8f0',
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthShort,
                      {
                        color: isSelected ? '#ffffff' : theme.text,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {m.short}
                  </Text>
                  <Text
                    style={[
                      styles.monthFull,
                      {
                        color: isSelected ? 'rgba(255,255,255,0.82)' : theme.textMuted,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {m.full}
                  </Text>

                  {isCurrentActual && !isSelected ? (
                    <View style={styles.currentDot} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Actions Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={handleSelectCurrentMonth}
              style={[
                styles.currentMonthBtn,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#c7d2fe',
                },
              ]}
              activeOpacity={0.75}
            >
              <Ionicons name="today-outline" size={15} color={isDark ? '#818cf8' : '#4f46e5'} style={{ marginRight: 6 }} />
              <Text style={[styles.currentMonthBtnText, { color: isDark ? '#a5b4fc' : '#4f46e5' }]}>
                Jump to Current Month
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.extrabold,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  yearArrow: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCenterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  thisYearBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  thisYearText: {
    fontSize: 10,
    fontWeight: '700',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  monthCell: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    position: 'relative',
  },
  monthShort: {
    fontSize: 15,
    marginBottom: 2,
  },
  monthFull: {
    fontSize: 10,
    fontWeight: '500',
  },
  currentDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  footerRow: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: Spacing.md,
  },
  currentMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  currentMonthBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
