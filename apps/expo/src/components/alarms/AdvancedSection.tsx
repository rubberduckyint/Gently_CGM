/**
 * AdvancedSection Component
 *
 * Reusable form section for advanced alarm settings (priority, haptic feedback).
 * Used by both add and edit alarm forms.
 */

import React from "react";
import { Pressable, Text, View } from "react-native";

import type { AlarmFormData } from "./BasicInfoSection";
import { cards, colors, spacing, typography } from "~/styles";

interface AdvancedSectionProps {
  formData: AlarmFormData;
  onUpdateFormData: (updates: Partial<AlarmFormData>) => void;
}

export function AdvancedSection({
  formData,
  onUpdateFormData,
}: AdvancedSectionProps) {
  return (
    <View style={[cards.base, { marginBottom: spacing[6] }]}>
      <Text style={[typography.h4, { marginBottom: spacing[4] }]}>
        Advanced Settings
      </Text>

      {/* Priority */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[2] }]}>
          Priority
        </Text>
        <View style={{ gap: spacing[2] }}>
          {(["LOW", "MEDIUM", "HIGH"] as const).map((priority) => (
            <Pressable
              key={priority}
              onPress={() => onUpdateFormData({ priority })}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: spacing[2],
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: colors.primary[500],
                  marginRight: spacing[2],
                  backgroundColor:
                    formData.priority === priority
                      ? colors.primary[500]
                      : "transparent",
                }}
              />
              <Text style={[typography.body]}>{priority}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Haptic Feedback */}
      <View>
        <Text style={[typography.label, { marginBottom: spacing[2] }]}>
          Haptic Feedback
        </Text>
        <View style={{ gap: spacing[2] }}>
          {(
            ["STANDARD", "STRONG", "SOFT", "DOUBLE", "PULSE", "WAVE"] as const
          ).map((haptic) => (
            <Pressable
              key={haptic}
              onPress={() => onUpdateFormData({ hapticChoice: haptic })}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: spacing[2],
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: colors.primary[500],
                  marginRight: spacing[2],
                  backgroundColor:
                    formData.hapticChoice === haptic
                      ? colors.primary[500]
                      : "transparent",
                }}
              />
              <Text style={[typography.body]}>{haptic}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
