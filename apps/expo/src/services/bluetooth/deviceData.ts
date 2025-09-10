// Device data reading and management using secure Gently BLE protocol
import type { Device } from "react-native-ble-plx";

import type { SecureConnectionResult } from "./connection";
import type { DeviceInfo } from "./types";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../../utils/base64";
import {
  CommandCode,
  GENTLY_SERVICE_UUID,
  REQUEST_CHARACTERISTIC_UUID,
  RESPONSE_CHARACTERISTIC_UUID,
} from "./protocol";

/**
 * Send a command and get response using secure protocol
 */
async function sendSecureCommand(
  connectionResult: SecureConnectionResult,
  commandCode: CommandCode,
  payload?: Uint8Array,
): Promise<Uint8Array> {
  const { device, protocol } = connectionResult;

  // Create the command request
  const commandPayload = payload ?? new Uint8Array(0);
  const request = protocol.createRequest(commandCode, commandPayload);

  // Send the command
  await device.writeCharacteristicWithResponseForService(
    GENTLY_SERVICE_UUID,
    REQUEST_CHARACTERISTIC_UUID,
    uint8ArrayToBase64(request),
  );

  // Read the response
  const response = await device.readCharacteristicForService(
    GENTLY_SERVICE_UUID,
    RESPONSE_CHARACTERISTIC_UUID,
  );

  if (!response.value) {
    throw new Error("No response received");
  }

  // Parse and return the response payload
  const parsedResponse = protocol.parseResponse(
    base64ToUint8Array(response.value),
  );

  return parsedResponse.payload;
}

/**
 * Read device info using secure protocol (recommended method)
 */
export async function readSecureDeviceInfo(
  connectionResult: SecureConnectionResult,
): Promise<DeviceInfo> {
  try {
    console.log("📋 Reading secure device info...");

    // Get device info using secure protocol
    const infoPayload = await sendSecureCommand(
      connectionResult,
      CommandCode.GET_DEVICE_INFO,
    );

    // Parse device info from response
    const deviceInfo = parseDeviceInfoResponse(infoPayload);

    console.log("✅ Successfully read device info:", deviceInfo);
    return deviceInfo;
  } catch (error) {
    console.error("❌ Error reading secure device info:", error);

    // Fallback to legacy method if secure fails
    console.log("🔄 Falling back to legacy device info reading...");
    return readDeviceInfo(connectionResult.device);
  }
}

/**
 * Get battery level using secure protocol
 */
export async function readSecureBatteryLevel(
  connectionResult: SecureConnectionResult,
): Promise<number> {
  try {
    const statusPayload = await sendSecureCommand(
      connectionResult,
      CommandCode.GET_DEVICE_STATUS,
    );

    // Parse battery level from status response
    return parseBatteryFromStatus(statusPayload);
  } catch (error) {
    console.error("❌ Error reading secure battery level:", error);
    return 0; // Default battery level
  }
}

/**
 * Get device time using secure protocol
 */
export async function readSecureDeviceTime(
  connectionResult: SecureConnectionResult,
): Promise<Date> {
  try {
    console.log("🕐 Reading secure device time...");

    const timePayload = await sendSecureCommand(
      connectionResult,
      CommandCode.GET_TIME,
    );

    // Parse time from response
    const deviceTime = parseTimeResponse(timePayload);

    console.log("✅ Successfully read device time:", deviceTime);
    return deviceTime;
  } catch (error) {
    console.error("❌ Error reading secure device time:", error);
    // Return current system time as fallback
    return new Date();
  }
}

/**
 * Get comprehensive device details (info + time + battery)
 */
