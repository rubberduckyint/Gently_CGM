/**
 * Alert push handler — wires Expo push receipts of `type: "cgm_alert"`
 * to the BLE side channel.
 *
 * The OS-level notification UI is unaffected (Expo's foreground handler
 * in services/notifications already shows the alert). This module
 * additionally dispatches to the bracelet over BLE so the wearer feels
 * it on the wrist.
 *
 * **iOS background caveat:** When the app is fully killed on iOS, BLE
 * state preservation requires native-module configuration (BLE
 * background mode + state restoration delegate) that is out of scope
 * for this commit. Foreground works on both platforms; Android
 * backgrounded works; iOS killed does not. CGM v1 is Android-first per
 * CLAUDE.md, so this is acceptable for now. If/when iOS background BLE
 * is wired, this handler is the consumer side — nothing here changes.
 *
 * **Glucose redaction:** Per CLAUDE.md absolute rule, never log glucose
 * values or raw payload bodies. Logs here are limited to
 * `alertEventId` + `ruleKind` + counts.
 */

import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import type { AlertPayload } from "~/types/alert-payload";
import type { BLEContextValue } from "~/contexts/BLEContext";
import { useBLE } from "~/contexts/BLEContext";
import { AlertPayloadSchema } from "~/types/alert-payload";

import { alertPayloadToBleCommands } from "./translator";

export { alertPayloadToBleCommands };

/**
 * Validate raw notification data against the AlertPayload contract.
 * Returns the parsed payload, or null on shape mismatch / wrong type.
 */
export function parseAlertPayload(data: unknown): AlertPayload | null {
  if (
    typeof data !== "object" ||
    data === null ||
    (data as { type?: unknown }).type !== "cgm_alert"
  ) {
    return null;
  }
  const result = AlertPayloadSchema.safeParse(data);
  if (!result.success) {
    console.warn(
      "[alerts] Push tagged cgm_alert but failed schema validation; ignoring",
    );
    return null;
  }
  return result.data;
}

/**
 * Dispatch an alert payload to the bracelet via BLE.
 *
 * Sequential — BLE doesn't love parallel writes, and the bracelet's
 * three modalities (vibration / led / audio) are already independent
 * commands at the firmware level.
 *
 * If the bracelet is disconnected on push arrival, attempt one short
 * inline reconnect before giving up. Closes the gap between the
 * background 5-min reconnect cadence and the moment an alert lands.
 * The OS notification already surfaced the alert; the bracelet is a
 * *secondary* alert accessory per CLAUDE.md, never the primary alarm.
 */
export async function dispatchAlertToBracelet(
  payload: AlertPayload,
  ble: Pick<
    BLEContextValue,
    "isDeviceConnected" | "sendBLECommand" | "reconnectLastPaired"
  >,
): Promise<void> {
  if (!ble.isDeviceConnected()) {
    console.log(
      `[alerts] Bracelet disconnected on push arrival for ${payload.alertEventId} — attempting inline reconnect`,
    );
    const reconnected = await ble.reconnectLastPaired();
    if (!reconnected) {
      console.warn(
        `[alerts] Inline reconnect failed for ${payload.alertEventId} (${payload.ruleKind}); skipping BLE dispatch — OS notification already surfaced`,
      );
      return;
    }
    console.log(
      `[alerts] Inline reconnect succeeded for ${payload.alertEventId}`,
    );
  }

  const commands = alertPayloadToBleCommands(payload);
  if (commands.length === 0) {
    console.log(
      `[alerts] No BLE commands emitted for ${payload.alertEventId} (${payload.ruleKind}); payload had no triggerable modalities`,
    );
    return;
  }

  console.log(
    `[alerts] Dispatching ${commands.length} BLE command(s) for ${payload.alertEventId} (${payload.ruleKind})`,
  );

  for (const command of commands) {
    try {
      await ble.sendBLECommand(command);
    } catch (error) {
      console.error(
        `[alerts] BLE command 0x${command.command.toString(16)} failed for ${payload.alertEventId}:`,
        error,
      );
      // Continue with remaining commands — partial alert better than none.
    }
  }
}

async function handleNotification(
  notification: Notifications.Notification,
  ble: Pick<
    BLEContextValue,
    "isDeviceConnected" | "sendBLECommand" | "reconnectLastPaired"
  >,
): Promise<void> {
  const data = notification.request.content.data;
  const payload = parseAlertPayload(data);
  if (!payload) return;
  await dispatchAlertToBracelet(payload, ble);
}

/**
 * Hook: subscribes to Expo push receipts and forwards CGM alerts to
 * the bracelet. Must run inside the BLEProvider tree.
 *
 * Idempotent against re-renders — useEffect deps are the BLE context's
 * stable callbacks, and Expo notification listeners are scoped to the
 * effect's lifetime.
 */
export function useAlertPushHandler(): void {
  const ble = useBLE();

  useEffect(() => {
    const dispatch = (n: Notifications.Notification) => {
      void handleNotification(n, ble);
    };

    const receivedSub =
      Notifications.addNotificationReceivedListener(dispatch);

    // For background-tap (best effort — iOS killed-state has caveats
    // covered in the file header comment).
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void handleNotification(response.notification, ble);
      },
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [ble]);
}

