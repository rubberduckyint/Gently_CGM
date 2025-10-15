/**
 * AdvancedSection Component
 *
 * Reusable form section for advanced alarm settings based on the BLE protocol.
 * Includes severity levels, LED patterns, vibration options, and snooze settings.
 * Used by both add and edit alarm forms.
 */

import React from "react";
import {
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AlarmFormData } from "./BasicInfoSection";
import { cards, colors, inputs, spacing, typography } from "~/styles";

interface AdvancedSectionProps {
  formData: AlarmFormData;
  onUpdateFormData: (updates: Partial<AlarmFormData>) => void;
}

// Define option types with descriptions
const SEVERITY_OPTIONS = [
  {
    key: "CRITICAL" as const,
    label: "Critical",
    description: "Highest priority - Cannot be snoozed or dismissed on device",
    icon: "alert-circle" as const,
    color: colors.error[500],
  },
  {
    key: "WARNING" as const,
    label: "Warning",
    description:
      "High priority - Can be snoozed but cannot be dismissed on device",
    icon: "warning" as const,
    color: colors.warning[500],
  },
  {
    key: "INFORMATIONAL" as const,
    label: "Informational",
    description: "Standard priority - Can be snoozed and dismissed on device",
    icon: "information-circle" as const,
    color: colors.primary[500],
  },
] as const;

const LED_PATTERNS = [
  {
    key: "SOLID" as const,
    label: "Solid",
    description: "Continuous steady light",
    icon: "ellipse" as const,
  },
  {
    key: "BLINK_SLOW" as const,
    label: "Slow Blink",
    description: "Gentle pulsing light",
    icon: "ellipse-outline" as const,
  },
  {
    key: "BLINK_FAST" as const,
    label: "Fast Blink",
    description: "Rapid attention-getting flashes",
    icon: "flash" as const,
  },
  {
    key: "PULSE" as const,
    label: "Pulse",
    description: "Smooth breathing effect",
    icon: "heart" as const,
  },
  {
    key: "STROBE" as const,
    label: "Strobe",
    description: "Intense flashing pattern",
    icon: "flash-outline" as const,
  },
] as const;

const LED_COLORS = [
  { key: "RED" as const, label: "Red", color: colors.error[500] },
  { key: "GREEN" as const, label: "Green", color: colors.success[500] },
  { key: "BLUE" as const, label: "Blue", color: colors.primary[500] },
  { key: "YELLOW" as const, label: "Yellow", color: colors.warning[400] },
  { key: "MAGENTA" as const, label: "Magenta", color: "#FF1493" }, // Use direct hex for magenta
  { key: "CYAN" as const, label: "Cyan", color: "#00BFFF" }, // Use direct hex for cyan
  { key: "WHITE" as const, label: "White", color: colors.gray[100] },
] as const;

const VIBRATION_INTENSITIES = [
  {
    key: "LOW" as const,
    label: "Low",
    description: "Gentle vibration",
    icon: "radio-button-off" as const,
  },
  {
    key: "MEDIUM" as const,
    label: "Medium",
    description: "Moderate vibration",
    icon: "remove" as const,
  },
  {
    key: "HIGH" as const,
    label: "High",
    description: "Strong vibration",
    icon: "reorder-three" as const,
  },
] as const;

const VIBRATION_PATTERNS = [
  {
    key: "QUICK" as const,
    label: "Quick",
    description: "Short, sharp vibrations",
    icon: "flash" as const,
  },
  {
    key: "HEARTBEAT" as const,
    label: "Heartbeat",
    description: "Rhythmic double pulses",
    icon: "heart" as const,
  },
  {
    key: "RAPID" as const,
    label: "Rapid",
    description: "Fast continuous pulses",
    icon: "pulse" as const,
  },
  {
    key: "SYMPHONY" as const,
    label: "Symphony",
    description: "Complex musical pattern",
    icon: "musical-notes" as const,
  },
] as const;

