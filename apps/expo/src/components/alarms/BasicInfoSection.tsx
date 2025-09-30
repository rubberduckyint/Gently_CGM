/**
 * BasicInfoSection Component
 *
 * Reusable form section for alarm basic information (title, description, color).
 * Used by both add and edit alarm forms.
 */

import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { cards, colors, inputs, spacing, typography } from "~/styles";

export interface AlarmFormData {
  title: string;
  description: string;
  color: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  hapticChoice: "STANDARD" | "STRONG" | "SOFT" | "DOUBLE" | "PULSE" | "WAVE";
  startDate: Date;
  repeat: boolean;
  repeatType: "minutes" | "hours" | "days" | "weeks";
  repeatEvery: number;
  daysOfWeek: string[];
  ends: "never" | "on" | "after";
  endsOnDate?: Date;
  endsAfter?: number;
}

const COLOR_OPTIONS = [
  "#007AFF", // Blue
  "#34C759", // Green
  "#FF3B30", // Red
  "#FF9500", // Orange
  "#AF52DE", // Purple
  "#FF2D92", // Pink
  "#00C7BE", // Teal
  "#FFD60A", // Yellow
];

interface BasicInfoSectionProps {
  formData: AlarmFormData;
  onUpdateFormData: (updates: Partial<AlarmFormData>) => void;
}

export function BasicInfoSection({
  formData,
  onUpdateFormData,
}: BasicInfoSectionProps) {
  return (
    <View style={[cards.base, { marginBottom: spacing[6] }]}>
      <Text style={[typography.h4, { marginBottom: spacing[4] }]}>
        Basic Information
      </Text>

      {/* Title Input */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[2] }]}>
          Title *
        </Text>
        <TextInput
          style={[inputs.base]}
          value={formData.title}
          onChangeText={(text) => onUpdateFormData({ title: text })}
          placeholder="Enter alarm title"
          placeholderTextColor={colors.text.secondary}
        />
      </View>

      {/* Description Input */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[2] }]}>
          Description
        </Text>
        <TextInput
          style={[inputs.base, { height: 80, textAlignVertical: "top" }]}
          value={formData.description}
          onChangeText={(text) => onUpdateFormData({ description: text })}
          placeholder="Enter description (optional)"
          placeholderTextColor={colors.text.secondary}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Color Selection */}
      <View>
        <Text style={[typography.label, { marginBottom: spacing[3] }]}>
          Color
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing[3],
          }}
        >
          {COLOR_OPTIONS.map((color) => (
            <Pressable
              key={color}
              onPress={() => onUpdateFormData({ color })}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: color,
                borderWidth: formData.color === color ? 3 : 2,
                borderColor:
                  formData.color === color
                    ? colors.primary[600]
                    : colors.border.light,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
