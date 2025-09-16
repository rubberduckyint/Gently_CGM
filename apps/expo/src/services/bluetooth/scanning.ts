// Device scanning functionality with Gently BLE Protocol support
import type { BleError, BleManager, Device } from "react-native-ble-plx";

import type { AdvertisementData } from "./protocol";
import type { BluetoothDevice, ScanCallbacks, ScanOptions } from "./types";
import { base64ToUint8Array } from "../../utils/base64";
import { parseManufacturerData } from "./commands";
import {
  GENTLY_SERVICE_UUID,
  GentlyBLEProtocol,
  isGentlyDeviceFromAdvertisement,
} from "./protocol";

/**
 * Parse manufacturer data to check if device is a Gently device
 */
export function isGentlyDevice(device: Device): boolean {
  // Check for exact device name "Gently" first
  if (device.name === "Gently") {
    console.log(
      `📱 FOUND: Gently device "${device.name}" (${device.id}) at ${device.rssi}dBm`,
    );
    return true;
  }

  // Check device name for "Gently" (case-insensitive fallback)
  if (device.name?.toLowerCase().includes("gently")) {
    console.log(
      `📱 FOUND: Gently device "${device.name}" (${device.id}) at ${device.rssi}dBm`,
    );
    return true;
  }

  // Check manufacturer data using the protocol
  if (device.manufacturerData) {
    try {
      // Convert base64 manufacturer data to Uint8Array
      const manufacturerArray = base64ToUint8Array(device.manufacturerData);
      const isGently = isGentlyDeviceFromAdvertisement(manufacturerArray);

      if (isGently) {
        console.log(
          `📱 FOUND: Gently device "${device.name ?? "Unknown"}" (${device.id}) at ${device.rssi}dBm - identified by manufacturer data`,
        );
        return true;
      }
    } catch {
      // Silently fail for non-Gently devices
    }
  }

  // Not a Gently device - don't log anything
  return false;
}

/**
 * Parse advertisement data from a Gently device
 */
export function parseGentlyAdvertisement(
  device: Device,
): AdvertisementData | null {
  const logPrefix = "📊 ADVERTISEMENT";

  if (!device.manufacturerData) {
    console.log(
      `${logPrefix}: No manufacturer data available for ${device.name ?? "Unknown"}`,
    );
    return null;
  }

  try {
    console.log(
      `${logPrefix}: Parsing advertisement for device: ${device.name ?? "Unknown"}`,
    );
    console.log(
      `${logPrefix}: Raw manufacturer data: ${device.manufacturerData}`,
    );

    const manufacturerArray = base64ToUint8Array(device.manufacturerData);
    console.log(
      `${logPrefix}: Manufacturer data (${manufacturerArray.length} bytes): ${Array.from(
        manufacturerArray,
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`,
    );

    const protocol = new GentlyBLEProtocol();
    const advertisementData =
      protocol.parseAdvertisementData(manufacturerArray);

    if (advertisementData) {
      console.log(`${logPrefix}: ✅ Successfully parsed advertisement data:`);
      console.log(
        `${logPrefix}:   - API Version: ${advertisementData.apiVersion}`,
      );
      console.log(
        `${logPrefix}:   - Packet Counter: ${advertisementData.packetCounter}`,
      );
      console.log(
        `${logPrefix}:   - Error Code: ${advertisementData.errorCode}`,
      );
      console.log(
        `${logPrefix}:   - Serial Number: ${Array.from(
          advertisementData.serialNumber,
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")}`,
      );
      console.log(
        `${logPrefix}:   - Battery Voltage: ${advertisementData.batteryVoltage}mV`,
      );
      console.log(
        `${logPrefix}:   - Charging: ${advertisementData.flags.charging}`,
      );
      console.log(
        `${logPrefix}:   - Battery Level: ${advertisementData.flags.batteryLevel}/7`,
      );
      console.log(
        `${logPrefix}:   - Bracelet Key Type: ${advertisementData.flags.braceletKeyType}`,
      );
      console.log(
        `${logPrefix}:   - Any Event Active: ${advertisementData.flags.anyEventActive}`,
      );
    } else {
      console.log(`${logPrefix}: ❌ Failed to parse advertisement data`);
    }

    return advertisementData;
  } catch (error) {
    console.log(`${logPrefix}: ❌ Error parsing advertisement:`, error);
    return null;
  }
}

/**
 * Convert BLE Device to BluetoothDevice with advertisement data
 */
