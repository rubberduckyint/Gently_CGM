/**
 * EmptyState Component
 *
 * A consistent component for displaying empty states with optional actions.
 */

import type { StyleProp, ViewStyle } from "react-native";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, emptyStates, spacing, typography } from "~/styles";
import { Button } from "./Button";

interface EmptyStateProps {
  /** Icon to display */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  actionTitle?: string;
  /** Called when action button is pressed */
  onAction?: () => void;
  /** Secondary action button */
  secondaryActionTitle?: string;
  /** Called when secondary action is pressed */
  onSecondaryAction?: () => void;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = "document-outline",
  title,
  description,
  actionTitle,
  onAction,
  secondaryActionTitle,
  onSecondaryAction,
  style,
}: EmptyStateProps) {
  return (
    <View
      style={[emptyStates.container, style]}
      accessible={true}
      accessibilityLabel={`${title}${description ? `. ${description}` : ""}`}
    >
      <View style={emptyStates.iconContainer}>
        <Ionicons name={icon} size={48} color={colors.gray[400]} />
      </View>

      <Text style={[typography.h4, emptyStates.title]}>{title}</Text>

      {description && (
        <Text style={[typography.body, emptyStates.description]}>
          {description}
        </Text>
      )}

      {actionTitle && onAction && (
        <View style={{ marginTop: spacing[4] }}>
          <Button title={actionTitle} onPress={onAction} variant="primary" />
        </View>
      )}

      {secondaryActionTitle && onSecondaryAction && (
        <View style={{ marginTop: spacing[2] }}>
          <Button
            title={secondaryActionTitle}
            onPress={onSecondaryAction}
            variant="ghost"
          />
        </View>
      )}
    </View>
  );
}
