// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Design System & Theme Tokens
// ---------------------------------------------------------------------------

export * from './types';
export * from './themes';
export * from './responsive';

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
