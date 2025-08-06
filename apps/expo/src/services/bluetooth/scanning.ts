// Device scanning functionality
import { BleError, BleManager, Device, ScanMode } from "react-native-ble-plx";

import type { BluetoothDevice, ScanCallbacks, ScanOptions } from "./types";
import { initializeBluetooth } from "./permissions";

/**
 * Check if a discovered device is a Gently device
 */
export function isGentlyDevice(device: Device): boolean {
  // Check device name for "Gently"
  if (device.name && device.name.toLowerCase().includes("gently")) {
    return true;
  }

  // For demo purposes, also accept devices with these common names
  // Remove or modify this in production
  if (device.name) {
    const demoNames = ["headphones", "speaker", "earbuds", "watch"];
    const deviceNameLower = device.name.toLowerCase();
    if (demoNames.some((name) => deviceNameLower.includes(name))) {
      console.log(
        "🎭 Demo mode: Accepting device as Gently device:",
        device.name,
      );
      return true;
    }
  }

  // You could also check for specific service UUIDs advertised by the device
  // if (device.serviceUUIDs && device.serviceUUIDs.includes(GENTLY_SERVICE_UUID)) {
  //   return true;
  // }

  return false;
}

/**
 * Convert BLE Device to BluetoothDevice
 */
export function mapBleDevice(device: Device): BluetoothDevice {
  return {
    id: device.id,
    name: device.name || "Gently",
    rssi: device.rssi || -100,
  };
}

/**
 * Start scanning for Gently devices
 */
export async function startDeviceScan(
  manager: BleManager,
  callbacks: ScanCallbacks,
  options: ScanOptions = {},
): Promise<() => void> {
  const { timeout = 30000, allowDuplicates = false } = options;

  try {
    // Initialize Bluetooth
    const initialized = await initializeBluetooth(manager);
    if (!initialized) {
      callbacks.onError("Failed to initialize Bluetooth");
      return () => {};
    }

    console.log("Starting BLE scan for Gently devices...");

    // Start scanning
    manager.startDeviceScan(
      null, // Service UUIDs to scan for (null = scan for all)
      {
        allowDuplicates,
        scanMode: ScanMode.LowLatency,
        legacyScan: false,
      },
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.error("Scan error:", error);
          callbacks.onError(`Scan failed: ${error.message}`);
          return;
        }

        if (device && isGentlyDevice(device)) {
          console.log("Found Gently device:", device.name, device.id);
          callbacks.onDeviceFound(mapBleDevice(device));
        }
      },
    );

    // Auto-stop scanning after timeout
    const timeoutId = setTimeout(() => {
      stopDeviceScan(manager);
      callbacks.onComplete?.();
    }, timeout);

    // Return stop function
    return () => {
      clearTimeout(timeoutId);
      stopDeviceScan(manager);
    };
  } catch (error) {
    console.error("Failed to start scan:", error);
    callbacks.onError("Failed to start scanning for devices");
    return () => {};
  }
}

/**
 * Stop device scanning
 */
export function stopDeviceScan(manager: BleManager): void {
  try {
    manager.stopDeviceScan();
    console.log("Stopped BLE scan");
  } catch (error) {
    console.error("Error stopping scan:", error);
  }
}
