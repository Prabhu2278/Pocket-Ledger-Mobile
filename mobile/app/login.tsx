// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Login Screen
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { api } from '../src/api/api';
import { Spacing, Radii, Typography, useResponsive } from '../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();
  const { isTablet } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      await login({ email: email.trim(), password });
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && { maxWidth: 460, alignSelf: 'center', width: '100%' },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          {/* Brand Header matching web Login.jsx */}
          <View style={styles.brandContainer}>
            <View style={[styles.brandLogoBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="receipt-outline" size={34} color={theme.primary} />
            </View>
            <View style={styles.brandTitleRow}>
              <Text style={[styles.brandTitle, { color: theme.text }]}>Pocket Ledger</Text>
              <View style={[styles.brandPill, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.brandPillText, { color: theme.primary }]}>Pro v2.4</Text>
              </View>
            </View>
            <Text style={[styles.pitchHeadline, { color: theme.text }]}>
              Master Your Wealth with Intelligent Simplicity
            </Text>
            <Text style={[styles.brandSubtitle, { color: theme.textMuted }]}>
              Manage multi-wallet balances, monitor real-time cash flows, and sync with web.
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Top Accent Gradient Bar matching screenshot */}
            <View style={[styles.topAccentBar, { backgroundColor: theme.primary }]} />

            {/* Welcome Back Pill matching web screenshot */}
            <View style={[styles.welcomePill, { backgroundColor: theme.primarySoft }]}>
              <View style={[styles.welcomeDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.welcomePillText, { color: theme.primary }]}>WELCOME BACK</Text>
            </View>

            <Text style={[styles.cardTitle, { color: theme.text }]}>Sign in to Pocket Ledger</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              Enter your credentials to access your financial dashboard.
            </Text>

            {errorMessage ? (
              <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
                <Ionicons name="alert-circle" size={18} color={theme.danger} style={{ marginRight: 6 }} />
                <Text style={[styles.errorBannerText, { color: theme.danger }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <Input
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              leftIcon={<Ionicons name="mail-outline" size={18} color={theme.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />}
            />

            <Button
              title="Sign in →"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={{ marginTop: Spacing.sm }}
            />

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={[styles.footerLink, { color: theme.primary }]}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SSL Badge matching screenshot */}
          <View style={[styles.sslBadge, { backgroundColor: theme.successSoft }]}>
            <View style={[styles.sslDot, { backgroundColor: theme.success }]} />
            <Ionicons name="shield-checkmark-outline" size={13} color={theme.success} style={{ marginRight: 4 }} />
            <Text style={[styles.sslText, { color: theme.success }]}>Bank-Grade 256-Bit SSL</Text>
          </View>

          {/* Backend Info Footer */}
          <View style={styles.backendNotice}>
            <Ionicons name="link-outline" size={14} color={theme.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.backendText, { color: theme.textMuted }]}>
              Connected to backend: {api.getBaseUrl()}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  brandLogoBox: {
    width: 72,
    height: 72,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: -0.5,
  },
  brandPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  brandPillText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  pitchHeadline: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  brandSubtitle: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
  formCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  welcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    marginBottom: Spacing.md,
  },
  welcomeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  welcomePillText: {
    fontSize: 10,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    marginTop: Spacing.lg,
  },
  sslDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  sslText: {
    fontSize: 11,
    fontWeight: Typography.weights.semibold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
  },
  footerLink: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  backendNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  backendText: {
    fontSize: Typography.sizes.xs,
  },
});
