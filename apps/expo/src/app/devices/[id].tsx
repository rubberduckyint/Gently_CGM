import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { State } from "react-native-ble-plx";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useGlobalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BluetoothDevice } from "~/services/bluetooth/types";
import type { RouterOutputs } from "~/utils/api";
import { useBluetooth } from "~/services/bluetooth";
import { readComprehensiveDeviceDetails } from "~/services/bluetooth/deviceData";
import { trpc } from "~/utils/api";

type DeviceWithAlarms = RouterOutputs["device"]["getById"];

function AlarmCard({
  alarm,
}: {
  alarm: NonNullable<DeviceWithAlarms>["alarms"][number];
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "#ef4444";
      case "MEDIUM":
        return "#f59e0b";
      case "LOW":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  return (
    <View style={styles.alarmCard}>
      <View style={styles.alarmHeader}>
        <View style={styles.alarmInfo}>
          <Text style={styles.alarmTitle}>{alarm.title}</Text>
          {alarm.description && (
            <Text style={styles.alarmDescription}>{alarm.description}</Text>
          )}
        </View>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(alarm.priority) },
          ]}
        >
          <Text style={styles.priorityText}>{alarm.priority}</Text>
        </View>
      </View>
      <View style={styles.alarmDetails}>
        <View style={styles.alarmDetailItem}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text
            style={[
              styles.detailValue,
              { color: alarm.isActive ? "#10b981" : "#6b7280" },
            ]}
          >
            {alarm.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
        <View style={styles.alarmDetailItem}>
          <Text style={styles.detailLabel}>Repeat</Text>
          <Text style={styles.detailValue}>{alarm.repeat ? "Yes" : "No"}</Text>
        </View>
        <View style={styles.alarmDetailItem}>
          <Text style={styles.detailLabel}>Haptic</Text>
          <Text style={styles.detailValue}>{alarm.hapticChoice}</Text>
        </View>
      </View>
    </View>
  );
}

