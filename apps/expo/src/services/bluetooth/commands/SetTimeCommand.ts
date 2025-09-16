/**
 * Set Time Command
 *
 * Sets the device's current time.
 */

import type { BLECommandExecutionContext, BLECommandMetadata } from "./base";
import { CommandCode } from "../protocol";
import { BLECommand } from "./base";
import { sendSecureCommand } from "./core";

export interface SetTimeResponse {
  success: boolean;
  timeSet: Date;
  connectionUsed: boolean;
}

export class SetTimeCommand extends BLECommand<SetTimeResponse> {
  readonly metadata: BLECommandMetadata = {
    id: "set-time",
    name: "Set Device Time",
    description: "Set the device's current time",
    category: "device-control",
    version: "1.0.0",
    requiresConnection: true,
    estimatedDuration: 2000,
    tags: ["time", "clock", "sync", "control"],
    parameters: [
      {
        name: "time",
        type: "number",
        required: false,
        description: "Unix timestamp to set (default: current time)",
        validation: {
          min: 0,
        },
      },
    ],
  };

  protected async executeImpl(
    context: BLECommandExecutionContext,
  ): Promise<SetTimeResponse> {
    this.log("info", "Setting device time");

    // Use provided time or current system time
    const timeToSet = context.parameters?.time as number | undefined;
    const targetTime = timeToSet ? new Date(timeToSet * 1000) : new Date();

    this.log("info", `Setting device time to: ${targetTime.toISOString()}`);

    let connection = context.connection;
    let shouldDisconnect = false;

    if (!connection) {
      this.log("info", "Establishing connection for time setting...");
      connection = await context.connect();
      shouldDisconnect = true;
    } else {
      this.log("info", "Using existing connection");
    }

    try {
      // Create time payload (4 bytes, Unix timestamp in seconds, little endian)
      const payload = new Uint8Array(4);
      const timestamp = Math.floor(targetTime.getTime() / 1000);
      const view = new DataView(payload.buffer);
      view.setUint32(0, timestamp, true);

      this.log("info", "Sending time to device...", {
        timestamp,
        payload: Array.from(payload)
          .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
          .join(" "),
      });

      const response = await sendSecureCommand(
        connection,
        CommandCode.SET_TIME,
        payload,
      );

      if (response.length < 1) {
        throw new Error("Invalid set time response");
      }

      const status = response[0] ?? 0xff;
      const success = status === 0x00;

      if (success) {
        this.log("info", "Device time set successfully");
      } else {
        this.log(
          "warn",
          `Set time failed with status: 0x${status.toString(16).padStart(2, "0")}`,
        );
      }

      return {
        success,
        timeSet: targetTime,
        connectionUsed: !shouldDisconnect,
      };
    } finally {
      if (shouldDisconnect) {
        await context.disconnect();
      }
    }
  }
}
