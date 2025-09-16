/**
 * Get Time Command
 *
 * Retrieves the current time from the device.
 */

import type { BLECommandExecutionContext, BLECommandMetadata } from "./base";
import { CommandCode } from "../protocol";
import { BLECommand } from "./base";
import { sendSecureCommand } from "./core";

export interface GetTimeResponse {
  deviceTime: Date;
  systemTime: Date;
  timeDifference: number; // milliseconds
  connectionUsed: boolean;
}

export class GetTimeCommand extends BLECommand<GetTimeResponse> {
  readonly metadata: BLECommandMetadata = {
    id: "get-time",
    name: "Get Device Time",
    description: "Retrieve current time from the device",
    category: "device-status",
    version: "1.0.0",
    requiresConnection: true,
    estimatedDuration: 1500,
    tags: ["time", "clock", "sync"],
  };

  protected async executeImpl(
    context: BLECommandExecutionContext,
  ): Promise<GetTimeResponse> {
    this.log("info", "Getting device time");

    let connection = context.connection;
    let shouldDisconnect = false;

    if (!connection) {
      this.log("info", "Establishing connection for time request...");
      connection = await context.connect();
      shouldDisconnect = true;
    } else {
      this.log("info", "Using existing connection");
    }

    try {
      const systemTime = new Date();
      const timePayload = await sendSecureCommand(
        connection,
        CommandCode.GET_TIME,
      );
      const deviceTime = this.parseTimeResponse(timePayload);
      const timeDifference = deviceTime.getTime() - systemTime.getTime();

      this.log("info", `Device time: ${deviceTime.toISOString()}`);
      this.log("info", `System time: ${systemTime.toISOString()}`);
      this.log("info", `Time difference: ${timeDifference}ms`);

      return {
        deviceTime,
        systemTime,
        timeDifference,
        connectionUsed: !shouldDisconnect,
      };
    } finally {
      if (shouldDisconnect) {
        await context.disconnect();
      }
    }
  }

  /**
   * Parse time from device time response
   */
  private parseTimeResponse(timePayload: Uint8Array): Date {
    if (timePayload.length < 4) {
      this.log(
        "warn",
        "Time response too short, returning current system time",
      );
      return new Date();
    }

    const status = timePayload[0];
    if (status !== 0x00) {
      this.log(
        "warn",
        `Time request failed with status: 0x${status?.toString(16).padStart(2, "0")}`,
      );
      return new Date();
    }

    // Parse Unix timestamp (4 bytes, little endian, starting from byte 1)
    const timestampView = new DataView(timePayload.buffer, 1, 4);
    const timestamp = timestampView.getUint32(0, true);

    // Convert to JavaScript Date (Unix timestamp is in seconds)
    return new Date(timestamp * 1000);
  }
}
