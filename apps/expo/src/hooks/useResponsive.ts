/**
 * Responsive Design Hook
 *
 * Provides utilities for responsive layouts that adapt to:
 * - Screen size (small phones, tablets, etc.)
 * - User's font scale settings (accessibility)
 * - Device pixel ratio
 *
 * Key principles for large font accessibility:
 * 1. Cap extremely large font scales to prevent UI breaking
 * 2. Allow layouts to reflow (vertical stacking) when text is large
 * 3. Increase spacing proportionally with font scale
 * 4. Ensure touch targets remain accessible (min 44x44)
 */

import type { ViewStyle } from "react-native";
import { PixelRatio, useWindowDimensions } from "react-native";

// Minimum touch target size for accessibility (Apple HIG)
const MIN_TOUCH_TARGET = 44;

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  // Screen size breakpoints (similar to Tailwind)
  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  };

  // Determine current screen size category
  const isSmall = width < breakpoints.sm;
  const isMedium = width >= breakpoints.sm && width < breakpoints.md;
  const isLarge = width >= breakpoints.md && width < breakpoints.lg;
  const isExtraLarge = width >= breakpoints.lg;

  // Font scale thresholds for layout decisions
  const isLargeText = fontScale > 1.2;
  const isVeryLargeText = fontScale > 1.5;
  const isExtremeText = fontScale > 2.0;

  // Scale value based on screen width (useful for icons, spacing)
  const scaleWidth = (size: number) => {
    const baseWidth = 375; // iPhone SE width as base
    return (width / baseWidth) * size;
  };

  // Scale value based on screen height
  const scaleHeight = (size: number) => {
    const baseHeight = 667; // iPhone SE height as base
    return (height / baseHeight) * size;
  };

  // Get font size that respects user's font scale but caps it
  // This prevents extremely large text from breaking layouts
  const getFontSize = (baseSize: number, maxScale = 1.5) => {
    const cappedScale = Math.min(fontScale, maxScale);
    return baseSize * cappedScale;
  };

  // Get spacing that adapts to font scale
  // Larger text needs more breathing room
  const getSpacing = (baseSpacing: number) => {
    if (isExtremeText) {
      return baseSpacing * 1.3;
    }
    if (isVeryLargeText) {
      return baseSpacing * 1.2;
    }
    if (isLargeText) {
      return baseSpacing * 1.1;
    }
    return baseSpacing;
  };

  // Get icon size that adapts to font scale
  // Icons scale at 50% of font scale rate
  const getIconSize = (baseSize: number) => {
    const scaleFactor = 1 + (fontScale - 1) * 0.5;
    return Math.round(baseSize * Math.min(scaleFactor, 1.5));
  };

  // Get minimum touch target size
  // Ensures interactive elements remain accessible
  const getTouchTarget = (baseSize: number) => {
    return Math.max(baseSize, MIN_TOUCH_TARGET);
  };

  // Get container padding that increases with font scale
  const getContainerPadding = (basePadding: number) => {
    if (isVeryLargeText) {
      return basePadding * 1.25;
    }
    if (isLargeText) {
      return basePadding * 1.1;
    }
    return basePadding;
  };

  /**
   * Get layout style that switches from horizontal to vertical
   * when font scale is very large to prevent text overflow
   */
  const getAdaptiveLayout = (options?: {
    threshold?: number;
    gap?: number;
  }): ViewStyle => {
    const threshold = options?.threshold ?? 1.5;
    const gap = options?.gap ?? 8;
    const shouldStack = fontScale > threshold;

    return {
      flexDirection: shouldStack ? "column" : "row",
      alignItems: shouldStack ? "flex-start" : "center",
      gap: getSpacing(gap),
    };
  };

  /**
   * Get text container style that allows proper wrapping
   */
  const getTextContainerStyle = (): ViewStyle => {
    return {
      flex: 1,
      flexShrink: 1,
      minWidth: 0, // Allows flex items to shrink below content size
    };
  };

  /**
   * Get card style that adapts padding for large text
   */
  const getCardPadding = (basePadding: number) => {
    if (isExtremeText) {
      return basePadding * 1.4;
    }
    if (isVeryLargeText) {
      return basePadding * 1.25;
    }
    if (isLargeText) {
      return basePadding * 1.1;
    }
    return basePadding;
  };

  /**
   * Determine if an element should be hidden at very large text sizes
   * Use sparingly - only for decorative elements
   */
  const shouldHideDecorativeElement = () => {
    return isExtremeText;
  };

  /**
   * Get button height that scales with text
   */
  const getButtonHeight = (baseHeight: number) => {
    const scaledHeight = baseHeight * Math.min(fontScale, 1.3);
    return Math.max(scaledHeight, MIN_TOUCH_TARGET);
  };

  return {
    // Screen dimensions
    width,
    height,
    fontScale,

    // Screen size checks
    isSmall,
    isMedium,
    isLarge,
    isExtraLarge,

    // Font scale checks
    isLargeText,
    isVeryLargeText,
    isExtremeText,

    // Scaling functions
    scaleWidth,
    scaleHeight,
    getFontSize,
    getSpacing,
    getIconSize,
    getTouchTarget,
    getContainerPadding,
    getCardPadding,
    getButtonHeight,

    // Layout helpers
    getAdaptiveLayout,
    getTextContainerStyle,
    shouldHideDecorativeElement,

    // Device info
    pixelRatio: PixelRatio.get(),
    fontScaleRounded: Math.round(fontScale * 100) / 100,
  };
}