export async function readComprehensiveDeviceDetails(
  connectionResult: SecureConnectionResult,
): Promise<{
  deviceInfo: DeviceInfo;
  deviceTime: Date;
  batteryLevel: number;
  timestamp: Date;
}> {
  console.log("📋 Reading comprehensive device details...");

  try {
    // Get all device details in parallel for better performance
    const [deviceInfo, deviceTime, batteryLevel] = await Promise.all([
      readSecureDeviceInfo(connectionResult),
      readSecureDeviceTime(connectionResult),
      readSecureBatteryLevel(connectionResult),
    ]);

    const result = {
      deviceInfo,
      deviceTime,
      batteryLevel,
      timestamp: new Date(), // Current system time for reference
    };

    console.log("✅ Successfully read comprehensive device details:", result);
    return result;
  } catch (error) {
    console.error("❌ Error reading comprehensive device details:", error);
    throw error;
  }
}

/**
 * Legacy device info reading for backward compatibility
 */
export function readDeviceInfo(device: Device): DeviceInfo {
  try {
    console.log("📋 Reading device info for:", device.name ?? device.id);
    console.log("⚠️ Using legacy device info reading");

    // Legacy approach - read basic device properties
    const deviceInfo: DeviceInfo = {
      serialNumber: device.id,
      firmwareVersion: "Unknown",
      batteryLevel: 0, // Will be read separately
    };

    console.log("✅ Legacy device info read:", deviceInfo);
    return deviceInfo;
  } catch (error) {
    console.error("❌ Error reading legacy device info:", error);
    throw new Error(`Failed to read device info: ${String(error)}`);
  }
}

/**
 * Parse device info response from secure protocol
 */
function parseDeviceInfoResponse(payload: Uint8Array): DeviceInfo {
  // Device info response format (based on protocol):
  // [status][serial_number_length][serial_number...][firmware_version_length][firmware_version...]

  if (payload.length < 2) {
    throw new Error("Invalid device info response");
  }

  const status = payload[0];
  if (status !== 0x00) {
    throw new Error(
      `Device info request failed with status: 0x${status?.toString(16) ?? "unknown"}`,
    );
  }

  let offset = 1;

  // Parse serial number
  let serialNumber = "unknown";
  if (offset < payload.length) {
    const serialLength = payload[offset] ?? 0;
    offset++;

    if (offset + serialLength <= payload.length) {
      const serialBytes = payload.slice(offset, offset + serialLength);
      serialNumber = new TextDecoder().decode(serialBytes);
      offset += serialLength;
    }
  }

  // Parse firmware version
  let firmwareVersion = "1.0.0";
  if (offset < payload.length) {
    const firmwareLength = payload[offset] ?? 0;
    offset++;

    if (offset + firmwareLength <= payload.length) {
      const firmwareBytes = payload.slice(offset, offset + firmwareLength);
      firmwareVersion = new TextDecoder().decode(firmwareBytes);
    }
  }

  return {
    serialNumber,
    firmwareVersion,
    batteryLevel: 0, // Will be read separately
  };
}

/**
 * Parse battery level from device status response
 */
function parseBatteryFromStatus(payload: Uint8Array): number {
  // Status response format (based on protocol):
  // [status][battery_level][other_status_data...]

  if (payload.length < 2) {
    return 0;
  }

  const status = payload[0];
  if (status !== 0x00) {
    return 0;
  }

  // Battery level is typically the second byte (0-100)
  const batteryLevel = payload[1];
  return Math.min(100, Math.max(0, batteryLevel ?? 0));
}

/**
 * Parse time response from device time request
 */
function parseTimeResponse(payload: Uint8Array): Date {
  // Time response format (based on protocol):
  // [status][hour][minute][second][year][month][date][weekday]

  if (payload.length < 8) {
    throw new Error("Invalid time response - insufficient data");
  }

  const status = payload[0];
  if (status !== 0x00) {
    throw new Error(
      `Time request failed with status: 0x${status?.toString(16) ?? "unknown"}`,
    );
  }

  // Parse BCD formatted time values
  const hour = fromBCD(payload[1] ?? 0);
  const minute = fromBCD(payload[2] ?? 0);
  const second = fromBCD(payload[3] ?? 0);
  const year = 2000 + fromBCD(payload[4] ?? 0); // Year offset from 2000
  const month = fromBCD(payload[5] ?? 0) - 1; // Month is 0-indexed in JS Date
  const date = fromBCD(payload[6] ?? 0);

  return new Date(year, month, date, hour, minute, second);
}

