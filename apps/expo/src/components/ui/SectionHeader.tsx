/**
 * SectionHeader Component
 *
 * A consistent section header for grouping related content.
 */

import type { StyleProp, ViewStyle } from "react-native";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, typography } from "~/styles";
import { headingA11y } from "~/utils/accessibility";

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional icon */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  icon,
  subtitle,
  style,
}: SectionHeaderProps) {
  const a11yProps = headingA11y(title);

  return (
    <View style={[{ marginBottom: spacing[3] }, style]} {...a11yProps}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={colors.primary[500]}
            style={{ marginRight: spacing[2] }}
          />
        )}
        <Text style={typography.labelLarge}>{title}</Text>
      </View>
      {subtitle && (
        <Text
          style={[
            typography.caption,
            {
              color: colors.text.secondary,
              marginTop: spacing[1],
              marginLeft: icon ? 28 : 0,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
