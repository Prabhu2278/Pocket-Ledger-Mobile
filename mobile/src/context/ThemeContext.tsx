// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Multi-Theme & Responsive Context
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import {
  ThemeColors,
  ThemeId,
  ThemeMode,
  ALL_THEMES,
  THEME_LIST,
  lightTheme,
  darkTheme,
} from '../theme';
import { storage } from '../api/storage';

interface ThemeContextValue {
  themeId: ThemeId;
  themeMode: ThemeMode;
  theme: ThemeColors;
  isDark: boolean;
  themes: ThemeColors[];
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeId, setThemeIdState] = useState<ThemeId>('system');

  useEffect(() => {
    async function loadSavedTheme() {
      const saved = await storage.getTheme();
      if (saved && (saved === 'system' || saved in ALL_THEMES)) {
        setThemeIdState(saved as ThemeId);
      }
    }
    loadSavedTheme();
  }, []);

  const setThemeId = useCallback(async (id: ThemeId) => {
    setThemeIdState(id);
    await storage.setTheme(id);
  }, []);

  const setThemeMode = setThemeId;

  // Resolve active theme colors
  let activeTheme: ThemeColors;
  if (themeId === 'system') {
    activeTheme = systemScheme === 'dark' ? darkTheme : lightTheme;
  } else if (themeId in ALL_THEMES) {
    activeTheme = ALL_THEMES[themeId as keyof typeof ALL_THEMES];
  } else {
    activeTheme = systemScheme === 'dark' ? darkTheme : lightTheme;
  }

  const isDark = activeTheme.isDark;

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeId = isDark ? 'light' : 'dark';
    setThemeId(nextTheme);
  }, [isDark, setThemeId]);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        themeMode: themeId,
        theme: activeTheme,
        isDark,
        themes: THEME_LIST,
        toggleTheme,
        setThemeMode,
        setThemeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
