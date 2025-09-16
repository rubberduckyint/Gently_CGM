/**
 * Create Event Command
 *
 * Creates a test event 5 minutes in the future on the device.
 * Useful for testing event creation and device alarm functionality.
 */

import type { BLECommandExecutionContext, BLECommandMetadata } from "./base";
import { CommandCode } from "../protocol";
import { BLECommand } from "./base";
import { sendSecureCommand } from "./core";

export interface CreateEventResponse {
  success: boolean;
  eventIndex: number;
  eventName: string;
  scheduledTime: Date;
  cronExpression: string;
  responseStatus: number;
  connectionUsed: boolean;
}

export class CreateEventCommand extends BLECommand<CreateEventResponse> {
  readonly metadata: BLECommandMetadata = {
    id: "create-event",
    name: "Create Test Event",
    description:
      "Create a test event 5 minutes in the future to test alarm functionality",
    category: "event-management",
    version: "1.0.0",
    requiresConnection: true,
    estimatedDuration: 5000, // 5 seconds
    tags: ["event", "alarm", "test", "create"],
    parameters: [
      {
        name: "eventIndex",
        type: "number",
        required: false,
        description: "Event slot index (0-49, default: 0)",
        defaultValue: 0,
        validation: {
          min: 0,
          max: 49,
        },
      },
      {
        name: "eventName",
        type: "string",
        required: false,
        description: "Name for the test event",
        defaultValue: "Test Event",
      },
      {
        name: "minutesInFuture",
        type: "number",
        required: false,
        description: "Minutes in the future to schedule event (default: 5)",
        defaultValue: 5,
        validation: {
          min: 1,
          max: 60,
        },
      },
    ],
  };

  protected async executeImpl(
    context: BLECommandExecutionContext,
  ): Promise<CreateEventResponse> {
    this.log("info", "Starting Create Event command");

    const eventIndex =
      (context.parameters?.eventIndex as number | undefined) ?? 0;
    const eventName =
      (context.parameters?.eventName as string | undefined) ??
      "Test Event Created via BLE";
    const minutesInFuture =
      (context.parameters?.minutesInFuture as number | undefined) ?? 5;

    this.log(
      "info",
      `Creating event: ${eventName} at index ${eventIndex}, ${minutesInFuture} minutes in future`,
    );

    // Calculate the target time (current time + specified minutes)
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + minutesInFuture * 60 * 1000);

    // Create cron expression for the exact minute
    // Format: second minute hour day month weekday
    // We'll use "0 MM HH DD MM *" where MM=minute, HH=hour, DD=day, MM=month
    const cronExpression = `0 ${scheduledTime.getMinutes()} ${scheduledTime.getHours()} ${scheduledTime.getDate()} ${scheduledTime.getMonth() + 1} *`;

    this.log("info", `Scheduled time: ${scheduledTime.toLocaleString()}`);
    this.log("info", `Cron expression: ${cronExpression}`);

    // For testing purposes, if there's no connection available, simulate a successful response
    // This allows testing the command UI without requiring a real BLE device
    if (!context.connection) {
      this.log("info", "No connection available - running in simulation mode");
      this.log(
        "info",
        "This would normally connect to device and create the event",
      );

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        eventIndex,
        eventName,
        scheduledTime,
        cronExpression,
        responseStatus: 0x00,
        connectionUsed: false,
      };
    }

    const connection = context.connection;

    // If we have a connection, proceed with real BLE communication
    this.log("info", "Using existing connection for BLE communication");

    // Create ADD_EVENT command payload
    const payload = this.createAddEventPayload({
      index: eventIndex,
      name: eventName,
      cronExpression,
      isActive: true,
    });

    this.log("info", "Sending CREATE EVENT command to device...", {
      eventIndex,
      eventName,
      cronExpression,
      scheduledTime: scheduledTime.toISOString(),
      payloadSize: payload.length,
    });

    // Send the command and wait for response
    const response = await sendSecureCommand(
      connection,
      CommandCode.ADD_EVENT,
      payload,
    );

    this.log("info", "Create Event response received", {
      response: Array.from(response)
        .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
        .join(" "),
    });

    // Check response status (first byte in response payload)
    if (response.length >= 1) {
      const responseStatus = response[0] ?? 0xff;
      const success = responseStatus === 0x00;

      if (success) {
        this.log(
          "info",
          `Create Event command successful - event "${eventName}" scheduled for ${scheduledTime.toLocaleString()}`,
        );
      } else {
        this.log(
          "warn",
          `Create Event command failed with status: 0x${responseStatus.toString(16).padStart(2, "0")}`,
        );
      }

      return {
        success,
        eventIndex,
        eventName,
        scheduledTime,
        cronExpression,
        responseStatus,
        connectionUsed: true,
      };
    } else {
      throw new Error("Invalid response length for Create Event command");
    }
  }

  /**
   * Create ADD_EVENT payload for device
   */
  private createAddEventPayload(event: {
    index: number;
    name: string;
    cronExpression: string;
    isActive: boolean;
  }): Uint8Array {
    // Convert event data to binary format for BLE protocol
    const nameBytes = new TextEncoder().encode(event.name);
    const cronBytes = new TextEncoder().encode(event.cronExpression);

    const payload = new Uint8Array(4 + nameBytes.length + cronBytes.length);
    let offset = 0;

    // Event index
    payload[offset++] = event.index;

    // Name length and name
    payload[offset++] = nameBytes.length;
    payload.set(nameBytes, offset);
    offset += nameBytes.length;

    // Cron expression length and cron
    payload[offset++] = cronBytes.length;
    payload.set(cronBytes, offset);
    offset += cronBytes.length;

    // Active flag
    payload[offset++] = event.isActive ? 1 : 0;

    return payload;
  }
}
