/**
 * Basic Connection Test Command
 *
 * Tests the fundamental BLE connection functionality to a Gently device,
 * verifying that the device can be found, connected to, and disconnected from.
 */

import type { BLECommandExecutionContext, BLECommandMetadata } from "./base";
import { BLECommand } from "./base";

export interface ConnectionTestResponse {
  deviceId: string;
  deviceName?: string;
  protocolEstablished: boolean;
  deviceInfoAvailable: boolean;
  connectionDuration: number;
}

export class BasicConnectionCommand extends BLECommand<ConnectionTestResponse> {
  readonly metadata: BLECommandMetadata = {
    id: "basic-connection",
    name: "Basic Connection Test",
    description: "Test basic BLE connection to device using serial number",
    category: "connection",
    version: "1.0.0",
    requiresConnection: false, // We establish our own connection
    estimatedDuration: 5000, // 5 seconds
    tags: ["connection", "basic", "test", "bluetooth"],
  };

  protected async executeImpl(
    context: BLECommandExecutionContext,
  ): Promise<ConnectionTestResponse> {
    if (!context.deviceSerialNumber) {
      throw new Error("Device serial number is required for connection test");
    }

    this.log(
      "info",
      `Starting basic connection test for device: ${context.deviceSerialNumber}`,
    );

    const startTime = Date.now();

    // Step 1: Establish connection
    this.log("info", "Establishing BLE connection...");
    const connection = await context.connect();

    this.log("info", "Successfully connected to device", {
      deviceId: connection.device.id,
      deviceName: connection.device.name,
    });

    // Step 2: Verify protocol establishment
    const protocolEstablished = connection.protocol.isDynamicKeyEstablished();
    this.log(
      "info",
      `Protocol status: ${protocolEstablished ? "established" : "not established"}`,
    );

    // Step 3: Verify device info availability
    const deviceInfoAvailable = !!connection.deviceInfo;
    this.log("info", `Device info available: ${deviceInfoAvailable}`);

    this.log("info", "Device info details", {
      hardwareVersion: connection.deviceInfo.hardwareVersion,
      firmwareVersion: `${connection.deviceInfo.firmwareVersionMajor}.${connection.deviceInfo.firmwareVersionMinor}`,
      buildNumber: connection.deviceInfo.firmwareBuildNumber,
    });

    // Step 4: Wait briefly to simulate real usage
    this.log("info", "Simulating brief connection usage...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 5: Disconnect
    this.log("info", "Disconnecting from device...");
    await context.disconnect();
    this.log("info", "Successfully disconnected");

    const connectionDuration = Date.now() - startTime;
    this.log("info", `Connection test completed in ${connectionDuration}ms`);

    return {
      deviceId: connection.device.id,
      deviceName: connection.device.name ?? undefined,
      protocolEstablished,
      deviceInfoAvailable,
      connectionDuration,
    };
  }
}
