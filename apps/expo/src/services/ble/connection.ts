/**
 * Reusable BLE Connection Utilities
 *
 * Provides standardized connection logic with timeout and retry functionality
 * for use across all BLE-enabled pages (add-device, ble-test, alarm syncing)
 */

import { Platform } from "react-native";
import BleManager from "react-native-ble-manager";

import { startNotifications } from "./manager";

export interface BLEConnectionOptions {
  maxRetries?: number;
  connectionTimeout?: number; // milliseconds
  stabilizationDelay?: number; // milliseconds to wait after connection
  enableMTU?: boolean; // whether to configure MTU on Android
  mtuSize?: number;
}

export interface BLEConnectionResult {
  success: boolean;
  peripheral: string;
  error?: string;
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Standardized BLE device connection with timeout and retry logic
 *
 * @param peripheralId - The BLE peripheral ID to connect to
 * @param options - Connection configuration options
 * @returns Promise resolving to connection result
 */
export async function connectToBLEDevice(
  peripheralId: string,
  options: BLEConnectionOptions = {},
): Promise<BLEConnectionResult> {
  const {
    maxRetries = 3,
    connectionTimeout = 5000, // 5 seconds
    stabilizationDelay = 900, // 900ms
    enableMTU = true,
    mtuSize = 512,
  } = options;

  console.log(`🔗 Starting BLE connection to device: ${peripheralId}`);
  console.log(`📋 Connection options:`, {
    maxRetries,
    connectionTimeout,
    stabilizationDelay,
    enableMTU,
    mtuSize,
  });

  try {
    // Check if already connected and disconnect if needed
    console.log(`🔍 Checking existing connection status...`);
    const isConnected = await BleManager.isPeripheralConnected(peripheralId);
    if (isConnected) {
      console.log(`🔌 Device already connected, disconnecting first...`);
      await BleManager.disconnect(peripheralId);
      await sleep(500); // Brief pause after disconnect
    }

    // Attempt connection with timeout and retries
    let connectionSuccess = false;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔗 Connection attempt ${attempt}/${maxRetries} for device: ${peripheralId}`,
        );

        // Create a promise that rejects after timeout
        const connectionPromise = BleManager.connect(peripheralId);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Connection timeout")),
            connectionTimeout,
          );
        });

        // Race between connection and timeout
        await Promise.race([connectionPromise, timeoutPromise]);

        console.log(
          `✅ Connected to device: ${peripheralId} on attempt ${attempt}`,
        );
        connectionSuccess = true;
        break;
      } catch (connectionError) {
        lastError =
          connectionError instanceof Error
            ? connectionError
            : new Error(String(connectionError));
        console.warn(
          `⚠️ Connection attempt ${attempt} failed for ${peripheralId}:`,
          lastError,
        );

        if (attempt < maxRetries) {
          console.log(`🔄 Retrying connection in 1 second...`);
          await sleep(1000); // Wait 1 second before retry
        }
      }
    }

    if (!connectionSuccess) {
      const errorMessage = `Failed to connect after ${maxRetries} attempts. ${lastError?.message ?? "Unknown error"}`;
      console.error(`❌ All connection attempts failed for ${peripheralId}`);
      return {
        success: false,
        peripheral: peripheralId,
        error: errorMessage,
      };
    }

    // Connection stabilization delay
    console.log(
      `⏱️ Waiting ${stabilizationDelay}ms for connection to stabilize...`,
    );
    await sleep(stabilizationDelay);

    // Configure MTU for Android if enabled
    if (enableMTU && Platform.OS === "android") {
      console.log(`🔧 Configuring MTU for Android device...`);
      try {
        await BleManager.requestMTU(peripheralId, mtuSize);
        console.log(`📶 MTU ${mtuSize} configured for ${peripheralId}`);
      } catch (mtuError) {
        console.warn(`⚠️ MTU request failed for ${peripheralId}:`, mtuError);
        // Continue without MTU - this is not critical for basic functionality
      }
    }

    // Discover services and characteristics
    console.log(`🔍 Discovering services for ${peripheralId}...`);
    await BleManager.retrieveServices(peripheralId);
    console.log(`✅ Services discovered for ${peripheralId}`);

    // Start notifications
    console.log(`🔔 Starting notifications for ${peripheralId}...`);
    await startNotifications(peripheralId);
    console.log(`✅ Notifications started for ${peripheralId}`);

    console.log(`🎉 BLE connection fully established for ${peripheralId}`);
    return {
      success: true,
      peripheral: peripheralId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ BLE connection failed for ${peripheralId}:`, error);
    return {
      success: false,
      peripheral: peripheralId,
      error: errorMessage,
    };
  }
}

/**
 * Standardized BLE device disconnection with cleanup
 *
 * @param peripheralId - The BLE peripheral ID to disconnect from
 * @returns Promise resolving when disconnection is complete
 */
export async function disconnectFromBLEDevice(
  peripheralId: string,
): Promise<void> {
  console.log(`🔌 Disconnecting from BLE device: ${peripheralId}`);

  try {
    // Check if connected first
    const isConnected = await BleManager.isPeripheralConnected(peripheralId);
    if (!isConnected) {
      console.log(`ℹ️ Device ${peripheralId} is not connected`);
      return;
    }

    // Stop notifications first
    try {
      const { stopNotifications } = await import("./manager");
      await stopNotifications(peripheralId);
      console.log(`🔕 Notifications stopped for ${peripheralId}`);
    } catch (notificationError) {
      console.warn(
        `⚠️ Failed to stop notifications for ${peripheralId}:`,
        notificationError,
      );
      // Continue with disconnection even if notification stop fails
    }

    // Disconnect from device
    await BleManager.disconnect(peripheralId);
    console.log(`✅ Disconnected from device: ${peripheralId}`);
  } catch (error) {
    console.error(`❌ Failed to disconnect from ${peripheralId}:`, error);
    throw error;
  }
}

/**
 * Check if a BLE device is currently connected
 *
 * @param peripheralId - The BLE peripheral ID to check
 * @returns Promise resolving to connection status
 */
export async function isBLEDeviceConnected(
  peripheralId: string,
): Promise<boolean> {
  try {
    const isConnected = await BleManager.isPeripheralConnected(peripheralId);
    console.log(`🔍 Device ${peripheralId} connection status: ${isConnected}`);
    return isConnected;
  } catch (error) {
    console.error(
      `❌ Failed to check connection status for ${peripheralId}:`,
      error,
    );
    return false;
  }
}
