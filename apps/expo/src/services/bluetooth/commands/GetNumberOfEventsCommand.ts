/**
 * Get Number of Events Command
 *
 * Retrieves the total number of events/alarms stored on the device.
 */

import type { BLECommandExecutionContext, BLECommandMetadata } from "./base";
import { CommandCode } from "../protocol";
import { BLECommand } from "./base";
import { sendSecureCommand } from "./core";

export interface GetNumberOfEventsResponse {
  numberOfEvents: number;
  connectionUsed: boolean;
}

export class GetNumberOfEventsCommand extends BLECommand<GetNumberOfEventsResponse> {
  readonly metadata: BLECommandMetadata = {
    id: "get-number-of-events",
    name: "Get Number of Events",
    description: "Get the total number of events/alarms on the device",
    category: "events",
    version: "1.0.0",
    requiresConnection: true,
    estimatedDuration: 1500,
    tags: ["events", "alarms", "count"],
  };

  protected async executeImpl(
    context: BLECommandExecutionContext,
  ): Promise<GetNumberOfEventsResponse> {
    this.log("info", "Getting number of events");

    let connection = context.connection;
    let shouldDisconnect = false;

    if (!connection) {
      this.log("info", "Establishing connection for event count request...");
      connection = await context.connect();
      shouldDisconnect = true;
    } else {
      this.log("info", "Using existing connection");
    }

    try {
      const response = await sendSecureCommand(
        connection,
        CommandCode.GET_NUMBER_OF_EVENTS,
      );

      if (response.length < 2) {
        throw new Error("Invalid get number of events response");
      }

      const status = response[0] ?? 0xff;
      if (status !== 0x00) {
        throw new Error(
          `Get number of events failed with status: 0x${status.toString(16).padStart(2, "0")}`,
        );
      }

      const numberOfEvents = response[1] ?? 0;
      this.log("info", `Device has ${numberOfEvents} events`);

      return {
        numberOfEvents,
        connectionUsed: !shouldDisconnect,
      };
    } finally {
      if (shouldDisconnect) {
        await context.disconnect();
      }
    }
  }
}
