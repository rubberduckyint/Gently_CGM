/**
 * Design System Typography
 * 
 * Consistent text styles and typography scales
 */

import type { TextStyle } from 'react-native';
import { colors } from './colors';

// Font weights
export const fontWeights = {
  normal: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
} as const;

// Font sizes
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

// Line heights
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// Base typography styles
export const typography = {
  // Headings
  h1: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes['4xl'] * lineHeights.tight,
    color: colors.text.primary,
  } as TextStyle,

  h2: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes['3xl'] * lineHeights.tight,
    color: colors.text.primary,
  } as TextStyle,

  h3: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes['2xl'] * lineHeights.tight,
    color: colors.text.primary,
  } as TextStyle,

  h4: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.xl * lineHeights.tight,
    color: colors.text.primary,
  } as TextStyle,

  h5: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.lg * lineHeights.normal,
    color: colors.text.primary,
  } as TextStyle,

  h6: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.base * lineHeights.normal,
    color: colors.text.primary,
  } as TextStyle,

  // Body text
  bodyLarge: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.normal,
    lineHeight: fontSizes.lg * lineHeights.normal,
    color: colors.text.primary,
  } as TextStyle,

  body: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.normal,
    lineHeight: fontSizes.base * lineHeights.normal,
    color: colors.text.primary,
  } as TextStyle,

  bodySmall: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: fontSizes.sm * lineHeights.normal,
    color: colors.text.primary,
  } as TextStyle,

  // Caption and labels
  caption: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    lineHeight: fontSizes.xs * lineHeights.normal,
    color: colors.text.secondary,
  } as TextStyle,

  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.sm * lineHeights.normal,
    color: colors.text.primary,
  } as TextStyle,

  labelLarge: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.base * lineHeights.normal,
    color: colors.text.primary,
  } as TextStyle,

  // Special variants
  subtitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.normal,
    lineHeight: fontSizes.base * lineHeights.normal,
    color: colors.text.secondary,
  } as TextStyle,

  subtitleLarge: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.normal,
    lineHeight: fontSizes.lg * lineHeights.normal,
    color: colors.text.secondary,
  } as TextStyle,

  // Button text
  buttonLarge: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.base * lineHeights.tight,
  } as TextStyle,

  button: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.sm * lineHeights.tight,
  } as TextStyle,

  buttonSmall: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.xs * lineHeights.tight,
  } as TextStyle,

  // Link text
  link: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.base * lineHeights.normal,
    color: colors.text.link,
  } as TextStyle,

  linkSmall: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.sm * lineHeights.normal,
    color: colors.text.link,
  } as TextStyle,
} as const;

// Text color variants
export const textColors = {
  primary: { color: colors.text.primary },
  secondary: { color: colors.text.secondary },
  tertiary: { color: colors.text.tertiary },
  inverse: { color: colors.text.inverse },
  link: { color: colors.text.link },
  error: { color: colors.text.error },
  success: { color: colors.text.success },
  warning: { color: colors.text.warning },
} as const;

// Text alignment utilities
export const textAlign = {
  left: { textAlign: 'left' as const },
  center: { textAlign: 'center' as const },
  right: { textAlign: 'right' as const },
} as const;