export function AdvancedSection({
  formData,
  onUpdateFormData,
}: AdvancedSectionProps) {
  const canSnooze = formData.severityLevel !== "CRITICAL";

  return (
    <View style={[cards.base, { marginBottom: spacing[4] }]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[2],
          marginBottom: spacing[2],
        }}
      >
        <Ionicons name="watch" size={20} color={colors.primary[500]} />
        <Text style={[typography.h4]}>Bracelet Settings</Text>
      </View>
      <Text
        style={[
          typography.caption,
          {
            color: colors.text.secondary,
            marginBottom: spacing[5],
            lineHeight: 18,
          },
        ]}
      >
        Configure how your bracelet will alert you - from the priority level to
        the light and vibration patterns.
      </Text>

      {/* Severity Level */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[2] }]}>
          Priority Level *
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: colors.text.secondary,
              marginBottom: spacing[3],
              lineHeight: 18,
            },
          ]}
        >
          Choose how important this alarm is. Higher priority alarms have more
          restrictions to ensure you don't miss them.
        </Text>
        <View style={{ gap: spacing[3] }}>
          {SEVERITY_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => onUpdateFormData({ severityLevel: option.key })}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingVertical: spacing[3],
                paddingHorizontal: spacing[4],
                borderRadius: 12,
                borderWidth: 2,
                borderColor:
                  formData.severityLevel === option.key
                    ? option.color
                    : colors.border.light,
                backgroundColor:
                  formData.severityLevel === option.key
                    ? `${option.color}15`
                    : colors.background.secondary,
              }}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={option.color}
                style={{ marginRight: spacing[3], marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.body,
                    {
                      color: option.color,
                      marginBottom: spacing[1],
                      fontWeight: "600",
                    },
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.text.secondary, lineHeight: 18 },
                  ]}
                >
                  {option.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Snooze Settings - Only show if applicable */}
      {canSnooze && (
        <View style={{ marginBottom: spacing[4] }}>
          <Text style={[typography.label, { marginBottom: spacing[2] }]}>
            Snooze Settings
          </Text>
          <Text
            style={[
              typography.caption,
              {
                color: colors.text.secondary,
                marginBottom: spacing[3],
                lineHeight: 18,
              },
            ]}
          >
            Control how the snooze feature works when you need a few more
            minutes.
          </Text>
          <View
            style={{
              backgroundColor: colors.background.secondary,
              padding: spacing[4],
              borderRadius: 12,
              gap: spacing[4],
            }}
          >
            <View>
              <Text
                style={[
                  typography.body,
                  { marginBottom: spacing[2], fontWeight: "600" },
                ]}
              >
                Snooze Period: {formData.snoozePeriod} minutes
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.text.secondary, marginBottom: spacing[3] },
                ]}
              >
                How long the alarm waits before alerting you again after you
                press snooze (1-60 minutes)
              </Text>
              <TextInput
                style={[inputs.base]}
                value={formData.snoozePeriod.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  onUpdateFormData({
                    snoozePeriod: Math.max(1, Math.min(60, value)),
                  });
                }}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor={colors.text.secondary}
              />
            </View>
            <View>
              <Text
                style={[
                  typography.body,
                  { marginBottom: spacing[2], fontWeight: "600" },
                ]}
              >
                Snooze Timeout: {formData.snoozeTimeout} minutes
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.text.secondary, marginBottom: spacing[3] },
                ]}
              >
                How long you have to press snooze after the alarm starts (1-120
                minutes)
              </Text>
              <TextInput
                style={[inputs.base]}
                value={formData.snoozeTimeout.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  onUpdateFormData({
                    snoozeTimeout: Math.max(1, Math.min(120, value)),
                  });
                }}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={colors.text.secondary}
              />
            </View>
          </View>
        </View>
      )}

      {/* Retrigger Settings */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[2] }]}>
          Retrigger Settings
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: colors.text.secondary,
              marginBottom: spacing[3],
              lineHeight: 18,
            },
          ]}
        >
          Set if and when the alarm should alert you again after being dismissed
          or acknowledged.
        </Text>
        <View
          style={{
            backgroundColor: colors.background.secondary,
            padding: spacing[4],
            borderRadius: 12,
            gap: spacing[4],
          }}
        >
          <View>
            <Text
              style={[
                typography.body,
                { marginBottom: spacing[2], fontWeight: "600" },
              ]}
            >
              Retrigger Delay: {formData.retriggerDelay} minutes
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.text.secondary, marginBottom: spacing[3] },
              ]}
            >
              How long to wait before the alarm can alert you again (0 to
              disable)
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
            >
              <Pressable
                onPress={() =>
                  onUpdateFormData({
                    retriggerDelay: Math.max(0, formData.retriggerDelay - 1),
                  })
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: colors.background.primary,
                  borderWidth: 1,
                  borderColor: colors.border.medium,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="remove" size={24} color={colors.text.primary} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.border.light,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      width: `${(formData.retriggerDelay / 60) * 100}%`,
                      backgroundColor: colors.primary[500],
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
              <Pressable
                onPress={() =>
                  onUpdateFormData({
                    retriggerDelay: Math.min(60, formData.retriggerDelay + 1),
                  })
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: colors.background.primary,
                  borderWidth: 1,
                  borderColor: colors.border.medium,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
          </View>
          <View>
            <Text
              style={[
                typography.body,
                { marginBottom: spacing[2], fontWeight: "600" },
              ]}
            >
              Max Snoozes:{" "}
              {formData.retriggerDelay > 0 && formData.snoozePeriod > 0
                ? Math.floor(
                    formData.retriggerTimeout / formData.retriggerDelay,
                  )
                : 0}
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.text.secondary, marginBottom: spacing[3] },
              ]}
            >
              {formData.retriggerDelay > 0
                ? `How many times can you snooze? (${formData.retriggerTimeout} min ÷ ${formData.retriggerDelay} min delay = ${Math.floor(formData.retriggerTimeout / formData.retriggerDelay)} snoozes)`
                : "Set retrigger delay above 0 to enable snoozing"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
              }}
            >
              <Pressable
                onPress={() =>
                  onUpdateFormData({
                    retriggerTimeout: Math.max(
                      0,
                      formData.retriggerTimeout -
                        (formData.retriggerDelay || 1),
                    ),
                  })
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: colors.background.primary,
                  borderWidth: 1,
                  borderColor: colors.border.medium,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="remove" size={24} color={colors.text.primary} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.border.light,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      width: `${(formData.retriggerTimeout / 120) * 100}%`,
                      backgroundColor: colors.primary[500],
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
              <Pressable
                onPress={() =>
                  onUpdateFormData({
                    retriggerTimeout: Math.min(
                      120,
                      formData.retriggerTimeout +
                        (formData.retriggerDelay || 1),
                    ),
                  })
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: colors.background.primary,
                  borderWidth: 1,
                  borderColor: colors.border.medium,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* LED Pattern */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[2] }]}>
          Light Pattern
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: colors.text.secondary,
              marginBottom: spacing[3],
              lineHeight: 18,
            },
          ]}
        >
          Choose how the bracelet's LED will light up when the alarm triggers.
        </Text>
        <View style={{ gap: spacing[2] }}>
          {LED_PATTERNS.map((pattern) => (
            <Pressable
              key={pattern.key}
              onPress={() => onUpdateFormData({ ledPattern: pattern.key })}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: spacing[3],
                paddingHorizontal: spacing[4],
                borderRadius: 8,
                backgroundColor:
                  formData.ledPattern === pattern.key
                    ? colors.primary[50]
                    : "transparent",
                borderWidth: 1,
                borderColor:
                  formData.ledPattern === pattern.key
                    ? colors.primary[500]
                    : colors.border.light,
              }}
            >
              <Ionicons
                name={pattern.icon}
                size={20}
                color={
                  formData.ledPattern === pattern.key
                    ? colors.primary[500]
                    : colors.text.secondary
                }
                style={{ marginRight: spacing[3] }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.body,
                    {
                      color:
                        formData.ledPattern === pattern.key
                          ? colors.primary[500]
                          : colors.text.primary,
                      fontWeight:
                        formData.ledPattern === pattern.key ? "600" : "400",
                    },
                  ]}
                >
                  {pattern.label}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.text.secondary, marginTop: 2 },
                  ]}
                >
                  {pattern.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* LED Color */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[3] }]}>
          Light Color
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: spacing[2],
          }}
        >
          {LED_COLORS.map((colorOption) => (
            <Pressable
              key={colorOption.key}
              onPress={() => onUpdateFormData({ ledColor: colorOption.key })}
              style={{
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                aspectRatio: 1,
                maxWidth: 50,
                borderRadius: 25,
                borderWidth: 2,
                borderColor:
                  formData.ledColor === colorOption.key
                    ? colors.primary[500]
                    : colors.border.light,
                backgroundColor: colorOption.color,
              }}
            />
          ))}
        </View>
      </View>

      {/* Vibration Settings */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[3] }]}>
          Vibration Strength
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: spacing[2],
          }}
        >
          {VIBRATION_INTENSITIES.map((intensity) => (
            <Pressable
              key={intensity.key}
              onPress={() =>
                onUpdateFormData({ vibrationIntensity: intensity.key })
              }
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: spacing[3],
                paddingHorizontal: spacing[3],
                borderRadius: 8,
                backgroundColor:
                  formData.vibrationIntensity === intensity.key
                    ? colors.primary[500]
                    : colors.background.secondary,
                borderWidth: 2,
                borderColor:
                  formData.vibrationIntensity === intensity.key
                    ? colors.primary[500]
                    : colors.border.light,
                gap: spacing[2],
              }}
            >
              <Ionicons
                name={intensity.icon}
                size={20}
                color={
                  formData.vibrationIntensity === intensity.key
                    ? colors.background.primary
                    : colors.text.primary
                }
              />
              <Text
                style={[
                  typography.body,
                  {
                    color:
                      formData.vibrationIntensity === intensity.key
                        ? colors.background.primary
                        : colors.text.primary,
                    fontWeight:
                      formData.vibrationIntensity === intensity.key
                        ? "600"
                        : "400",
                  },
                ]}
              >
                {intensity.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Vibration Pattern */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={[typography.label, { marginBottom: spacing[2] }]}>
          Vibration Pattern
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: colors.text.secondary,
              marginBottom: spacing[3],
              lineHeight: 18,
            },
          ]}
        >
          Choose the rhythm of the vibration pattern.
        </Text>
        <View
          style={{
            backgroundColor: colors.background.secondary,
            padding: spacing[4],
            borderRadius: 12,
          }}
        >
          <View style={{ gap: spacing[3] }}>
            {VIBRATION_PATTERNS.map((pattern) => (
              <TouchableOpacity
                key={pattern.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: spacing[3],
                  backgroundColor:
                    formData.vibrationPattern === pattern.key
                      ? colors.primary[500]
                      : colors.background.primary,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor:
                    formData.vibrationPattern === pattern.key
                      ? colors.primary[500]
                      : colors.border.medium,
                }}
                onPress={() =>
                  onUpdateFormData({
                    vibrationPattern: pattern.key,
                  })
                }
              >
                <Ionicons
                  name={pattern.icon}
                  size={20}
                  color={
                    formData.vibrationPattern === pattern.key
                      ? colors.background.primary
                      : colors.text.primary
                  }
                  style={{ marginRight: spacing[3] }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      typography.body,
                      {
                        color:
                          formData.vibrationPattern === pattern.key
                            ? colors.background.primary
                            : colors.text.primary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {pattern.label}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color:
                          formData.vibrationPattern === pattern.key
                            ? colors.background.primary
                            : colors.text.secondary,
                      },
                    ]}
                  >
                    {pattern.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
