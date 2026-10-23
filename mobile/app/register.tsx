// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Registration Screen
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { api } from '../src/services/api';
import { Spacing, Radii, Typography } from '../src/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      await register({ name: name.trim(), email: email.trim(), password });
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed. Please try again.');
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header matching web Register.jsx */}
          <View style={styles.brandContainer}>
            <View style={[styles.brandLogoBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="receipt-outline" size={32} color={theme.primary} />
            </View>
            <View style={styles.brandTitleRow}>
              <Text style={[styles.brandTitle, { color: theme.text }]}>Pocket Ledger</Text>
              <View style={[styles.brandPill, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.brandPillText, { color: theme.primary }]}>Pro v2.4</Text>
              </View>
            </View>
            <Text style={[styles.pitchHeadline, { color: theme.text }]}>
              Create Your Ledger Account
            </Text>
            <Text style={[styles.brandSubtitle, { color: theme.textMuted }]}>
              Start tracking multi-wallet balances and synchronized transactions.
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
            {errorMessage ? (
              <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
                <Ionicons name="alert-circle" size={18} color={theme.danger} style={{ marginRight: 6 }} />
                <Text style={[styles.errorBannerText, { color: theme.danger }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <Input
              label="Full Name"
              placeholder="e.g. Prabhu"
              value={name}
              onChangeText={setName}
              leftIcon={<Ionicons name="person-outline" size={18} color={theme.textMuted} />}
            />

            <Input
              label="Email Address"
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
              placeholder="Minimum 6 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />}
            />

            <Input
              label="Confirm Password"
              placeholder="Repeat your password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              leftIcon={<Ionicons name="checkmark-done-outline" size={18} color={theme.textMuted} />}
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              style={{ marginTop: Spacing.sm }}
            />

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={[styles.footerLink, { color: theme.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Backend Notice */}
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
    marginBottom: Spacing.xl,
  },
  brandLogoBox: {
    width: 64,
    height: 64,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
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
