/**
 * Toggle Component
 *
 * A consistent, accessible toggle/switch component with label support.
 * Designed to handle large font settings gracefully.
 */

import type { StyleProp, ViewStyle } from "react-native";
import { Switch, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, typography } from "~/styles";
import { switchA11y } from "~/utils/accessibility";

interface ToggleProps {
  /** Toggle label */
  label: string;
  /** Current value */
  value: boolean;
  /** Called when value changes */
  onValueChange: (value: boolean) => void;
  /** Optional description text */
  description?: string;
  /** Icon to show before label */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Disable the toggle */
  disabled?: boolean;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Additional styles for the container */
  style?: StyleProp<ViewStyle>;
}

export function Toggle({
  label,
  value,
  onValueChange,
  description,
  icon,
  disabled = false,
  accessibilityHint,
  style,
}: ToggleProps) {
  const { fontScale } = useWindowDimensions();
  const isLargeText = fontScale > 1.3;
  const isVeryLargeText = fontScale > 1.8;

  const a11yProps = switchA11y(label, value, {
    hint: accessibilityHint,
    disabled,
  });

  // Scale icon size with font scale, but cap it
  const iconSize = Math.min(18 * fontScale, 28);

  // Increase spacing for large text
  const verticalPadding = isVeryLargeText
    ? spacing[5]
    : isLargeText
      ? spacing[4]
      : spacing[3];

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: verticalPadding,
          minHeight: 48, // Minimum touch target
          gap: spacing[3],
        },
        style,
      ]}
      {...a11yProps}
    >
      {/* Label and description section - flex to allow wrapping */}
      <View
        style={{
          flex: 1,
          flexShrink: 1,
          minWidth: 0,
          marginRight: spacing[3],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={disabled ? colors.gray[400] : colors.text.primary}
              style={{ marginRight: spacing[2], flexShrink: 0 }}
            />
          )}
          <Text
            style={[
              typography.label,
              {
                flexShrink: 1,
                flexWrap: "wrap",
              },
              disabled && { color: colors.gray[400] },
            ]}
            // Allow up to 3 lines for very large text
            numberOfLines={isVeryLargeText ? undefined : 2}
          >
            {label}
          </Text>
        </View>
        {description && (
          <Text
            style={[
              typography.caption,
              {
                color: disabled ? colors.gray[400] : colors.text.secondary,
                marginTop: 4,
                marginLeft: icon ? iconSize + spacing[2] : 0,
              },
            ]}
            // Allow description to wrap fully for accessibility
            numberOfLines={isVeryLargeText ? undefined : 3}
          >
            {description}
          </Text>
        )}
      </View>

      {/* Switch - fixed size, doesn't shrink */}
      <View style={{ flexShrink: 0 }}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: colors.gray[300], true: colors.primary[300] }}
          thumbColor={value ? colors.primary[500] : colors.gray[100]}
        />
      </View>
    </View>
  );
}
