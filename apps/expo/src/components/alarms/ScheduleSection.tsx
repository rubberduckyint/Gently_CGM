/**
 * ScheduleSection Component
 *
 * Reusable form section for alarm scheduling (time, repeat settings).
 * Used by both add and edit alarm forms.
 */

import React from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import type { AlarmFormData } from "./BasicInfoSection";
import { cards, colors, inputs, spacing, typography } from "~/styles";

interface ScheduleSectionProps {
  formData: AlarmFormData;
  onUpdateFormData: (updates: Partial<AlarmFormData>) => void;
  showStartTimePicker: boolean;
  onToggleStartTimePicker: () => void;
  showEndDatePicker: boolean;
  onToggleEndDatePicker: () => void;
}

export function ScheduleSection({
  formData,
  onUpdateFormData,
  showStartTimePicker,
  onToggleStartTimePicker,
  showEndDatePicker,
  onToggleEndDatePicker,
}: ScheduleSectionProps) {
  const handleDayPress = (day: string) => {
    const currentDays = formData.daysOfWeek;
    if (currentDays.includes(day)) {
      onUpdateFormData({
        daysOfWeek: currentDays.filter((d) => d !== day),
      });
    } else {
      onUpdateFormData({
        daysOfWeek: [...currentDays, day],
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <>
      <View style={[cards.base, { marginBottom: spacing[6] }]}>
        <Text style={[typography.h4, { marginBottom: spacing[4] }]}>
          Schedule
        </Text>

        {/* Start Time */}
        <View style={{ marginBottom: spacing[4] }}>
          <Text style={[typography.label, { marginBottom: spacing[2] }]}>
            Start Time
          </Text>
          <Pressable
            style={{
              borderWidth: 1,
              borderColor: colors.border.medium,
              backgroundColor: colors.background.secondary,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              borderRadius: 8,
              justifyContent: "center",
            }}
            onPress={onToggleStartTimePicker}
          >
            <Text style={[typography.body, { color: colors.text.primary }]}>
              {formatTime(formData.startDate)}
            </Text>
          </Pressable>
        </View>

        {/* Repeat Toggle */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing[4],
          }}
        >
          <Text style={[typography.label]}>Repeat</Text>
          <Switch
            value={formData.repeat}
            onValueChange={(value) => onUpdateFormData({ repeat: value })}
            trackColor={{
              false: colors.gray[300],
              true: colors.primary[500],
            }}
            thumbColor={colors.background.primary}
          />
        </View>

        {/* Repeat Options - Only show if repeat is enabled */}
        {formData.repeat && (
          <>
            {/* Repeat Type */}
            <View style={{ marginBottom: spacing[4] }}>
              <Text style={[typography.label, { marginBottom: spacing[2] }]}>
                Repeat Every
              </Text>
              <View style={{ flexDirection: "row", gap: spacing[2] }}>
                <TextInput
                  style={[inputs.base, { flex: 1 }]}
                  value={formData.repeatEvery.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 1;
                    onUpdateFormData({ repeatEvery: Math.max(1, num) });
                  }}
                  keyboardType="numeric"
                  placeholder="1"
                />
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border.medium,
                    backgroundColor: colors.background.secondary,
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    borderRadius: 8,
                    flex: 2,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={[typography.body, { color: colors.text.primary }]}
                  >
                    {formData.repeatType}
                  </Text>
                </View>
              </View>
            </View>

            {/* Days of Week - Only show for weekly repeat */}
            {formData.repeatType === "weeks" && (
              <View style={{ marginBottom: spacing[4] }}>
                <Text style={[typography.label, { marginBottom: spacing[2] }]}>
                  Days of Week
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: spacing[2],
                  }}
                >
                  {["0", "1", "2", "3", "4", "5", "6"].map((day) => {
                    const dayNames = [
                      "Sun",
                      "Mon",
                      "Tue",
                      "Wed",
                      "Thu",
                      "Fri",
                      "Sat",
                    ];
                    const isSelected = formData.daysOfWeek.includes(day);
                    return (
                      <Pressable
                        key={day}
                        onPress={() => handleDayPress(day)}
                        style={[
                          {
                            paddingHorizontal: spacing[3],
                            paddingVertical: spacing[2],
                            borderRadius: 8,
                            borderWidth: 1,
                          },
                          isSelected
                            ? {
                                backgroundColor: colors.primary[500],
                                borderColor: colors.primary[500],
                              }
                            : {
                                backgroundColor: colors.background.primary,
                                borderColor: colors.border.light,
                              },
                        ]}
                      >
                        <Text
                          style={[
                            typography.bodySmall,
                            {
                              color: isSelected
                                ? colors.text.inverse
                                : colors.text.primary,
                            },
                          ]}
                        >
                          {dayNames[parseInt(day)]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* End Condition */}
            <View>
              <Text style={[typography.label, { marginBottom: spacing[2] }]}>
                Ends
              </Text>
              <View style={{ gap: spacing[2] }}>
                {(["never", "on", "after"] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => onUpdateFormData({ ends: option })}
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
                          formData.ends === option
                            ? colors.primary[500]
                            : "transparent",
                      }}
                    />
                    <Text style={[typography.body]}>
                      {option === "never"
                        ? "Never"
                        : option === "on"
                          ? "On date"
                          : "After occurrences"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* End Date Picker */}
              {formData.ends === "on" && (
                <View style={{ marginTop: spacing[2] }}>
                  <Pressable
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border.medium,
                      backgroundColor: colors.background.secondary,
                      paddingHorizontal: spacing[4],
                      paddingVertical: spacing[3],
                      borderRadius: 8,
                      justifyContent: "center",
                    }}
                    onPress={onToggleEndDatePicker}
                  >
                    <Text
                      style={[typography.body, { color: colors.text.primary }]}
                    >
                      {formData.endsOnDate
                        ? formatDate(formData.endsOnDate)
                        : "Select end date"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* End After Input */}
              {formData.ends === "after" && (
                <View style={{ marginTop: spacing[2] }}>
                  <TextInput
                    style={[inputs.base]}
                    value={formData.endsAfter?.toString() ?? ""}
                    onChangeText={(text) => {
                      const num = parseInt(text) || undefined;
                      onUpdateFormData({ endsAfter: num });
                    }}
                    keyboardType="numeric"
                    placeholder="Number of occurrences"
                    placeholderTextColor={colors.text.secondary}
                  />
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Date/Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="time"
          display="default"
          onChange={(event, selectedDate) => {
            onToggleStartTimePicker();
            if (selectedDate) {
              onUpdateFormData({ startDate: selectedDate });
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endsOnDate ?? new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            onToggleEndDatePicker();
            if (selectedDate) {
              onUpdateFormData({ endsOnDate: selectedDate });
            }
          }}
        />
      )}
    </>
  );
}
