/**
 * Mock BLE Service for Test Users
 *
 * Provides simulated BLE functionality for Apple App Review testing
 * without requiring physical Gently devices.
 *
 * This service is only active when the logged-in user is extraspecialtestuser@gentlyus.com
 */

import type { Peripheral } from "react-native-ble-manager";

import type { BLECommandRequest, BLECommandResponse } from "./types";
import { SIMULATED_DEVICE } from "~/utils/testMode";
import { CommandCode, ResponseStatus } from "./types";

// Mock device state
interface MockDeviceState {
  isConnected: boolean;
  serialNumber: string;
  batteryLevel: number;
  batteryVoltage: number;
  isCharging: boolean;
  firmwareVersion: string;
  uptime: number;
  currentTime: Date;
}

// Global mock device state
let mockDeviceState: MockDeviceState = {
  isConnected: false,
  serialNumber: SIMULATED_DEVICE.serialNumber,
  batteryLevel: SIMULATED_DEVICE.batteryLevel,
  batteryVoltage: 4000, // 4.0V
  isCharging: false,
  firmwareVersion: SIMULATED_DEVICE.firmwareVersion,
  uptime: 0,
  currentTime: new Date(),
};

/**
 * Reset mock device state (useful for testing)
 */
export function resetMockDeviceState(): void {
  mockDeviceState = {
    isConnected: false,
    serialNumber: SIMULATED_DEVICE.serialNumber,
    batteryLevel: SIMULATED_DEVICE.batteryLevel,
    batteryVoltage: 4000,
    isCharging: false,
    firmwareVersion: SIMULATED_DEVICE.firmwareVersion,
    uptime: 0,
    currentTime: new Date(),
  };
}

/**
 * Simulate a delay to mimic real BLE communication
 */
async function simulateDelay(ms = 100): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock scan for devices
 * Returns a simulated Gently device
 */
export async function mockScanForDevices(
  onDeviceFound: (peripheral: Peripheral) => void,
  timeoutSeconds = 5,
): Promise<void> {
  console.log(`[Mock BLE] Simulating device scan for ${timeoutSeconds}s`);

  // Simulate scanning delay
  await simulateDelay(1000);

  // Create mock peripheral
  const mockPeripheral: Peripheral = {
    id: `mock-${SIMULATED_DEVICE.serialNumber}`,
    name: SIMULATED_DEVICE.name,
    rssi: -45,
    advertising: {
      isConnectable: true,
      localName: SIMULATED_DEVICE.name,
      serviceUUIDs: ["0000fff0-0000-1000-8000-00805f9b34fb"],
      manufacturerData: {
        Gently: {
          CDVType: "ArrayBuffer",
          bytes: [2, 1, 6, 9, 9, 71, 101, 110, 116, 108, 121],
          data: "AgEGCQlHZW50bHk=", // Base64 encoded
        },
      },
    },
  };

  console.log(`[Mock BLE] Found simulated device:`, mockPeripheral.name);
  onDeviceFound(mockPeripheral);

  // Simulate scan completion
  await simulateDelay(timeoutSeconds * 1000);
  console.log(`[Mock BLE] Scan completed`);
}

/**
 * Mock connect to device
 */
export async function mockConnectToDevice(
  peripheralId: string,
  serialNumber: string,
): Promise<void> {
  console.log(
    `[Mock BLE] Connecting to device: ${peripheralId} (${serialNumber})`,
  );

  // Simulate connection delay
  await simulateDelay(500);

  mockDeviceState.isConnected = true;
  mockDeviceState.serialNumber = serialNumber;

  console.log(`[Mock BLE] Connected successfully`);
}

/**
 * Mock disconnect from device
 */
export async function mockDisconnectDevice(): Promise<void> {
  console.log(`[Mock BLE] Disconnecting from device`);
  await simulateDelay(200);
  mockDeviceState.isConnected = false;
  console.log(`[Mock BLE] Disconnected`);
}

/**
 * Check if currently connected to mock device
 */
export function isMockDeviceConnected(): boolean {
  return mockDeviceState.isConnected;
}

/**
 * Mock start notifications
 */
export async function mockStartNotifications(
  peripheralId: string,
): Promise<void> {
  console.log(`[Mock BLE] Starting notifications for: ${peripheralId}`);
  await simulateDelay(100);
}

/**
 * Mock stop notifications
 */
export async function mockStopNotifications(
  peripheralId: string,
): Promise<void> {
  console.log(`[Mock BLE] Stopping notifications for: ${peripheralId}`);
  await simulateDelay(100);
}

/**
 * Generate mock response for a command
 */