/**
 * Convert BCD (Binary Coded Decimal) to regular number
 */
function fromBCD(bcd: number): number {
  return (bcd >> 4) * 10 + (bcd & 0x0f);
}

/**
 * Factory key for decrypting advertisement payloads
 */
const FACTORY_KEY = new Uint8Array([
  0x43, 0xea, 0x5f, 0x35, 0x65, 0x98, 0x59, 0x87, 0x4a, 0x6f, 0x18, 0x47, 0x42,
  0xc3, 0x2b, 0x2b,
]);

/**
 * Simple TEA decryption for 8-byte blocks
 * This is a simplified implementation based on the protocol documentation
 */
function teaDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  if (data.length !== 8 || key.length !== 16) {
    throw new Error("TEA decrypt requires 8-byte data and 16-byte key");
  }

  // Convert bytes to 32-bit integers (little-endian)
  const dataView = new DataView(data.buffer, data.byteOffset);
  const keyView = new DataView(key.buffer, key.byteOffset);

  let y = dataView.getUint32(0, true); // little-endian
  let z = dataView.getUint32(4, true); // little-endian

  const k0 = keyView.getUint32(0, true);
  const k1 = keyView.getUint32(4, true);
  const k2 = keyView.getUint32(8, true);
  const k3 = keyView.getUint32(12, true);

  let sum = 0xc6ef3720; // TEA magic constant for 32 rounds
  const delta = 0x9e3779b9;

  for (let i = 0; i < 32; i++) {
    z = (z - (((y << 4) + k2) ^ (y + sum) ^ ((y >>> 5) + k3))) >>> 0;
    y = (y - (((z << 4) + k0) ^ (z + sum) ^ ((z >>> 5) + k1))) >>> 0;
    sum = (sum - delta) >>> 0;
  }

  // Convert back to bytes
  const result = new Uint8Array(8);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, y, true); // little-endian
  resultView.setUint32(4, z, true); // little-endian

  return result;
}

/**
 * Decrypt Gently advertisement payload using factory key
 */
export function decryptAdvertisementPayload(
  encryptedPayload: Uint8Array,
): Uint8Array {
  if (encryptedPayload.length !== 24) {
    throw new Error("Advertisement payload must be 24 bytes");
  }

  // Decrypt in 8-byte blocks using TEA
  const decrypted = new Uint8Array(24);

  for (let i = 0; i < 24; i += 8) {
    const block = encryptedPayload.slice(i, i + 8);
    const decryptedBlock = teaDecrypt(block, FACTORY_KEY);
    decrypted.set(decryptedBlock, i);
  }

  return decrypted;
}

/**
 * Parse manufacturer data from BLE advertisement according to Gently protocol
 */
