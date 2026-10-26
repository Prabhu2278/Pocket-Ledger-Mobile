// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Settings Screen
// Faithfully matching frontend/src/pages/Settings.jsx
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Header } from '../../src/components/ui/Header';
import { AmbientMesh } from '../../src/components/ui/AmbientMesh';
import { AddCurrencyModal } from '../../src/components/modals/AddCurrencyModal';
import {
  DEFAULT_CURRENCIES,
  POPULAR_CURRENCIES,
  getCustomCurrencies,
  saveCustomCurrency,
  removeCustomCurrency,
  CurrencyConfig,
} from '../../src/utils/formatCurrency';
import { api } from '../../src/api/api';
import { Spacing, Radii, Typography, useResponsive, ThemeId } from '../../src/theme';

const THEME_DISPLAY_ITEMS = [
  {
    id: 'light' as const,
    name: 'Light Theme',
    category: 'Clean Daylight & Crisp Contrast',
    description: 'Clean white cards with soft slate accents, clear daylight visibility, and royal indigo highlights.',
    icon: 'sunny' as const,
    color: '#4f46e5',
    swatches: ['#f6f8fd', '#ffffff', '#4f46e5', '#10b981', '#f43f5e'],
  },
  {
    id: 'dark' as const,
    name: 'Dark Theme',
    category: 'Midnight Dark & Fintech Slate',
    description: 'Easy on the eyes in low light with deep slate backgrounds, battery power savings, and vibrant accents.',
    icon: 'moon' as const,
    color: '#818cf8',
    swatches: ['#0a0e17', '#131926', '#818cf8', '#34d399', '#f87171'],
  },
];

const PRESET_COLORS = [
  '#b42c45',
  '#2563eb',
  '#15803d',
  '#b45309',
  '#0d7a6f',
  '#9333ea',
  '#ec4899',
  '#0284c7',
  '#6366f1',
  '#64748b',
];

