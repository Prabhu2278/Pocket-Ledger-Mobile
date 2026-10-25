import { ThemeId, ThemeColors } from '../types';
import { lightTheme } from './light';
import { darkTheme } from './dark';
import { oceanTheme } from './ocean';
import { forestTheme } from './forest';
import { sunsetTheme } from './sunset';
import { purpleTheme } from './purple';
import { roseTheme } from './rose';
import { amoledTheme } from './amoled';

export * from './light';
export * from './dark';
export * from './ocean';
export * from './forest';
export * from './sunset';
export * from './purple';
export * from './rose';
export * from './amoled';

export const ALL_THEMES: Record<Exclude<ThemeId, 'system'>, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
  ocean: oceanTheme,
  forest: forestTheme,
  sunset: sunsetTheme,
  purple: purpleTheme,
  rose: roseTheme,
  amoled: amoledTheme,
};

export const THEME_LIST: ThemeColors[] = [
  lightTheme,
  darkTheme,
  oceanTheme,
  forestTheme,
  sunsetTheme,
  purpleTheme,
  roseTheme,
  amoledTheme,
];
