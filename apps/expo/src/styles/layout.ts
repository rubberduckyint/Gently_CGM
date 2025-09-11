/**
 * Design System Layout
 *
 * Reusable layout utilities and container styles
 */

import type { ViewStyle } from "react-native";

import { colors } from "./colors";
import { spacing } from "./spacing";

// Container styles
export const containers = {
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,

  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,

  content: {
    flex: 1,
    paddingHorizontal: spacing[6], // 24px
  } as ViewStyle,

  contentCentered: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: "center",
  } as ViewStyle,

  section: {
    marginBottom: spacing[6], // 24px
  } as ViewStyle,

  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing[4], // 16px
    marginBottom: spacing[4],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  cardLarge: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing[6], // 24px
    marginBottom: spacing[6],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
} as const;

// Flex utilities
export const flex = {
  // Flex direction
  row: { flexDirection: "row" as const },
  column: { flexDirection: "column" as const },
  rowReverse: { flexDirection: "row-reverse" as const },
  columnReverse: { flexDirection: "column-reverse" as const },

  // Flex wrap
  wrap: { flexWrap: "wrap" as const },
  nowrap: { flexWrap: "nowrap" as const },

  // Flex values
  flex1: { flex: 1 },
  flexNone: { flex: 0 },
  flexAuto: { flex: 1, flexBasis: "auto" },

  // Justify content
  justifyStart: { justifyContent: "flex-start" as const },
  justifyEnd: { justifyContent: "flex-end" as const },
  justifyCenter: { justifyContent: "center" as const },
  justifyBetween: { justifyContent: "space-between" as const },
  justifyAround: { justifyContent: "space-around" as const },
  justifyEvenly: { justifyContent: "space-evenly" as const },

  // Align items
  itemsStart: { alignItems: "flex-start" as const },
  itemsEnd: { alignItems: "flex-end" as const },
  itemsCenter: { alignItems: "center" as const },
  itemsBaseline: { alignItems: "baseline" as const },
  itemsStretch: { alignItems: "stretch" as const },

  // Align self
  selfStart: { alignSelf: "flex-start" as const },
  selfEnd: { alignSelf: "flex-end" as const },
  selfCenter: { alignSelf: "center" as const },
  selfBaseline: { alignSelf: "baseline" as const },
  selfStretch: { alignSelf: "stretch" as const },
} as const;

// Position utilities
export const position = {
  relative: { position: "relative" as const },
  absolute: { position: "absolute" as const },

  // Positioning helpers
  inset0: { top: 0, right: 0, bottom: 0, left: 0 },
  topFull: { top: "100%" },
  leftFull: { left: "100%" },

  // Z-index
  z10: { zIndex: 10 },
  z20: { zIndex: 20 },
  z30: { zIndex: 30 },
  z40: { zIndex: 40 },
  z50: { zIndex: 50 },
} as const;

// Size utilities
export const size = {
  // Width
  wFull: { width: "100%" },
  wAuto: { width: "auto" },

  // Height
  hFull: { height: "100%" },
  hAuto: { height: "auto" },

  // Min/Max dimensions
  minW0: { minWidth: 0 },
  minH0: { minHeight: 0 },
  maxWFull: { maxWidth: "100%" },
  maxHFull: { maxHeight: "100%" },
} as const;

// Loading states
export const loadingStates = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  } as ViewStyle,

  overlay: {
    ...position.absolute,
    ...position.inset0,
    backgroundColor: colors.background.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  } as ViewStyle,
} as const;

// Empty states
export const emptyStates = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[8], // 32px
  } as ViewStyle,
} as const;

// Error states
export const errorStates = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[8], // 32px
  } as ViewStyle,
} as const;

// Dividers
export const dividers = {
  horizontal: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[4], // 16px
  } as ViewStyle,

  vertical: {
    width: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing[4], // 16px
  } as ViewStyle,

  withText: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing[6], // 24px
  } as ViewStyle,

  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  } as ViewStyle,
} as const;
