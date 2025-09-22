/**
 * BLE Test Page
 *
 * A minimal interface for testing BLE commands with connected devices.
 * Uses the design system for consistent styling.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BleManager, State } from "react-native-ble-plx";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import type { SecureConnectionResult } from "~/services/bluetooth/connection";
import type { AdvertisementData } from "~/services/bluetooth/protocol";
import type {
  SimpleCommandMetadata,
  SimpleCommandResult,
} from "~/services/bluetooth/simpleCommands";
import { Header } from "~/components/ui/Header";
import {
  connectToGentlyDevice,
  getStoredDeviceKey,
  initializeBluetooth,
  startDeviceScan,
} from "~/services/bluetooth";
import {
  executeSimpleCommand,
  SIMPLE_COMMANDS,
} from "~/services/bluetooth/simpleCommands";
import { colors, containers, spacing, typography } from "~/styles";
import { trpc } from "~/utils/api";

/**
 * Find a Gently device by serial number using BLE scanning
 */
async function findDeviceBySerialNumber(
  manager: BleManager,
  targetSerialNumber: string,
  timeoutMs = 10000,
): Promise<{ deviceId: string; advertisementData: AdvertisementData } | null> {
  return new Promise((resolve) => {
    let found = false;
    const timeoutId = setTimeout(() => {
      if (!found) {
        console.log(`⏰ Scan timeout after ${timeoutMs}ms, device not found`);
        cleanup();
        resolve(null);
      }
    }, timeoutMs);
    let stopScan: (() => void) | null = null;

    const cleanup = () => {
      if (stopScan) {
        stopScan();
      }
      clearTimeout(timeoutId);
    };

    // Start scanning
    console.log(
      `🔍 Scanning for device with serial number: ${targetSerialNumber}`,
    );

    stopScan = startDeviceScan(manager, {
      onDeviceFound: (device) => {
        if (device.advertisementData) {
          const deviceSerialHex = Array.from(
            device.advertisementData.serialNumber,
          )
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          console.log(`📱 Found device with serial: ${deviceSerialHex}`);

          if (deviceSerialHex === targetSerialNumber) {
            console.log(
              `✅ Found matching device: ${device.name} (${device.id})`,
            );
            found = true;
            cleanup();
            resolve({
              deviceId: device.id,
              advertisementData: device.advertisementData,
            });
          }
        }
      },
      onError: (error) => {
        console.error("❌ Scan error:", error);
        cleanup();
        resolve(null);
      },
    });
  });
}

