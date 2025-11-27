/**
 * Alarm Utilities
 *
 * Shared utility functions for alarms used across web and mobile apps.
 */

import cronstrue from "cronstrue";

import type { AlarmFormData, ScheduleInfo } from "./types";

// ============================================================================
// Cron Expression Utilities
// ============================================================================

/**
 * Generate a cron expression from alarm form values
 */
export function generateCronExpression(
  values: Pick<
    AlarmFormData,
    "startDate" | "repeat" | "repeatType" | "repeatEvery" | "daysOfWeek"
  >,
): string {
  const date =
    values.startDate instanceof Date
      ? values.startDate
      : new Date(values.startDate);
  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;

  if (!values.repeat) {
    // One-time alarm
    return `${minute} ${hour} ${day} ${month} *`;
  }

  switch (values.repeatType) {
    case "minutes":
      return `*/${values.repeatEvery} * * * *`;
    case "hours":
      return `${minute} */${values.repeatEvery} * * *`;
    case "days":
      return `${minute} ${hour} */${values.repeatEvery} * *`;
    case "weeks": {
      const days =
        values.daysOfWeek.length > 0 ? values.daysOfWeek.join(",") : "*";
      return `${minute} ${hour} * * ${days}`;
    }
    default:
      return `${minute} ${hour} ${day} ${month} *`;
  }
}

/**
 * Parse a cron expression to human-readable format
 */
export function parseCronExpression(cronExpression: string): string {
  try {
    return cronstrue.toString(cronExpression, {
      use24HourTimeFormat: false,
      verbose: true,
    });
  } catch (error) {
    console.warn("Failed to parse cron expression:", cronExpression, error);
    return "Invalid schedule";
  }
}

// ============================================================================
// Date Formatting Utilities
// ============================================================================

/**
 * Format a date as datetime-local input value (YYYY-MM-DDTHH:MM)
 */
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format a date with time for display
 */
export function formatDateWithTime(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;

  // Show date for other days
  const dateStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Format distance to a date in human-readable format
 */
export function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return "Past";

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  if (days < 7) return `${days}d ${hours % 24}h`;
  return `${days}d`;
}

// ============================================================================
// Alarm Schedule Calculation
// ============================================================================

interface CalculateScheduleParams {
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  repeat: boolean;
  cronExpression: string;
}

/**
 * Calculate the next alarm occurrence and schedule information
 */
export function calculateNextAlarmOccurrence(
  params: CalculateScheduleParams,
): ScheduleInfo {
  const { isActive, startDate, endDate, repeat, cronExpression } = params;
  const now = new Date();

  // Check if alarm is expired
  if (endDate && endDate < now) {
    return {
      nextOccurrence: null,
      timeUntilNext: null,
      isExpired: true,
      displayText: "Expired",
    };
  }

  // If not active, show disabled
  if (!isActive) {
    return {
      nextOccurrence: startDate > now ? startDate : null,
      timeUntilNext: null,
      isExpired: false,
      displayText: "Disabled",
    };
  }

  // For one-time alarms
  if (!repeat) {
    if (startDate < now) {
      return {
        nextOccurrence: null,
        timeUntilNext: null,
        isExpired: true,
        displayText: "Expired",
      };
    }
    return {
      nextOccurrence: startDate,
      timeUntilNext: formatTimeUntil(startDate),
      isExpired: false,
      displayText: formatDateWithTime(startDate),
    };
  }

  // For repeating alarms, use the cron description
  const cronDescription = parseCronExpression(cronExpression);

  // Simple next occurrence calculation for repeating alarms
  let nextOccurrence = startDate;
  if (startDate < now) {
    // Calculate next occurrence based on repeat pattern
    // This is a simplified calculation
    nextOccurrence = new Date(now);
    nextOccurrence.setHours(startDate.getHours());
    nextOccurrence.setMinutes(startDate.getMinutes());
    nextOccurrence.setSeconds(0);

    if (nextOccurrence < now) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
    }
  }

  return {
    nextOccurrence,
    timeUntilNext: formatTimeUntil(nextOccurrence),
    isExpired: false,
    displayText: cronDescription,
    repeatInfo: cronDescription,
  };
}
