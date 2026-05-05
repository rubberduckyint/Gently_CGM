/**
 * useBLENotifications Hook
 *
 * Handles BLE notification parsing and state management.
 * Processes battery, event, and time notifications from connected devices.
 */

import { useCallback, useState } from "react";

import type { BLENotification } from "~/contexts/BLEContext";
import { TEAEncryption } from "~/services/ble/encryption";
import {
  parseActiveEventNotification,
  parseBatteryStatusNotification,
  parseNotification,
  parseTimeNotification,
} from "~/services/ble/notifications";

// Helper function to get human-readable command names for logging
function getCommandName(command: number): string {
  const commandNames: Record<number, string> = {
    0x01: "GET_UPTIME",
    0x02: "GET_DEVICE_INFO",
    0x0a: "GET_TIME",
    0x0b: "SET_TIME",
    0x0c: "GET_DEVICE_STATUS",
    0x10: "FIND_ME",
    0x11: "ENTER_DFU_MODE",
    0x12: "REBOOT_BRACELET",
  };
  return (
    commandNames[command] ??
    `UNKNOWN_COMMAND_${command.toString(16).padStart(2, "0").toUpperCase()}`
  );
}

interface UseBLENotificationsProps {
  getEncryptionKey: () => string | null;
}

export function useBLENotifications({
  getEncryptionKey,
}: UseBLENotificationsProps) {
  const [notifications, setNotifications] = useState<BLENotification[]>([]);

  /**
   * Clear all stored notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Add a new notification to the list
   */
  const addNotification = useCallback((notification: BLENotification) => {
    setNotifications((prev) => [...prev, notification]);
  }, []);

  /**
   * Process incoming BLE notification data
   */
  const handleNotificationData = useCallback(
    (data: number[]) => {
      const encryptionKey = getEncryptionKey();

      if (!encryptionKey) {
        console.warn("[BLE Notifications] No encryption key available");
        return;
      }

      try {
        // Convert received data to Uint8Array
        const encryptedData = new Uint8Array(data);

        // Decrypt notifications
        const tea = new TEAEncryption(encryptionKey);
        const decryptedData = new Uint8Array(encryptedData.length);

        for (let i = 0; i < encryptedData.length; i += 8) {
          const block = encryptedData.slice(i, i + 8);
          if (block.length === 8) {
            const decryptedBlock = tea.decrypt(block);
            decryptedData.set(decryptedBlock, i);
          }
        }

        // Check if this is a notification (0x80-0x82) or a command response (0x01-0x13)
        const command = decryptedData[1]; // Command is at byte 1 after API version

        if (command !== undefined && command < 0x80) {
          // This is a command response, not a notification
          const commandName = getCommandName(command);
          console.log(
            `[BLE Notifications] Received ${commandName} response`,
          );
          return;
        }

        // Parse the notification
        const notification = parseNotification(decryptedData);
        if (!notification) {
          console.warn("[BLE Notifications] Could not parse notification");
          return;
        }

        let detailedDescription = "";
        let notificationType: "battery" | "event" | "time" | "unknown" =
          "unknown";

        if (notification.command === 0x80) {
          // Battery Status Notification
          const batteryNotification =
            parseBatteryStatusNotification(decryptedData);
          notificationType = "battery";
          detailedDescription = `Battery: ${batteryNotification.batteryLevelText} (${batteryNotification.batteryVoltage}mV)${batteryNotification.isCharging ? " - Charging" : ""}`;

          console.log(
            `[BLE Notifications] Battery: ${batteryNotification.batteryLevelText} at ${batteryNotification.batteryVoltage}mV`,
          );
        } else if (notification.command === 0x81) {
          // Active Event Notification
          const eventNotification = parseActiveEventNotification(decryptedData);
          notificationType = "event";
          detailedDescription = `Event ${eventNotification.eventIndex}: ${eventNotification.eventStateText}`;

          console.log(
            `[BLE Notifications] Event #${eventNotification.eventIndex}: ${eventNotification.eventStateText}`,
          );
        } else {
          // Time Notification (command === 0x82)
          const timeNotification = parseTimeNotification(decryptedData);
          notificationType = "time";
          detailedDescription = `Time: ${timeNotification.dateTime.toLocaleString()} (${timeNotification.weekDayText})`;

          console.log(
            `[BLE Notifications] Time: ${timeNotification.dateTime.toLocaleString()}`,
          );
        }

        // Add to notifications list
        const contextNotification: BLENotification = {
          type: notificationType,
          timestamp: new Date(),
          description: detailedDescription,
          rawData: Array.from(decryptedData),
        };

        setNotifications((prev) => [...prev, contextNotification]);
        console.log(`[BLE Notifications] ${detailedDescription}`);
      } catch (error) {
        console.warn(
          "[BLE Notifications] Failed to parse notification:",
          error,
        );
      }
    },
    [getEncryptionKey],
  );

  return {
    notifications,
    clearNotifications,
    addNotification,
    handleNotificationData,
  };
}
