/**
 * Card Component
 *
 * A consistent, accessible card component for displaying grouped content.
 */

import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, View } from "react-native";

import { cards, spacing } from "~/styles";
import { cardA11y } from "~/utils/accessibility";

export type CardVariant = "default" | "elevated" | "outlined";

export interface CardProps {
  /** Card content */
  children?: React.ReactNode;
  /** Visual variant */
  variant?: CardVariant;
  /** Make the card pressable */
  onPress?: () => void;
  /** Accessibility label for the card */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Padding inside the card */
  padding?: keyof typeof spacing;
  /** Remove default margin */
  noMargin?: boolean;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {},
  elevated: cards.elevated,
  outlined: cards.bordered,
};

export function Card({
  children,
  variant = "default",
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  padding = 4,
  noMargin = false,
}: CardProps) {
  const a11yProps = accessibilityLabel
    ? cardA11y(accessibilityLabel, {
        hint: accessibilityHint,
        isActionable: !!onPress,
      })
    : {};

  const cardStyle: StyleProp<ViewStyle> = [
    cards.base,
    variantStyles[variant],
    { padding: spacing[padding] },
    noMargin && { marginBottom: 0 },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && { opacity: 0.9 }]}
        {...a11yProps}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...a11yProps}>
      {children}
    </View>
  );
}