function generateMockResponse(command: BLECommandRequest): BLECommandResponse {
  const responsePayload: number[] = [];

  switch (command.command) {
    case CommandCode.GET_DEVICE_INFO: {
      // Device info response
      const version = mockDeviceState.firmwareVersion.split(".");
      responsePayload.push(
        parseInt(version[0] ?? "1"), // Major version
        parseInt(version[1] ?? "0"), // Minor version
        parseInt(version[2] ?? "0"), // Patch version
        0x01, // Hardware version
      );
      break;
    }

    case CommandCode.GET_UPTIME: {
      // Uptime response (in seconds, 4 bytes little-endian)
      mockDeviceState.uptime += 60; // Increment by 1 minute each time
      const uptime = mockDeviceState.uptime;
      responsePayload.push(
        uptime & 0xff,
        (uptime >> 8) & 0xff,
        (uptime >> 16) & 0xff,
        (uptime >> 24) & 0xff,
      );
      break;
    }

    case CommandCode.GET_TIME: {
      // Time response (BCD format)
      const now = mockDeviceState.currentTime;
      responsePayload.push(
        (Math.floor((now.getFullYear() % 100) / 10) << 4) |
          ((now.getFullYear() % 100) % 10),
        (Math.floor((now.getMonth() + 1) / 10) << 4) |
          ((now.getMonth() + 1) % 10),
        (Math.floor(now.getDate() / 10) << 4) | (now.getDate() % 10),
        now.getDay(),
        (Math.floor(now.getHours() / 10) << 4) | (now.getHours() % 10),
        (Math.floor(now.getMinutes() / 10) << 4) | (now.getMinutes() % 10),
        (Math.floor(now.getSeconds() / 10) << 4) | (now.getSeconds() % 10),
      );
      break;
    }

    case CommandCode.SET_TIME: {
      // Update mock device time
      mockDeviceState.currentTime = new Date();
      break;
    }

    case CommandCode.FIND_ME: {
      // Find device command
      console.log(`[Mock BLE] Find Me activated`);
      break;
    }

    case CommandCode.TRIGGER_LED_PATTERN:
    case CommandCode.TRIGGER_VIBRATION_PATTERN:
    case CommandCode.TRIGGER_AUDIO_PATTERN: {
      // Pattern trigger commands
      console.log(
        `[Mock BLE] Triggered pattern: 0x${command.command.toString(16)}`,
      );
      break;
    }

    case CommandCode.REBOOT_BRACELET: {
      console.log(`[Mock BLE] Rebooting device`);
      // Simulate disconnect after reboot
      setTimeout(() => {
        mockDeviceState.isConnected = false;
      }, 1000);
      break;
    }

    case CommandCode.GET_DEVICE_STATUS: {
      // Comprehensive device status
      responsePayload.push(
        mockDeviceState.batteryLevel,
        mockDeviceState.isCharging ? 0x80 : 0x00,
        mockDeviceState.batteryVoltage & 0xff,
        (mockDeviceState.batteryVoltage >> 8) & 0xff,
      );
      break;
    }

    default: {
      // Unknown command - return success anyway for test mode
      console.warn(
        `[Mock BLE] Unknown command: 0x${command.command.toString(16)}`,
      );
      break;
    }
  }

  return {
    apiVersion: 1,
    commandCode: command.command,
    status: ResponseStatus.OK,
    payload: new Uint8Array(responsePayload),
  };
}

/**
 * Mock send command
 */
export async function mockSendCommand(
  command: BLECommandRequest,
  _timeoutMs?: number,
): Promise<BLECommandResponse> {
  console.log(
    `[Mock BLE] Sending command: 0x${command.command.toString(16).padStart(2, "0")}`,
  );

  if (!mockDeviceState.isConnected) {
    throw new Error("Mock device not connected");
  }

  // Simulate command processing delay
  await simulateDelay(150);

  const response = generateMockResponse(command);

  console.log(
    `[Mock BLE] Command response: status=${response.status}, payload length=${response.payload.length}`,
  );

  return response;
}

/**
 * Mock send multi-packet command
 */
export async function mockSendMultiPacketCommand<T>(
  command: BLECommandRequest,
  packetHandler: (payload: Uint8Array, deviceId: string) => T | null,
  timeoutMs?: number,
): Promise<T> {
  console.log(
    `[Mock BLE] Sending multi-packet command: 0x${command.command.toString(16).padStart(2, "0")}`,
  );

  if (!mockDeviceState.isConnected) {
    throw new Error("Mock device not connected");
  }

  // For multi-packet commands, use single response
  const response = await mockSendCommand(command, timeoutMs);
  const result = packetHandler(response.payload, mockDeviceState.serialNumber);

  if (result === null) {
    throw new Error("Multi-packet command did not return a result");
  }

  return result;
}

/**
 * Get mock device info for advertisement data parsing
 */
export function getMockDeviceInfo(): {
  serialNumber: string;
  batteryLevel: number;
  batteryVoltage: number;
  isCharging: boolean;
  firmwareVersion: string;
} {
  return {
    serialNumber: mockDeviceState.serialNumber,
    batteryLevel: mockDeviceState.batteryLevel,
    batteryVoltage: mockDeviceState.batteryVoltage,
    isCharging: mockDeviceState.isCharging,
    firmwareVersion: mockDeviceState.firmwareVersion,
  };
}
