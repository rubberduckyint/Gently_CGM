// Device data reading and parsing functionality
import type { Device } from "react-native-ble-plx";

import type { DeviceInfo } from "./types";

// Gently device characteristic UUIDs
const GENTLY_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const DEVICE_INFO_CHAR_UUID = "12345678-1234-1234-1234-123456789abd";
const BATTERY_CHAR_UUID = "12345678-1234-1234-1234-123456789abe";

/**
 * Read device information from a connected Gently device
 */
export async function readDeviceInfo(device: Device): Promise<DeviceInfo> {
  try {
    console.log("📋 Reading device info for:", device.name || device.id);

    // Check if device is still connected
    const isConnected = await device.isConnected();
    if (!isConnected) {
      throw new Error("Device is no longer connected");
    }

    // Check if device has the expected service
    const services = await device.services();
    const hasGentlyService = services.some(
      (service) =>
        service.uuid.toLowerCase() === GENTLY_SERVICE_UUID.toLowerCase(),
    );

    if (!hasGentlyService) {
      console.log(
        "🎭 Device doesn't have Gently service, using mock data for demo",
      );
      throw new Error("Not a Gently device - using mock data for demo");
    }

    // Read device information characteristic
    const deviceInfoCharacteristic = await device.readCharacteristicForService(
      GENTLY_SERVICE_UUID,
      DEVICE_INFO_CHAR_UUID,
    );

    // Read battery level characteristic
    const batteryCharacteristic = await device.readCharacteristicForService(
      GENTLY_SERVICE_UUID,
      BATTERY_CHAR_UUID,
    );

    // Decode the values
    const deviceInfoData = decodeDeviceInfo(deviceInfoCharacteristic.value);
    const batteryLevel = decodeBatteryLevel(batteryCharacteristic.value);

    const result = {
      serialNumber: deviceInfoData.serialNumber,
      firmwareVersion: deviceInfoData.firmwareVersion,
      batteryLevel,
    };

    console.log("✅ Device info read successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Failed to read device info:", error);

    // For demo purposes, return mock data if reading fails
    const mockData = {
      serialNumber: `GEN-${Date.now().toString().slice(-6)}`,
      firmwareVersion: "1.0.0",
      batteryLevel: Math.floor(Math.random() * 30) + 70, // 70-100%
    };

    console.log("🎭 Using mock device data for demo:", mockData);
    return mockData;
  }
}

/**
 * Decode device information from characteristic value
 */
function decodeDeviceInfo(base64Value: string | null): {
  serialNumber: string;
  firmwareVersion: string;
} {
  if (!base64Value) {
    return { serialNumber: "Unknown", firmwareVersion: "Unknown" };
  }

  try {
    // This would depend on your device's data format
    // For now, return mock data based on current time
    return {
      serialNumber: `GEN-${Date.now().toString().slice(-6)}`,
      firmwareVersion: "1.0.0",
    };
  } catch (error) {
    console.error("Failed to decode device info:", error);
    return { serialNumber: "Unknown", firmwareVersion: "Unknown" };
  }
}

/**
 * Decode battery level from characteristic value
 */
function decodeBatteryLevel(base64Value: string | null): number {
  if (!base64Value) {
    return 0;
  }

  try {
    // Decode base64 to get battery level
    // This would depend on your device's data format
    // For now, return a random battery level between 70-100%
    return Math.floor(Math.random() * 30) + 70;
  } catch (error) {
    console.error("Failed to decode battery level:", error);
    return 0;
  }
}

/**
 * Parse manufacturer data (if needed for device identification)
 */
export function parseManufacturerData(
  data: string,
): Record<string, any> | null {
  try {
    // Implement manufacturer data parsing based on your device's format
    // This is a placeholder implementation
    return null;
  } catch (error) {
    console.error("Failed to parse manufacturer data:", error);
    return null;
  }
}
