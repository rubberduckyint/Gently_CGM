/**
 * Alarm Types
 *
 * Shared type definitions for alarms used across web and mobile apps.
 * These are the canonical source of truth for alarm-related types.
 */

// ============================================================================
// Enum Types (matching database schema)
// ============================================================================

export type SeverityLevel = "INFORMATIONAL" | "WARNING" | "CRITICAL";

export type LedPattern =
  | "OFF"
  | "SOLID"
  | "BLINK_SLOW"
  | "BLINK_FAST"
  | "PULSE"
  | "STROBE";

export type LedColor =
  | "RED"
  | "GREEN"
  | "BLUE"
  | "YELLOW"
  | "MAGENTA"
  | "CYAN"
  | "WHITE";

export type VibrationIntensity = "LOW" | "MEDIUM" | "HIGH" | "MAXIMUM";

export type VibrationPattern = "QUICK" | "HEARTBEAT" | "RAPID" | "SYMPHONY";

export type SyncStatus = "NOT_SYNCED" | "SYNCING" | "SYNCED" | "ERROR";

export type RepeatType = "minutes" | "hours" | "days" | "weeks";

export type EndsType = "never" | "on" | "after";

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Alarm form data used when creating or editing alarms.
 * This is the client-side representation that maps to the Alarm schema.
 */
export interface AlarmFormData {
  title: string;
  description: string;
  startDate: Date;
  repeat: boolean;
  repeatType: RepeatType;
  repeatEvery: number;
  daysOfWeek: string[];
  ends: EndsType;
  endsOnDate?: Date;
  endsAfter?: number;
  isActive?: boolean;
  // BLE Protocol fields
  severityLevel: SeverityLevel;
  ledPattern: LedPattern;
  ledColor: LedColor;
  vibrationPattern: VibrationPattern | number;
  vibrationIntensity: VibrationIntensity;
  snoozePeriod: number;
  snoozeTimeout: number;
  retriggerDelay: number;
  retriggerTimeout: number;
  // Notification settings
  pushNotification: boolean;
  emailNotification: boolean;
}

/**
 * Schedule display information for alarms
 */
export interface ScheduleInfo {
  nextOccurrence: Date | null;
  timeUntilNext: string | null;
  isExpired: boolean;
  displayText: string;
  repeatInfo?: string;
}

// ============================================================================
// Option Types for UI Components
// ============================================================================

export interface LabeledOption<T> {
  value: T;
  label: string;
  short?: string;
  description?: string;
  icon?: string;
}

export interface ColorOption {
  value: LedColor;
  label: string;
  hex: string;
}
