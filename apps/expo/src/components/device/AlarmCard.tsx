import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import cronstrue from "cronstrue";

import type { RouterOutputs } from "~/utils/api";
import { cards, colors, spacing, typography } from "~/styles";
import {
  calculateNextAlarmOccurrence,
  getAlarmStatusColor,
} from "~/utils/alarmUtils";

type Alarm = NonNullable<RouterOutputs["device"]["getById"]>["alarms"][number];

interface AlarmCardProps {
  alarm: Alarm;
  compact?: boolean;
  onPress?: () => void;
}

export function AlarmCard({ alarm, compact = false, onPress }: AlarmCardProps) {
  // Safely convert dates, providing defaults for invalid values
  const safeStartDate = React.useMemo(() => {
    console.log("AlarmCard processing startDate:", {
      raw: alarm.startDate,
      type: typeof alarm.startDate,
      isDate: alarm.startDate instanceof Date,
    });

    let date: Date;
    if (alarm.startDate instanceof Date) {
      date = alarm.startDate;
    } else {
      // Handle string dates from API
      date = new Date(alarm.startDate);
    }

    if (isNaN(date.getTime())) {
      console.warn(
        "Invalid startDate detected, using current date:",
        alarm.startDate,
      );
      return new Date();
    }

    return date;
  }, [alarm.startDate]);

  const safeEndDate = React.useMemo(() => {
    console.log("AlarmCard processing endDate:", {
      raw: alarm.endDate,
      type: typeof alarm.endDate,
      isDate: alarm.endDate instanceof Date,
    });

    if (!alarm.endDate) return undefined;

    let date: Date;
    if (alarm.endDate instanceof Date) {
      date = alarm.endDate;
    } else {
      // Handle string dates from API
      date = new Date(alarm.endDate);
    }

    if (isNaN(date.getTime())) {
      console.warn("Invalid endDate detected, ignoring:", alarm.endDate);
      return undefined;
    }

    return date;
  }, [alarm.endDate]);

  const scheduleInfo = React.useMemo(() => {
    // Debug logging to trace the source of invalid dates
    console.log("AlarmCard calculating schedule for alarm:", {
      id: alarm.id,
      isActive: alarm.isActive,
      startDate: safeStartDate,
      startDateValid: !isNaN(safeStartDate.getTime()),
      endDate: safeEndDate,
      endDateValid: safeEndDate ? !isNaN(safeEndDate.getTime()) : true,
      repeat: alarm.repeat,
      cronExpression: alarm.cronExpression,
    });

    return calculateNextAlarmOccurrence({
      isActive: alarm.isActive,
      startDate: safeStartDate,
      endDate: safeEndDate ?? null,
      repeat: alarm.repeat,
      cronExpression: alarm.cronExpression,
    });
  }, [
    alarm.id,
    alarm.isActive,
    safeStartDate,
    safeEndDate,
    alarm.repeat,
    alarm.cronExpression,
  ]);

  const getDetailedScheduleDescription = () => {
    const startTime = safeStartDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const startDate = safeStartDate.toLocaleDateString();

    let description = "";

    // Base schedule
    if (alarm.repeat) {
      try {
        description = cronstrue.toString(alarm.cronExpression);
      } catch {
        description = "Repeating alarm";
      }
    } else {
      description = `One-time alarm on ${startDate} at ${startTime}`;
    }

    // Add end date information if available
    if (safeEndDate) {
      const endDate = safeEndDate.toLocaleDateString();
      const endTime = safeEndDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (alarm.repeat) {
        description += ` until ${endDate} at ${endTime}`;
      }
    } else if (alarm.repeat) {
      description += " (continues indefinitely)";
    }

    // Add next occurrence info if available
    if (scheduleInfo.nextOccurrence && alarm.isActive) {
      const nextTime = scheduleInfo.nextOccurrence.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const nextDate = scheduleInfo.nextOccurrence.toLocaleDateString();
      const today = new Date().toLocaleDateString();

      if (nextDate === today) {
        description += `\nNext: Today at ${nextTime}`;
      } else {
        description += `\nNext: ${nextDate} at ${nextTime}`;
      }
    }

    // Add additional context for better understanding
    if (alarm.repeat && alarm.snoozePeriod && alarm.snoozePeriod > 0) {
      description += `\nSnooze: ${alarm.snoozePeriod} minutes`;
    }

    // Add status information
    if (!alarm.isActive) {
      description += "\n(Inactive)";
    } else if (safeEndDate && safeEndDate < new Date()) {
      description += "\n(Expired)";
    } else if (!scheduleInfo.nextOccurrence) {
      description += "\n(No upcoming occurrences)";
    }

    return description;
  };

  const getSeverityConfig = (severityLevel: string) => {
    switch (severityLevel) {
      case "CRITICAL":
        return {
          color: colors.error[500],
          icon: "warning" as const,
          bgColor: colors.error[50],
        };
      case "WARNING":
        return {
          color: colors.warning[500],
          icon: "alert-circle" as const,
          bgColor: colors.warning[50],
        };
      case "INFORMATIONAL":
        return {
          color: colors.success[500],
          icon: "information-circle" as const,
          bgColor: colors.success[50],
        };
      default:
        return {
          color: colors.text.secondary,
          icon: "information-circle" as const,
          bgColor: colors.background.secondary,
        };
    }
  };

  const getSyncStatusConfig = (status: string) => {
    switch (status) {
      case "SYNCED":
        return {
          color: colors.status.synced,
          icon: "checkmark-circle" as const,
          text: "Synced",
        };
      case "SYNCING":
        return {
          color: colors.status.syncing,
          icon: "sync" as const,
          text: "Syncing",
        };
      case "ERROR":
        return {
          color: colors.status.error,
          icon: "close-circle" as const,
          text: "Error",
        };
      default:
        return {
          color: colors.status.pending,
          icon: "time" as const,
          text: "Pending",
        };
    }
  };

  const severityConfig = getSeverityConfig(alarm.severityLevel as string);
  const syncConfig = getSyncStatusConfig(alarm.syncStatus);

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cards.base,
          { marginBottom: spacing[3] },
          pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        ]}
      >
        {/* Header Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: spacing[2],
          }}
        >
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name={alarm.isActive ? "notifications" : "notifications-off"}
              size={18}
              color={
                alarm.isActive ? colors.primary[500] : colors.text.secondary
              }
              style={{ marginRight: spacing[2] }}
            />
            <Text
              style={[
                typography.labelLarge,
                {
                  flex: 1,
                  color: alarm.isActive
                    ? colors.text.primary
                    : colors.text.secondary,
                },
              ]}
              numberOfLines={1}
            >
              {alarm.title}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
              marginLeft: spacing[2],
            }}
          >
            {/* Severity Indicator */}
            <View
              style={{
                paddingHorizontal: spacing[2],
                paddingVertical: spacing[1],
                borderRadius: spacing[1],
                backgroundColor: severityConfig.bgColor,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: severityConfig.color,
                    fontWeight: "600",
                    fontSize: 10,
                  },
                ]}
              >
                {alarm.severityLevel.charAt(0)}
              </Text>
            </View>
            {onPress && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.text.tertiary}
              />
            )}
          </View>
        </View>

        {/* Schedule Description */}
        <Text
          style={[
            typography.caption,
            {
              color: colors.text.secondary,
              lineHeight: 16,
              marginBottom: spacing[2],
            },
          ]}
          numberOfLines={2}
        >
          {getDetailedScheduleDescription()}
        </Text>

        {/* Details Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            paddingTop: spacing[2],
            borderTopWidth: 1,
            borderTopColor: colors.border.light,
          }}
        >
          {/* LED Color */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[1],
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor:
                  alarm.ledColor === "RED"
                    ? "#ff3b30"
                    : alarm.ledColor === "GREEN"
                      ? "#34c759"
                      : alarm.ledColor === "BLUE"
                        ? "#007aff"
                        : alarm.ledColor === "YELLOW"
                          ? "#ffcc02"
                          : alarm.ledColor === "MAGENTA"
                            ? "#af52de"
                            : alarm.ledColor === "CYAN"
                              ? "#00ffff"
                              : "#ffffff",
                borderWidth: 1,
                borderColor: colors.border.light,
              }}
            />
            <Text
              style={[
                typography.caption,
                { color: colors.text.tertiary, fontSize: 10 },
              ]}
            >
              {alarm.ledPattern.replace("_", " ")}
            </Text>
          </View>

          {/* Vibration */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[1],
            }}
          >
            <Ionicons
              name="phone-portrait"
              size={12}
              color={colors.text.tertiary}
            />
            <Text
              style={[
                typography.caption,
                { color: colors.text.tertiary, fontSize: 10 },
              ]}
            >
              {alarm.vibrationIntensity.slice(0, 3)}
            </Text>
          </View>

          {/* Snooze */}
          {alarm.snoozePeriod > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[1],
              }}
            >
              <Ionicons name="time" size={12} color={colors.text.tertiary} />
              <Text
                style={[
                  typography.caption,
                  { color: colors.text.tertiary, fontSize: 10 },
                ]}
              >
                {alarm.snoozePeriod}m
              </Text>
            </View>
          )}

          {/* Sync Status */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[1],
              marginLeft: "auto",
            }}
          >
            <Ionicons
              name={syncConfig.icon}
              size={12}
              color={syncConfig.color}
            />
            <Text
              style={[
                typography.caption,
                { color: syncConfig.color, fontSize: 10, fontWeight: "600" },
              ]}
            >
              {syncConfig.text}
            </Text>
          </View>
        </View>

        {/* Next Occurrence */}
        {scheduleInfo.timeUntilNext && (
          <View
            style={{
              marginTop: spacing[2],
              paddingTop: spacing[2],
              borderTopWidth: 1,
              borderTopColor: colors.border.light,
            }}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: getAlarmStatusColor(scheduleInfo),
                  fontWeight: "600",
                  fontSize: 11,
                },
              ]}
              numberOfLines={1}
            >
              ⏰ {scheduleInfo.timeUntilNext}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cards.base,
        { marginBottom: spacing[4] },
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: spacing[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing[1],
            }}
          >
            <Ionicons
              name={alarm.isActive ? "notifications" : "notifications-off"}
              size={22}
              color={
                alarm.isActive ? colors.primary[500] : colors.text.secondary
              }
              style={{ marginRight: spacing[2] }}
            />
            <Text
              style={[
                typography.h6,
                {
                  flex: 1,
                  color: alarm.isActive
                    ? colors.text.primary
                    : colors.text.secondary,
                },
              ]}
            >
              {alarm.title}
            </Text>
          </View>
          {alarm.description && (
            <Text
              style={[
                typography.bodySmall,
                { color: colors.text.secondary, marginTop: spacing[1] },
              ]}
            >
              {alarm.description}
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          <View
            style={{
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[2],
              borderRadius: spacing[2],
              backgroundColor: severityConfig.bgColor,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={severityConfig.icon}
                size={16}
                color={severityConfig.color}
                style={{ marginRight: spacing[1] }}
              />
              <Text
                style={[
                  typography.caption,
                  { color: severityConfig.color, fontWeight: "600" },
                ]}
              >
                {alarm.severityLevel}
              </Text>
            </View>
          </View>

          {onPress && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text.tertiary}
            />
          )}
        </View>
      </View>

      {/* Schedule */}
      <View
        style={{
          backgroundColor: colors.background.tertiary,
          padding: spacing[3],
          borderRadius: spacing[2],
          marginBottom: spacing[3],
        }}
      >
        <Text
          style={[
            typography.bodySmall,
            {
              color: colors.text.primary,
              marginBottom: spacing[2],
              lineHeight: 20,
            },
          ]}
        >
          {getDetailedScheduleDescription()}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.text.tertiary, fontFamily: "monospace" },
          ]}
        >
          {alarm.cronExpression}
        </Text>
      </View>

      {/* LED & Vibration Settings */}
      <View
        style={{
          flexDirection: "row",
          gap: spacing[3],
          marginBottom: spacing[3],
          padding: spacing[3],
          backgroundColor: colors.background.secondary,
          borderRadius: spacing[2],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.caption,
              { color: colors.text.secondary, marginBottom: spacing[2] },
            ]}
          >
            LED Alert
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor:
                  alarm.ledColor === "RED"
                    ? "#ff3b30"
                    : alarm.ledColor === "GREEN"
                      ? "#34c759"
                      : alarm.ledColor === "BLUE"
                        ? "#007aff"
                        : alarm.ledColor === "YELLOW"
                          ? "#ffcc02"
                          : alarm.ledColor === "MAGENTA"
                            ? "#af52de"
                            : alarm.ledColor === "CYAN"
                              ? "#00ffff"
                              : "#ffffff",
                borderWidth: 2,
                borderColor: colors.border.light,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.caption,
                  { color: colors.text.primary, fontWeight: "600" },
                ]}
              >
                {alarm.ledColor}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.text.tertiary, fontSize: 10 },
                ]}
              >
                {alarm.ledPattern.replace(/_/g, " ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.caption,
              { color: colors.text.secondary, marginBottom: spacing[2] },
            ]}
          >
            Vibration
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
            }}
          >
            <Ionicons
              name="phone-portrait"
              size={24}
              color={colors.primary[500]}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.caption,
                  { color: colors.text.primary, fontWeight: "600" },
                ]}
              >
                {alarm.vibrationIntensity}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.text.tertiary, fontSize: 10 },
                ]}
              >
                Pattern {alarm.vibrationPattern}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Timing Settings */}
      <View
        style={{
          flexDirection: "row",
          gap: spacing[2],
          marginBottom: spacing[3],
        }}
      >
        <View
          style={{
            flex: 1,
            padding: spacing[3],
            backgroundColor: colors.background.secondary,
            borderRadius: spacing[2],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing[1],
            }}
          >
            <Ionicons
              name="time"
              size={16}
              color={colors.primary[500]}
              style={{ marginRight: spacing[1] }}
            />
            <Text
              style={[typography.caption, { color: colors.text.secondary }]}
            >
              Snooze
            </Text>
          </View>
          <Text
            style={[
              typography.bodySmall,
              { color: colors.text.primary, fontWeight: "600" },
            ]}
          >
            {alarm.snoozePeriod}m
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.text.tertiary, fontSize: 10 },
            ]}
          >
            Timeout: {alarm.snoozeTimeout}m
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            padding: spacing[3],
            backgroundColor: colors.background.secondary,
            borderRadius: spacing[2],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing[1],
            }}
          >
            <Ionicons
              name="repeat"
              size={16}
              color={colors.primary[500]}
              style={{ marginRight: spacing[1] }}
            />
            <Text
              style={[typography.caption, { color: colors.text.secondary }]}
            >
              Retrigger
            </Text>
          </View>
          <Text
            style={[
              typography.bodySmall,
              { color: colors.text.primary, fontWeight: "600" },
            ]}
          >
            {alarm.retriggerDelay}m
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.text.tertiary, fontSize: 10 },
            ]}
          >
            Timeout: {alarm.retriggerTimeout}m
          </Text>
        </View>
      </View>

      {/* Status Row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingTop: spacing[3],
          borderTopWidth: 1,
          borderTopColor: colors.border.light,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          <Ionicons
            name={alarm.isActive ? "checkmark-circle" : "close-circle"}
            size={18}
            color={alarm.isActive ? colors.success[500] : colors.text.secondary}
          />
          <Text
            style={[
              typography.caption,
              {
                color: alarm.isActive
                  ? colors.success[600]
                  : colors.text.secondary,
                fontWeight: "600",
              },
            ]}
          >
            {alarm.isActive ? "Active" : "Inactive"}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          <Ionicons name={syncConfig.icon} size={18} color={syncConfig.color} />
          <Text
            style={[
              typography.caption,
              {
                color: syncConfig.color,
                fontWeight: "600",
              },
            ]}
          >
            {syncConfig.text}
          </Text>
          {alarm.lastSync && (
            <Text
              style={[
                typography.caption,
                { color: colors.text.tertiary, fontSize: 10 },
              ]}
            >
              {new Date(alarm.lastSync).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