export function mapBleDevice(device: Device): BluetoothDevice {
  const base = {
    id: device.id,
    name: device.name ?? "Gently",
    rssi: device.rssi ?? -100,
    serviceUUIDs: device.serviceUUIDs ?? undefined,
    localName: device.localName ?? undefined,
  };

  // Try to parse advertisement data
  const advertisementData = parseGentlyAdvertisement(device);

  // Parse manufacturer data for device filtering
  let manufacturerData: BluetoothDevice["manufacturerData"] | undefined;
  if (device.manufacturerData) {
    try {
      const parsedManufacturerData = parseManufacturerData(
        device.manufacturerData,
      );
      if (parsedManufacturerData) {
        manufacturerData =
          parsedManufacturerData as BluetoothDevice["manufacturerData"];
      }
    } catch (error) {
      console.warn("Failed to parse manufacturer data:", error);
    }
  }

  return {
    ...base,
    advertisementData: advertisementData ?? undefined,
    manufacturerData,
  };
}

/**
 * Start scanning for Bluetooth devices
 */
export function startDeviceScan(
  manager: BleManager,
  callbacks: ScanCallbacks,
  options: ScanOptions = {},
): () => void {
  console.log("🔍 STARTING DEVICE SCAN...");
  console.log(`🔍 Scan options:`, options);
  console.log(`🔍 Looking for service UUID: ${GENTLY_SERVICE_UUID}`);

  let foundDeviceCount = 0;
  let gentlyDeviceCount = 0;

  // Track unique Gently devices by their device ID to avoid duplicates
  const foundGentlyDevices = new Map<string, BluetoothDevice>();

  // Function to display the current list of found Gently devices
  const displayGentlyDevicesList = () => {
    if (foundGentlyDevices.size === 0) {
      console.log("📋 No Gently devices found yet");
      return;
    }

    console.log(
      `📋 === FOUND GENTLY DEVICES LIST (${foundGentlyDevices.size}) ===`,
    );
    let index = 1;
    foundGentlyDevices.forEach((device) => {
      console.log(`📱 [${index}] ${device.name}`);
      console.log(`    🆔 Device ID (for connection): ${device.id}`);
      console.log(`    📡 Signal: ${device.rssi} dBm`);

      // Display service UUIDs
      if (device.serviceUUIDs && device.serviceUUIDs.length > 0) {
        console.log(`    🔗 Service UUIDs: ${device.serviceUUIDs.join(", ")}`);
      } else {
        console.log(`    🔗 Service UUIDs: None advertised`);
      }

      // Display local name if different from name
      if (device.localName && device.localName !== device.name) {
        console.log(`    📛 Local Name: ${device.localName}`);
      }

      if (device.advertisementData) {
        const serialHex = Array.from(device.advertisementData.serialNumber)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.log(`    🔢 Serial: ${serialHex}`);
        console.log(
          `    🔋 Battery: ${device.advertisementData.batteryVoltage}mV (Level: ${device.advertisementData.flags.batteryLevel}/7)`,
        );
        console.log(
          `    ⚡ Charging: ${device.advertisementData.flags.charging ? "Yes" : "No"}`,
        );
        console.log(
          `    🔔 Events Active: ${device.advertisementData.flags.anyEventActive ? "Yes" : "No"}`,
        );
        console.log(
          `    🔑 Key Type: ${device.advertisementData.flags.braceletKeyType === 0 ? "Factory" : "Custom"}`,
        );
      } else {
        console.log(`    ⚠️  No advertisement data available`);
      }
      console.log(""); // Empty line for spacing
      index++;
    });
    console.log("📋 =======================================");
    console.log(
      "💡 TIP: Use the 'Device ID (for connection)' above to connect to specific devices",
    );
    console.log(
      "📖 See: https://github.com/dotintent/react-native-ble-plx/wiki/Device-Connecting",
    );
  };

  // Set up timeout if specified
  let timeoutId: NodeJS.Timeout | null = null;
  if (options.timeout) {
    console.log(`🔍 Scan timeout set to: ${options.timeout}ms`);
    timeoutId = setTimeout(() => {
      console.log(`⏰ SCAN TIMEOUT REACHED (${options.timeout}ms)`);
      displayGentlyDevicesList();
      console.log(
        `📊 SCAN SUMMARY: Found ${foundGentlyDevices.size} unique Gently devices`,
      );
      void manager.stopDeviceScan();
      callbacks.onComplete?.();
    }, options.timeout);
  }

  // Start scanning with specific service UUID for production
  void manager.startDeviceScan(
    //[GENTLY_SERVICE_UUID],
    null,
    {
      scanMode: 2, // Low latency scan mode
      legacyScan: false, // Use modern BLE scanning
    },
    (error: BleError | null, device: Device | null) => {
      if (error) {
        console.error("❌ BLE scan error:", error);
        displayGentlyDevicesList();
        console.log(
          `📊 SCAN ERROR SUMMARY: Found ${foundGentlyDevices.size} unique Gently devices before error`,
        );
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        callbacks.onError(error.message);
        return;
      }

      if (device) {
        foundDeviceCount++;
        console.log(
          `🔍 DEVICE FOUND [${foundDeviceCount}]: "${device.name ?? "Unnamed"}" (${device.id})`,
        );
        console.log(`📡   Signal: ${device.rssi ?? "Unknown"} dBm`);
        console.log(
          `📊   Service UUIDs: ${device.serviceUUIDs?.join(", ") ?? "None"}`,
        );
        console.log(
          `📊   Manufacturer Data: ${device.manufacturerData ? "Present" : "None"}`,
        );
        console.log(`📊   Local Name: ${device.localName ?? "None"}`);

        // Check if this is a Gently device
        const isGently = isGentlyDevice(device);

        if (isGently) {
          // Check if we've already found this device (avoid duplicates)
          if (foundGentlyDevices.has(device.id)) {
            console.log(
              `🔄 DUPLICATE GENTLY DEVICE: "${device.name ?? "Unknown"}" (${device.id}) - updating signal strength`,
            );

            // Update the existing device with new RSSI if it's stronger
            const existingDevice = foundGentlyDevices.get(device.id);
            if (existingDevice && (device.rssi ?? -100) > existingDevice.rssi) {
              const deviceWithAdvData = mapBleDevice(device);
              foundGentlyDevices.set(device.id, deviceWithAdvData);
              console.log(
                `📡 Updated signal strength: ${device.rssi} dBm (was ${existingDevice.rssi} dBm)`,
              );
            }
          } else {
            gentlyDeviceCount++;
            console.log(
              `✅ NEW GENTLY DEVICE [${gentlyDeviceCount}]: "${device.name ?? "Unknown"}"`,
            );

            // Parse advertisement data for better device info
            const deviceWithAdvData = mapBleDevice(device);

            // Add to our unique devices map
            foundGentlyDevices.set(device.id, deviceWithAdvData);

            // Log comprehensive device information
            console.log("📱 GENTLY DEVICE DETAILS:");
            console.log(
              `📱   - Device ID (for connection): ${deviceWithAdvData.id}`,
            );
            console.log(`📱   - Device Name: ${deviceWithAdvData.name}`);
            console.log(
              `📱   - Signal Strength: ${deviceWithAdvData.rssi} dBm`,
            );

            // Log service UUIDs
            if (
              deviceWithAdvData.serviceUUIDs &&
              deviceWithAdvData.serviceUUIDs.length > 0
            ) {
              console.log(
                `📱   - Service UUIDs: ${deviceWithAdvData.serviceUUIDs.join(", ")}`,
              );
            } else {
              console.log(`📱   - Service UUIDs: None advertised`);
            }

            // Log local name if available and different
            if (
              deviceWithAdvData.localName &&
              deviceWithAdvData.localName !== deviceWithAdvData.name
            ) {
              console.log(`📱   - Local Name: ${deviceWithAdvData.localName}`);
            }

            if (deviceWithAdvData.advertisementData) {
              console.log("📱   - Advertisement Data: AVAILABLE");
              console.log(
                `📱     * Serial Number: ${Array.from(
                  deviceWithAdvData.advertisementData.serialNumber,
                )
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")}`,
              );
              console.log(
                `📱     * Battery: ${deviceWithAdvData.advertisementData.batteryVoltage}mV`,
              );
              console.log(
                `📱     * Charging: ${deviceWithAdvData.advertisementData.flags.charging}`,
              );
              console.log(
                `📱     * Battery Level: ${deviceWithAdvData.advertisementData.flags.batteryLevel}/7`,
              );
              console.log(
                `📱     * Events Active: ${deviceWithAdvData.advertisementData.flags.anyEventActive}`,
              );
            } else {
              console.log("📱   - Advertisement Data: NOT AVAILABLE");
            }

            callbacks.onDeviceFound(deviceWithAdvData);
          }
        } else {
          console.log(
            `⏭️  Skipping non-Gently device: "${device.name ?? "Unnamed"}"`,
          );
        }

        console.log(
          `📊 Current scan progress: ${foundGentlyDevices.size} unique Gently devices found`,
        );
        console.log("---");
      }
    },
  );

  // Return stop function
  return () => {
    console.log("🛑 STOPPING DEVICE SCAN");
    displayGentlyDevicesList();
    console.log(
      `📊 FINAL SCAN SUMMARY: Found ${foundGentlyDevices.size} unique Gently devices`,
    );
    void manager.stopDeviceScan();
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Stop device scanning
 */
export function stopDeviceScan(manager: BleManager): void {
  void manager.stopDeviceScan();
}
