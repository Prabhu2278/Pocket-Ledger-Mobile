// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Add Currency Modal Component
// Faithfully matching frontend/src/components/AddCurrencyModal.jsx
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { POPULAR_CURRENCIES, CurrencyConfig } from '../../utils/formatCurrency';
import { Spacing, Radii, Typography, useResponsive } from '../../theme';

const REGION_FILTERS = [
  { id: 'all', label: 'All Currencies' },
  { id: 'popular', label: 'Major' },
  { id: 'asia', label: 'Asia-Pacific' },
  { id: 'west', label: 'Americas & Europe' },
  { id: 'mideast', label: 'Middle East' },
];

const MAJOR_CODES = new Set(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD', 'AED']);
const ASIA_CODES = new Set(['INR', 'JPY', 'SGD', 'AUD', 'NZD', 'CNY', 'KRW', 'MYR', 'THB', 'IDR', 'PHP']);
const WEST_CODES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'BRL', 'MXN', 'RUB', 'TRY']);
const MIDEAST_CODES = new Set(['AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR']);

export interface AddCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCurrency: (currency: CurrencyConfig) => void;
  existingCodes?: string[];
  activeCurrency?: string;
}

export const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
  isOpen,
  onClose,
  onSelectCurrency,
  existingCodes = [],
  activeCurrency = 'INR',
}) => {
  const { theme, isDark } = useTheme();
  const { isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return POPULAR_CURRENCIES.filter((curr) => {
      if (regionFilter === 'popular' && !MAJOR_CODES.has(curr.code)) return false;
      if (regionFilter === 'asia' && !ASIA_CODES.has(curr.code)) return false;
      if (regionFilter === 'west' && !WEST_CODES.has(curr.code)) return false;
      if (regionFilter === 'mideast' && !MIDEAST_CODES.has(curr.code)) return false;

      if (!q) return true;
      return (
        curr.code.toLowerCase().includes(q) ||
        curr.name.toLowerCase().includes(q) ||
        curr.symbol.toLowerCase().includes(q)
      );
    });
  }, [search, regionFilter]);

  const handleSelect = (curr: CurrencyConfig) => {
    onSelectCurrency(curr);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
            isTablet && { maxWidth: 520, width: '100%', alignSelf: 'center' },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <View style={[styles.iconBadge, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="cash-outline" size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Add New Currency</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  Choose from world currencies to add to your ledger.
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={16} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by code or name (e.g. JPY, USD)..."
              placeholderTextColor={theme.textMuted}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Region Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {REGION_FILTERS.map((rf) => {
              const isActive = regionFilter === rf.id;
              return (
                <TouchableOpacity
                  key={rf.id}
                  onPress={() => setRegionFilter(rf.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? theme.primary : theme.surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isActive ? '#ffffff' : theme.textSecondary },
                    ]}
                  >
                    {rf.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Currencies Grid */}
          <ScrollView style={styles.gridList} showsVerticalScrollIndicator={false}>
            {filteredCurrencies.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No currencies matched "{search}"
                </Text>
              </View>
            ) : (
              filteredCurrencies.map((curr) => {
                const isExisting = existingCodes.includes(curr.code);
                const isActive = activeCurrency === curr.code;

                return (
                  <View
                    key={curr.code}
                    style={[
                      styles.currCard,
                      {
                        backgroundColor: isActive ? theme.primarySoft : isDark ? '#161e2e' : '#f8fafc',
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <View style={styles.currLeft}>
                      <View style={[styles.symbolBadge, { backgroundColor: theme.surfaceMuted }]}>
                        <Text style={[styles.symbolText, { color: theme.text }]}>{curr.symbol}</Text>
                      </View>
                      <View style={styles.currDetails}>
                        <Text style={[styles.currName, { color: theme.text }]} numberOfLines={1}>
                          {curr.name}
                        </Text>
                        <Text style={[styles.currCode, { color: theme.textMuted }]}>
                          {curr.code} {curr.code === 'INR' && '• Default'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      disabled={isActive}
                      onPress={() => handleSelect(curr)}
                      style={[
                        styles.actionBtn,
                        isActive
                          ? { backgroundColor: theme.primary }
                          : isExisting
                          ? { backgroundColor: theme.surfaceMuted, borderColor: theme.border, borderWidth: 1 }
                          : { backgroundColor: theme.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          {
                            color: isActive || !isExisting ? '#ffffff' : theme.textSecondary,
                          },
                        ]}
                      >
                        {isActive ? 'Active' : isExisting ? 'Select' : '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AddCurrencyModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalBox: {
    maxHeight: '85%',
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: Spacing.sm,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    padding: 0,
  },
  filterChipsRow: {
    gap: 6,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: Typography.weights.semibold,
  },
  gridList: {
    marginTop: 4,
  },
  currCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  currLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  symbolBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  currDetails: {
    flex: 1,
  },
  currName: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  currCode: {
    fontSize: 10,
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
  emptyWrap: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.xs,
  },
});
