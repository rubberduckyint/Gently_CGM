/**
 * Design System Spacing
 * 
 * Consistent spacing scale based on a 4px grid system
 */

// Base spacing unit (4px)
const baseUnit = 4;

// Spacing scale
export const spacing = {
  0: 0,
  1: baseUnit * 1, // 4px
  2: baseUnit * 2, // 8px
  3: baseUnit * 3, // 12px
  4: baseUnit * 4, // 16px
  5: baseUnit * 5, // 20px
  6: baseUnit * 6, // 24px
  7: baseUnit * 7, // 28px
  8: baseUnit * 8, // 32px
  10: baseUnit * 10, // 40px
  12: baseUnit * 12, // 48px
  16: baseUnit * 16, // 64px
  20: baseUnit * 20, // 80px
  24: baseUnit * 24, // 96px
  32: baseUnit * 32, // 128px
} as const;

// Semantic spacing aliases
export const semanticSpacing = {
  xs: spacing[1], // 4px
  sm: spacing[2], // 8px
  md: spacing[4], // 16px
  lg: spacing[6], // 24px
  xl: spacing[8], // 32px
  '2xl': spacing[12], // 48px
  '3xl': spacing[16], // 64px
} as const;

// Margin utilities
export const margin = {
  m: (value: keyof typeof spacing) => ({ margin: spacing[value] }),
  mt: (value: keyof typeof spacing) => ({ marginTop: spacing[value] }),
  mb: (value: keyof typeof spacing) => ({ marginBottom: spacing[value] }),
  ml: (value: keyof typeof spacing) => ({ marginLeft: spacing[value] }),
  mr: (value: keyof typeof spacing) => ({ marginRight: spacing[value] }),
  mx: (value: keyof typeof spacing) => ({ 
    marginLeft: spacing[value], 
    marginRight: spacing[value] 
  }),
  my: (value: keyof typeof spacing) => ({ 
    marginTop: spacing[value], 
    marginBottom: spacing[value] 
  }),
} as const;

// Padding utilities
export const padding = {
  p: (value: keyof typeof spacing) => ({ padding: spacing[value] }),
  pt: (value: keyof typeof spacing) => ({ paddingTop: spacing[value] }),
  pb: (value: keyof typeof spacing) => ({ paddingBottom: spacing[value] }),
  pl: (value: keyof typeof spacing) => ({ paddingLeft: spacing[value] }),
  pr: (value: keyof typeof spacing) => ({ paddingRight: spacing[value] }),
  px: (value: keyof typeof spacing) => ({ 
    paddingLeft: spacing[value], 
    paddingRight: spacing[value] 
  }),
  py: (value: keyof typeof spacing) => ({ 
    paddingTop: spacing[value], 
    paddingBottom: spacing[value] 
  }),
} as const;

// Gap utilities for flexbox
export const gap = {
  gap: (value: keyof typeof spacing) => ({ gap: spacing[value] }),
  rowGap: (value: keyof typeof spacing) => ({ rowGap: spacing[value] }),
  columnGap: (value: keyof typeof spacing) => ({ columnGap: spacing[value] }),
} as const;

// Border radius scale
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

// Border utilities
export const border = {
  radius: (value: keyof typeof borderRadius) => ({ borderRadius: borderRadius[value] }),
  radiusTop: (value: keyof typeof borderRadius) => ({
    borderTopLeftRadius: borderRadius[value],
    borderTopRightRadius: borderRadius[value],
  }),
  radiusBottom: (value: keyof typeof borderRadius) => ({
    borderBottomLeftRadius: borderRadius[value],
    borderBottomRightRadius: borderRadius[value],
  }),
  radiusLeft: (value: keyof typeof borderRadius) => ({
    borderTopLeftRadius: borderRadius[value],
    borderBottomLeftRadius: borderRadius[value],
  }),
  radiusRight: (value: keyof typeof borderRadius) => ({
    borderTopRightRadius: borderRadius[value],
    borderBottomRightRadius: borderRadius[value],
  }),
} as const;
