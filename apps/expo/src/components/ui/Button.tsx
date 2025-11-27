/**
 * Button Component
 *
 * A consistent, accessible button component for the entire app.
 * Supports multiple variants, sizes, and states.
 * Designed to handle large font settings gracefully.
 */

import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { buttons, buttonText, colors, spacing } from "~/styles";
import { buttonA11y } from "~/utils/accessibility";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "error";
export type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  /** Button text */
  title: string;
  /** Called when button is pressed */
  onPress: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Show loading spinner and disable button */
  loading?: boolean;
  /** Disable the button */
  disabled?: boolean;
  /** Icon to show before text */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Icon to show after text */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Full width button */
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: buttons.primary,
  secondary: buttons.secondary,
  outline: buttons.outline,
  ghost: buttons.ghost,
  error: buttons.error,
};

const textColors: Record<ButtonVariant, string> = {
  primary: colors.text.inverse,
  secondary: colors.text.primary,
  outline: colors.primary[600],
  ghost: colors.primary[600],
  error: colors.text.inverse,
};

// Minimum heights for accessibility (44pt touch target)
const MIN_BUTTON_HEIGHT = 44;

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  accessibilityHint,
  style,
  fullWidth = false,
}: ButtonProps) {
  const { fontScale } = useWindowDimensions();
  const isLargeText = fontScale > 1.3;

  const isDisabled = loading || disabled;
  const textColor = textColors[variant];

  // Scale icon sizes with font, but cap them
  const baseIconSizes: Record<ButtonSize, number> = {
    small: 16,
    medium: 18,
    large: 20,
  };
  const iconSize = Math.min(baseIconSizes[size] * Math.min(fontScale, 1.4), 28);

  // Calculate button height based on font scale
  const baseHeights: Record<ButtonSize, number> = {
    small: 36,
    medium: 44,
    large: 52,
  };
  const scaledHeight = Math.max(
    baseHeights[size] * Math.min(fontScale, 1.3),
    MIN_BUTTON_HEIGHT,
  );

  // Padding that scales with font
  const horizontalPadding = isLargeText ? spacing[5] : spacing[4];
  const verticalPadding = isLargeText ? spacing[3] : spacing[2];

  const a11yProps = buttonA11y(title, {
    hint: accessibilityHint,
    disabled: isDisabled,
  });

  // Dynamic size styles
  const sizeStyles: ViewStyle = {
    minHeight: scaledHeight,
    paddingHorizontal: horizontalPadding,
    paddingVertical: verticalPadding,
  };

  // Text size based on button size and font scale
  const getTextSize = () => {
    const baseSizes: Record<ButtonSize, number> = {
      small: 14,
      medium: 16,
      large: 18,
    };
    // Cap text scaling at 1.3x to prevent overflow
    return baseSizes[size] * Math.min(fontScale, 1.3);
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        buttons.base,
        variantStyles[variant],
        sizeStyles,
        fullWidth && { width: "100%" },
        isDisabled && buttons.disabled,
        pressed && { opacity: 0.8 },
        style,
      ]}
      {...a11yProps}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "nowrap",
          }}
        >
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={iconSize}
              color={textColor}
              style={{ marginRight: spacing[2], flexShrink: 0 }}
            />
          )}
          <Text
            style={[
              variant === "primary" ? buttonText.primary : buttonText.secondary,
              {
                color: textColor,
                fontSize: getTextSize(),
                flexShrink: 1,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {title}
          </Text>
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={iconSize}
              color={textColor}
              style={{ marginLeft: spacing[2], flexShrink: 0 }}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}
