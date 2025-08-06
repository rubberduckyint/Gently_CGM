// React Hook for Bluetooth functionality
import type { Device } from "react-native-ble-plx";
import { useCallback, useEffect, useRef, useState } from "react";
import { BleManager, State } from "react-native-ble-plx";

import type {
  BluetoothDevice,
  BluetoothState,
  DeviceInfo,
  ScanCallbacks,
  ScanOptions,
} from "./types";
import {
  connectToDevice,
  disconnectDevice,
  isDeviceConnected,
} from "./connection";
import { readDeviceInfo } from "./deviceData";
import { startDeviceScan, stopDeviceScan } from "./scanning";

/**
 * Custom hook for Bluetooth operations
 * Provides a clean, functional API for BLE operations
 */
export function useBluetooth() {
  const managerRef = useRef<BleManager | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);

  const [state, setState] = useState<BluetoothState>({
    isScanning: false,
    connectedDevice: null,
    connectionStatus: "disconnected",
    lastError: null,
  });

  // Initialize manager
  useEffect(() => {
    managerRef.current = new BleManager();
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
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
    async (
      onDeviceFound: (device: BluetoothDevice) => void,
      options?: ScanOptions,
    ): Promise<void> => {
      if (!managerRef.current) {
        throw new Error("Bluetooth manager not initialized");
      }

      // Stop any existing scan
      if (stopScanRef.current) {
        stopScanRef.current();
      }

      setState((prev) => ({ ...prev, isScanning: true, lastError: null }));

      const callbacks: ScanCallbacks = {
        onDeviceFound,
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
        const stopFunction = await startDeviceScan(
          managerRef.current,
          callbacks,
          options,
        );
        stopScanRef.current = stopFunction;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isScanning: false,
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    },
    [],
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

  // Connect to device
  const connect = useCallback(async (deviceId: string): Promise<Device> => {
    if (!managerRef.current) {
      throw new Error("Bluetooth manager not initialized");
    }

    setState((prev) => ({
      ...prev,
      connectionStatus: "connecting",
      lastError: null,
    }));

    try {
      const device = await connectToDevice(managerRef.current, deviceId);
      setState((prev) => ({
        ...prev,
        connectedDevice: device,
        connectionStatus: "connected",
      }));
      return device;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        connectionStatus: "error",
        lastError: error instanceof Error ? error.message : "Unknown error",
      }));
      throw error;
    }
  }, []);

  // Disconnect from device
  const disconnect = useCallback(async (): Promise<void> => {
    if (!managerRef.current || !state.connectedDevice) {
      return;
    }

    try {
      await disconnectDevice(managerRef.current, state.connectedDevice);
      setState((prev) => ({
        ...prev,
        connectedDevice: null,
        connectionStatus: "disconnected",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        lastError: error instanceof Error ? error.message : "Unknown error",
      }));
      throw error;
    }
  }, [state.connectedDevice]);

  // Get device info
  const getDeviceInfo = useCallback(
    async (device?: Device): Promise<DeviceInfo> => {
      const targetDevice = device || state.connectedDevice;
      if (!targetDevice) {
        throw new Error("No device connected");
      }

      try {
        return await readDeviceInfo(targetDevice);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
        throw error;
      }
    },
    [state.connectedDevice],
  );

  // Check connection status
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!state.connectedDevice) {
      return false;
    }

    try {
      const connected = await isDeviceConnected(state.connectedDevice);
      if (!connected) {
        setState((prev) => ({
          ...prev,
          connectedDevice: null,
          connectionStatus: "disconnected",
        }));
      }
      return connected;
    } catch {
      setState((prev) => ({
        ...prev,
        connectedDevice: null,
        connectionStatus: "disconnected",
      }));
      return false;
    }
  }, [state.connectedDevice]);

  return {
    // State
    ...state,

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
