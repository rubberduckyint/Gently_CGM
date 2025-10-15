import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useGlobalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AlarmForSync } from "~/utils/alarmSync";
import { AlarmCard } from "~/components/device";
import { HamburgerMenu } from "~/components/ui/HamburgerMenu";
import { Header } from "~/components/ui/Header";
import { useBLE } from "~/contexts/BLEContext";
import { useAlarmSync } from "~/hooks/useAlarmSync";
import { createRemoveAllEventsRequest } from "~/services/ble/commands/removeAllEvents";
import { ResponseStatus } from "~/services/ble/types";
import {
  buttons,
  cards,
  colors,
  containers,
  spacing,
  typography,
} from "~/styles";
import { trpc } from "~/utils/api";

export default function DeviceDetailPage() {
  const { deviceId } = useGlobalSearchParams<{ deviceId: string }>();
  const queryClient = useQueryClient();
  const [autoConnectAttempted, setAutoConnectAttempted] = React.useState(false);

  // Store the initial device ID to prevent it from changing during navigation
  const [initialDeviceId] = React.useState(deviceId);

  // Debug logging to track device ID changes
  React.useEffect(() => {
    console.log("🔍 [Device Detail] Route deviceId:", deviceId);
    console.log("🔍 [Device Detail] Stored initialDeviceId:", initialDeviceId);
  }, [deviceId, initialDeviceId]);

  // Use BLE context to show connection status
  const {
    connectionState,
    connectToDevice,
    disconnectDevice,
    connectedDevice,
    notifications,
    sendBLECommand,
  } = useBLE();

  // Track the latest battery status from notifications
  const [batteryStatus, setBatteryStatus] = React.useState<{
    level: number; // 0=CRITICAL, 1=LOW, 2=MEDIUM, 3=GOOD, 4=FULL
    voltage: number;
    isCharging: boolean;
    levelText: string;
  } | null>(null);

  // Update battery status when notifications arrive
  React.useEffect(() => {
    const latestBatteryNotification = notifications
      .filter((n) => n.type === "battery")
      .slice(-1)[0];

    if (latestBatteryNotification?.description) {
      const regex = /Battery: (\w+) \((\d+)mV\)(?: - (Charging))?/;
      const match = regex.exec(latestBatteryNotification.description);

      if (match) {
        const levelText = match[1] ?? "UNKNOWN";
        const voltage = parseInt(match[2] ?? "0", 10);
        const isCharging = match[3] === "Charging";

        const levelMap: Record<string, number> = {
          CRITICAL: 0,
          LOW: 1,
          MEDIUM: 2,
          GOOD: 3,
          FULL: 4,
        };

        setBatteryStatus({
          level: levelMap[levelText] ?? 0,
          voltage,
          isCharging,
          levelText,
        });
      }
    }
  }, [notifications]);

  // Helper to get battery display info
  const getBatteryInfo = (status: typeof batteryStatus) => {
    if (!status) {
      return {
        color: colors.gray[400],
        text: "Unknown",
        icon: "battery-dead-outline" as const,
      };
    }

    const configs = [
      {
        color: colors.error[600],
        text: "Critical",
        icon: "battery-dead" as const,
      },
      { color: colors.error[500], text: "Low", icon: "battery-half" as const },
      {
        color: colors.warning[600],
        text: "Medium",
        icon: "battery-half" as const,
      },
      {
        color: colors.success[600],
        text: "Good",
        icon: "battery-full" as const,
      },
      {
        color: colors.success[600],
        text: "Full",
        icon: "battery-full" as const,
      },
    ];

    const config = configs[status.level] ?? configs[0];

    return {
      ...config,
      icon: status.isCharging
        ? ("battery-charging" as const)
        : (config?.icon ?? ("battery-dead-outline" as const)),
    };
  };

  const {
    data: device,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["device", "getById", { id: initialDeviceId }],
    queryFn: async () => {
      return await trpc.device.getById.query({ id: initialDeviceId });
    },
    enabled: !!initialDeviceId,
    retry: (failureCount, error) => {
      // Don't retry if the device is not found (likely deleted)
      if (
        error instanceof Error &&
        (error.message.includes("Device not found") ||
          error.message.includes("you don't have permission"))
      ) {
        return false;
      }
      // Default retry behavior for other errors
      return failureCount < 3;
    },
  });

  // Initialize alarm sync hook
  const alarmSync = useAlarmSync({
    deviceSerialNumber: device?.serialNumber ?? undefined,
    enabled: true,
    onSyncComplete: () => {
      // Reset the auto-sync flag so future changes can trigger new syncs
      autoSyncedRef.current = false;
      void queryClient.invalidateQueries({
        queryKey: ["device", "getById", { id: initialDeviceId }],
      });
    },
  });

  // Track if we've already auto-synced to prevent infinite loops
  const autoSyncedRef = React.useRef(false);
  // Track the previous alarm count to detect deletions
  const previousAlarmCountRef = React.useRef<number | null>(null);
  // Track the previous alarm data to detect updates
  const previousAlarmsRef = React.useRef<string | null>(null);

  // Auto-sync unsynced alarms when connected
  React.useEffect(() => {
    if (
      device?.alarms &&
      connectionState === "connected" &&
      !alarmSync.isSyncing
    ) {
      const alarmsForSync: AlarmForSync[] = device.alarms.map((alarm) => ({
        id: alarm.id,
        title: alarm.title,
        cronExpression: alarm.cronExpression,
        isActive: alarm.isActive,
        severityLevel: alarm.severityLevel,
        ledPattern: alarm.ledPattern,
        ledColor: alarm.ledColor,
        vibrationPattern: alarm.vibrationPattern,
        vibrationIntensity: alarm.vibrationIntensity,
        snoozePeriod: alarm.snoozePeriod,
        snoozeTimeout: alarm.snoozeTimeout,
        retriggerDelay: alarm.retriggerDelay,
        retriggerTimeout: alarm.retriggerTimeout,
        syncStatus: alarm.syncStatus,
      }));

      const currentAlarmCount = device.alarms.length;
      const previousAlarmCount = previousAlarmCountRef.current;

      // Create a hash of the current alarms to detect changes
      // Include key properties that would indicate the alarm needs re-syncing
      const currentAlarmsHash = JSON.stringify(
        alarmsForSync.map((a) => ({
          id: a.id,
          title: a.title,
          cronExpression: a.cronExpression,
          isActive: a.isActive,
          severityLevel: a.severityLevel,
          ledPattern: a.ledPattern,
          ledColor: a.ledColor,
          vibrationPattern: a.vibrationPattern,
          vibrationIntensity: a.vibrationIntensity,
        })),
      );
      const alarmsChanged = previousAlarmsRef.current !== currentAlarmsHash;

      // Reset the auto-sync flag if alarms have changed
      if (alarmsChanged) {
        console.log("📝 Alarms changed, triggering sync");
        autoSyncedRef.current = false;
      }

      // Trigger sync if we haven't already synced these alarms
      // We sync whenever alarms change or there's a deletion
      if (!autoSyncedRef.current) {
        const alarmWasDeleted =
          previousAlarmCount !== null && currentAlarmCount < previousAlarmCount;

        // Always sync if alarms changed or were deleted
        if (alarmsChanged || alarmWasDeleted) {
          // Set the flag IMMEDIATELY to prevent race conditions
          autoSyncedRef.current = true;

          console.log(
            `🔄 Triggering sync - changed: ${alarmsChanged}, deleted: ${alarmWasDeleted}`,
          );

          // Force sync of all alarms to peripheral
          void alarmSync.performSync(alarmsForSync, true);
        }
      }

      // Update the alarm count and hash for next comparison
      previousAlarmCountRef.current = currentAlarmCount;
      previousAlarmsRef.current = currentAlarmsHash;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.alarms, connectionState]);

  // Reset auto-sync flag when disconnected
  React.useEffect(() => {
    if (connectionState === "disconnected") {
      autoSyncedRef.current = false;
      previousAlarmCountRef.current = null;
      previousAlarmsRef.current = null;
    }
  }, [connectionState]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!initialDeviceId) throw new Error("Device ID is required");

      // Check if the current connected device matches the one being deleted
      console.log("🔍 Checking BLE connection before deletion...");
      console.log("   └─ Connected device:", connectedDevice);
      console.log("   └─ Device to delete:", device?.serialNumber);
      console.log("   └─ Connection state:", connectionState);

      if (connectedDevice && device?.serialNumber) {
        // Check if the connected device's serial number matches this device
        if (connectedDevice.serialNumber === device.serialNumber) {
          console.log(
            `🔌 Device ${device.serialNumber} is connected, will remove all events first...`,
          );

          // Only try to send command if actually connected
          if (connectionState === "connected") {
            try {
              // First, remove all events from the peripheral
              console.log(
                "🗑️ Sending REMOVE_ALL_EVENTS command to peripheral...",
              );
              const removeAllEventsCommand = createRemoveAllEventsRequest();
              const response = await sendBLECommand(
                removeAllEventsCommand,
                5000,
              );

              if (response.status === ResponseStatus.OK) {
                console.log(
                  "✅ Successfully removed all events from peripheral",
                );
              } else {
                console.warn(
                  "⚠️ Failed to remove all events from peripheral, continuing with deletion...",
                );
              }
            } catch (removeEventsError) {
              console.warn(
                `⚠️ Error removing events from ${device.serialNumber}:`,
                removeEventsError,
              );
              // Continue with deletion even if removing events fails
            }
          } else {
            console.log(
              `⚠️ Device state is ${connectionState}, skipping REMOVE_ALL_EVENTS command`,
            );
          }

          // Then disconnect the device
          try {
            await disconnectDevice();
            console.log(`✅ Disconnected device: ${device.serialNumber}`);
          } catch (disconnectError) {
            console.warn(
              `⚠️ Failed to disconnect ${device.serialNumber}:`,
              disconnectError,
            );
          }
        }
      }

      // Delete the device from the database
      console.log("🗑️ Deleting device from database...");
      return await trpc.device.delete.mutate({ id: initialDeviceId });
    },
    onSuccess: () => {
      console.log("✅ Device deleted successfully from database");
      // Invalidate the devices list so it refetches on the dashboard
      void queryClient.invalidateQueries({
        queryKey: ["devices"],
      });
      void queryClient.invalidateQueries({
        queryKey: [["device", "getAll"]],
      });

      // Navigate back to dashboard
      router.push("/dashboard");
    },
    onError: (error) => {
      console.error("❌ Device deletion failed:", error);
      Alert.alert(
        "Deletion Failed",
        `Could not delete device: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    },
  });

  // Handle device not found errors by navigating back automatically
  useEffect(() => {
    if (
      error?.message &&
      (error.message.includes("Device not found") ||
        error.message.includes("you don't have permission"))
    ) {
      console.log(
        `📱 Device not found or access denied for ID: ${initialDeviceId}`,
      );
      console.log("   └─ Error:", error.message);
      console.log("   └─ Current route deviceId:", deviceId);
      console.log("   └─ Navigating back to dashboard");
      
      // Add a small delay to prevent navigation loops and allow debugging
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [error, initialDeviceId, deviceId]);

  // Auto-connect to device when page loads
  useEffect(() => {
    const autoConnect = async () => {
      if (
        !device?.serialNumber ||
        autoConnectAttempted ||
        connectionState === "connected" ||
        connectionState === "connecting"
      ) {
        return;
      }

      setAutoConnectAttempted(true);
      console.log("🔄 Auto-connecting to device:", device.serialNumber);

      try {
        await connectToDevice(device.serialNumber);
      } catch (error) {
        console.warn("⚠️ Auto-connect failed:", error);
      }
    };

    void autoConnect();
  }, [device, autoConnectAttempted, connectionState, connectToDevice]);

  // Handle manual reconnect
  const handleReconnect = async () => {
    if (!device?.serialNumber) {
      Alert.alert("Error", "Device serial number is required for connection");
      return;
    }

    try {
      await connectToDevice(device.serialNumber);
    } catch (error) {
      Alert.alert(
        "Connection Failed",
        `Could not connect to device: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    }
  };

  const handleDeleteDevice = () => {
    Alert.alert(
      "Delete Device",
      "Are you sure you want to delete this device? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <View style={containers.contentCentered}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text
            style={[
              typography.body,
              { marginTop: spacing[3], color: colors.gray[500] },
            ]}
          >
            Loading device...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <View
          style={[
            containers.contentCentered,
            { alignItems: "center", paddingHorizontal: spacing[8] },
          ]}
        >
          <Text
            style={[
              typography.h5,
              {
                color: colors.error[600],
                marginBottom: spacing[2],
                textAlign: "center",
              },
            ]}
          >
            Failed to load device
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
            {error.message || "Please try again later"}
          </Text>
          <Pressable
            style={[buttons.base, buttons.primary]}
            onPress={() => router.back()}
          >
            <Text
              style={[typography.labelLarge, { color: colors.text.inverse }]}
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <View
          style={[
            containers.contentCentered,
            { alignItems: "center", paddingHorizontal: spacing[8] },
          ]}
        >
          <Text
            style={[
              typography.h5,
              {
                color: colors.error[600],
                marginBottom: spacing[6],
                textAlign: "center",
              },
            ]}
          >
            Device not found
          </Text>
          <Pressable
            style={[buttons.base, buttons.primary]}
            onPress={() => router.back()}
          >
            <Text
              style={[typography.labelLarge, { color: colors.text.inverse }]}
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header
        title=""
        showBackButton={true}
        rightComponent={
          <HamburgerMenu
            options={[
              {
                label: "Edit Device",
                onPress: () => router.push(`/devices/${deviceId}/edit`),
                icon: "pencil",
              },
              {
                label: "BLE Test",
                onPress: () => router.push(`/devices/${deviceId}/ble-test`),
                icon: "bluetooth",
              },
              {
                label: "Delete Device",
                onPress: handleDeleteDevice,
                icon: "trash",
                destructive: true,
              },
            ]}
          />
        }
      />
      <ScrollView
        style={containers.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Device Header */}
        <View style={[cards.base]}>
          <View>
            <Text style={[typography.h4, { marginBottom: spacing[1] }]}>
              {device.title}
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.text.secondary, marginBottom: spacing[3] },
              ]}
            >
              {device.description}
            </Text>

            {/* Device Stats */}
            <View style={{ gap: spacing[2] }}>
              {device.serialNumber && (
                <View style={[{ flexDirection: "row", alignItems: "center" }]}>
                  <Ionicons
                    name="barcode-outline"
                    size={14}
                    color={colors.gray[500]}
                    style={{ marginRight: spacing[1] }}
                  />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.gray[500], fontWeight: "500" },
                    ]}
                  >
                    {device.serialNumber}
                  </Text>
                </View>
              )}
              {/* Connection Status and Battery on same line */}
              <View
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[4],
                  },
                ]}
              >
                {/* Connection Status */}
                <View style={[{ flexDirection: "row", alignItems: "center" }]}>
                  <Ionicons
                    name="bluetooth"
                    size={14}
                    color={
                      connectionState === "connected"
                        ? colors.success[600]
                        : connectionState === "connecting"
                          ? colors.warning[600]
                          : colors.gray[400]
                    }
                    style={{ marginRight: spacing[1] }}
                  />
                  <Text
                    style={[
                      typography.caption,
                      {
                        color:
                          connectionState === "connected"
                            ? colors.success[600]
                            : connectionState === "connecting"
                              ? colors.warning[600]
                              : connectionState === "scanning"
                                ? colors.primary[600]
                                : colors.gray[500],
                        fontWeight: "500",
                      },
                    ]}
                  >
                    {connectionState.charAt(0).toUpperCase() +
                      connectionState.slice(1)}
                  </Text>
                </View>

                {/* Battery Status */}
                {batteryStatus && (
                  <View
                    style={[{ flexDirection: "row", alignItems: "center" }]}
                  >
                    <Ionicons
                      name={getBatteryInfo(batteryStatus).icon}
                      size={14}
                      color={getBatteryInfo(batteryStatus).color}
                      style={{ marginRight: spacing[1] }}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: getBatteryInfo(batteryStatus).color,
                          fontWeight: "500",
                        },
                      ]}
                    >
                      {getBatteryInfo(batteryStatus).text} (
                      {batteryStatus.voltage}mV)
                      {batteryStatus.isCharging && " ⚡"}
                    </Text>
                  </View>
                )}
              </View>
              {/* Reconnect Button */}
              {connectionState === "disconnected" && device.serialNumber && (
                <Pressable
                  style={[
                    buttons.base,
                    buttons.primary,
                    {
                      paddingVertical: spacing[1],
                      paddingHorizontal: spacing[3],
                      alignSelf: "flex-start",
                    },
                  ]}
                  onPress={handleReconnect}
                >
                  <Text
                    style={[typography.caption, { color: colors.text.inverse }]}
                  >
                    Reconnect
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Alarms Section */}
        <View style={containers.section}>
          <View
            style={[
              {
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing[4],
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: spacing[2],
              }}
            >
              <Ionicons
                name="alarm"
                size={24}
                color={colors.text.primary}
                style={{ marginRight: spacing[2] }}
              />
              <Text style={[typography.h5, { color: colors.text.primary }]}>
                Alarms ({device.alarms.length})
              </Text>
            </View>
            <View>
              <Pressable
                style={[
                  buttons.base,
                  buttons.success,
                  {
                    paddingVertical: spacing[2],
                    paddingHorizontal: spacing[4],
                  },
                ]}
                onPress={() => router.push(`/devices/${deviceId}/alarms/add`)}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={colors.text.inverse}
                  style={{ marginRight: spacing[1] }}
                />
                <Text
                  style={[typography.label, { color: colors.text.inverse }]}
                >
                  Add Alarm
                </Text>
              </Pressable>
            </View>
          </View>

          {device.alarms.length === 0 ? (
            <View
              style={[
                cards.base,
                { alignItems: "center", paddingVertical: spacing[8] },
              ]}
            >
              <Ionicons
                name="alarm-outline"
                size={48}
                color={colors.gray[400]}
                style={{ marginBottom: spacing[3] }}
              />
              <Text
                style={[
                  typography.h6,
                  { color: colors.text.primary, marginBottom: spacing[1] },
                ]}
              >
                No alarms configured
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: colors.text.secondary, textAlign: "center" },
                ]}
              >
                Add your first alarm to get started
              </Text>
            </View>
          ) : (
            <View style={[{ gap: spacing[3] }]}>
              {device.alarms.map((alarm) => {
                return (
                  <AlarmCard
                    key={alarm.id}
                    alarm={alarm}
                    onPress={() => {
                      console.log(
                        "🚨 Navigating to alarm edit:",
                        alarm.id,
                        "from device:",
                        deviceId,
                      );
                      router.push(
                        `/devices/${deviceId}/alarms/edit/${alarm.id}`,
                      );
                    }}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