export default function DeviceDetailPage() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const {
    connect,
    disconnect,
    getDeviceInfo,
    startScan,
    stopScan,
    getBluetoothState,
    checkConnection,
  } = useBluetooth();

  const {
    data: device,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["device", "getById", { id: id }],
    queryFn: async () => {
      return await trpc.device.getById.query({ id: id });
    },
    enabled: !!id,
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async () => {
      return await trpc.device.delete.mutate({ id: id });
    },
    onSuccess: () => {
      // Invalidate the devices list to refresh the dashboard
      void queryClient.invalidateQueries({ queryKey: ["device", "getAll"] });
      // Navigate back to dashboard
      router.back();
    },
    onError: (error) => {
      Alert.alert("Error", `Failed to delete device: ${error.message}`);
    },
  });

  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isGettingDetails, setIsGettingDetails] = React.useState(false);

  const handleGetDeviceDetails = async () => {
    if (!device?.id) return;

    setIsGettingDetails(true);
    try {
      console.log(
        `🔍 Getting comprehensive device details for: ${device.title}`,
      );

      // Check if Bluetooth is available and enabled
      const bluetoothState = await getBluetoothState();
      console.log("📡 Bluetooth State:", bluetoothState);

      if (bluetoothState !== State.PoweredOn) {
        console.error(
          "❌ Bluetooth is not powered on. Current state:",
          bluetoothState,
        );
        return;
      }

      // Check if device is nearby by scanning briefly
      console.log("🔍 Checking if device is nearby...");

      let deviceFound = false;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          stopScan();
          resolve();
        }, 5000); // 5 second scan

        startScan(
          (foundDevice: BluetoothDevice) => {
            if (foundDevice.id === device.id) {
              console.log(
                "✅ Device found during scan:",
                foundDevice.name,
                "RSSI:",
                foundDevice.rssi,
              );
              deviceFound = true;
              clearTimeout(timeout);
              stopScan();
              resolve();
            }
          },
          { timeout: 5000 },
        );
      });

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!deviceFound) {
        console.warn(
          "⚠️ Device not found during scan - may be out of range or not advertising",
        );
        console.log("� Attempting connection anyway...");
      }

      // Connect to the device
      console.log("🔗 Attempting to connect...");
      const result = await connect(device.id);
      console.log("✅ Successfully connected to device");

      // Get device info
      const deviceInfo = getDeviceInfo();
      console.log("📱 Device Information:", deviceInfo);

      // Get device time and details
      try {
        const comprehensiveDetails =
          await readComprehensiveDeviceDetails(result);
        console.log("⏰ Comprehensive Device Details:", comprehensiveDetails);

        // Store the serial number and other device info in the database
        if (comprehensiveDetails.deviceInfo.serialNumber !== "unknown") {
          console.log(
            "💾 Storing device serial number:",
            comprehensiveDetails.deviceInfo.serialNumber,
          );

          try {
            // Check if we already have a device with this serial number
            const existingDevice = await trpc.device.findBySerialNumber.query({
              serialNumber: comprehensiveDetails.deviceInfo.serialNumber,
            });

            if (existingDevice && existingDevice.id !== device.id) {
              Alert.alert(
                "Device Conflict",
                `This device's serial number (${comprehensiveDetails.deviceInfo.serialNumber}) is already associated with another device: "${existingDevice.title}". This might indicate a duplicate device entry.`,
                [
                  { text: "Continue Anyway", style: "destructive" },
                  { text: "Cancel", style: "cancel" },
                ],
              );
              return;
            }

            // Update the device with Bluetooth info
            await trpc.device.updateFromBluetooth.mutate({
              id: device.id,
              serialNumber: comprehensiveDetails.deviceInfo.serialNumber,
              batteryLevel: comprehensiveDetails.batteryLevel,
              firmwareVersion: comprehensiveDetails.deviceInfo.firmwareVersion,
            });

            console.log("✅ Device info updated in database");

            // Refresh the device data
            await queryClient.invalidateQueries({
              queryKey: ["device", "getById", { id: device.id }],
            });

            Alert.alert(
              "Device Details Retrieved",
              `✅ Successfully connected and updated device info!\n\nSerial Number: ${comprehensiveDetails.deviceInfo.serialNumber}\nFirmware: ${comprehensiveDetails.deviceInfo.firmwareVersion}\nBattery: ${comprehensiveDetails.batteryLevel}%\nDevice Time: ${comprehensiveDetails.deviceTime.toLocaleString()}`,
              [{ text: "OK" }],
            );
          } catch (dbError) {
            console.error("❌ Failed to update device in database:", dbError);

            if (
              dbError instanceof Error &&
              dbError.message.includes("Serial number mismatch")
            ) {
              Alert.alert(
                "Device Verification Failed",
                `⚠️ ${dbError.message}\n\nPlease verify you're connecting to the correct device.`,
                [{ text: "OK" }],
              );
            } else {
              Alert.alert(
                "Database Error",
                "Failed to store device information in database, but device details were retrieved successfully.",
                [{ text: "OK" }],
              );
            }
          }
        } else {
          console.warn(
            "⚠️ Device serial number is unknown - cannot verify device identity",
          );
          Alert.alert(
            "Device Details Retrieved",
            "✅ Connected to device but could not retrieve serial number for verification.\n\nThis is normal for some device firmware versions.",
            [{ text: "OK" }],
          );
        }
      } catch (timeError) {
        console.error(
          "❌ Failed to get comprehensive device details:",
          timeError,
        );
        Alert.alert(
          "Connection Error",
          "Failed to retrieve device details. The device may not be responding properly.",
          [{ text: "OK" }],
        );
      }

      // Log current timestamp for comparison
      const currentTime = new Date();
      console.log("🕐 Current Time:", currentTime.toISOString());

      // Disconnect after getting info
      await disconnect();
      console.log("🔌 Disconnected from device");
    } catch (error) {
      console.error("❌ Error getting device details:", error);

      // Additional error information
      if (error instanceof Error) {
        console.error("❌ Error name:", error.name);
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
      }

      // Try to disconnect if there was a connection issue
      try {
        await disconnect();
      } catch (disconnectError) {
        console.error("❌ Error during cleanup disconnect:", disconnectError);
      }
    } finally {
      setIsGettingDetails(false);
    }
  };

  const handleSyncDevice = async () => {
    if (!device?.id) return;

    setIsSyncing(true);
    try {
      console.log("🔄 Starting device sync for:", device.title);

      // Try to connect to the device
      const connectedDevice = await connect(device.id);
      console.log("✅ Connected to device:", connectedDevice.device.name);

      // Check connection health
      const isConnected = await checkConnection();
      if (isConnected) {
        Alert.alert(
          "Sync Successful",
          "✅ Device connection is healthy and active! Your device is ready for use.",
          [{ text: "OK" }],
        );

        // Refresh device data
        void queryClient.invalidateQueries({
          queryKey: ["device", "getById", { id: id }],
        });
      } else {
        Alert.alert(
          "Sync Failed",
          "❌ Could not establish a healthy connection with the device.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("❌ Sync error:", error);
      Alert.alert(
        "Sync Error",
        `Failed to sync with device: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSyncing(false);
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
          onPress: () => deleteDeviceMutation.mutate(),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading device...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load device</Text>
          <Text style={styles.errorDescription}>
            {error.message || "Please try again later"}
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Device not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return "#10b981";
    if (level > 20) return "#f59e0b";
    return "#ef4444";
  };

  const getSyncStatusText = (status: string) => {
    switch (status) {
      case "SYNCED":
        return "✓ Synced";
      case "SYNCING":
        return "⟳ Syncing";
      case "ERROR":
        return "⚠ Error";
      default:
        return "○ Not Synced";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Device Header */}
        <View style={styles.deviceHeader}>
          <View style={styles.deviceAvatar}>
            <Text style={styles.deviceInitials}>
              {device.title?.slice(0, 2).toUpperCase() ?? "??"}
            </Text>
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceTitle}>{device.title}</Text>
            <Text style={styles.deviceDescription}>{device.description}</Text>
          </View>
        </View>

        {/* Device Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Battery Level</Text>
            <Text
              style={[
                styles.statValue,
                { color: getBatteryColor(device.batteryLevel ?? 0) },
              ]}
            >
              {device.batteryLevel ?? 0}%
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Sync Status</Text>
            <Text style={styles.statValue}>
              {getSyncStatusText(device.syncStatus ?? "NOT_SYNCED")}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Last Sync</Text>
            <Text style={styles.statValue}>
              {device.lastSync
                ? new Date(device.lastSync).toLocaleDateString()
                : "Never"}
            </Text>
          </View>
          {device.serialNumber && (
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Serial Number</Text>
              <Text style={styles.statValue}>{device.serialNumber}</Text>
            </View>
          )}
        </View>

        {/* Alarms Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Alarms ({device.alarms.length})
            </Text>
            <Pressable
              style={styles.addAlarmButton}
              onPress={() => router.push(`/alarms/add/${device.id}`)}
            >
              <Text style={styles.addAlarmButtonText}>+ Add Alarm</Text>
            </Pressable>
          </View>

          {device.alarms.length === 0 ? (
            <View style={styles.emptyAlarmsContainer}>
              <Text style={styles.emptyAlarmsText}>No alarms configured</Text>
              <Text style={styles.emptyAlarmsDescription}>
                Add your first alarm to get started
              </Text>
            </View>
          ) : (
            <View style={styles.alarmsContainer}>
              {device.alarms.map((alarm) => (
                <AlarmCard key={alarm.id} alarm={alarm} />
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
            onPress={handleSyncDevice}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <View style={styles.syncingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.syncButtonText}>Syncing...</Text>
              </View>
            ) : (
              <Text style={styles.syncButtonText}>Sync Device</Text>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.detailsButton,
              isGettingDetails && styles.buttonDisabled,
            ]}
            onPress={handleGetDeviceDetails}
            disabled={isGettingDetails}
          >
            {isGettingDetails ? (
              <View style={styles.syncingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.detailsButtonText}>Getting Details...</Text>
              </View>
            ) : (
              <Text style={styles.detailsButtonText}>
                Get Device Details & Time
              </Text>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.deleteButton,
              deleteDeviceMutation.isPending && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteDevice}
            disabled={deleteDeviceMutation.isPending}
          >
            <Text style={styles.deleteButtonText}>
              {deleteDeviceMutation.isPending ? "Deleting..." : "Delete Device"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 8,
    textAlign: "center",
  },
  errorDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  deviceAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  deviceInitials: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
  },
  deviceInfo: {
    flex: 1,
  },
  deviceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  deviceDescription: {
    fontSize: 16,
    color: "#6b7280",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  addAlarmButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addAlarmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  alarmsContainer: {
    gap: 12,
  },
  alarmCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  alarmHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  alarmInfo: {
    flex: 1,
    marginRight: 12,
  },
  alarmTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  alarmDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  alarmDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  alarmDetailItem: {
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  emptyAlarmsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyAlarmsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  emptyAlarmsDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  syncButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  syncingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  syncButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  detailsButton: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  detailsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
