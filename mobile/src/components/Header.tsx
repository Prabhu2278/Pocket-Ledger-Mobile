// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Top Header with Month Navigator
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatMonthLabel } from '../utils/dateUtils';
import { Spacing, Radii, Typography } from '../theme';

import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showMonthSwitcher?: boolean;
  onPressFilter?: () => void;
  activeFilterCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Pocket Ledger',
  subtitle,
  showMonthSwitcher = true,
  onPressFilter,
  activeFilterCount = 0,
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { monthState, goToPreviousMonth, goToNextMonth, isRefreshing, refreshAll } = useApp();
  const { user, logout } = useAuth();

  const handleAvatarPress = () => {
    const doLogout = async () => {
      try {
        await logout();
        router.replace('/login');
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to logout');
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Signed in as ${user?.email || 'User'}\n\nDo you want to log out?`)) {
        doLogout();
      }
      return;
    }

    Alert.alert(
      user?.full_name || 'My Account',
      `${user?.email || 'Active Session'}\n\nWould you like to sign out?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'P';

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={[styles.logoIcon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="wallet" size={20} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {onPressFilter ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onPressFilter}
              style={[
                styles.iconButton,
                {
                  backgroundColor: activeFilterCount > 0 ? theme.primarySoft : theme.surfaceMuted,
                  borderColor: activeFilterCount > 0 ? theme.primary : theme.border,
                  borderWidth: activeFilterCount > 0 ? 1 : 0,
                },
              ]}
            >
              <Ionicons
                name="filter"
                size={18}
                color={activeFilterCount > 0 ? theme.primary : theme.textSecondary}
              />
              {activeFilterCount > 0 ? (
                <View style={[styles.headerBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.headerBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={refreshAll}
            style={[styles.iconButton, { backgroundColor: theme.surfaceMuted }]}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={isRefreshing ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAvatarPress}
            style={[styles.avatar, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.avatarText}>{userInitial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showMonthSwitcher ? (
        <View style={[styles.monthSwitcher, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={goToPreviousMonth}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.monthLabelContainer}>
            <Ionicons name="calendar-outline" size={15} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.monthLabel, { color: theme.text }]}>
              {formatMonthLabel(monthState)}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={goToNextMonth}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: Typography.weights.extrabold,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.sm,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginTop: 4,
  },
  monthArrow: {
    padding: 6,
  },
  monthLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
