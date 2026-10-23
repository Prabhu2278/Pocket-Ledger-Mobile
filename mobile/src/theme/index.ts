// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Design System & Theme Tokens
// ---------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  tabBar: string;
  tabBarBorder: string;
  cardShadow: string;
  inputBg: string;
}

export const lightTheme: ThemeColors = {
  background: '#f8fafc',      // Clean slate/light-blue background
  surface: '#ffffff',         // Crisp white cards
  surfaceHover: '#f1f5f9',
  surfaceMuted: '#f1f5f9',
  text: '#0f172a',            // High contrast navy text
  textSecondary: '#334155',   // Slate secondary text
  textMuted: '#64748b',       // Muted gray
  border: '#e2e8f0',          // Subtle border
  borderSubtle: '#f1f5f9',
  primary: '#4f46e5',         // Indigo / Royal Blue primary
  primaryHover: '#4338ca',
  primarySoft: '#eef2ff',
  onPrimary: '#ffffff',
  success: '#15803d',         // Forest emerald for income and positive balance
  successSoft: '#dcfce7',
  danger: '#b91c1c',          // Crimson for expenses
  dangerSoft: '#fee2e2',
  warning: '#b45309',         // Amber for warnings
  warningSoft: '#fef3c7',
  info: '#2563eb',            // Sapphire for transfers/info
  infoSoft: '#dbeafe',
  tabBar: '#ffffff',
  tabBarBorder: '#e2e8f0',
  cardShadow: 'rgba(15, 23, 42, 0.06)',
  inputBg: '#ffffff',
};

export const darkTheme: ThemeColors = {
  background: '#0a0e17',      // Midnight deep dark background
  surface: '#131926',         // Deep slate card surface
  surfaceHover: '#1b2334',
  surfaceMuted: '#172033',
  text: '#f8fafc',            // Light crisp text
  textSecondary: '#94a3b8',   // Slate secondary
  textMuted: '#64748b',
  border: '#1e293e',          // Dark subtle border
  borderSubtle: '#192233',
  primary: '#818cf8',         // Radiant indigo accent
  primaryHover: '#99a1f9',
  primarySoft: 'rgba(129, 140, 248, 0.16)',
  onPrimary: '#0b0f17',
  success: '#34d399',         // Glowing mint for income
  successSoft: 'rgba(52, 211, 153, 0.16)',
  danger: '#f87171',          // Coral red for expenses
  dangerSoft: 'rgba(248, 113, 113, 0.16)',
  warning: '#fbbf24',         // Warm amber
  warningSoft: 'rgba(251, 191, 36, 0.16)',
  info: '#60a5fa',
  infoSoft: 'rgba(96, 165, 250, 0.16)',
  tabBar: '#101522',
  tabBarBorder: '#1e293e',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
  inputBg: '#172033',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
};

export const Typography = {
  fontFamily: undefined, // Uses native system font (San Francisco on iOS, Roboto on Android)
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};
