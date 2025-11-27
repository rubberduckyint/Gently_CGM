/**
 * SelectionGroup Component
 *
 * A reusable component for selecting between multiple options.
 * Supports single and multi-select modes.
 */

import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, typography } from "~/styles";

export interface SelectionOption<T extends string = string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
}

interface SelectionGroupProps<T extends string = string> {
  /** Available options */
  options: SelectionOption<T>[];
  /** Currently selected value(s) */
  value: T | T[];
  /** Called when selection changes */
  onChange: (value: T | T[]) => void;
  /** Allow multiple selections */
  multiple?: boolean;
  /** Orientation of the options */
  orientation?: "horizontal" | "vertical";
  /** Disable all options */
  disabled?: boolean;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
  /** Size variant */
  size?: "small" | "medium" | "large";
}

export function SelectionGroup<T extends string = string>({
  options,
  value,
  onChange,
  multiple = false,
  orientation = "horizontal",
  disabled = false,
  style,
  size = "medium",
}: SelectionGroupProps<T>) {
  const selectedValues = Array.isArray(value) ? value : [value];

  const handlePress = (optionValue: T) => {
    if (disabled) return;

    if (multiple) {
      const currentValues = selectedValues;
      if (currentValues.includes(optionValue)) {
        onChange(currentValues.filter((v) => v !== optionValue));
      } else {
        onChange([...currentValues, optionValue] as T[]);
      }
    } else {
      onChange(optionValue);
    }
  };

  const isSelected = (optionValue: T) => selectedValues.includes(optionValue);

  const getPadding = () => {
    switch (size) {
      case "small":
        return { paddingVertical: spacing[1], paddingHorizontal: spacing[2] };
      case "large":
        return { paddingVertical: spacing[4], paddingHorizontal: spacing[5] };
      default:
        return { paddingVertical: spacing[2], paddingHorizontal: spacing[4] };
    }
  };

  const padding = getPadding();

  return (
    <View
      style={[
        {
          flexDirection: orientation === "horizontal" ? "row" : "column",
          gap: spacing[2],
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      accessible={true}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => handlePress(option.value)}
            disabled={disabled}
            style={[
              {
                flex: orientation === "horizontal" ? 1 : undefined,
                ...padding,
                borderRadius: 8,
                backgroundColor: selected
                  ? colors.primary[500]
                  : colors.background.secondary,
                borderWidth: 1,
                borderColor: selected
                  ? colors.primary[500]
                  : colors.border.light,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: option.icon ? "row" : "column",
                gap: option.icon ? spacing[2] : 0,
              },
            ]}
            accessible={true}
            accessibilityRole={multiple ? "checkbox" : "radio"}
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.label}
          >
            {option.icon && (
              <Ionicons
                name={option.icon}
                size={size === "small" ? 16 : 20}
                color={
                  selected ? colors.background.primary : colors.text.primary
                }
              />
            )}
            <Text
              style={[
                size === "small" ? typography.caption : typography.body,
                {
                  color: selected
                    ? colors.background.primary
                    : colors.text.primary,
                  fontWeight: selected ? "600" : "400",
                  textAlign: "center",
                },
              ]}
            >
              {option.label}
            </Text>
            {option.description && (
              <Text
                style={[
                  typography.caption,
                  {
                    color: selected
                      ? colors.background.primary
                      : colors.text.secondary,
                    textAlign: "center",
                    marginTop: spacing[1],
                  },
                ]}
              >
                {option.description}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Day selector specifically for weekdays
 */
interface DaySelectorProps {
  /** Selected days */
  selectedDays: string[];
  /** Called when selection changes */
  onDayChange: (days: string[]) => void;
  /** Disable the selector */
  disabled?: boolean;
}

const DAYS = [
  { value: "MON", label: "M" },
  { value: "TUE", label: "T" },
  { value: "WED", label: "W" },
  { value: "THU", label: "T" },
  { value: "FRI", label: "F" },
  { value: "SAT", label: "S" },
  { value: "SUN", label: "S" },
];

export function DaySelector({
  selectedDays,
  onDayChange,
  disabled = false,
}: DaySelectorProps) {
  const handleDayPress = (day: string) => {
    if (disabled) return;

    if (selectedDays.includes(day)) {
      onDayChange(selectedDays.filter((d) => d !== day));
    } else {
      onDayChange([...selectedDays, day]);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing[2],
        opacity: disabled ? 0.6 : 1,
      }}
      accessible={true}
      accessibilityLabel="Select days of the week"
    >
      {DAYS.map((day) => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <Pressable
            key={day.value}
            onPress={() => handleDayPress(day.value)}
            disabled={disabled}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isSelected
                ? colors.primary[500]
                : colors.background.secondary,
              borderWidth: 1,
              borderColor: isSelected
                ? colors.primary[500]
                : colors.border.light,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessible={true}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled }}
            accessibilityLabel={getDayName(day.value)}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: isSelected
                    ? colors.background.primary
                    : colors.text.primary,
                  fontWeight: isSelected ? "700" : "500",
                },
              ]}
            >
              {day.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function getDayName(day: string): string {
  const names: Record<string, string> = {
    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
    FRI: "Friday",
    SAT: "Saturday",
    SUN: "Sunday",
  };
  return names[day] ?? day;
}
