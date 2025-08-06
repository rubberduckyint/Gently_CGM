// Device connection functionality
import { BleManager, Device } from "react-native-ble-plx";

// Gently device service and characteristic UUIDs
const GENTLY_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const DEVICE_INFO_CHAR_UUID = "12345678-1234-1234-1234-123456789abd";
const BATTERY_CHAR_UUID = "12345678-1234-1234-1234-123456789abe";

/**
 * Connect to a specific device
 */
export async function connectToDevice(
  manager: BleManager,
  deviceId: string,
): Promise<Device> {
  try {
    console.log("Attempting to connect to device:", deviceId);

    // Connect to the device
    const device = await manager.connectToDevice(deviceId);

    // Discover services and characteristics
    await device.discoverAllServicesAndCharacteristics();

    console.log("Successfully connected to device:", device.name);

    // Verify it's a Gently device
    await verifyGentlyDevice(device);

    return device;
  } catch (error) {
    console.error("Failed to connect to device:", error);
    throw new Error(
      `Failed to connect to device: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Disconnect from a device
 */
export async function disconnectDevice(
  manager: BleManager,
  device: Device,
): Promise<void> {
  try {
    await manager.cancelDeviceConnection(device.id);
    console.log("Disconnected from device");
  } catch (error) {
    console.error("Error disconnecting device:", error);
    throw error;
  }
}

/**
 * Verify that a connected device is actually a Gently device
 */
async function verifyGentlyDevice(device: Device): Promise<void> {
  try {
    const services = await device.services();
    const hasGentlyService = services.some(
      (service) =>
        service.uuid.toLowerCase() === GENTLY_SERVICE_UUID.toLowerCase(),
    );

    if (!hasGentlyService) {
      console.warn("Connected device does not appear to be a Gently device");
      // For demo purposes, we'll continue anyway
      // In production, you might want to throw an error here
    }
  } catch (error) {
    console.warn("Could not verify Gently device:", error);
    // For demo purposes, continue anyway
  }
}

/**
 * Check if device is connected
 */
export async function isDeviceConnected(device: Device): Promise<boolean> {
  try {
    return await device.isConnected();
  } catch {
    return false;
  }
}
