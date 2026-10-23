// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Settings & Preferences Screen
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/components/Header';
import { POPULAR_CURRENCIES } from '../../src/utils/formatCurrency';
import { api } from '../../src/services/api';
import { Spacing, Radii, Typography } from '../../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const { currency, updateCurrency, categories } = useApp();

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Pocket Ledger?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header title="Settings" showMonthSwitcher={false} subtitle="Preferences, categories & account" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.profileRow}>
            <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarInitial}>
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {user?.full_name || 'Pocket Ledger User'}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.textMuted }]}>
                {user?.email || 'user@pocketledger.app'}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Appearance / Theme */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Appearance</Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: theme.primarySoft }]}>
                <Ionicons
                  name={isDark ? 'moon-outline' : 'sunny-outline'}
                  size={18}
                  color={theme.primary}
                />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Dark Theme</Text>
                <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                  {isDark ? 'Midnight Fintech Dark active' : 'Clean Slate Light active'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* 2. Currency Preferences */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Currency Settings</Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowCurrencyModal(!showCurrencyModal)}
            style={styles.settingItem}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: theme.successSoft }]}>
                <Ionicons name="cash-outline" size={18} color={theme.success} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Display Currency</Text>
                <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                  Active: {currency} (Synced with Web)
                </Text>
              </View>
            </View>
            <View style={styles.currencyPill}>
              <Text style={[styles.currencyPillText, { color: theme.primary }]}>{currency}</Text>
              <Ionicons
                name={showCurrencyModal ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.primary}
                style={{ marginLeft: 4 }}
              />
            </View>
          </TouchableOpacity>

          {/* Currency Dropdown Options */}
          {showCurrencyModal ? (
            <View style={[styles.currencyOptionsList, { borderTopColor: theme.borderSubtle }]}>
              {POPULAR_CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  activeOpacity={0.7}
                  onPress={() => {
                    updateCurrency(c.code);
                    setShowCurrencyModal(false);
                  }}
                  style={[
                    styles.currencyOptionItem,
                    {
                      backgroundColor: c.code === currency ? theme.primarySoft : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyOptionText,
                      {
                        color: c.code === currency ? theme.primary : theme.text,
                        fontWeight: c.code === currency ? Typography.weights.bold : Typography.weights.regular,
                      },
                    ]}
                  >
                    {c.label}
                  </Text>
                  {c.code === currency ? (
                    <Ionicons name="checkmark" size={18} color={theme.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* 3. Category Management */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Categories</Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/modal/category')}
            style={styles.settingItem}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: theme.infoSoft }]}>
                <Ionicons name="pricetags-outline" size={18} color={theme.info} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Manage Categories</Text>
                <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                  {categories.length} custom and system categories
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 4. Budget & Financial Goals */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Budget Target</Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/modal/budget')}
            style={styles.settingItem}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: theme.warningSoft }]}>
                <Ionicons name="trending-up-outline" size={18} color={theme.warning} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Monthly Budget Limit</Text>
                <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                  Configure monthly spending target
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 5. Statement CSV Tools */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Data & Statements</Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/modal/csv')}
            style={styles.settingItem}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Import Bank Statement</Text>
                <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                  Upload CSV bank statement to mobile and web
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 6. Backend Connectivity & Info */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Backend Status</Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: theme.successSoft }]}>
                <Ionicons name="server-outline" size={18} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>FastAPI Backend</Text>
                <Text style={[styles.settingDescription, { color: theme.textMuted }]} numberOfLines={1}>
                  {api.getBaseUrl()}
                </Text>
              </View>
            </View>
            <View style={[styles.onlineBadge, { backgroundColor: theme.successSoft }]}>
              <Text style={[styles.onlineBadgeText, { color: theme.success }]}>Connected</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.danger} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: theme.danger }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.textMuted }]}>
          Pocket Ledger Mobile v1.0.0 • Connected to FastAPI & PostgreSQL/SQLite
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  sectionHeading: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  profileEmail: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  settingDescription: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  currencyPillText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  currencyOptionsList: {
    borderTopWidth: 1,
    paddingVertical: 4,
  },
  currencyOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  currencyOptionText: {
    fontSize: Typography.sizes.sm,
  },
  onlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: Spacing.xxl,
  },
  logoutText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  versionText: {
    textAlign: 'center',
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
