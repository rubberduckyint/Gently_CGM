/**
 * Accessibility Utilities
 *
 * Centralized accessibility helpers to ensure consistent a11y patterns
 * throughout the app. These utilities help generate proper accessibility
 * labels, hints, and roles for common UI patterns.
 */

import type { AccessibilityRole } from "react-native";

/**
 * Common accessibility props type
 */
export interface A11yProps {
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | "mixed";
    busy?: boolean;
    expanded?: boolean;
  };
}

/**
 * Generate accessibility props for a button
 */
export function buttonA11y(
  label: string,
  options?: {
    hint?: string;
    disabled?: boolean;
  },
): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: options?.hint,
    accessibilityRole: "button",
    accessibilityState: options?.disabled ? { disabled: true } : undefined,
  };
}

/**
 * Generate accessibility props for a link
 */
export function linkA11y(
  label: string,
  options?: {
    hint?: string;
  },
): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: options?.hint ?? `Navigates to ${label}`,
    accessibilityRole: "link",
  };
}

/**
 * Generate accessibility props for a toggle/switch
 */
export function switchA11y(
  label: string,
  isOn: boolean,
  options?: {
    hint?: string;
    disabled?: boolean;
  },
): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: `${label}, ${isOn ? "on" : "off"}`,
    accessibilityHint:
      options?.hint ?? `Double tap to ${isOn ? "turn off" : "turn on"}`,
    accessibilityRole: "switch",
    accessibilityState: {
      checked: isOn,
      disabled: options?.disabled,
    },
  };
}

/**
 * Generate accessibility props for a text input
 */
export function textInputA11y(
  label: string,
  options?: {
    hint?: string;
    value?: string;
    placeholder?: string;
  },
): A11yProps {
  const labelWithValue = options?.value
    ? `${label}, current value: ${options.value}`
    : label;

  return {
    accessible: true,
    accessibilityLabel: labelWithValue,
    accessibilityHint: options?.hint ?? "Double tap to edit",
    accessibilityRole: "none", // TextInput handles its own role
  };
}

/**
 * Generate accessibility props for a selectable item
 */
export function selectableA11y(
  label: string,
  isSelected: boolean,
  options?: {
    hint?: string;
    index?: number;
    total?: number;
  },
): A11yProps {
  let positionInfo = "";
  if (options?.index !== undefined && options?.total !== undefined) {
    positionInfo = `, ${options.index + 1} of ${options.total}`;
  }

  return {
    accessible: true,
    accessibilityLabel: `${label}${positionInfo}`,
    accessibilityHint:
      options?.hint ??
      (isSelected ? "Currently selected" : "Double tap to select"),
    accessibilityRole: "button",
    accessibilityState: { selected: isSelected },
  };
}

/**
 * Generate accessibility props for a card/container
 */
export function cardA11y(
  label: string,
  options?: {
    hint?: string;
    isActionable?: boolean;
  },
): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: options?.hint,
    accessibilityRole: options?.isActionable ? "button" : "none",
  };
}

/**
 * Generate accessibility props for a list item
 */
export function listItemA11y(
  label: string,
  options?: {
    hint?: string;
    index?: number;
    total?: number;
    isActionable?: boolean;
  },
): A11yProps {
  let positionInfo = "";
  if (options?.index !== undefined && options?.total !== undefined) {
    positionInfo = `, item ${options.index + 1} of ${options.total}`;
  }

  return {
    accessible: true,
    accessibilityLabel: `${label}${positionInfo}`,
    accessibilityHint: options?.hint,
    accessibilityRole: options?.isActionable ? "button" : "none",
  };
}

/**
 * Generate accessibility props for a header/heading
 */
export function headingA11y(
  label: string,
  _options?: {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
  },
): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: "header",
  };
}

/**
 * Generate accessibility props for an image
 */
export function imageA11y(
  description: string,
  options?: {
    isDecorative?: boolean;
  },
): A11yProps {
  if (options?.isDecorative) {
    return {
      accessible: false,
      accessibilityLabel: undefined,
    };
  }

  return {
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: "image",
  };
}

/**
 * Generate accessibility props for a loading state
 */
export function loadingA11y(message = "Loading"): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: message,
    accessibilityRole: "progressbar",
    accessibilityState: { busy: true },
  };
}

/**
 * Generate accessibility props for an alert/notification
 */
export function alertA11y(message: string): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: message,
    accessibilityRole: "alert",
  };
}

/**
 * Generate accessibility props for a tab
 */
export function tabA11y(
  label: string,
  isSelected: boolean,
  options?: {
    index?: number;
    total?: number;
  },
): A11yProps {
  let positionInfo = "";
  if (options?.index !== undefined && options?.total !== undefined) {
    positionInfo = `, tab ${options.index + 1} of ${options.total}`;
  }

  return {
    accessible: true,
    accessibilityLabel: `${label}${positionInfo}`,
    accessibilityHint: isSelected
      ? "Currently selected"
      : "Double tap to select",
    accessibilityRole: "tab",
    accessibilityState: { selected: isSelected },
  };
}

/**
 * Format a date for accessibility announcements
 */
export function formatDateForA11y(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a time for accessibility announcements
 */
export function formatTimeForA11y(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a date and time for accessibility announcements
 */
export function formatDateTimeForA11y(date: Date): string {
  return `${formatDateForA11y(date)} at ${formatTimeForA11y(date)}`;
}
