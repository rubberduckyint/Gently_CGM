/**
 * Accessible Layout Styles
 *
 * Layout utilities and styles designed for accessibility,
 * particularly for users with large font settings.
 *
 * Key principles:
 * 1. Layouts should reflow gracefully when text is large
 * 2. Text should never be cut off - always allow wrapping
 * 3. Touch targets remain accessible (min 44x44)
 * 4. Spacing increases proportionally with font scale
 */

import type { TextStyle, ViewStyle } from "react-native";

/**
 * Styles for containers that hold text
 * Ensures text can wrap properly and containers can shrink
 */
export const textContainerStyles: ViewStyle = {
  flex: 1,
  flexShrink: 1,
  minWidth: 0, // Critical for flex shrinking to work
};

/**
 * Styles for row layouts that may need to stack
 * Use with useResponsive().getAdaptiveLayout() for dynamic stacking
 */
export const adaptiveRowStyles: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
};

/**
 * Minimum touch target size for buttons and interactive elements
 */
export const minTouchTargetStyles: ViewStyle = {
  minWidth: 44,
  minHeight: 44,
};

/**
 * Text styles that ensure proper overflow handling
 */
export const safeTextStyles: TextStyle = {
  flexShrink: 1,
  flexWrap: "wrap",
};

/**
 * Card styles optimized for accessibility
 */
export const accessibleCardStyles: ViewStyle = {
  // Flexible padding that works with scaled content
  paddingVertical: 16,
  paddingHorizontal: 16,
  // Ensure content can expand
  minHeight: 60,
};

/**
 * List item styles for accessibility
 */
export const accessibleListItemStyles: ViewStyle = {
  minHeight: 48, // Minimum for comfortable tapping
  paddingVertical: 12,
  paddingHorizontal: 16,
  flexDirection: "row",
  alignItems: "center",
};

/**
 * Icon container that scales with font
 * Use with getIconSize() from useResponsive
 */
export const scalingIconContainerStyles: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0, // Icons shouldn't shrink
};

/**
 * Styles for labels/titles in form-like layouts
 */
export const accessibleLabelStyles: ViewStyle = {
  marginBottom: 8,
  flexShrink: 0,
};

/**
 * Styles for values/content in form-like layouts
 */
export const accessibleValueStyles: ViewStyle = {
  flex: 1,
  flexShrink: 1,
  minWidth: 0,
};

/**
 * Header section styles that adapt to large text
 */
export const accessibleHeaderStyles: ViewStyle = {
  paddingVertical: 16,
  paddingHorizontal: 20,
  minHeight: 56,
};

/**
 * Button container styles for accessibility
 */
export const accessibleButtonStyles: ViewStyle = {
  minHeight: 48,
  paddingVertical: 12,
  paddingHorizontal: 24,
  alignItems: "center",
  justifyContent: "center",
};

/**
 * Styles for toggle/switch rows
 */
export const accessibleToggleRowStyles: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: 56,
  paddingVertical: 12,
  gap: 16,
};

/**
 * Styles for the label section of toggle rows
 * Allows text to wrap when needed
 */
export const accessibleToggleLabelStyles: ViewStyle = {
  flex: 1,
  flexShrink: 1,
  minWidth: 0,
  paddingRight: 8,
};

/**
 * Separator/divider styles
 */
export const accessibleDividerStyles: ViewStyle = {
  height: 1,
  backgroundColor: "#E5E7EB",
  marginVertical: 8,
};

/**
 * Screen container with proper safe areas
 */
export const accessibleScreenStyles: ViewStyle = {
  flex: 1,
  backgroundColor: "#FFFFFF",
};

/**
 * Scrollable content area styles
 */
export const accessibleScrollContentStyles: ViewStyle = {
  flexGrow: 1,
  paddingHorizontal: 16,
  paddingBottom: 24,
};

/**
 * Helper to create accessible spacing
 * Multiply these values by fontScale for proportional spacing
 */
export const accessibleSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
