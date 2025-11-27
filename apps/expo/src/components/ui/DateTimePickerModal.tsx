/**
 * DateTimePickerModal Component
 *
 * A reusable modal for picking dates and times on iOS and Android.
 * Provides a consistent, accessible interface for datetime selection.
 */

import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { colors, spacing, typography } from "~/styles";

export type PickerMode = "date" | "time" | "datetime";

interface DateTimePickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** The current selected date/time */
  value: Date;
  /** Type of picker to show */
  mode: PickerMode;
  /** Called when the user confirms selection */
  onConfirm: (date: Date) => void;
  /** Called when the modal is dismissed */
  onCancel: () => void;
  /** Optional minimum date */
  minimumDate?: Date;
  /** Optional maximum date */
  maximumDate?: Date;
  /** Title shown in the modal */
  title?: string;
}

export function DateTimePickerModal({
  visible,
  value,
  mode,
  onConfirm,
  onCancel,
  minimumDate,
  maximumDate,
  title,
}: DateTimePickerModalProps) {
  // Temporary value for iOS (allows cancellation)
  const [tempValue, setTempValue] = useState(value);

  // Sync temp value when modal opens with new value
  useEffect(() => {
    if (visible) {
      setTempValue(value);
    }
  }, [visible, value]);

  const getTitle = () => {
    if (title) return title;
    switch (mode) {
      case "date":
        return "Select Date";
      case "time":
        return "Select Time";
      case "datetime":
        return "Select Date & Time";
      default:
        return "Select";
    }
  };

  // For Android, we need to show two pickers sequentially for datetime
  const [androidStep, setAndroidStep] = useState<"date" | "time">("date");

  // Reset step when modal opens
  useEffect(() => {
    if (visible && Platform.OS === "android") {
      setAndroidStep(mode === "time" ? "time" : "date");
    }
  }, [visible, mode]);

  // iOS Picker
  if (Platform.OS === "ios") {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={onCancel}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: spacing[4],
          }}
          onPress={onCancel}
          accessible={true}
          accessibilityLabel="Close picker"
        >
          <Pressable
            style={{
              backgroundColor: colors.background.primary,
              borderRadius: 16,
              padding: spacing[4],
              width: "100%",
              maxWidth: 400,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[
                typography.h3,
                {
                  color: colors.text.primary,
                  marginBottom: spacing[4],
                  textAlign: "center",
                },
              ]}
            >
              {getTitle()}
            </Text>

            <DateTimePicker
              value={tempValue}
              mode={mode === "datetime" ? "datetime" : mode}
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setTempValue(selectedDate);
                }
              }}
              style={{
                backgroundColor: colors.background.primary,
                height: 200,
              }}
              textColor={colors.text.primary}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: spacing[3],
                paddingTop: spacing[4],
                borderTopWidth: 1,
                borderTopColor: colors.border.light,
                marginTop: spacing[4],
              }}
            >
              <TouchableOpacity
                onPress={onCancel}
                style={{
                  flex: 1,
                  paddingVertical: spacing[3],
                  backgroundColor: colors.background.secondary,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border.medium,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[typography.body, { color: colors.text.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onConfirm(tempValue)}
                style={{
                  flex: 1,
                  paddingVertical: spacing[3],
                  backgroundColor: colors.primary[500],
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Confirm selection"
              >
                <Text style={[typography.body, { color: colors.text.inverse }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // Android Picker
  if (!visible) return null;

  return (
    <DateTimePicker
      value={tempValue}
      mode={mode === "datetime" ? androidStep : mode}
      display="default"
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      onChange={(event, selectedDate) => {
        if (event.type === "dismissed") {
          onCancel();
          return;
        }

        if (selectedDate) {
          if (mode === "datetime" && androidStep === "date") {
            // For datetime mode, show time picker next
            setTempValue(selectedDate);
            setAndroidStep("time");
          } else {
            // Final selection
            const finalDate =
              mode === "datetime" && androidStep === "time"
                ? new Date(
                    tempValue.getFullYear(),
                    tempValue.getMonth(),
                    tempValue.getDate(),
                    selectedDate.getHours(),
                    selectedDate.getMinutes(),
                  )
                : selectedDate;
            onConfirm(finalDate);
          }
        }
      }}
      textColor={colors.text.primary}
    />
  );
}

/**
 * Pressable date/time input field
 */
interface DateTimeFieldProps {
  value: Date;
  mode: "date" | "time";
  onPress: () => void;
  disabled?: boolean;
  _placeholder?: string;
}

export function DateTimeField({
  value,
  mode,
  onPress,
  disabled = false,
  _placeholder,
}: DateTimeFieldProps) {
  const formatValue = () => {
    if (mode === "date") {
      return value.toLocaleDateString();
    }
    return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Pressable
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border.medium,
        backgroundColor: disabled
          ? colors.gray[100]
          : colors.background.secondary,
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[3],
        borderRadius: 8,
        justifyContent: "center",
      }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${mode === "date" ? "Date" : "Time"}: ${formatValue()}`}
      accessibilityHint={disabled ? undefined : `Tap to change ${mode}`}
    >
      <Text
        style={[
          typography.bodySmall,
          { color: disabled ? colors.text.secondary : colors.text.primary },
        ]}
      >
        {formatValue()}
      </Text>
    </Pressable>
  );
}
