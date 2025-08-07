/**
 * Design System Components
 * 
 * Reusable component styles for buttons, inputs, cards, etc.
 */

import type { ViewStyle, TextStyle } from 'react-native';
import { colors } from './colors';
import { typography, fontWeights } from './typography';
import { spacing, borderRadius } from './spacing';

// Button styles
export const buttons = {
  // Base button styles
  base: {
    paddingVertical: spacing[3], // 12px
    paddingHorizontal: spacing[4], // 16px
    borderRadius: borderRadius.lg, // 8px
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  } as ViewStyle,

  // Button sizes
  small: {
    paddingVertical: spacing[2], // 8px
    paddingHorizontal: spacing[3], // 12px
    borderRadius: borderRadius.md, // 6px
  } as ViewStyle,

  medium: {
    paddingVertical: spacing[3], // 12px
    paddingHorizontal: spacing[4], // 16px
    borderRadius: borderRadius.lg, // 8px
  } as ViewStyle,

  large: {
    paddingVertical: spacing[4], // 16px
    paddingHorizontal: spacing[6], // 24px
    borderRadius: borderRadius.lg, // 8px
  } as ViewStyle,

  // Button variants
  primary: {
    backgroundColor: colors.primary[500],
  } as ViewStyle,

  secondary: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.medium,
  } as ViewStyle,

  success: {
    backgroundColor: colors.success[500],
  } as ViewStyle,

  error: {
    backgroundColor: colors.error[500],
  } as ViewStyle,

  warning: {
    backgroundColor: colors.warning[500],
  } as ViewStyle,

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.medium,
  } as ViewStyle,

  ghost: {
    backgroundColor: 'transparent',
  } as ViewStyle,

  // Button states
  disabled: {
    opacity: 0.6,
  } as ViewStyle,

  loading: {
    opacity: 0.8,
  } as ViewStyle,
} as const;

// Button text styles
export const buttonText = {
  primary: {
    ...typography.button,
    color: colors.text.inverse,
  } as TextStyle,

  secondary: {
    ...typography.button,
    color: colors.text.primary,
  } as TextStyle,

  success: {
    ...typography.button,
    color: colors.text.inverse,
  } as TextStyle,

  error: {
    ...typography.button,
    color: colors.text.inverse,
  } as TextStyle,

  warning: {
    ...typography.button,
    color: colors.text.inverse,
  } as TextStyle,

  outline: {
    ...typography.button,
    color: colors.text.primary,
  } as TextStyle,

  ghost: {
    ...typography.button,
    color: colors.text.link,
  } as TextStyle,

  small: {
    ...typography.buttonSmall,
  } as TextStyle,

  large: {
    ...typography.buttonLarge,
  } as TextStyle,
} as const;

// Input styles
export const inputs = {
  container: {
    marginBottom: spacing[6], // 24px
  } as ViewStyle,

  label: {
    ...typography.label,
    marginBottom: spacing[2], // 8px
    color: colors.text.primary,
  } as TextStyle,

  base: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[4], // 16px
    paddingVertical: spacing[3], // 12px
    borderRadius: borderRadius.lg, // 8px
    fontSize: 16,
    color: colors.text.primary,
  } as TextStyle,

  focused: {
    borderColor: colors.border.focus,
    borderWidth: 2,
  } as ViewStyle,

  error: {
    borderColor: colors.border.error,
  } as ViewStyle,

  success: {
    borderColor: colors.border.success,
  } as ViewStyle,

  disabled: {
    backgroundColor: colors.gray[100],
    color: colors.text.tertiary,
  } as ViewStyle,

  // Input variants
  large: {
    paddingVertical: spacing[4], // 16px
    fontSize: 18,
  } as ViewStyle,

  small: {
    paddingVertical: spacing[2], // 8px
    fontSize: 14,
  } as ViewStyle,
} as const;

// Card styles
export const cards = {
  base: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg, // 8px
    padding: spacing[4], // 16px
    marginBottom: spacing[4], // 16px
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  large: {
    padding: spacing[6], // 24px
    marginBottom: spacing[6], // 24px
    borderRadius: borderRadius.xl, // 12px
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,

  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  bordered: {
    borderWidth: 1,
    borderColor: colors.border.light,
  } as ViewStyle,

  interactive: {
    borderWidth: 1,
    borderColor: colors.border.light,
  } as ViewStyle,

  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  } as ViewStyle,
} as const;

// Avatar styles
export const avatars = {
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
  } as ViewStyle,

  small: {
    width: 32,
    height: 32,
  } as ViewStyle,

  medium: {
    width: 48,
    height: 48,
  } as ViewStyle,

  large: {
    width: 64,
    height: 64,
  } as ViewStyle,

  text: {
    color: colors.text.inverse,
    fontWeight: fontWeights.semibold,
  } as TextStyle,

  textSmall: {
    fontSize: 12,
  } as TextStyle,

  textMedium: {
    fontSize: 16,
  } as TextStyle,

  textLarge: {
    fontSize: 20,
  } as TextStyle,
} as const;

// Badge/Tag styles
export const badges = {
  base: {
    paddingHorizontal: spacing[2], // 8px
    paddingVertical: spacing[1], // 4px
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  primary: {
    backgroundColor: colors.primary[100],
  } as ViewStyle,

  success: {
    backgroundColor: colors.success[100],
  } as ViewStyle,

  error: {
    backgroundColor: colors.error[100],
  } as ViewStyle,

  warning: {
    backgroundColor: colors.warning[100],
  } as ViewStyle,

  gray: {
    backgroundColor: colors.gray[100],
  } as ViewStyle,

  text: {
    ...typography.caption,
    fontWeight: fontWeights.medium,
  } as TextStyle,

  textPrimary: {
    color: colors.primary[700],
  } as TextStyle,

  textSuccess: {
    color: colors.success[700],
  } as TextStyle,

  textError: {
    color: colors.error[700],
  } as TextStyle,

  textWarning: {
    color: colors.warning[700],
  } as TextStyle,

  textGray: {
    color: colors.gray[700],
  } as TextStyle,
} as const;

// List item styles
export const listItems = {
  container: {
    paddingVertical: spacing[3], // 12px
    paddingHorizontal: spacing[4], // 16px
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  } as ViewStyle,

  content: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,

  title: {
    ...typography.body,
    fontWeight: fontWeights.medium,
  } as TextStyle,

  subtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing[1], // 4px
  } as TextStyle,

  trailing: {
    marginLeft: 'auto',
  } as ViewStyle,

  interactive: {
    backgroundColor: colors.gray[50],
  } as ViewStyle,
} as const;
