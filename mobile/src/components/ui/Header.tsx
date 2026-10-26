// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Top Header with Month Navigator
// ---------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatMonthLabel } from '../../utils/dateUtils';
import { Spacing, Radii, Typography, useResponsive } from '../../theme';

import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CustomAlertDialog } from '../modals/CustomAlertDialog';
import { MonthPickerModal } from '../modals/MonthPickerModal';

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
  const { theme, isDark } = useTheme();
  const { isSmallPhone, isTablet, contentMaxWidth } = useResponsive();
  const { monthState, setMonthState, goToPreviousMonth, goToNextMonth } = useApp();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [logoutLoading, setLogoutLoading] = React.useState(false);
  const [showMonthPicker, setShowMonthPicker] = React.useState(false);

  const handleAvatarPress = () => {
    setShowLogoutConfirm(true);
  };

  const doLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      setShowLogoutConfirm(false);
      router.replace('/login');
    } catch (err: any) {
      setShowLogoutConfirm(false);
    } finally {
      setLogoutLoading(false);
    }
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'P';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderBottomColor: theme.border },
        isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoIcon}
          >
            <Ionicons name="receipt-outline" size={20} color="#ffffff" />
          </LinearGradient>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAvatarPress}
          >
            <LinearGradient
              colors={['#4f46e5', '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{userInitial}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {showMonthSwitcher ? (
        <View
          style={[
            styles.monthSwitcher,
            {
              backgroundColor: isDark ? '#141c2e' : '#eef2ff',
              borderColor: isDark ? '#24304f' : '#c7d2fe',
              borderWidth: 1,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={goToPreviousMonth}
            style={[
              styles.monthArrow,
              isDark
                ? { backgroundColor: '#1c2538', borderRadius: Radii.sm }
                : { backgroundColor: '#ffffff', shadowColor: '#4f46e5', shadowOpacity: 0.1, shadowRadius: 3, elevation: 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={17} color={isDark ? '#818cf8' : '#4f46e5'} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowMonthPicker(true)}
            style={styles.monthLabelContainer}
            accessibilityRole="button"
            accessibilityLabel="Select Month & Year"
          >
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.22)' : '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
              <Ionicons name="calendar-outline" size={14} color={isDark ? '#818cf8' : '#4f46e5'} />
            </View>
            <Text style={[styles.monthLabel, { color: isDark ? '#f8fafc' : '#312e81', fontWeight: '800' }]}>
              {formatMonthLabel(monthState)}
            </Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={isDark ? '#818cf8' : '#6366f1'}
              style={{ marginLeft: 4, opacity: 0.85 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={goToNextMonth}
            style={[
              styles.monthArrow,
              isDark
                ? { backgroundColor: '#1c2538', borderRadius: Radii.sm }
                : { backgroundColor: '#ffffff', shadowColor: '#4f46e5', shadowOpacity: 0.1, shadowRadius: 3, elevation: 1 },
            ]}
          >
            <Ionicons name="chevron-forward" size={17} color={isDark ? '#818cf8' : '#4f46e5'} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Interactive Month & Year Calendar Picker Modal */}
      <MonthPickerModal
        isOpen={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        currentYear={monthState.year}
        currentMonth={monthState.month}
        onSelectMonth={(year, month) => {
          setMonthState({ year, month });
        }}
      />

      {/* Styled Sign Out Confirmation Dialog */}
      <CustomAlertDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        type="danger"
        icon="log-out-outline"
        title={user?.full_name || 'My Account'}
        subtitle={user?.email || 'Active Session'}
        message="Would you like to sign out of Pocket Ledger?"
        secondaryButton={{
          text: 'Cancel',
          onPress: () => setShowLogoutConfirm(false),
        }}
        primaryButton={{
          text: 'Sign Out',
          variant: 'danger',
          loading: logoutLoading,
          onPress: doLogout,
        }}
      />
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
