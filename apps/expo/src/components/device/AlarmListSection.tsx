/**
 * AlarmListSection Component
 *
 * Displays a list of alarms for a device, grouped by active and expired.
 */

import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { colors, spacing, typography } from "~/styles";
import { buttonA11y } from "~/utils/accessibility";
import { calculateNextAlarmOccurrence } from "~/utils/alarmUtils";
import { AlarmCard } from "./AlarmCard";

type Alarm = NonNullable<RouterOutputs["device"]["getById"]>["alarms"][number];

interface AlarmListSectionProps {
  alarms: Alarm[];
  showExpiredAlarms: boolean;
  onToggleExpired: () => void;
  onAlarmPress: (alarmId: string) => void;
  onAddAlarm: () => void;
}

/**
 * Check if an alarm is expired/completed
 */
function isAlarmExpired(alarm: Alarm): boolean {
  const scheduleInfo = calculateNextAlarmOccurrence({
    isActive: alarm.isActive,
    startDate: alarm.startDate,
    endDate: alarm.endDate,
    repeat: alarm.repeat,
    cronExpression: alarm.cronExpression,
  });
  return (
    scheduleInfo.status === "completed" || scheduleInfo.status === "overdue"
  );
}

export function AlarmListSection({
  alarms,
  showExpiredAlarms,
  onToggleExpired,
  onAlarmPress,
  onAddAlarm,
}: AlarmListSectionProps) {
  // Categorize alarms
  const categorizedAlarms = useMemo(() => {
    const active: { alarm: Alarm; isExpired: false }[] = [];
    const expired: { alarm: Alarm; isExpired: true }[] = [];

    for (const alarm of alarms) {
      if (isAlarmExpired(alarm)) {
        expired.push({ alarm, isExpired: true });
      } else {
        active.push({ alarm, isExpired: false });
      }
    }

    return { active, expired };
  }, [alarms]);

  const { active: activeAlarms, expired: expiredAlarms } = categorizedAlarms;

  // Empty state
  if (alarms.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: spacing[8],
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.gray[100],
            justifyContent: "center",
            alignItems: "center",
            marginBottom: spacing[4],
          }}
        >
          <Ionicons name="alarm-outline" size={40} color={colors.gray[400]} />
        </View>
        <Text
          style={[
            typography.h5,
            {
              color: colors.text.secondary,
              marginBottom: spacing[2],
              textAlign: "center",
            },
          ]}
        >
          No reminders yet
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: colors.gray[500],
              textAlign: "center",
              marginBottom: spacing[6],
            },
          ]}
        >
          Add your first reminder to get started with gentle nudges throughout
          your day
        </Text>
        <Pressable
          style={{
            backgroundColor: colors.primary[500],
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[6],
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
          }}
          onPress={onAddAlarm}
          {...buttonA11y("Add your first reminder", {
            hint: "Creates a new reminder for this device",
          })}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={[typography.labelLarge, { color: "white" }]}>
            Add Your First Reminder
          </Text>
        </Pressable>
      </View>
    );
  }

  // All alarms are expired
  if (activeAlarms.length === 0 && expiredAlarms.length > 0) {
    return (
      <View style={{ gap: spacing[3] }}>
        <View
          style={{
            paddingVertical: spacing[8],
            alignItems: "center",
          }}
        >
          <Text
            style={[
              typography.body,
              {
                color: colors.gray[500],
                textAlign: "center",
                marginBottom: spacing[3],
              },
            ]}
          >
            All reminders have completed
          </Text>
          <Pressable
            style={{
              backgroundColor: colors.primary[500],
              paddingVertical: spacing[3],
              paddingHorizontal: spacing[5],
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
            }}
            onPress={onAddAlarm}
            {...buttonA11y("Add new reminder", {
              hint: "Creates a new reminder for this device",
            })}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={[typography.labelLarge, { color: "white" }]}>
              Add New Reminder
            </Text>
          </Pressable>
        </View>

        {/* Expired alarms section */}
        {expiredAlarms.length > 0 && (
          <View style={{ marginTop: spacing[4] }}>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: spacing[2],
              }}
              onPress={onToggleExpired}
              {...buttonA11y(
                `${showExpiredAlarms ? "Hide" : "Show"} ${expiredAlarms.length} expired reminders`,
                {
                  hint: showExpiredAlarms
                    ? "Collapses the expired reminders list"
                    : "Expands to show expired reminders",
                },
              )}
            >
              <Text style={[typography.label, { color: colors.gray[500] }]}>
                {expiredAlarms.length} Expired Reminder
                {expiredAlarms.length !== 1 ? "s" : ""}
              </Text>
              <Ionicons
                name={showExpiredAlarms ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.gray[500]}
              />
            </Pressable>

            {showExpiredAlarms && (
              <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
                {expiredAlarms.map(({ alarm }) => (
                  <AlarmCard
                    key={alarm.id}
                    alarm={alarm}
                    isExpired={true}
                    onPress={() => onAlarmPress(alarm.id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // Has active alarms
  return (
    <View style={{ gap: spacing[3] }}>
      {/* Active Alarms */}
      {activeAlarms.map(({ alarm }) => (
        <AlarmCard
          key={alarm.id}
          alarm={alarm}
          onPress={() => onAlarmPress(alarm.id)}
        />
      ))}

      {/* Expired Alarms Toggle */}
      {expiredAlarms.length > 0 && (
        <View style={{ marginTop: spacing[4] }}>
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: spacing[2],
            }}
            onPress={onToggleExpired}
            {...buttonA11y(
              `${showExpiredAlarms ? "Hide" : "Show"} ${expiredAlarms.length} expired reminders`,
              {
                hint: showExpiredAlarms
                  ? "Collapses the expired reminders list"
                  : "Expands to show expired reminders",
              },
            )}
          >
            <Text style={[typography.label, { color: colors.gray[500] }]}>
              {expiredAlarms.length} Expired Reminder
              {expiredAlarms.length !== 1 ? "s" : ""}
            </Text>
            <Ionicons
              name={showExpiredAlarms ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.gray[500]}
            />
          </Pressable>

          {showExpiredAlarms && (
            <View style={{ gap: spacing[3], marginTop: spacing[3] }}>
              {expiredAlarms.map(({ alarm }) => (
                <AlarmCard
                  key={alarm.id}
                  alarm={alarm}
                  isExpired={true}
                  onPress={() => onAlarmPress(alarm.id)}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
