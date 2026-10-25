// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Responsive Engine & Layout Hooks
// ---------------------------------------------------------------------------

import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

export type Breakpoint = 'smallPhone' | 'phone' | 'largePhone' | 'tablet';

// Baseline width for reference (Standard iPhone 375pt)
const BASELINE_WIDTH = 375;
const BASELINE_HEIGHT = 812;

export interface ResponsiveValues {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isSmallPhone: boolean;
  isPhone: boolean;
  isLargePhone: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  scale: (size: number, factor?: number) => number;
  fontScale: (size: number) => number;
  horizontalPadding: number;
  contentMaxWidth: number;
  columns: number;
  cardWidth: (spacing?: number) => number | string;
}

/**
 * Calculates adaptive scaling with moderate dampening
 */
export function getResponsiveValues(width: number, height: number): ResponsiveValues {
  const isLandscape = width > height;
  const isPortrait = !isLandscape;
  
  // Use the smaller dimension for device classification to handle orientation changes gracefully
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);

  const isSmallPhone = minDimension < 360;
  const isTablet = minDimension >= 768;
  const isLargePhone = !isTablet && minDimension >= 414;
  const isPhone = !isSmallPhone && !isLargePhone && !isTablet;

  let breakpoint: Breakpoint = 'phone';
  if (isSmallPhone) breakpoint = 'smallPhone';
  else if (isTablet) breakpoint = 'tablet';
  else if (isLargePhone) breakpoint = 'largePhone';

  // Responsive scale factor with moderate dampening
  const scale = (size: number, factor: number = 0.5): number => {
    const scaleRatio = width / BASELINE_WIDTH;
    const newSize = size + (size * scaleRatio - size) * factor;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  };

  // Safe font scaling (clamped to prevent layout breaking from extreme OS settings)
  const fontScale = (size: number): number => {
    const fontFactor = PixelRatio.getFontScale();
    const clampedFontFactor = Math.min(Math.max(fontFactor, 0.85), 1.3);
    const scaled = size * clampedFontFactor;
    return Math.round(PixelRatio.roundToNearestPixel(scaled));
  };

  // Adaptive horizontal padding
  let horizontalPadding = 16;
  if (isSmallPhone) horizontalPadding = 12;
  else if (isLargePhone) horizontalPadding = 20;
  else if (isTablet) horizontalPadding = Math.max(24, Math.round((width - 760) / 2));

  // Maximum content width constraint on tablets/desktops
  const contentMaxWidth = isTablet ? 760 : width;

  // Multi-column layout decisions (e.g. 2 columns for wallets or stat cards on tablet / landscape)
  const columns = isTablet || (isLandscape && width >= 600) ? 2 : 1;

  const cardWidth = (spacing: number = 16): number | string => {
    if (columns > 1) {
      // 2 columns
      const availableWidth = isTablet ? 760 : width - horizontalPadding * 2;
      return Math.floor((availableWidth - spacing) / 2);
    }
    return '100%';
  };

  return {
    width,
    height,
    breakpoint,
    isSmallPhone,
    isPhone,
    isLargePhone,
    isTablet,
    isLandscape,
    isPortrait,
    scale,
    fontScale,
    horizontalPadding,
    contentMaxWidth,
    columns,
    cardWidth,
  };
}

/**
 * Real-time reactive hook updating on rotation, resizing, or screen change
 */
export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();
  return getResponsiveValues(width, height);
}
