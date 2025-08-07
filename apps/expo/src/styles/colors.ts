/**
 * Design System Colors
 * 
 * Centralized color palette based on the existing app design
 * using Tailwind-inspired color scales for consistency
 */

export const colors = {
  // Primary colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Success colors
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Main success
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Error/Danger colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Gray colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Background colors
  background: {
    primary: '#f8fafc',
    secondary: '#ffffff',
    tertiary: '#f3f4f6',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text colors
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    link: '#3b82f6',
    error: '#ef4444',
    success: '#059669',
    warning: '#d97706',
  },

  // Border colors
  border: {
    light: '#f3f4f6',
    medium: '#d1d5db',
    dark: '#6b7280',
    focus: '#3b82f6',
    error: '#ef4444',
    success: '#10b981',
  },

  // Battery level colors (for devices)
  battery: {
    high: '#10b981', // green
    medium: '#f59e0b', // amber
    low: '#ef4444', // red
  },

  // Status colors (for sync status, etc.)
  status: {
    synced: '#059669',
    syncing: '#3b82f6',
    error: '#dc2626',
    pending: '#6b7280',
  },
} as const;

// Semantic color aliases for easier usage
export const semanticColors = {
  primary: colors.primary[500],
  success: colors.success[500],
  error: colors.error[500],
  warning: colors.warning[500],
  background: colors.background.primary,
  surface: colors.background.secondary,
  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  borderDefault: colors.border.medium,
} as const;
