// Bluetooth service types and interfaces
import type { Device } from "react-native-ble-plx";

import type {
  AdvertisementData,
  DeviceInformation,
  GentlyBLEProtocol,
} from "./protocol";

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
  advertisementData?: AdvertisementData;
  manufacturerData?: {
    isGentlyDevice: boolean;
    isFactoryMode?: boolean | null;
    serialNumber?: string;
    batteryLevel?: number;
    charging?: boolean;
    anyEventActive?: boolean;
    decryptionFailed?: boolean;
    [key: string]: unknown;
  };
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface DeviceInfo {
  serialNumber: string;
  firmwareVersion: string;
  batteryLevel: number;
}

export interface ScanOptions {
  timeout?: number;
  allowDuplicates?: boolean;
}

export interface ScanCallbacks {
  onDeviceFound: (device: BluetoothDevice) => void;
  onError: (error: string) => void;
  onComplete?: () => void;
}

export interface BluetoothState {
  isScanning: boolean;
  connectedDevice: Device | null;
  connectionStatus: ConnectionStatus;
  lastError: string | null;
  protocol: GentlyBLEProtocol | null;
  deviceInformation: DeviceInformation | null;
}
