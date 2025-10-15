/**
 * Responsive Design Hook
 *
 * Provides utilities for responsive layouts that adapt to:
 * - Screen size (small phones, tablets, etc.)
 * - User's font scale settings (accessibility)
 * - Device pixel ratio
 */

import { PixelRatio, useWindowDimensions } from "react-native";

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

  // Is the user using large text (accessibility)?
  const isLargeText = fontScale > 1.2;

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

  // Get font size that respects user's font scale
  // This is already handled by RN, but you can use this to cap extremely large sizes
  const getFontSize = (baseSize: number, maxScale = 1.5) => {
    const cappedScale = Math.min(fontScale, maxScale);
    return baseSize * cappedScale;
  };

  // Get spacing that adapts to font scale
  const getSpacing = (baseSpacing: number) => {
    // When text is large, increase spacing slightly for readability
    const scaleFactor = isLargeText ? 1.1 : 1;
    return baseSpacing * scaleFactor;
  };

  // Get icon size that adapts to font scale
  const getIconSize = (baseSize: number) => {
    // Scale icons slightly with text, but not 1:1
    const scaleFactor = 1 + (fontScale - 1) * 0.5;
    return Math.round(baseSize * scaleFactor);
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
    isLargeText,

    // Scaling functions
    scaleWidth,
    scaleHeight,
    getFontSize,
    getSpacing,
    getIconSize,

    // Device info
    pixelRatio: PixelRatio.get(),
    fontScaleRounded: Math.round(fontScale * 100) / 100,
  };
}
