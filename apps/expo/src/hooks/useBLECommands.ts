/**
 * useBLECommands Hook
 *
 * Provides methods for sending BLE commands to connected devices
 * with automatic retry logic and error handling.
 */

import { useCallback, useRef } from "react";

import type {
  BLECommandRequest,
  BLECommandResponse,
} from "~/services/ble/types";
import { sendCommand, sendMultiPacketCommand } from "~/services/ble/manager";

interface UseBLECommandsProps {
  getConnectionState: () =>
    | "disconnected"
    | "scanning"
    | "connecting"
    | "connected"
    | "error";
  getConnectedDevice: () => { id: string } | null;
  getEncryptionKey: () => string | null;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// Helper function to get human-readable command names for logging
function getCommandName(command: number): string {
  const commandNames: Record<number, string> = {
    0x01: "GET_UPTIME",
    0x02: "GET_DEVICE_INFO",
    0x03: "GET_EVENT",
    0x04: "ADD_EVENT",
    0x05: "SET_EVENT_ON_OFF",
    0x06: "GET_ALL_EVENTS",
    0x07: "REMOVE_EVENT",
    0x08: "REMOVE_ALL_EVENTS",
    0x09: "GET_NUMBER_OF_EVENTS",
    0x0a: "GET_TIME",
    0x0b: "SET_TIME",
    0x0c: "GET_DEVICE_STATUS",
    0x0d: "ACKNOWLEDGE_EVENT",
    0x0e: "SET_BRACELET_KEY",
    0x0f: "GET_BRACELET_KEY",
    0x10: "FIND_ME",
    0x11: "ENTER_DFU_MODE",
    0x12: "REBOOT_BRACELET",
    0x13: "SET_DYNAMIC_KEY",
  };
  return (
    commandNames[command] ??
    `UNKNOWN_COMMAND_${command.toString(16).padStart(2, "0").toUpperCase()}`
  );
}

export function useBLECommands({
  getConnectionState,
  getConnectedDevice,
  getEncryptionKey,
}: UseBLECommandsProps) {
  const _commandInProgressRef = useRef(false);

  /**
   * Send a single-packet BLE command with automatic retry
   */
  const sendBLECommand = useCallback(
    async (
      command: BLECommandRequest,
      timeoutMs = 20000,
    ): Promise<BLECommandResponse> => {
      const connectedDevice = getConnectedDevice();
      const encryptionKey = getEncryptionKey();
      const connectionState = getConnectionState();

      if (!connectedDevice || !encryptionKey) {
        throw new Error("Device not connected or encryption key missing");
      }

      if (connectionState !== "connected") {
        throw new Error(`Invalid connection state: ${connectionState}`);
      }

      let lastError: Error = new Error("No attempts made");
      const commandName = getCommandName(command.command);

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(
            `🔄 [BLE Commands] Sending ${commandName} (attempt ${attempt}/${MAX_RETRIES})`,
          );

          const response = await sendCommand({
            peripheralId: connectedDevice.id,
            command,
            encryptionKey,
            timeoutMs,
          });

          if (attempt > 1) {
            console.log(
              `✅ [BLE Commands] ${commandName} succeeded on attempt ${attempt}`,
            );
          }

          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `⚠️ [BLE Commands] ${commandName} attempt ${attempt}/${MAX_RETRIES} failed:`,
            lastError.message,
          );

          if (attempt === MAX_RETRIES) {
            console.error(
              `❌ [BLE Commands] ${commandName} failed after ${MAX_RETRIES} attempts`,
            );
            throw lastError;
          }

          const delayMs = attempt * BASE_RETRY_DELAY_MS;
          console.log(`⏳ [BLE Commands] Waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      throw lastError;
    },
    [getConnectionState, getConnectedDevice, getEncryptionKey],
  );

  /**
   * Send a multi-packet BLE command with automatic retry
   */
  const sendMultiPacketBLECommand = useCallback(
    async <T>(
      command: BLECommandRequest,
      packetHandler: (payload: Uint8Array, deviceId: string) => T,
      timeoutMs = 30000,
    ): Promise<T> => {
      const connectedDevice = getConnectedDevice();
      const encryptionKey = getEncryptionKey();
      const connectionState = getConnectionState();

      if (!connectedDevice || !encryptionKey) {
        console.error(
          "❌ [BLE Commands] Multi-packet command failed - device not connected",
        );
        throw new Error("Device not connected or encryption key missing");
      }

      if (connectionState !== "connected") {
        console.error(
          `❌ [BLE Commands] Multi-packet command failed - invalid state: ${connectionState}`,
        );
        throw new Error(`Invalid connection state: ${connectionState}`);
      }

      let lastError: Error = new Error("No attempts made");
      const commandName = getCommandName(command.command);

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(
            `🔄 [BLE Commands] Sending multi-packet ${commandName} (attempt ${attempt}/${MAX_RETRIES})`,
          );

          const response = await sendMultiPacketCommand(
            connectedDevice.id,
            encryptionKey,
            command,
            packetHandler,
            timeoutMs,
          );

          console.log(
            `✅ [BLE Commands] Multi-packet ${commandName} succeeded`,
          );
          return response as T;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `⚠️ [BLE Commands] Multi-packet ${commandName} attempt ${attempt}/${MAX_RETRIES} failed:`,
            lastError.message,
          );

          if (attempt === MAX_RETRIES) {
            console.error(
              `❌ [BLE Commands] Multi-packet ${commandName} failed after ${MAX_RETRIES} attempts`,
            );
            throw lastError;
          }

          const delayMs = attempt * BASE_RETRY_DELAY_MS;
          console.log(`⏳ [BLE Commands] Waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      throw lastError;
    },
    [getConnectionState, getConnectedDevice, getEncryptionKey],
  );

  return {
    sendBLECommand,
    sendMultiPacketBLECommand,
    getCommandName,
  };
}
