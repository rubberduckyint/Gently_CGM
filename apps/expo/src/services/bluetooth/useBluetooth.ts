// React Hook for Bluetooth functionality
import type { Device, State } from "react-native-ble-plx";
import { useCallback, useEffect, useRef, useState } from "react";
import { BleManager } from "react-native-ble-plx";

import type { SecureConnectionResult } from "./connection";
import type { DeviceInformation, GentlyBLEProtocol } from "./protocol";
import type {
  BluetoothDevice,
  BluetoothState,
  DeviceInfo,
  ScanCallbacks,
  ScanOptions,
} from "./types";
import { connectToGentlyDevice } from "./connection";
import { initializeBluetooth } from "./permissions";
import { startDeviceScan, stopDeviceScan } from "./scanning";

/**
 * Custom hook for Bluetooth operations
 * Provides a clean, functional API for BLE operations
 */
export function useBluetooth() {
  const managerRef = useRef<BleManager | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const scannedDevicesRef = useRef<Map<string, BluetoothDevice>>(new Map());
  const disconnectionSubscriptionRef = useRef<{ remove: () => void } | null>(
    null,
  );

  // Store custom encryption keys per device ID
  const customKeysRef = useRef<Map<string, Uint8Array>>(new Map());

  const [isInitialized, setIsInitialized] = useState(false);

  const [state, setState] = useState<BluetoothState>({
    isScanning: false,
    connectedDevice: null,
    connectionStatus: "disconnected",
    lastError: null,
    protocol: null,
    deviceInformation: null,
  });

  // Setup device disconnection monitoring
  const setupDisconnectionMonitoring = useCallback((deviceId: string) => {
    if (!managerRef.current) {
      console.warn("⚠️ Cannot setup disconnection monitoring: no BLE manager");
      return;
    }

    console.log(
      `🔍 Setting up disconnection monitoring for device: ${deviceId}`,
    );

    // Remove any existing subscription
    if (disconnectionSubscriptionRef.current) {
      disconnectionSubscriptionRef.current.remove();
      disconnectionSubscriptionRef.current = null;
    }

    // Setup the disconnection listener following the documentation
    const subscription = managerRef.current.onDeviceDisconnected(
      deviceId,
      (error, device) => {
        console.log("🔌 Device disconnection event triggered");

        if (error) {
          console.error(
            "❌ Disconnection error:",
            JSON.stringify(error, null, 2),
          );
        }

        if (device) {
          console.log("📱 Disconnected device info:", {
            id: device.id,
            name: device.name,
            rssi: device.rssi,
          });

          // Update state to reflect disconnection
          setState((prev) => ({
            ...prev,
            connectedDevice: null,
            protocol: null,
            deviceInformation: null,
            connectionStatus: "disconnected",
            lastError: error ? `Disconnected: ${error.message}` : null,
          }));

          // Clear the stored custom key for this device when it disconnects
          customKeysRef.current.delete(deviceId);
          console.log(
            `🗑️ Cleared custom key for disconnected device: ${deviceId}`,
          );

          console.log("🔄 Attempting to reconnect to device..."); // Attempt to reconnect with a delay
          setTimeout(() => {
            const reconnect = async () => {
              try {
                console.log("🔗 Reconnecting to device:", device.id);
                await device.connect();
                console.log("✅ Successfully reconnected to device");

                // Re-discover services after reconnection
                await device.discoverAllServicesAndCharacteristics();
                console.log(
                  "✅ Service discovery completed after reconnection",
                );

                // Need to re-establish the secure connection with Gently protocol
                // This would typically involve re-running the pairing process
                console.log(
                  "⚠️ Note: Full protocol re-establishment may be needed",
                );
              } catch (reconnectError) {
                console.error("❌ Failed to reconnect:", reconnectError);
                setState((prev) => ({
                  ...prev,
                  lastError: `Reconnection failed: ${
                    reconnectError instanceof Error
                      ? reconnectError.message
                      : "Unknown error"
                  }`,
                }));
              }
            };

            void reconnect();
          }, 2000); // 2 second delay before reconnection attempt
        }
      },
    );

    disconnectionSubscriptionRef.current = subscription;
    console.log("✅ Disconnection monitoring setup completed");
  }, []);

  // Store custom key for a device
  const storeCustomKey = useCallback(
    (deviceId: string, customKey: Uint8Array) => {
      console.log(`🔑 Storing custom key for device: ${deviceId}`);
      customKeysRef.current.set(deviceId, customKey);
    },
    [],
  );

  // Get stored custom key for a device
  const getStoredCustomKey = useCallback(
    (deviceId: string): Uint8Array | undefined => {
      const key = customKeysRef.current.get(deviceId);
      if (key) {
        console.log(`🔑 Found stored custom key for device: ${deviceId}`);
      } else {
        console.log(`🔍 No stored custom key found for device: ${deviceId}`);
      }
      return key;
    },
    [],
  );

  // Clear custom key for a device
  const clearCustomKey = useCallback((deviceId: string) => {
    console.log(`🗑️ Clearing custom key for device: ${deviceId}`);
    customKeysRef.current.delete(deviceId);
  }, []);

  // Get information about stored keys (for debugging)
  const getStoredKeysInfo = useCallback(() => {
    const keys = Array.from(customKeysRef.current.entries()).map(
      ([deviceId, key]) => ({
        deviceId,
        keyLength: key.length,
        keyPreview:
          Array.from(key.slice(0, 4))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("") + "...",
      }),
    );
    console.log("🔑 Stored custom keys:", keys);
    return keys;
  }, []);

  // Remove disconnection monitoring
  const removeDisconnectionMonitoring = useCallback(() => {
    if (disconnectionSubscriptionRef.current) {
      console.log("🔄 Removing disconnection monitoring");
      disconnectionSubscriptionRef.current.remove();
      disconnectionSubscriptionRef.current = null;
    }
  }, []);
  useEffect(() => {
    const initManager = async () => {
      managerRef.current = new BleManager();

      try {
        const initialized = await initializeBluetooth(managerRef.current);
        setIsInitialized(initialized);

        if (!initialized) {
          const errorMsg =
            "Failed to initialize Bluetooth. Please check permissions and enable Bluetooth.";
          setState((prev) => ({
            ...prev,
            lastError: errorMsg,
          }));
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Bluetooth initialization failed";
        setState((prev) => ({
          ...prev,
          lastError: errorMessage,
        }));
      }
    };

    void initManager();

    return () => {
      console.log("🔄 useBluetooth: Cleaning up BLE manager...");
      // Stop any ongoing operations before destroying
      if (managerRef.current) {
        try {
          // Stop any active scan first
          void managerRef.current.stopDeviceScan();
          console.log("🔄 useBluetooth: Stopped device scan");
        } catch (error) {
          console.warn(
            "⚠️ useBluetooth: Error stopping scan during cleanup:",
            error,
          );
        }

        // Remove disconnection monitoring
        removeDisconnectionMonitoring();

        // Add a small delay to allow operations to complete
        setTimeout(() => {
          if (managerRef.current) {
            managerRef.current.destroy().catch((error) => {
              console.warn("⚠️ useBluetooth: Error destroying manager:", error);
            });
          }
        }, 100);
      }
    };
  }, [removeDisconnectionMonitoring]);

  // Get current Bluetooth state
  const getBluetoothState = useCallback(async (): Promise<State> => {
    if (!managerRef.current) {
      throw new Error("Bluetooth manager not initialized");
    }
    try {
      return await managerRef.current.state();
    } catch (error) {
      if (error instanceof Error && error.message.includes("destroyed")) {
        throw new Error("Bluetooth manager was destroyed");
      }
      throw error;
    }
  }, []);

  // Start scanning for devices
  const startScan = useCallback(
    (
      onDeviceFound: (device: BluetoothDevice) => void,
      options?: ScanOptions,
    ) => {
      if (!managerRef.current) {
        throw new Error("Bluetooth manager not initialized");
      }

      if (!isInitialized) {
        throw new Error(
          "Bluetooth not initialized. Please check permissions and enable Bluetooth.",
        );
      }

      console.log("🔍 useBluetooth: Starting device scan...");
      console.log("🔍 useBluetooth: Scan options:", options);

      // Stop any existing scan
      if (stopScanRef.current) {
        console.log("🔍 useBluetooth: Stopping existing scan first");
        stopScanRef.current();
      }

      // Clear previously scanned devices
      scannedDevicesRef.current.clear();
      console.log("🔍 useBluetooth: Cleared previous scan results");

      setState((prev) => ({ ...prev, isScanning: true, lastError: null }));

      const callbacks: ScanCallbacks = {
        onDeviceFound: (device) => {
          console.log(
            `🔍 useBluetooth: Device found callback - ${device.name} (${device.id})`,
          );
          // Store the device with its advertisement data
          scannedDevicesRef.current.set(device.id, device);
          onDeviceFound(device);
        },
        onError: (error) => {
          console.error("🔍 useBluetooth: Scan error callback:", error);
          setState((prev) => ({
            ...prev,
            isScanning: false,
            lastError: error,
          }));
        },
        onComplete: () => {
          console.log("🔍 useBluetooth: Scan complete callback");
          setState((prev) => ({ ...prev, isScanning: false }));
          stopScanRef.current = null;
        },
      };

      try {
        const stopFunction = startDeviceScan(
          managerRef.current,
          callbacks,
          options,
        );
        stopScanRef.current = stopFunction;
        console.log("🔍 useBluetooth: Scan started successfully");
      } catch (error) {
        console.error("❌ useBluetooth: Failed to start device scan:", error);
        setState((prev) => ({
          ...prev,
          isScanning: false,
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    },
    [isInitialized],
  );

  // Stop scanning
  const stopScan = useCallback((): void => {
    console.log("🔍 useBluetooth: Stopping device scan...");

    if (stopScanRef.current) {
      stopScanRef.current();
      stopScanRef.current = null;
      console.log("🔍 useBluetooth: Scan stopped via stop function");
    }

    if (managerRef.current) {
      stopDeviceScan(managerRef.current);
      console.log("🔍 useBluetooth: Scan stopped via manager");
    }

    setState((prev) => ({ ...prev, isScanning: false }));
    console.log("🔍 useBluetooth: Scan state updated to stopped");
  }, []);

  // Connect to device using Gently protocol
  const connect = useCallback(
    async (deviceId: string): Promise<SecureConnectionResult> => {
      if (!managerRef.current) {
        throw new Error("Bluetooth manager not initialized");
      }

      if (!isInitialized) {
        throw new Error(
          "Bluetooth not initialized. Please check permissions and enable Bluetooth.",
        );
      }

      console.log(`🔗 useBluetooth: Connecting to device with ID: ${deviceId}`);
      console.log(
        `📖 Device ID usage: https://github.com/dotintent/react-native-ble-plx/wiki/Device-Connecting`,
      );

      setState((prev) => ({
        ...prev,
        connectionStatus: "connecting",
        lastError: null,
      }));

      try {
        // Check if device is already connected first
        const existingConnection = await isDeviceIdConnected(deviceId);
        if (
          existingConnection.isConnected &&
          existingConnection.device &&
          existingConnection.protocol
        ) {
          console.log(
            `✅ useBluetooth: Device ${deviceId} is already connected, reusing connection`,
          );
          return {
            device: existingConnection.device,
            protocol: existingConnection.protocol,
            deviceInfo: existingConnection.deviceInformation ?? {
              hardwareVersion: 1,
              firmwareVersionMajor: 1,
              firmwareVersionMinor: 0,
              firmwareBuildNumber: 1,
            },
            uptime: new Uint8Array([0, 0, 0, 0]), // Mock uptime for existing connection
            serialNumber: "UNKNOWN", // We don't have access to cache here, will be overwritten by real connection
          };
        }

        // Get the stored device data including advertisement data
        const scannedDevice = scannedDevicesRef.current.get(deviceId);
        const advertisementData = scannedDevice?.advertisementData;

        // Get stored custom key if available
        const storedCustomKey = getStoredCustomKey(deviceId);

        console.log(
          "🔗 useBluetooth: Connecting with advertisement data:",
          advertisementData,
        );
        console.log(
          `🔑 useBluetooth: Using ${storedCustomKey ? "stored" : "new"} custom key for device ${deviceId}`,
        );

        const result = await connectToGentlyDevice(
          managerRef.current,
          deviceId,
          advertisementData,
          storedCustomKey, // Pass the stored custom key if available
        );

        // Store the custom key for future use if this was a new connection
        if (!storedCustomKey) {
          console.log(
            "🔑 useBluetooth: New connection established, storing dynamic key",
          );
          const dynamicKey = result.protocol.getDynamicKey();
          if (dynamicKey) {
            storeCustomKey(deviceId, dynamicKey);
            console.log(
              "✅ useBluetooth: Dynamic key stored for future connections",
            );
          } else {
            console.log("⚠️ useBluetooth: No dynamic key available to store");
          }
        }

        setState((prev) => ({
          ...prev,
          connectedDevice: result.device,
          protocol: result.protocol,
          deviceInformation: result.deviceInfo,
          connectionStatus: "connected",
        }));

        // Setup disconnection monitoring for the connected device
        setupDisconnectionMonitoring(deviceId);

        return result;
      } catch (error) {
        console.error("❌ useBluetooth: Failed to connect:", error);
        setState((prev) => ({
          ...prev,
          connectionStatus: "error",
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isInitialized,
      setupDisconnectionMonitoring,
      getStoredCustomKey,
      storeCustomKey,
    ],
  );

  // Connect to device by device ID (stored from previous scan)
  const connectById = useCallback(
    async (deviceId: string): Promise<SecureConnectionResult> => {
      if (!managerRef.current) {
        throw new Error("Bluetooth manager not initialized");
      }

      if (!isInitialized) {
        throw new Error(
          "Bluetooth not initialized. Please check permissions and enable Bluetooth.",
        );
      }

      console.log(`� useBluetooth: Connecting to device with ID: ${deviceId}`);

      setState((prev) => ({
        ...prev,
        connectionStatus: "connecting",
        lastError: null,
      }));

      try {
        // Check if device is already connected first
        const existingConnection = await isDeviceIdConnected(deviceId);
        if (
          existingConnection.isConnected &&
          existingConnection.device &&
          existingConnection.protocol
        ) {
          console.log(
            `✅ connectById: Device ${deviceId} is already connected, reusing connection`,
          );
          return {
            device: existingConnection.device,
            protocol: existingConnection.protocol,
            deviceInfo: existingConnection.deviceInformation ?? {
              hardwareVersion: 1,
              firmwareVersionMajor: 1,
              firmwareVersionMinor: 0,
              firmwareBuildNumber: 1,
            },
            uptime: new Uint8Array([0, 0, 0, 0]), // Mock uptime for existing connection
            serialNumber: "UNKNOWN", // We don't have access to cache here, will be overwritten by real connection
          };
        }

        // Get stored custom key if available
        const storedCustomKey = getStoredCustomKey(deviceId);

        console.log(
          `🔑 connectById: Using ${storedCustomKey ? "stored" : "new"} custom key for device ${deviceId}`,
        );

        // Connect directly using the stored device ID
        // See: https://github.com/dotintent/react-native-ble-plx/wiki/Device-Connecting
        const result = await connectToGentlyDevice(
          managerRef.current,
          deviceId,
          undefined, // No advertisement data available for direct connection
          storedCustomKey, // Pass the stored custom key if available
        );

        // Store the custom key for future use if this was a new connection
        if (!storedCustomKey) {
          console.log(
            "🔑 connectById: New connection established, storing dynamic key",
          );
          const dynamicKey = result.protocol.getDynamicKey();
          if (dynamicKey) {
            storeCustomKey(deviceId, dynamicKey);
            console.log(
              "✅ connectById: Dynamic key stored for future connections",
            );
          } else {
            console.log("⚠️ connectById: No dynamic key available to store");
          }
        }

        console.log(
          `✅ connectById: Successfully connected to device ${deviceId}`,
        );
        setState((prev) => ({
          ...prev,
          connectedDevice: result.device,
          protocol: result.protocol,
          deviceInformation: result.deviceInfo,
          connectionStatus: "connected",
        }));

        // Setup disconnection monitoring for the connected device
        setupDisconnectionMonitoring(deviceId);

        return result;
      } catch (error) {
        console.error(
          `❌ connectById: Failed to connect to device ${deviceId}:`,
          error,
        );

        // Handle specific manager destroyed error
        if (error instanceof Error && error.message.includes("destroyed")) {
          setState((prev) => ({
            ...prev,
            connectionStatus: "error",
            lastError: "Bluetooth manager was destroyed",
          }));
          throw new Error("Bluetooth manager was destroyed");
        }

        setState((prev) => ({
          ...prev,
          connectionStatus: "error",
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isInitialized,
      setupDisconnectionMonitoring,
      getStoredCustomKey,
      storeCustomKey,
    ],
  );

  // Disconnect from device
  const disconnect = useCallback(async (): Promise<void> => {
    if (!state.connectedDevice) {
      return;
    }

    const deviceId = state.connectedDevice.id;

    try {
      await state.connectedDevice.cancelConnection();

      // Remove disconnection monitoring since we're intentionally disconnecting
      removeDisconnectionMonitoring();

      // Clear the stored custom key for this device when manually disconnecting
      clearCustomKey(deviceId);

      setState((prev) => ({
        ...prev,
        connectedDevice: null,
        protocol: null,
        deviceInformation: null,
        connectionStatus: "disconnected",
      }));
    } catch (error) {
      console.error("❌ useBluetooth: Failed to disconnect:", error);
      setState((prev) => ({
        ...prev,
        lastError: error instanceof Error ? error.message : "Unknown error",
      }));
      throw error;
    }
  }, [state.connectedDevice, removeDisconnectionMonitoring, clearCustomKey]);

  // Get device info using stored device information
  const getDeviceInfo = useCallback(
    (device?: Device): DeviceInfo => {
      const targetDevice = device ?? state.connectedDevice;
      const deviceInfo = state.deviceInformation;

      if (!targetDevice || !deviceInfo) {
        throw new Error(
          "No device connected or device information not available",
        );
      }

      // Convert protocol device info to our DeviceInfo format
      // For now, using mock data since DeviceInformation doesn't have all fields
      return {
        serialNumber: `GNT-${deviceInfo.hardwareVersion}-${deviceInfo.firmwareBuildNumber}`,
        firmwareVersion: `${deviceInfo.firmwareVersionMajor}.${deviceInfo.firmwareVersionMinor}.${deviceInfo.firmwareBuildNumber}`,
        batteryLevel: 85, // Mock battery level - would need separate battery status command
      };
    },
    [state.connectedDevice, state.deviceInformation],
  );

  // Check connection status
  const checkConnection = useCallback(async (): Promise<boolean> => {
    console.log("🔍 useBluetooth: Checking connection status...");

    if (!state.connectedDevice) {
      console.log("❌ useBluetooth: No connected device");
      return false;
    }

    try {
      console.log("🔍 useBluetooth: Checking device connection status...");
      const connected = await state.connectedDevice.isConnected();

      console.log("🔍 useBluetooth: Connection status:", connected);

      if (!connected) {
        console.log(
          "❌ useBluetooth: Device is no longer connected, updating state",
        );
        setState((prev) => ({
          ...prev,
          connectedDevice: null,
          protocol: null,
          deviceInformation: null,
          connectionStatus: "disconnected",
        }));
      }
      return connected;
    } catch (error) {
      console.error("❌ useBluetooth: Error checking connection:", error);
      setState((prev) => ({
        ...prev,
        connectedDevice: null,
        protocol: null,
        deviceInformation: null,
        connectionStatus: "disconnected",
      }));
      return false;
    }
  }, [state.connectedDevice]);

  // Check if a specific device ID is already connected
  const isDeviceIdConnected = useCallback(
    async (
      deviceId: string,
    ): Promise<{
      isConnected: boolean;
      device?: Device;
      protocol?: GentlyBLEProtocol;
      deviceInformation?: DeviceInformation;
    }> => {
      console.log(
        `🔍 useBluetooth: Checking if device ${deviceId} is already connected...`,
      );

      if (!state.connectedDevice || !state.protocol) {
        console.log("❌ useBluetooth: No connected device or protocol");
        return { isConnected: false };
      }

      // Check if the connected device ID matches the requested device ID
      if (state.connectedDevice.id !== deviceId) {
        console.log(
          `❌ useBluetooth: Connected device ID (${state.connectedDevice.id}) doesn't match requested ID (${deviceId})`,
        );
        return { isConnected: false };
      }

      try {
        // Verify the device is still actually connected
        const connected = await state.connectedDevice.isConnected();

        if (connected) {
          console.log(
            `✅ useBluetooth: Device ${deviceId} is already connected and verified`,
          );

          return {
            isConnected: true,
            device: state.connectedDevice,
            protocol: state.protocol,
            deviceInformation: state.deviceInformation ?? undefined,
          };
        } else {
          console.log(
            `❌ useBluetooth: Device ${deviceId} is no longer connected`,
          );
          // Clean up state since device is disconnected
          setState((prev) => ({
            ...prev,
            connectedDevice: null,
            protocol: null,
            deviceInformation: null,
            connectionStatus: "disconnected",
          }));
          return { isConnected: false };
        }
      } catch (error) {
        console.error(
          `❌ useBluetooth: Error checking device ${deviceId} connection:`,
          error,
        );
        // Clean up state on error
        setState((prev) => ({
          ...prev,
          connectedDevice: null,
          protocol: null,
          deviceInformation: null,
          connectionStatus: "disconnected",
        }));
        return { isConnected: false };
      }
    },
    [state.connectedDevice, state.protocol, state.deviceInformation],
  );

  return {
    // State
    ...state,
    isInitialized,

    // Actions
    getBluetoothState,
    startScan,
    stopScan,
    connect,
    connectById,
    disconnect,
    getDeviceInfo,
    checkConnection,
    isDeviceIdConnected,
    getStoredCustomKey,
    storeCustomKey,
    clearCustomKey,
    getStoredKeysInfo,
  };
}
