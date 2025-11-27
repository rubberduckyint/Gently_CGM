/**
 * BasicInfoSection Component
 *
 * Reusable form section for alarm basic information (title, description, color).
 * Used by both add and edit alarm forms.
 */

import { Text, TextInput, View } from "react-native";

import type { AlarmFormData } from "~/types";
import { cards, colors, inputs, spacing, typography } from "~/styles";
import { textInputA11y } from "~/utils/accessibility";

// Re-export for backwards compatibility
export type { AlarmFormData } from "~/types";

interface BasicInfoSectionProps {
  formData: AlarmFormData;
  onUpdateFormData: (updates: Partial<AlarmFormData>) => void;
  showValidationErrors?: boolean;
}

export function BasicInfoSection({
  formData,
  onUpdateFormData,
  showValidationErrors = false,
}: BasicInfoSectionProps) {
  const isTitleEmpty = formData.title.trim().length === 0;
  const showTitleError = showValidationErrors && isTitleEmpty;
  const titleA11y = textInputA11y("Alarm name, required", {
    value: formData.title,
    placeholder: "e.g., Take Medication",
  });

  return (
    <View style={[cards.base, { marginBottom: spacing[4] }]}>
      {/* Title Input */}
      <View style={{ marginBottom: spacing[2] }}>
        <Text
          style={[
            typography.label,
            { marginBottom: spacing[2] },
            showTitleError && { color: colors.error[500] },
          ]}
        >
          Alarm Name *
        </Text>
        <TextInput
          style={[
            inputs.base,
            showTitleError && {
              borderColor: colors.error[500],
              borderWidth: 2,
            },
          ]}
          value={formData.title}
          onChangeText={(text) => onUpdateFormData({ title: text })}
          placeholder="e.g., Take Medication, Morning Reminder"
          placeholderTextColor={colors.text.secondary}
          {...titleA11y}
        />
        {showTitleError && (
          <Text
            style={[
              typography.caption,
              { color: colors.error[500], marginTop: spacing[1] },
            ]}
            accessibilityRole="alert"
          >
            Alarm name is required
          </Text>
        )}
      </View>
    </View>
  );
}