type SettingsTab = 'profile' | 'appearance' | 'currency' | 'categories' | 'security';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { isDark, toggleTheme, setThemeMode, setThemeId, theme, themeId } = useTheme();
  const { isSmallPhone, isTablet, contentMaxWidth } = useResponsive();
  const { currency, updateCurrency, categories, refreshCategories } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile tab state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Appearance tab state
  const [themeFilter, setThemeFilter] = useState<'all' | 'dark' | 'light'>('all');

  // Currency tab state
  const [customCurrencies, setCustomCurrencies] = useState<CurrencyConfig[]>(() => getCustomCurrencies());
  const [showAddCurrencyModal, setShowAddCurrencyModal] = useState(false);
  const [currencySaving, setCurrencySaving] = useState(false);

  // Security tab state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Categories tab state
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [catError, setCatError] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  // Displayed currencies list
  const displayedCurrencies = useMemo(() => {
    const list: CurrencyConfig[] = [...DEFAULT_CURRENCIES];
    const defaultCodes = new Set(DEFAULT_CURRENCIES.map((c: CurrencyConfig) => c.code));

    customCurrencies.forEach((curr) => {
      if (!defaultCodes.has(curr.code)) {
        list.push(curr);
        defaultCodes.add(curr.code);
      }
    });

    if (currency && !defaultCodes.has(currency)) {
      const match = POPULAR_CURRENCIES.find((c) => c.code === currency);
      if (match) {
        list.push(match);
      } else {
        list.push({
          code: currency,
          name: currency,
          symbol: currency,
          locale: 'en-US',
          label: `${currency} (${currency})`,
        });
      }
    }
    return list;
  }, [customCurrencies, currency]);

  // Handle Save Profile
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be empty');
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim() });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Currency Change
  const handleSelectCurrency = (targetCode: string) => {
    if (targetCode === currency) return;

    Alert.alert(
      'Change Currency?',
      `Are you sure you want to change your preferred currency to ${targetCode}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setCurrencySaving(true);
            try {
              await updateCurrency(targetCode);
              Alert.alert('Success', `Currency changed to ${targetCode}`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update currency');
            } finally {
              setCurrencySaving(false);
            }
          },
        },
      ]
    );
  };

  // Handle Remove Custom Currency
  const handleRemoveCustom = (codeToRemove: string) => {
    Alert.alert(
      'Delete Currency?',
      `Are you sure you want to delete ${codeToRemove} from your currency options?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            const updated = removeCustomCurrency(codeToRemove);
            setCustomCurrencies(updated);
            if (currency === codeToRemove) {
              await updateCurrency('INR');
            }
            Alert.alert('Success', `Removed ${codeToRemove} from currency options`);
          },
        },
      ]
    );
  };

  // Handle Adding Currency
  const handleAddCurrency = (newCurr: CurrencyConfig) => {
    const code = (newCurr.code || '').toUpperCase();
    if (!code) return;
    const isDefault = DEFAULT_CURRENCIES.some((d: CurrencyConfig) => d.code === code);
    if (!isDefault) {
      saveCustomCurrency(newCurr);
      setCustomCurrencies(getCustomCurrencies());
    }
    Alert.alert('Currency Added', `Added ${code} to currency options. Select it whenever you wish to switch.`);
  };

  // Handle Change Password
  const handleChangePassword = async () => {
    setPwError('');
    if (!currentPw) {
      setPwError('Enter your current password.');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }

    Alert.alert(
      'Update Password?',
      'Are you sure you want to update your password? You will need to use your new password next time you sign in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update Password',
          onPress: async () => {
            setPwSaving(true);
            try {
              await api.auth.changePassword({
                current_password: currentPw,
                new_password: newPw,
              });
              setCurrentPw('');
              setNewPw('');
              setConfirmPw('');
              Alert.alert('Success', 'Password changed successfully');
            } catch (err: any) {
              setPwError(err.message || 'Failed to change password');
            } finally {
              setPwSaving(false);
            }
          },
        },
      ]
    );
  };

  // Handle Create Category
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    setCatSaving(true);
    setCatError('');
    try {
      await api.categories.create({
        name: newCatName.trim(),
        type: newCatType,
        color: newCatColor,
      });
      await refreshCategories();
      setIsCategoryModalOpen(false);
      setNewCatName('');
      Alert.alert('Success', `Category '${newCatName.trim()}' added successfully.`);
    } catch (err: any) {
      setCatError(err.message || 'Failed to create category.');
    } finally {
      setCatSaving(false);
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = (catId: number, catName: string) => {
    Alert.alert(
      'Delete Category?',
      `Are you sure you want to delete '${catName}'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.categories.delete(catId);
              await refreshCategories();
              Alert.alert('Success', `Category '${catName}' deleted.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  // Handle Sign Out
  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await logout();
        router.replace('/login');
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to sign out');
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to sign out of Pocket Ledger?')) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Pocket Ledger?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const filteredCategories = categories.filter((c) => {
    if (categoryFilter === 'all') return true;
    return c.type === categoryFilter;
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <AmbientMesh />
      <Header title="Settings" showMonthSwitcher={false} subtitle="Preferences, categories & account" />

      {/* Top 5 Navigation Tabs matching web SETTINGS_TABS */}
      <View style={[styles.tabsHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'profile' && { borderBottomColor: theme.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setActiveTab('profile')}
          >
            <Ionicons name="person-outline" size={15} color={activeTab === 'profile' ? theme.primary : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'profile' ? theme.primary : theme.textMuted }]}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'appearance' && { borderBottomColor: theme.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setActiveTab('appearance')}
          >
            <Ionicons name="color-palette-outline" size={15} color={activeTab === 'appearance' ? theme.primary : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'appearance' ? theme.primary : theme.textMuted }]}>Themes & Colors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'currency' && { borderBottomColor: theme.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setActiveTab('currency')}
          >
            <Ionicons name="cash-outline" size={15} color={activeTab === 'currency' ? theme.primary : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'currency' ? theme.primary : theme.textMuted }]}>Currency</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'categories' && { borderBottomColor: theme.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setActiveTab('categories')}
          >
            <Ionicons name="pricetag-outline" size={15} color={activeTab === 'categories' ? theme.primary : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'categories' ? theme.primary : theme.textMuted }]}>Categories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'security' && { borderBottomColor: theme.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setActiveTab('security')}
          >
            <Ionicons name="shield-checkmark-outline" size={15} color={activeTab === 'security' ? theme.primary : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'security' ? theme.primary : theme.textMuted }]}>Security & Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================================================
            TAB 1: Profile Settings
            ===================================================================== */}
        {activeTab === 'profile' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardHeading, { color: theme.text }]}>Profile settings</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Manage your display name and view your connected account details.
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your display name"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceMuted, borderColor: theme.border, color: theme.textMuted, opacity: 0.7 }]}
                value={user?.email || 'Logged in user'}
                editable={false}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSaveProfile}
              disabled={profileSaving}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.primaryBtnText}>{profileSaving ? 'Saving...' : 'Save profile'}</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 18 }]} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogout}
              style={[styles.logoutBtn, { borderColor: theme.danger }]}
            >
              <Ionicons name="log-out-outline" size={16} color={theme.danger} />
              <Text style={[styles.logoutBtnText, { color: theme.danger }]}>Sign Out of Pocket Ledger</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* =====================================================================
            TAB 2: Themes & Appearance
            ===================================================================== */}
        {activeTab === 'appearance' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeaderFlex}>
              <Text style={[styles.cardHeading, { color: theme.text }]}>Appearance & Theme</Text>
              <View style={[styles.pillBadge, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.pillBadgeText, { color: theme.primary }]}>2 Options</Text>
              </View>
            </View>

            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Choose between clean Daylight Light mode and sleek Midnight Dark mode for your Pocket Ledger interface.
            </Text>

            {THEME_DISPLAY_ITEMS.map((item) => {
              const isActive = themeId === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => setThemeId(item.id)}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: item.swatches[1],
                      borderColor: isActive ? theme.primary : theme.border,
                      borderWidth: isActive ? 2 : 1,
                      borderLeftColor: item.color,
                      borderLeftWidth: 5,
                      marginBottom: Spacing.md,
                    },
                  ]}
                >
                  <View style={styles.themeCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: Radii.pill,
                          backgroundColor: `${item.color}25`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.themeCardName,
                            { color: item.id === 'light' ? '#0f172a' : '#ffffff' },
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.themeCardCategory,
                            { color: item.id === 'light' ? '#64748b' : '#94a3b8' },
                          ]}
                        >
                          {item.category}
                        </Text>
                      </View>
                    </View>
                    {isActive ? (
                      <View style={[styles.activeTag, { backgroundColor: theme.primary }]}>
                        <Text style={[styles.activeTagText, { color: '#ffffff' }]}>Active</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.swatchesRow}>
                    {item.swatches.map((color, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: color,
                            borderColor: item.id === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)',
                            borderWidth: 1,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.themeDesc,
                      { color: item.id === 'light' ? '#64748b' : '#94a3b8' },
                    ]}
                  >
                    {item.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* =====================================================================
            TAB 3: Currency Formatting
            ===================================================================== */}
        {activeTab === 'currency' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeaderFlex}>
              <Text style={[styles.cardHeading, { color: theme.text }]}>Currency formatting</Text>
              <View style={[styles.pillBadge, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.pillBadgeText, { color: theme.primary }]}>Default: INR</Text>
              </View>
            </View>

            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Select your preferred currency for display across transactions, cards, and reports.
            </Text>

            <View style={styles.currencyChipsGrid}>
              {displayedCurrencies.map((c) => {
                const isSelected = currency === c.code;
                const isCustom = !DEFAULT_CURRENCIES.some((d: CurrencyConfig) => d.code === c.code);

                return (
                  <TouchableOpacity
                    key={c.code}
                    activeOpacity={0.8}
                    onPress={() => handleSelectCurrency(c.code)}
                    style={[
                      styles.currencyChip,
                      {
                        backgroundColor: isSelected ? theme.primarySoft : isDark ? '#161e2e' : '#f8fafc',
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyChipText,
                        { color: isSelected ? theme.primary : theme.text },
                      ]}
                    >
                      {c.symbol} {c.code}
                    </Text>

                    {isCustom && (
                      <TouchableOpacity
                        onPress={() => handleRemoveCustom(c.code)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.removeCurrencyBtn}
                      >
                        <Text style={[styles.removeCurrencyText, { color: theme.danger }]}>×</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* + Add Currency Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowAddCurrencyModal(true)}
                style={[
                  styles.currencyChip,
                  {
                    borderStyle: 'dashed',
                    borderColor: theme.primary,
                    backgroundColor: theme.primarySoft,
                  },
                ]}
              >
                <Ionicons name="add" size={14} color={theme.primary} />
                <Text style={[styles.currencyChipText, { color: theme.primary, fontWeight: '700' }]}>
                  Add Currency
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* =====================================================================
            TAB 4: Categories
            ===================================================================== */}
        {activeTab === 'categories' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeaderFlex}>
              <Text style={[styles.cardHeading, { color: theme.text }]}>Categories</Text>
              <TouchableOpacity
                onPress={() => {
                  setNewCatName('');
                  setCatError('');
                  setIsCategoryModalOpen(true);
                }}
                style={[styles.smallAddBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="add" size={14} color="#ffffff" />
                <Text style={styles.smallAddBtnText}>Add Category</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Customize expense and income categories used to categorize your transactions.
            </Text>

            {/* Filter pills */}
            <View style={styles.pillsRow}>
              {(['all', 'expense', 'income'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setCategoryFilter(f)}
                  style={[
                    styles.filterPill,
                    categoryFilter === f && { backgroundColor: theme.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: categoryFilter === f ? '#ffffff' : theme.textSecondary },
                    ]}
                  >
                    {f === 'all' ? 'All' : f === 'expense' ? 'Expenses' : 'Income'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category list */}
            <View style={styles.categoryList}>
              {filteredCategories.map((cat) => (
                <View
                  key={cat.id}
                  style={[styles.categoryItem, { borderBottomColor: theme.border }]}
                >
                  <View style={styles.categoryItemLeft}>
                    <View style={[styles.catColorDot, { backgroundColor: cat.color || '#2563eb' }]} />
                    <Text style={[styles.catName, { color: theme.text }]}>{cat.name}</Text>
                    <View style={[styles.catTypeTag, { backgroundColor: theme.surfaceMuted }]}>
                      <Text style={[styles.catTypeTagText, { color: theme.textMuted }]}>{cat.type}</Text>
                    </View>
                  </View>

                  {!cat.is_default && (
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(cat.id, cat.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* =====================================================================
            TAB 5: Security & Account
            ===================================================================== */}
        {activeTab === 'security' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardHeading, { color: theme.text }]}>Account & security</Text>

            <View style={styles.formGroup}>
              <Text style={[styles.formSubheading, { color: theme.text }]}>Change password</Text>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Current password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                value={currentPw}
                onChangeText={setCurrentPw}
                placeholder="Enter current password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="At least 6 characters"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm new password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Re-enter new password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
              />
            </View>

            {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangePassword}
              disabled={pwSaving}
              style={[styles.secondaryBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                {pwSaving ? 'Updating password...' : 'Update password'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.sessionSection}>
              <Text style={[styles.formSubheading, { color: theme.text }]}>Session</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                Sign out of your active account session. You will be redirected to the sign-in screen.
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLogout}
                style={[styles.logoutBtn, { borderColor: theme.danger }]}
              >
                <Ionicons name="log-out-outline" size={16} color={theme.danger} />
                <Text style={[styles.logoutBtnText, { color: theme.danger }]}>Log out of Pocket Ledger</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Currency Modal */}
      <AddCurrencyModal
        isOpen={showAddCurrencyModal}
        onClose={() => setShowAddCurrencyModal(false)}
        onSelectCurrency={handleAddCurrency}
        existingCodes={displayedCurrencies.map((c) => c.code)}
        activeCurrency={currency}
      />

      {/* Add Category Modal */}
      <Modal
        visible={isCategoryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCategoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Category</Text>
              <TouchableOpacity onPress={() => setIsCategoryModalOpen(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="e.g., Subscriptions, Pet"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Type</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  onPress={() => setNewCatType('expense')}
                  style={[
                    styles.typeSelectorBtn,
                    newCatType === 'expense' && { backgroundColor: theme.danger },
                  ]}
                >
                  <Text style={{ color: newCatType === 'expense' ? '#ffffff' : theme.textSecondary, fontWeight: '700' }}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setNewCatType('income')}
                  style={[
                    styles.typeSelectorBtn,
                    newCatType === 'income' && { backgroundColor: theme.success },
                  ]}
                >
                  <Text style={{ color: newCatType === 'income' ? '#ffffff' : theme.textSecondary, fontWeight: '700' }}>Income</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Color</Text>
              <View style={styles.colorSwatchesRow}>
                {PRESET_COLORS.map((col) => (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setNewCatColor(col)}
                    style={[
                      styles.colorDotBtn,
                      { backgroundColor: col },
                      newCatColor === col && { borderWidth: 2.5, borderColor: '#ffffff' },
                    ]}
                  />
                ))}
              </View>
            </View>

            {catError ? <Text style={styles.errorText}>{catError}</Text> : null}

            <TouchableOpacity
              onPress={handleCreateCategory}
              disabled={catSaving}
              style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: Spacing.md }]}
            >
              <Text style={styles.primaryBtnText}>{catSaving ? 'Creating...' : 'Create Category'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  tabsHeader: {
    borderBottomWidth: 1,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardHeading: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  cardSubtitle: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formSubheading: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: 6,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizes.sm,
  },
  primaryBtn: {
    height: 42,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  secondaryBtn: {
    height: 42,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  errorText: {
    color: '#ef4444',
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.sm,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: Typography.weights.semibold,
  },
  themeGroup: {
    marginBottom: Spacing.lg,
  },
  themeGroupTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  themeCard: {
    padding: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  themeTitleBox: {
    flex: 1,
  },
  themeCardName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  themeCardCategory: {
    fontSize: 10,
  },
  activeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  themeDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  currencyChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  currencyChipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  removeCurrencyBtn: {
    marginLeft: 2,
  },
  removeCurrencyText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryList: {
    marginTop: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
  },
  catName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  catTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radii.sm,
  },
  catTypeTagText: {
    fontSize: 9,
    textTransform: 'capitalize',
  },
  smallAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  smallAddBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  sessionSection: {
    marginTop: Spacing.xs,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  logoutBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeSelectorBtn: {
    flex: 1,
    height: 38,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  colorDotBtn: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
  },
});
