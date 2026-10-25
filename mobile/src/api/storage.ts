// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Secure Storage Service
// ---------------------------------------------------------------------------
// Uses Expo SecureStore for encrypted token storage (Keychain on iOS, Keystore on Android).
// Uses AsyncStorage for non-sensitive local preferences (theme, currency).

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'pocket_ledger_auth_token';
const USER_KEY = 'pocket_ledger_auth_user';
const THEME_KEY = 'pocket_ledger_theme';
const CURRENCY_KEY = 'pocket_ledger_currency';

export const storage = {
  // 1. Secure Access Token (Encrypted on Device)
  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (err) {
      console.warn('[Storage] Error reading auth token:', err);
      return null;
    }
  },

  async setToken(token: string | null): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
        return;
      }
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (err) {
      console.warn('[Storage] Error persisting auth token:', err);
    }
  },

  // 2. User Profile Cache
  async getUser<T = any>(): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setUser<T = any>(user: T | null): Promise<void> {
    try {
      if (user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(USER_KEY);
      }
    } catch (err) {
      console.warn('[Storage] Error saving user profile:', err);
    }
  },

  // 3. Theme Preference
  async getTheme(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  },

  async setTheme(theme: string): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.warn('[Storage] Error saving theme:', err);
    }
  },

  // 4. Currency Preference
  async getCurrency(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(CURRENCY_KEY);
    } catch {
      return null;
    }
  },

  async setCurrency(code: string): Promise<void> {
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, code);
    } catch (err) {
      console.warn('[Storage] Error saving currency:', err);
    }
  },

  // 5. Clear all storage on logout
  async clearAll(): Promise<void> {
    await this.setToken(null);
    await this.setUser(null);
  },
};
