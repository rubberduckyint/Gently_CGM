// React Hook for Bluetooth functionality
import type { Device, State } from "react-native-ble-plx";
import { useCallback, useEffect, useRef, useState } from "react";
import { BleManager } from "react-native-ble-plx";

import type { SecureConnectionResult } from "./connection";
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
  const [isInitialized, setIsInitialized] = useState(false);

  const [state, setState] = useState<BluetoothState>({
    isScanning: false,
    connectedDevice: null,
    connectionStatus: "disconnected",
    lastError: null,
    protocol: null,
    deviceInformation: null,
  });

  // Initialize manager and Bluetooth
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
      if (managerRef.current) {
        void managerRef.current.destroy();
      }
    };
  }, []);

  // Get current Bluetooth state
  const getBluetoothState = useCallback(async (): Promise<State> => {
    if (!managerRef.current) {
      throw new Error("Bluetooth manager not initialized");
    }
    return await managerRef.current.state();
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

      // Stop any existing scan
      if (stopScanRef.current) {
        stopScanRef.current();
      }

      // Clear previously scanned devices
      scannedDevicesRef.current.clear();

      setState((prev) => ({ ...prev, isScanning: true, lastError: null }));

      const callbacks: ScanCallbacks = {
        onDeviceFound: (device) => {
          // Store the device with its advertisement data
          scannedDevicesRef.current.set(device.id, device);
          onDeviceFound(device);
        },
        onError: (error) => {
          setState((prev) => ({
            ...prev,
            isScanning: false,
            lastError: error,
          }));
        },
        onComplete: () => {
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
      } catch (error) {
        console.error("❌ Failed to start device scan:", error);
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
    if (stopScanRef.current) {
      stopScanRef.current();
      stopScanRef.current = null;
    }

    if (managerRef.current) {
      stopDeviceScan(managerRef.current);
    }

    setState((prev) => ({ ...prev, isScanning: false }));
  }, []);

  // Connect to device using Gently protocol
  const connect = useCallback(
    async (deviceId: string): Promise<SecureConnectionResult> => {
      if (!managerRef.current) {
        throw new Error("Bluetooth manager not initialized");
      }

      setState((prev) => ({
        ...prev,
        connectionStatus: "connecting",
        lastError: null,
      }));

      try {
        // Get the stored device data including advertisement data
        const scannedDevice = scannedDevicesRef.current.get(deviceId);
        const advertisementData = scannedDevice?.advertisementData;

        console.log(
          "🔗 useBluetooth: Connecting with advertisement data:",
          advertisementData ? "Available" : "Not available",
        );

        const result = await connectToGentlyDevice(
          managerRef.current,
          deviceId,
          advertisementData,
        );

        setState((prev) => ({
          ...prev,
          connectedDevice: result.device,
          protocol: result.protocol,
          deviceInformation: result.deviceInfo,
          connectionStatus: "connected",
        }));

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
    [],
  );

  // Disconnect from device
  const disconnect = useCallback(async (): Promise<void> => {
    if (!state.connectedDevice) {
      return;
    }

    try {
      await state.connectedDevice.cancelConnection();

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
  }, [state.connectedDevice]);

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

  return {
    // State
    ...state,
    isInitialized,

    // Actions
    getBluetoothState,
    startScan,
    stopScan,
    connect,
    disconnect,
    getDeviceInfo,
    checkConnection,
  };
}
