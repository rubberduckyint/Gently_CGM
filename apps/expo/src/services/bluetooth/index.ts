// Legacy compatibility - simple functional wrapper
import { BleManager } from "react-native-ble-plx";

import type { BluetoothDevice, DeviceInfo } from "./types";
import { connectToDevice, disconnectDevice } from "./connection";
import { readDeviceInfo } from "./deviceData";
import { initializeBluetooth } from "./permissions";
import { startDeviceScan, stopDeviceScan } from "./scanning";

// Main Bluetooth service exports - simplified functional API
export * from "./types";
export * from "./permissions";
export * from "./scanning";
export * from "./connection";
export * from "./deviceData";
export * from "./useBluetooth";

/**
 * Simple functional Bluetooth service
 * Drop-in replacement for the class-based approach
 */
class SimpleBluetoothService {
  private manager = new BleManager();
  private stopScan: (() => void) | null = null;

  async initialize(): Promise<boolean> {
    return initializeBluetooth(this.manager);
  }

  async startScan(
    onDeviceFound: (device: BluetoothDevice) => void,
    onError: (error: string) => void,
  ): Promise<void> {
    if (this.stopScan) {
      this.stopScan();
    }

    this.stopScan = await startDeviceScan(
      this.manager,
      { onDeviceFound, onError },
      { timeout: 30000 },
    );
  }

  stopDeviceScan(): void {
    if (this.stopScan) {
      this.stopScan();
      this.stopScan = null;
    } else {
      stopDeviceScan(this.manager);
    }
  }

  async connectToDevice(
    deviceId: string,
  ): Promise<import("react-native-ble-plx").Device> {
    return connectToDevice(this.manager, deviceId);
  }

  async disconnectDevice(
    device: import("react-native-ble-plx").Device,
  ): Promise<void> {
    return disconnectDevice(this.manager, device);
  }

  async getDeviceInfo(
    device: import("react-native-ble-plx").Device,
  ): Promise<DeviceInfo> {
    return readDeviceInfo(device);
  }

  destroy(): void {
    this.stopDeviceScan();
    this.manager.destroy();
  }
}

// Export singleton for backward compatibility
export const bluetoothService = new SimpleBluetoothService();
