import { ThemeColors } from '../types';

export const forestTheme: ThemeColors = {
  id: 'forest',
  name: 'Forest Green',
  isDark: true,
  background: '#071711',      // Deep pine shadow
  surface: '#0f291e',         // Rich evergreen moss surface
  surfaceHover: '#173a2b',
  surfaceMuted: '#123124',
  card: '#0f291e',
  text: '#f0fdf4',            // Pale mint white
  textSecondary: '#bbf7d0',   // Sage secondary
  textMuted: '#86efac',       // Muted foliage green
  border: '#1a4734',          // Deep moss border
  borderSubtle: '#143829',
  primary: '#10b981',         // Luminous forest emerald
  primaryHover: '#059669',
  primarySoft: 'rgba(16, 185, 129, 0.20)',
  onPrimary: '#ffffff',
  success: '#34d399',         // Vibrant mint
  successSoft: 'rgba(52, 211, 153, 0.18)',
  danger: '#fb7185',          // Rosewood red
  dangerSoft: 'rgba(251, 113, 133, 0.18)',
  warning: '#fbbf24',         // Golden sunlight amber
  warningSoft: 'rgba(251, 191, 36, 0.18)',
  info: '#2dd4bf',            // Pine lake teal
  infoSoft: 'rgba(45, 212, 191, 0.18)',
  tabBar: '#0a2017',
  tabBarBorder: '#1a4734',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
  inputBg: '#123124',
  chartColors: ['#10b981', '#34d399', '#fbbf24', '#fb7185', '#2dd4bf', '#86efac'],
  previewColor: '#10b981',
  previewBg: '#071711',
};
