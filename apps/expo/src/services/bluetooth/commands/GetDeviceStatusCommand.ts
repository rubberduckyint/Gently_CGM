/**
 * Get Device Status Command
 *
 * Retrieves device status information including battery level
 * and other status indicators.
 */

import type { BLECommandExecutionContext, BLECommandMetadata } from "./base";
import { CommandCode } from "../protocol";
import { BLECommand } from "./base";
import { sendSecureCommand } from "./core";

export interface DeviceStatusResponse {
  batteryLevel: number; // 0-100 percentage
  connectionUsed: boolean;
}

export class GetDeviceStatusCommand extends BLECommand<DeviceStatusResponse> {
  readonly metadata: BLECommandMetadata = {
    id: "get-device-status",
    name: "Get Device Status",
    description: "Retrieve device status including battery level",
    category: "device-status",
    version: "1.0.0",
    requiresConnection: true,
    estimatedDuration: 1500,
    tags: ["status", "battery", "health"],
  };

  protected async executeImpl(
    context: BLECommandExecutionContext,
  ): Promise<DeviceStatusResponse> {
    this.log("info", "Getting device status");

    let connection = context.connection;
    let shouldDisconnect = false;

    if (!connection) {
      this.log("info", "Establishing connection for status request...");
      connection = await context.connect();
      shouldDisconnect = true;
    } else {
      this.log("info", "Using existing connection");
    }

    try {
      const statusPayload = await sendSecureCommand(
        connection,
        CommandCode.GET_DEVICE_STATUS,
      );
      const batteryLevel = this.parseBatteryFromStatus(statusPayload);

      this.log("info", `Device battery level: ${batteryLevel}%`);

      return {
        batteryLevel,
        connectionUsed: !shouldDisconnect,
      };
    } finally {
      if (shouldDisconnect) {
        await context.disconnect();
      }
    }
  }

  /**
   * Parse battery level from device status response
   */
  private parseBatteryFromStatus(statusPayload: Uint8Array): number {
    if (statusPayload.length < 2) {
      this.log("warn", "Status response too short, defaulting battery to 0%");
      return 0;
    }

    // First byte is status, second byte is battery level (0-100)
    const status = statusPayload[0];
    if (status !== 0x00) {
      this.log(
        "warn",
        `Status request failed with code: 0x${status?.toString(16).padStart(2, "0")}`,
      );
      return 0;
    }

    const batteryLevel = statusPayload[1] ?? 0;
    return Math.min(100, Math.max(0, batteryLevel)); // Clamp to 0-100
  }
}
