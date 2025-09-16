/**
 * Device Information Command
 *
 * Retrieves comprehensive device information including hardware version,
 * firmware version, and other device-specific details.
 */

import type { DeviceInformation } from "../protocol";
import type { BLECommandExecutionContext, BLECommandMetadata } from "./base";
import { CommandCode } from "../protocol";
import { BLECommand } from "./base";
import { sendSecureCommand } from "./core";

export interface DeviceInfoResponse extends DeviceInformation {
  connectionUsed: boolean; // Whether an existing connection was used
}

export class DeviceInfoCommand extends BLECommand<DeviceInfoResponse> {
  readonly metadata: BLECommandMetadata = {
    id: "device-info",
    name: "Get Device Information",
    description: "Retrieve device hardware and firmware information",
    category: "device-info",
    version: "1.0.0",
    requiresConnection: true,
    estimatedDuration: 2000, // 2 seconds
    tags: ["device", "info", "hardware", "firmware"],
  };

  protected async executeImpl(
    context: BLECommandExecutionContext,
  ): Promise<DeviceInfoResponse> {
    this.log("info", "Starting device information retrieval");

    let connection = context.connection;
    let shouldDisconnect = false;

    if (!connection) {
      this.log(
        "info",
        "No existing connection, establishing new connection...",
      );
      connection = await context.connect();
      shouldDisconnect = true;
    } else {
      this.log("info", "Using existing connection");
    }

    try {
      // Get device info using secure protocol
      this.log("info", "Requesting device information via secure protocol...");
      const infoPayload = await sendSecureCommand(
        connection,
        CommandCode.GET_DEVICE_INFO,
      );

      // Parse device info from response
      const deviceInfo = this.parseDeviceInfoResponse(infoPayload);

      this.log("info", "Device information retrieved successfully", {
        hardwareVersion: deviceInfo.hardwareVersion,
        firmwareVersion: `${deviceInfo.firmwareVersionMajor}.${deviceInfo.firmwareVersionMinor}`,
        buildNumber: deviceInfo.firmwareBuildNumber,
      });

      return {
        ...deviceInfo,
        connectionUsed: !shouldDisconnect,
      };
    } finally {
      if (shouldDisconnect) {
        this.log("info", "Disconnecting from device...");
        await context.disconnect();
      }
    }
  }

  /**
   * Parse device info response from secure protocol
   */
  private parseDeviceInfoResponse(payload: Uint8Array): DeviceInformation {
    // Device info response format (based on protocol):
    // [status][hardware_version][firmware_major][firmware_minor][build_number]

    if (payload.length < 5) {
      throw new Error("Invalid device info response length");
    }

    const status = payload[0];
    if (status !== 0x00) {
      throw new Error(
        `Device info request failed with status: 0x${status?.toString(16).padStart(2, "0")}`,
      );
    }

    return {
      hardwareVersion: payload[1] ?? 0,
      firmwareVersionMajor: payload[2] ?? 0,
      firmwareVersionMinor: payload[3] ?? 0,
      firmwareBuildNumber: payload[4] ?? 0,
    };
  }
}
