import * as SecureStore from "expo-secure-store";

/**
 * Device Key Storage Utility
 *
 * Provides persistent storage for device keys using SecureStore.
 * Maps custom keys to device IDs for secure device communication.
 */

const DEVICE_KEY_PREFIX = "gently_device_key_";

/**
 * Sanitize device identifier to be compatible with SecureStore
 * SecureStore keys must contain only alphanumeric characters, ".", "-", and "_"
 */
function sanitizeDeviceIdentifier(deviceIdentifier: string): string {
  // Replace any invalid characters with underscores
  return deviceIdentifier.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Store a device key for a given device identifier
 */
export async function storeDeviceKey(
  deviceIdentifier: string,
  key: Uint8Array,
): Promise<void> {
  try {
    const sanitizedId = sanitizeDeviceIdentifier(deviceIdentifier);
    const keyString = Array.from(key).join(",");
    await SecureStore.setItemAsync(
      `${DEVICE_KEY_PREFIX}${sanitizedId}`,
      keyString,
    );
    console.log(
      `🔑 Device key stored for: ${deviceIdentifier} (sanitized: ${sanitizedId})`,
    );
  } catch (error) {
    console.error(
      `❌ Failed to store device key for ${deviceIdentifier}:`,
      error,
    );
    throw error;
  }
}

/**
 * Retrieve a device key for a given device identifier
 */
export async function getStoredDeviceKey(
  deviceIdentifier: string,
): Promise<Uint8Array | null> {
  try {
    const sanitizedId = sanitizeDeviceIdentifier(deviceIdentifier);
    const keyString = await SecureStore.getItemAsync(
      `${DEVICE_KEY_PREFIX}${sanitizedId}`,
    );

    if (!keyString) {
      console.log(
        `🔍 No stored device key found for: ${deviceIdentifier} (sanitized: ${sanitizedId})`,
      );
      return null;
    }

    const key = new Uint8Array(keyString.split(",").map(Number));
    console.log(
      `🔑 Found stored device key for: ${deviceIdentifier} (sanitized: ${sanitizedId})`,
    );
    return key;
  } catch (error) {
    console.error(
      `❌ Failed to retrieve device key for ${deviceIdentifier}:`,
      error,
    );
    return null;
  }
}

/**
 * Remove a device key for a given device identifier
 */
export async function removeDeviceKey(deviceIdentifier: string): Promise<void> {
  try {
    const sanitizedId = sanitizeDeviceIdentifier(deviceIdentifier);
    await SecureStore.deleteItemAsync(`${DEVICE_KEY_PREFIX}${sanitizedId}`);
    console.log(
      `🗑️ Device key removed for: ${deviceIdentifier} (sanitized: ${sanitizedId})`,
    );
  } catch (error) {
    console.error(
      `❌ Failed to remove device key for ${deviceIdentifier}:`,
      error,
    );
    throw error;
  }
}

/**
 * Get all stored device identifiers (for debugging/management)
 */
export function getStoredDeviceIdentifiers(): string[] {
  // Note: SecureStore doesn't provide a way to list all keys
  // This would need to be implemented with a separate index if needed
  console.log("⚠️ Getting all device identifiers not supported by SecureStore");
  return [];
}
