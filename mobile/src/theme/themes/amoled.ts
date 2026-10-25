import { ThemeColors } from '../types';

export const amoledTheme: ThemeColors = {
  id: 'amoled',
  name: 'AMOLED Black',
  isDark: true,
  background: '#000000',      // True 100% pitch black for zero OLED power draw
  surface: '#0a0a0a',         // Ultra-dark minimal surface
  surfaceHover: '#141414',
  surfaceMuted: '#121212',
  card: '#0a0a0a',
  text: '#ffffff',            // Maximum contrast pure white
  textSecondary: '#a3a3a3',   // Neutral 400
  textMuted: '#737373',       // Neutral 500
  border: '#262626',          // Crisp high-definition border
  borderSubtle: '#171717',
  primary: '#6366f1',         // Neon electric indigo
  primaryHover: '#818cf8',
  primarySoft: 'rgba(99, 102, 241, 0.20)',
  onPrimary: '#ffffff',
  success: '#22c55e',         // Electric neon green
  successSoft: 'rgba(34, 197, 94, 0.18)',
  danger: '#ef4444',          // Pure signal red
  dangerSoft: 'rgba(239, 68, 68, 0.18)',
  warning: '#eab308',         // Laser yellow
  warningSoft: 'rgba(234, 179, 8, 0.18)',
  info: '#38bdf8',            // Cyan signal
  infoSoft: 'rgba(56, 189, 248, 0.18)',
  tabBar: '#000000',          // Seamless bottom edge
  tabBarBorder: '#262626',
  cardShadow: 'rgba(0, 0, 0, 0.90)',
  inputBg: '#0f0f0f',
  chartColors: ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#38bdf8'],
  previewColor: '#6366f1',
  previewBg: '#000000',
};
