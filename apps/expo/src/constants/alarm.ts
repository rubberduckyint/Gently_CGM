/**
 * Alarm Constants
 *
 * Centralized constants for alarm options, BLE protocol values, and display mappings.
 * These serve as the single source of truth for all alarm-related options.
 */

import type {
  LedColor,
  LedPattern,
  SeverityLevel,
  VibrationIntensity,
  VibrationPattern,
} from "~/types";

/**
 * Severity level options for alarms
 */
export const SEVERITY_LEVELS: {
  value: SeverityLevel;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "INFORMATIONAL",
    label: "Informational",
    description: "Low-priority reminder",
    icon: "information-circle-outline",
  },
  {
    value: "WARNING",
    label: "Warning",
    description: "Important reminder",
    icon: "warning-outline",
  },
  {
    value: "CRITICAL",
    label: "Critical",
    description: "Urgent reminder",
    icon: "alert-circle-outline",
  },
];

/**
 * LED pattern options
 */
export const LED_PATTERNS: {
  value: LedPattern;
  label: string;
  description: string;
}[] = [
  { value: "OFF", label: "Off", description: "No LED light" },
  { value: "SOLID", label: "Solid", description: "Constant light" },
  { value: "BLINK_SLOW", label: "Slow Blink", description: "Gentle blinking" },
  { value: "BLINK_FAST", label: "Fast Blink", description: "Rapid blinking" },
  { value: "PULSE", label: "Pulse", description: "Breathing effect" },
  { value: "STROBE", label: "Strobe", description: "Intense flashing" },
];

/**
 * LED color options with hex values for previews
 */
export const LED_COLORS: {
  value: LedColor;
  label: string;
  hex: string;
}[] = [
  { value: "RED", label: "Red", hex: "#EF4444" },
  { value: "GREEN", label: "Green", hex: "#22C55E" },
  { value: "BLUE", label: "Blue", hex: "#3B82F6" },
  { value: "YELLOW", label: "Yellow", hex: "#EAB308" },
  { value: "MAGENTA", label: "Magenta", hex: "#D946EF" },
  { value: "CYAN", label: "Cyan", hex: "#06B6D4" },
  { value: "WHITE", label: "White", hex: "#F8FAFC" },
];

/**
 * Vibration pattern options
 */
export const VIBRATION_PATTERNS: {
  value: VibrationPattern;
  label: string;
  description: string;
  bleRange: [number, number]; // BLE protocol number range
}[] = [
  {
    value: "QUICK",
    label: "Quick",
    description: "Short pulses",
    bleRange: [1, 8],
  },
  {
    value: "HEARTBEAT",
    label: "Heartbeat",
    description: "Double pulse rhythm",
    bleRange: [9, 16],
  },
  {
    value: "RAPID",
    label: "Rapid",
    description: "Fast continuous",
    bleRange: [17, 32],
  },
  {
    value: "SYMPHONY",
    label: "Symphony",
    description: "Complex pattern",
    bleRange: [33, 63],
  },
];

/**
 * Vibration intensity options
 */
export const VIBRATION_INTENSITIES: {
  value: VibrationIntensity;
  label: string;
  percentage: number;
}[] = [
  { value: "LOW", label: "Low", percentage: 25 },
  { value: "MEDIUM", label: "Medium", percentage: 50 },
  { value: "HIGH", label: "High", percentage: 75 },
  { value: "MAXIMUM", label: "Maximum", percentage: 100 },
];

/**
 * Snooze period options (in minutes)
 */
export const SNOOZE_PERIODS = [1, 2, 3, 5, 10, 15, 20, 30] as const;

/**
 * Snooze timeout options (in minutes)
 */
export const SNOOZE_TIMEOUTS = [5, 10, 15, 20, 30, 45, 60] as const;

/**
 * Retrigger delay options (in minutes)
 * 0 means disabled
 */
export const RETRIGGER_DELAYS = [0, 1, 2, 3, 5, 10, 15, 30] as const;

/**
 * Retrigger timeout options (in minutes)
 * 0 means disabled
 */
export const RETRIGGER_TIMEOUTS = [0, 5, 10, 15, 30, 60, 120] as const;

/**
 * Days of week for repeat scheduling
 */
export const DAYS_OF_WEEK = [
  { value: "0", label: "Sun", fullLabel: "Sunday" },
  { value: "1", label: "Mon", fullLabel: "Monday" },
  { value: "2", label: "Tue", fullLabel: "Tuesday" },
  { value: "3", label: "Wed", fullLabel: "Wednesday" },
  { value: "4", label: "Thu", fullLabel: "Thursday" },
  { value: "5", label: "Fri", fullLabel: "Friday" },
  { value: "6", label: "Sat", fullLabel: "Saturday" },
] as const;

/**
 * Repeat type options
 */
export const REPEAT_TYPES = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
] as const;

/**
 * Helper function to get LED color hex value
 */
export function getLedColorHex(color: LedColor): string {
  return LED_COLORS.find((c) => c.value === color)?.hex ?? "#3B82F6";
}

/**
 * Helper function to map vibration pattern enum to BLE protocol number
 */
export function mapVibrationPatternToNumber(pattern: VibrationPattern): number {
  const config = VIBRATION_PATTERNS.find((p) => p.value === pattern);
  return config ? config.bleRange[0] : 1;
}

/**
 * Helper function to map BLE protocol number to vibration pattern enum
 */
export function mapNumberToVibrationPattern(num: number): VibrationPattern {
  for (const pattern of VIBRATION_PATTERNS) {
    if (num >= pattern.bleRange[0] && num <= pattern.bleRange[1]) {
      return pattern.value;
    }
  }
  return "QUICK";
}

/**
 * Default alarm values
 */
export const DEFAULT_ALARM_VALUES = {
  severityLevel: "INFORMATIONAL" as SeverityLevel,
  ledPattern: "BLINK_SLOW" as LedPattern,
  ledColor: "BLUE" as LedColor,
  vibrationPattern: "QUICK" as VibrationPattern,
  vibrationIntensity: "MEDIUM" as VibrationIntensity,
  snoozePeriod: 5,
  snoozeTimeout: 15,
  retriggerDelay: 1,
  retriggerTimeout: 5,
  pushNotification: true,
  emailNotification: false,
} as const;
