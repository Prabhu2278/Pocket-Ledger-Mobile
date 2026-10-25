import { ThemeColors } from '../types';

export const sunsetTheme: ThemeColors = {
  id: 'sunset',
  name: 'Sunset Orange',
  isDark: true,
  background: '#140c14',      // Deep twilight obsidian
  surface: '#241424',         // Volcanic dusky plum
  surfaceHover: '#331d33',
  surfaceMuted: '#2b182b',
  card: '#241424',
  text: '#fff7ed',            // Warm golden cream
  textSecondary: '#fed7aa',   // Soft apricot secondary
  textMuted: '#fdba74',       // Warm terracotta muted
  border: '#3d223d',          // Twilight border
  borderSubtle: '#301b30',
  primary: '#f97316',         // Radiant sunset tangerine
  primaryHover: '#ea580c',
  primarySoft: 'rgba(249, 115, 22, 0.20)',
  onPrimary: '#ffffff',
  success: '#10b981',         // Oasis emerald
  successSoft: 'rgba(16, 185, 129, 0.18)',
  danger: '#ef4444',          // Crimson flare
  dangerSoft: 'rgba(239, 68, 68, 0.18)',
  warning: '#f59e0b',         // Solar gold
  warningSoft: 'rgba(245, 158, 11, 0.18)',
  info: '#fb923c',            // Desert sunset glow
  infoSoft: 'rgba(251, 146, 60, 0.18)',
  tabBar: '#1b0f1b',
  tabBarBorder: '#3d223d',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
  inputBg: '#2b182b',
  chartColors: ['#f97316', '#10b981', '#f59e0b', '#ef4444', '#fb923c', '#e11d48'],
  previewColor: '#f97316',
  previewBg: '#140c14',
};