export default function BLETestPage() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const [isTesting, setIsTesting] = useState(false);
  const [lastResult, setLastResult] = useState<SimpleCommandResult | null>(
    null,
  );
  const [availableCommands, setAvailableCommands] = useState<
    SimpleCommandMetadata[]
  >([]);
  const isCommandExecutionActiveRef = useRef(false);

  // BLE state management
  const [bleManager, setBleManager] = useState<BleManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentConnection, setCurrentConnection] =
    useState<SecureConnectionResult | null>(null);

  // Initialize Bluetooth
  useEffect(() => {
    console.log("🔧 BLETestPage: Initializing Bluetooth...");

    const initBluetooth = async () => {
      try {
        const manager = new BleManager();
        setBleManager(manager);

        await initializeBluetooth(manager);
        setIsInitialized(true);
        console.log("✅ BLETestPage: Bluetooth initialized successfully");
      } catch (error) {
        console.error("❌ BLETestPage: Failed to initialize Bluetooth:", error);
      }
    };

    void initBluetooth();
  }, []);

  // Fetch device information
  const {
    data: device,
    isLoading: deviceLoading,
    error: deviceError,
  } = useQuery({
    queryKey: ["device", "getById", { id: deviceId }],
    queryFn: async () => {
      if (!deviceId) throw new Error("Device ID is required");
      return await trpc.device.getById.query({ id: deviceId });
    },
    enabled: !!deviceId,
  });

  // Initialize available commands
  useEffect(() => {
    setAvailableCommands(SIMPLE_COMMANDS);
  }, []);

  const resetConnection = async () => {
    console.log("🔄 BLE Test: Resetting connection...");
    setCurrentConnection(null);
    setLastResult(null);

    if (currentConnection?.device) {
      try {
        await currentConnection.device.cancelConnection();
        console.log("✅ BLE Test: Disconnected from device");
      } catch (error) {
        console.warn("⚠️ BLE Test: Error disconnecting:", error);
      }
    }
  };

  const executeCommand = async (commandMetadata: SimpleCommandMetadata) => {
    if (isCommandExecutionActiveRef.current || isTesting) {
      console.warn("Command execution already in progress");
      return;
    }

    if (!bleManager || !isInitialized) {
      console.warn("Bluetooth not initialized");
      return;
    }

    isCommandExecutionActiveRef.current = true;
    setIsTesting(true);
    setLastResult(null);

    try {
      // Verify Bluetooth is available
      const bluetoothState = await bleManager.state();
      if (bluetoothState !== State.PoweredOn) {
        throw new Error("Bluetooth is not powered on");
      }

      if (!device?.serialNumber) {
        throw new Error("Device information not available");
      }

      // Get or establish connection
      let connection = currentConnection;
      if (!connection) {
        console.log(
          "🔄 BLE Test: No existing connection, establishing new one...",
        );

        // Try to establish a new connection using device discovery
        if (!device.serialNumber) {
          throw new Error("No serial number available for device discovery");
        }

        console.log(
          `🔄 BLE Test: Discovering device with serial ${device.serialNumber}...`,
        );

        // Find the device by serial number
        const discoveredDevice = await findDeviceBySerialNumber(
          bleManager,
          device.serialNumber,
        );

        if (!discoveredDevice) {
          throw new Error("Device not found during scanning");
        }

        // Try to get stored device key using serial number
        const storedKey = await getStoredDeviceKey(device.serialNumber);
        console.log(
          `🔄 BLE Test: ${storedKey ? "Found" : "No"} stored key for device`,
        );

        try {
          connection = await connectToGentlyDevice(
            bleManager,
            discoveredDevice.deviceId,
            discoveredDevice.advertisementData,
            storedKey ?? undefined,
          );

          console.log("✅ BLE Test: Connection established successfully");
          setCurrentConnection(connection);
        } catch (connectionError) {
          console.error("❌ BLE Test: Connection failed:", connectionError);

          // If connection fails, clear any stored connection state and throw
          setCurrentConnection(null);
          throw connectionError;
        }
      } else {
        console.log("✅ BLE Test: Using existing connection");
      }

      // Execute the simple command
      const result = await executeSimpleCommand(
        commandMetadata.id,
        connection.device,
        connection.protocol,
      );

      setLastResult(result);
    } catch (error) {
      console.error("❌ BLE command execution error:", error);

      let errorMessage = "Unknown error";

      if (error instanceof Error) {
        if (error.message.includes("Timeout waiting for")) {
          errorMessage =
            "Device did not respond to command. Try resetting the connection.";
        } else if (error.message.includes("Bluetooth is not powered on")) {
          errorMessage =
            "Bluetooth is not enabled. Please enable Bluetooth and try again.";
        } else if (error.message.includes("No Bluetooth device ID")) {
          errorMessage =
            "Device not properly configured. Check device settings.";
        } else if (error.message.includes("Failed to connect")) {
          errorMessage =
            "Failed to connect to device. Make sure device is nearby and powered on.";
        } else {
          errorMessage = error.message;
        }
      }

      const result: SimpleCommandResult = {
        success: false,
        error: errorMessage,
        duration: 0,
      };

      setLastResult(result);
    } finally {
      isCommandExecutionActiveRef.current = false;
      setIsTesting(false);
    }
  };

  if (deviceLoading) {
    return (
      <SafeAreaView
        style={[
          containers.safeArea,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[typography.body, { marginTop: spacing[3] }]}>
          Loading device...
        </Text>
      </SafeAreaView>
    );
  }

  if (deviceError || !device) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <Header title="BLE Test" showBackButton />
        <View
          style={[containers.card, { margin: spacing[4], padding: spacing[6] }]}
        >
          <Text style={[typography.body, { color: colors.error[500] }]}>
            Device not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header title={`BLE Test - ${device.title}`} showBackButton />

      <ScrollView style={{ flex: 1, padding: spacing[4] }}>
        {/* Device Info */}
        <View
          style={[
            containers.card,
            {
              marginBottom: spacing[5],
              padding: spacing[5],
              borderRadius: 12,
              shadowColor: colors.gray[900],
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 1,
            },
          ]}
        >
          <Text
            style={[
              typography.subtitle,
              {
                marginBottom: spacing[3],
                fontWeight: "600",
              },
            ]}
          >
            Device: {device.title}
          </Text>
          <View style={{ gap: spacing[1] }}>
            <Text
              style={[
                typography.caption,
                {
                  color: colors.text.secondary,
                  lineHeight: 16,
                },
              ]}
            >
              Serial: {device.serialNumber}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.text.secondary,
                    marginRight: spacing[2],
                  },
                ]}
              >
                Status:
              </Text>
              <View
                style={{
                  backgroundColor: currentConnection
                    ? colors.success[50]
                    : colors.gray[50],
                  borderColor: currentConnection
                    ? colors.success[200]
                    : colors.gray[200],
                  borderWidth: 1,
                  paddingHorizontal: spacing[2],
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: currentConnection
                        ? colors.success[700]
                        : colors.gray[600],
                      fontSize: 11,
                      fontWeight: "500",
                    },
                  ]}
                >
                  {currentConnection ? "Connected" : "Disconnected"}
                </Text>
              </View>
              {currentConnection && (
                <Pressable
                  style={({ pressed }) => ({
                    backgroundColor: pressed
                      ? colors.gray[200]
                      : colors.gray[100],
                    paddingHorizontal: spacing[2],
                    paddingVertical: spacing[1],
                    borderRadius: 6,
                    marginLeft: spacing[2],
                  })}
                  onPress={resetConnection}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.gray[700],
                        fontSize: 11,
                        fontWeight: "500",
                      },
                    ]}
                  >
                    Reset
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Available Commands */}
        <Text
          style={[
            typography.subtitle,
            {
              marginBottom: spacing[3],
              fontWeight: "600",
              color: colors.text.primary,
            },
          ]}
        >
          Available Commands
        </Text>
        <FlatList
          data={availableCommands}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: command }) => (
            <View
              style={[
                containers.card,
                {
                  marginBottom: spacing[3],
                  padding: spacing[5],
                  borderRadius: 12,
                  shadowColor: colors.gray[900],
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: spacing[2],
                }}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      fontWeight: "600",
                      flex: 1,
                      marginRight: spacing[3],
                    },
                  ]}
                >
                  {command.name}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.primary[50],
                    borderColor: colors.primary[200],
                    borderWidth: 1,
                    paddingHorizontal: spacing[2],
                    paddingVertical: spacing[1],
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.primary[700],
                        fontWeight: "500",
                        fontSize: 11,
                      },
                    ]}
                  >
                    {command.category}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  typography.caption,
                  {
                    marginBottom: spacing[4],
                    lineHeight: 18,
                    color: colors.text.secondary,
                  },
                ]}
              >
                {command.description}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  {
                    backgroundColor: isTesting
                      ? colors.gray[300]
                      : pressed
                        ? colors.primary[600]
                        : colors.primary[500],
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    borderRadius: 8,
                    minHeight: 48,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: colors.gray[900],
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                    opacity: isTesting ? 0.6 : 1,
                  },
                ]}
                onPress={() => executeCommand(command)}
                disabled={isTesting}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isTesting && (
                    <ActivityIndicator
                      size="small"
                      color={colors.text.inverse}
                      style={{ marginRight: spacing[2] }}
                    />
                  )}
                  <Text
                    style={[
                      typography.body,
                      {
                        color: colors.text.inverse,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {isTesting ? "Testing..." : "Run Test"}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
        />

        {/* Last Result */}
        {lastResult && (
          <View style={{ marginTop: spacing[6] }}>
            <Text
              style={[
                typography.subtitle,
                {
                  marginBottom: spacing[3],
                  fontWeight: "600",
                  color: colors.text.primary,
                },
              ]}
            >
              Last Result
            </Text>
            <View
              style={[
                containers.card,
                {
                  padding: spacing[5],
                  borderRadius: 12,
                  shadowColor: colors.gray[900],
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: spacing[2],
                }}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color: lastResult.success
                        ? colors.success[600]
                        : colors.error[600],
                      fontWeight: "600",
                      marginRight: spacing[2],
                    },
                  ]}
                >
                  {lastResult.success ? "✅ Success" : "❌ Failed"}
                </Text>
                <Text
                  style={[typography.caption, { color: colors.text.secondary }]}
                >
                  Duration: {lastResult.duration}ms
                </Text>
              </View>

              <Text
                style={[
                  typography.body,
                  {
                    marginBottom: spacing[3],
                    lineHeight: 20,
                  },
                ]}
              >
                {lastResult.success
                  ? "Command executed successfully"
                  : lastResult.error}
              </Text>

              {lastResult.data !== undefined && (
                <View
                  style={{
                    marginTop: spacing[2],
                    backgroundColor: colors.gray[50],
                    padding: spacing[3],
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        marginBottom: spacing[2],
                        fontWeight: "600",
                        color: colors.text.primary,
                      },
                    ]}
                  >
                    Data:
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      {
                        fontFamily: "monospace",
                        lineHeight: 16,
                        color: colors.text.secondary,
                      },
                    ]}
                  >
                    {typeof lastResult.data === "string"
                      ? lastResult.data
                      : JSON.stringify(lastResult.data, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
