/**
 * Simple BLE Commands
 *
 * Each command is just a simple function that:
 * 1. Creates the request payload using existing command classes
 * 2. Sends it via sendCommand
 * 3. Parses the response using existing command classes
 * 4. Returns typed result
 *
 * No registry, no complex patterns, just simple functions.
 */

import type { Device } from "react-native-ble-plx";

import type { GentlyBLEProtocol } from "./protocol";
// Import existing command classes for their request/response handling
import { DeviceInfoCommand } from "./commands/DeviceInfoCommand";
import { GetAllEventsCommand } from "./commands/GetAllEventsCommand";
import { GetDeviceStatusCommand } from "./commands/GetDeviceStatusCommand";
import { GetNumberOfEventsCommand } from "./commands/GetNumberOfEventsCommand";
import { GetTimeCommand } from "./commands/GetTimeCommand";
import { GetUptimeCommand } from "./commands/GetUptimeCommand";
import { SetTimeCommand } from "./commands/SetTimeCommand";
import { sendCommand } from "./connection";
import { CommandCode } from "./protocol";

export interface SimpleCommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

/**
 * Helper to execute a command and handle common error patterns
 */
async function executeCommand<T>(
  device: Device,
  protocol: GentlyBLEProtocol,
  commandCode: CommandCode,
  requestPayload: Uint8Array | undefined,
  responseParser: (payload: Uint8Array) => T,
  commandName: string,
): Promise<SimpleCommandResult<T>> {
  const startTime = Date.now();

  try {
    console.log(`🚀 Executing ${commandName}...`);

    const responsePayload = await sendCommand(
      device,
      protocol,
      commandCode,
      requestPayload,
    );
    const parsedData = responseParser(responsePayload);

    const duration = Date.now() - startTime;
    console.log(`✅ ${commandName} completed in ${duration}ms`);

    return {
      success: true,
      data: parsedData,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ ${commandName} failed:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

// =============================================================================
// SIMPLE COMMAND FUNCTIONS
// =============================================================================

export async function getDeviceInfo(
  device: Device,
  protocol: GentlyBLEProtocol,
) {
  return executeCommand(
    device,
    protocol,
    CommandCode.GET_DEVICE_INFO,
    DeviceInfoCommand.createRequest(),
    (payload) => DeviceInfoCommand.parseResponse(payload, 0),
    "Get Device Info",
  );
}

export async function getDeviceStatus(
  device: Device,
  protocol: GentlyBLEProtocol,
) {
  return executeCommand(
    device,
    protocol,
    CommandCode.GET_DEVICE_STATUS,
    GetDeviceStatusCommand.createRequest(),
    (payload) => GetDeviceStatusCommand.parseResponse(payload, 0),
    "Get Device Status",
  );
}

export async function getTime(device: Device, protocol: GentlyBLEProtocol) {
  return executeCommand(
    device,
    protocol,
    CommandCode.GET_TIME,
    GetTimeCommand.createRequest(),
    (payload) => GetTimeCommand.parseResponse(payload, 0),
    "Get Time",
  );
}

export async function setTime(
  device: Device,
  protocol: GentlyBLEProtocol,
  timestamp = Date.now(),
) {
  return executeCommand(
    device,
    protocol,
    CommandCode.SET_TIME,
    SetTimeCommand.createRequest(timestamp),
    (payload) => SetTimeCommand.parseResponse(payload, 0),
    "Set Time",
  );
}

export async function getUptime(device: Device, protocol: GentlyBLEProtocol) {
  return executeCommand(
    device,
    protocol,
    CommandCode.GET_UPTIME,
    GetUptimeCommand.createRequest(),
    (payload) => GetUptimeCommand.parseResponse(payload, 0),
    "Get Uptime",
  );
}

export async function getNumberOfEvents(
  device: Device,
  protocol: GentlyBLEProtocol,
) {
  return executeCommand(
    device,
    protocol,
    CommandCode.GET_NUMBER_OF_EVENTS,
    GetNumberOfEventsCommand.createRequest(),
    (payload) => GetNumberOfEventsCommand.parseResponse(payload, 0),
    "Get Number of Events",
  );
}

export async function getAllEvents(
  device: Device,
  protocol: GentlyBLEProtocol,
) {
  // GetAllEventsCommand uses a different pattern, let's just send raw command
  const requestPayload = new Uint8Array(6); // 6 bytes of padding
  return executeCommand(
    device,
    protocol,
    CommandCode.GET_ALL_EVENTS,
    requestPayload,
    (payload) => GetAllEventsCommand.parseEventResponse(payload),
    "Get All Events",
  );
}

// =============================================================================
// COMMAND METADATA FOR UI
// =============================================================================

export interface SimpleCommandMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: number;
  requiresParameters?: boolean;
}

export const SIMPLE_COMMANDS: SimpleCommandMetadata[] = [
  {
    id: "get-device-info",
    name: "Get Device Info",
    description: "Retrieve device hardware and firmware information",
    category: "Device Information",
    estimatedDuration: 1000,
  },
  {
    id: "get-device-status",
    name: "Get Device Status",
    description: "Get battery level and device status",
    category: "Device Status",
    estimatedDuration: 1000,
  },
  {
    id: "get-time",
    name: "Get Time",
    description: "Get current time from device",
    category: "Time Management",
    estimatedDuration: 1000,
  },
  {
    id: "set-time",
    name: "Set Time",
    description: "Set device time to current system time",
    category: "Time Management",
    estimatedDuration: 1000,
  },
  {
    id: "get-uptime",
    name: "Get Uptime",
    description: "Get device uptime",
    category: "Device Status",
    estimatedDuration: 1000,
  },
  {
    id: "get-number-of-events",
    name: "Get Number of Events",
    description: "Get total number of events on device",
    category: "Events",
    estimatedDuration: 1000,
  },
  {
    id: "get-all-events",
    name: "Get All Events",
    description: "Retrieve all events from device",
    category: "Events",
    estimatedDuration: 2000,
  },
];

// =============================================================================
// SIMPLE COMMAND EXECUTOR
// =============================================================================

/**
 * Execute a command by ID with optional parameters
 */
export async function executeSimpleCommand(
  commandId: string,
  device: Device,
  protocol: GentlyBLEProtocol,
  _parameters: Record<string, unknown> = {},
): Promise<SimpleCommandResult> {
  switch (commandId) {
    case "get-device-info":
      return getDeviceInfo(device, protocol);

    case "get-device-status":
      return getDeviceStatus(device, protocol);

    case "get-time":
      return getTime(device, protocol);

    case "set-time":
      return setTime(device, protocol, Date.now());

    case "get-uptime":
      return getUptime(device, protocol);

    case "get-number-of-events":
      return getNumberOfEvents(device, protocol);

    case "get-all-events":
      return getAllEvents(device, protocol);

    default:
      return {
        success: false,
        error: `Unknown command: ${commandId}`,
        duration: 0,
      };
  }
}