export function parseManufacturerData(
  data: string,
): Record<string, unknown> | null {
  try {
    // Convert base64 manufacturer data to useful information
    const uint8Array = base64ToUint8Array(data);

    if (uint8Array.length < 26) {
      // 2 bytes company ID + 24 bytes payload
      return null;
    }

    // Parse company ID (first 2 bytes)
    const byte0 = uint8Array[0] ?? 0;
    const byte1 = uint8Array[1] ?? 0;
    const companyId = byte0 | (byte1 << 8);

    // Check if this is a Motsai Research device (0x0274)
    if (companyId !== 0x0274) {
      return {
        companyId,
        isGentlyDevice: false,
        rawData: data,
      };
    }

    try {
      // Extract the 24-byte encrypted payload
      const encryptedPayload = uint8Array.slice(2, 26);

      // Decrypt the payload using the factory key
      const decryptedPayload = decryptAdvertisementPayload(encryptedPayload);

      // Parse the decrypted payload
      const parsedData = parseGentlyAdvertisementPayload(decryptedPayload);

      if (parsedData) {
        return {
          companyId,
          isGentlyDevice: true,
          isFactoryMode: parsedData.status.braceletKeyType === "factory",
          serialNumber: parsedData.serialNumber,
          apiVersion: parsedData.apiVersion,
          batteryLevel: parsedData.status.batteryLevel,
          batteryVoltage: parsedData.batteryVoltage,
          charging: parsedData.status.charging,
          anyEventActive: parsedData.status.anyEventActive,
          errorCode: parsedData.errorCode,
          time: parsedData.time,
          rawData: data,
        };
      }
    } catch (decryptError) {
      console.warn("Failed to decrypt advertisement payload:", decryptError);
      // Return basic info even if decryption fails
      return {
        companyId,
        isGentlyDevice: true,
        isFactoryMode: null, // Unknown
        decryptionFailed: true,
        rawData: data,
      };
    }

    return {
      companyId,
      isGentlyDevice: true,
      payloadLength: uint8Array.length - 2,
      rawData: data,
      encrypted: true,
    };
  } catch (error) {
    console.error("Error parsing manufacturer data:", error);
    return null;
  }
}

/**
 * Parse decrypted Gently advertisement payload
 * This function parses the 24-byte payload after decryption with the factory key
 */
export function parseGentlyAdvertisementPayload(decryptedPayload: Uint8Array): {
  apiVersion: number;
  packetCounter: number;
  errorCode: number;
  serialNumber: string;
  time: {
    hour: number;
    minute: number;
    second: number;
    year: number;
    month: number;
    date: number;
    weekDay: number;
  };
  batteryVoltage: number;
  status: {
    charging: boolean;
    batteryLevel: number;
    braceletKeyType: "factory" | "modified";
    anyEventActive: boolean;
  };
} | null {
  try {
    if (decryptedPayload.length < 24) {
      return null;
    }

    // Parse according to protocol specification
    const apiVersion = decryptedPayload[0] ?? 0;
    const packetCounter =
      (decryptedPayload[1] ?? 0) | ((decryptedPayload[2] ?? 0) << 8);
    const errorCode =
      (decryptedPayload[3] ?? 0) | ((decryptedPayload[4] ?? 0) << 8);

    // Serial number (bytes 5-12)
    const serialBytes = decryptedPayload.slice(5, 13);
    const serialNumber = Array.from(serialBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    // Time fields (bytes 13-19)
    const hour = fromBCD(decryptedPayload[13] ?? 0);
    const minute = fromBCD(decryptedPayload[14] ?? 0);
    const second = fromBCD(decryptedPayload[15] ?? 0);
    const year = 2000 + fromBCD(decryptedPayload[16] ?? 0);
    const month = fromBCD(decryptedPayload[17] ?? 0);
    const date = fromBCD(decryptedPayload[18] ?? 0);
    const weekDay = decryptedPayload[19] ?? 0;

    // Battery voltage (bytes 20-21)
    const batteryVoltage =
      (decryptedPayload[20] ?? 0) | ((decryptedPayload[21] ?? 0) << 8);

    // Status byte (byte 22)
    const statusByte = decryptedPayload[22] ?? 0;
    const charging = (statusByte & 0x04) !== 0; // Bit 2
    const batteryLevel = (statusByte >> 3) & 0x07; // Bits 3-5
    const braceletKeyType = (statusByte & 0x40) !== 0 ? "modified" : "factory"; // Bit 6
    const anyEventActive = (statusByte & 0x80) !== 0; // Bit 7

    return {
      apiVersion,
      packetCounter,
      errorCode,
      serialNumber,
      time: {
        hour,
        minute,
        second,
        year,
        month,
        date,
        weekDay,
      },
      batteryVoltage,
      status: {
        charging,
        batteryLevel,
        braceletKeyType,
        anyEventActive,
      },
    };
  } catch (error) {
    console.error("Error parsing Gently advertisement payload:", error);
    return null;
  }
}
