/**
 * BLE Scanning Hook
 *
 * A hook for managing BLE device scanning operations.
 * Extracts scanning logic from BLEContext for reusability.
 */

import type { Peripheral } from "react-native-ble-manager";
import { useCallback, useRef, useState } from "react";
import BleManager, {
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
} from "react-native-ble-manager";

import { requestBluetoothPermissions } from "~/services/ble/utils";

export interface ScanProgress {
  step: string;
  progress: number;
  message: string;
  isError?: boolean;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

export interface ScanConfig {
  timeoutSeconds?: number;
  matchMode?: BleScanMatchMode;
  scanMode?: BleScanMode;
}

const DEFAULT_SCAN_CONFIG: Required<ScanConfig> = {
  timeoutSeconds: 10,
  matchMode: BleScanMatchMode.Sticky,
  scanMode: BleScanMode.Balanced,
};

/**
 * Hook for BLE device scanning
 */
export function useBLEScanning() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Scan for devices advertising the Gently service
   */
  const scanForDevices = useCallback(
    async (
      onDeviceFound: (
        peripheral: Peripheral,
        advertisementData?: unknown,
      ) => void,
      config: ScanConfig = {},
    ): Promise<void> => {
      const { timeoutSeconds, matchMode, scanMode } = {
        ...DEFAULT_SCAN_CONFIG,
        ...config,
      };

      setError(null);

      try {
        // Request permissions first
        const hasPermissions = await requestBluetoothPermissions();
        if (!hasPermissions) {
          throw new Error("Bluetooth permissions not granted");
        }

        setIsScanning(true);

        // Set up timeout
        scanTimeoutRef.current = setTimeout(() => {
          void BleManager.stopScan();
          setIsScanning(false);
        }, timeoutSeconds * 1000);

        // Start scanning
        await BleManager.scan({
          serviceUUIDs: [],
          seconds: timeoutSeconds,
          allowDuplicates: false,
          matchMode,
          scanMode,
          callbackType: BleScanCallbackType.AllMatches,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsScanning(false);
        throw error;
      }
    },
    [],
  );

  /**
   * Scan for a specific device by serial number
   */
  const scanForDevice = useCallback(
    async (
      serialNumber: string,
      onProgress?: ScanProgressCallback,
      config: ScanConfig = {},
    ): Promise<Peripheral | null> => {
      const { timeoutSeconds } = { ...DEFAULT_SCAN_CONFIG, ...config };

      setError(null);
      onProgress?.({
        step: "Scanning",
        progress: 10,
        message: `Scanning for device ${serialNumber}...`,
      });

      return new Promise<Peripheral | null>((resolve, reject) => {
        let foundDevice: Peripheral | null = null;

        const _handleDeviceFound = (peripheral: Peripheral) => {
          // Check if this is the device we're looking for
          const name =
            peripheral.name ?? peripheral.advertising?.localName ?? "";
          if (name.includes(serialNumber) || peripheral.id === serialNumber) {
            foundDevice = peripheral;
            clearTimeout(timeoutId);
            void BleManager.stopScan();
            setIsScanning(false);
            onProgress?.({
              step: "Found",
              progress: 30,
              message: `Found device: ${name}`,
            });
            resolve(foundDevice);
          }
        };

        // Set up timeout
        const timeoutId = setTimeout(() => {
          void BleManager.stopScan();
          setIsScanning(false);
          if (!foundDevice) {
            onProgress?.({
              step: "Timeout",
              progress: 0,
              message: `Device ${serialNumber} not found`,
              isError: true,
            });
            resolve(null);
          }
        }, timeoutSeconds * 1000);

        // Start scan
        setIsScanning(true);
        BleManager.scan({
          serviceUUIDs: [],
          seconds: timeoutSeconds,
          allowDuplicates: false,
          matchMode: BleScanMatchMode.Sticky,
          scanMode: BleScanMode.LowLatency,
          callbackType: BleScanCallbackType.AllMatches,
        })
          .then(() => {
            // Scan started, device discovery handled by event listener
          })
          .catch((err) => {
            clearTimeout(timeoutId);
            setIsScanning(false);
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            onProgress?.({
              step: "Error",
              progress: 0,
              message: error.message,
              isError: true,
            });
            reject(error);
          });
      });
    },
    [],
  );

  /**
   * Stop any ongoing scan
   */
  const stopScan = useCallback(async () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    await BleManager.stopScan();
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    error,
    scanForDevices,
    scanForDevice,
    stopScan,
  };
}
