// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Theme Types & Definitions
// ---------------------------------------------------------------------------

export type ThemeId = 'light' | 'dark';

export type ThemeMode = ThemeId;

export interface ThemeColors {
  id: ThemeId | string;
  name: string;
  isDark: boolean;
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceMuted: string;
  card: string;
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
  chartColors: string[];
  previewColor: string;
  previewBg: string;
}
