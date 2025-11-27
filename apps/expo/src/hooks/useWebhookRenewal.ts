/**
 * Webhook Renewal Hook
 *
 * Automatically renews Google Calendar webhook channels before they expire.
 * Webhook channels expire after ~7 days, so we check and renew when
 * expiration is within 1 hour.
 */

import { useCallback, useEffect, useRef } from "react";

import {
  generateChannelId,
  getAccessToken,
  setupWatchChannel,
  stopWatchChannel,
} from "~/services/googleCalendar";
import { trpc } from "~/utils/api";

// Check for expiring webhooks every 30 minutes
const RENEWAL_CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Renew webhooks that expire within 2 hours
const RENEWAL_THRESHOLD_MS = 2 * 60 * 60 * 1000;

interface WebhookRenewalOptions {
  /** Enable automatic renewal checks */
  enabled?: boolean;
  /** Check interval in milliseconds (default: 30 minutes) */
  checkIntervalMs?: number;
}

interface CalendarConnectionForRenewal {
  id: string;
  accessToken: string;
  calendarId: string;
  watchChannelId: string | null;
  watchResourceId: string | null;
  watchExpiration: Date | null;
  isActive: boolean;
}

export function useWebhookRenewal(options: WebhookRenewalOptions = {}) {
  const { enabled = true, checkIntervalMs = RENEWAL_CHECK_INTERVAL_MS } =
    options;

  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRenewingRef = useRef(false);

  /**
   * Renew a single webhook channel
   */
  const renewWebhook = useCallback(
    async (connection: CalendarConnectionForRenewal) => {
      const webhookUrl = `${process.env.EXPO_PUBLIC_BASE_URL}/api/calendar/webhook`;

      // Skip if not using HTTPS
      if (!webhookUrl.startsWith("https://")) {
        console.log("[WebhookRenewal] Skipping - not using HTTPS");
        return false;
      }

      try {
        // Get fresh access token
        const accessToken = await getAccessToken();

        // Stop the old webhook if it exists
        if (connection.watchChannelId && connection.watchResourceId) {
          try {
            await stopWatchChannel(
              accessToken,
              connection.watchChannelId,
              connection.watchResourceId,
            );
            console.log(
              "[WebhookRenewal] Stopped old webhook:",
              connection.watchChannelId,
            );
          } catch {
            // Ignore - old webhook may have already expired
          }
        }

        // Create new webhook
        const channelId = generateChannelId();
        const watchInfo = await setupWatchChannel(
          accessToken,
          connection.calendarId,
          webhookUrl,
          channelId,
        );

        // Save new watch info
        await trpc.calendar.updateWatchChannel.mutate({
          connectionId: connection.id,
          watchChannelId: watchInfo.channelId,
          watchResourceId: watchInfo.resourceId,
          watchExpiration: watchInfo.expiration,
        });

        console.log(
          "[WebhookRenewal] Renewed webhook for connection:",
          connection.id,
          "expires:",
          watchInfo.expiration,
        );

        return true;
      } catch (error) {
        console.error("[WebhookRenewal] Failed to renew webhook:", error);

        // Clear the webhook info so we don't keep trying
        try {
          await trpc.calendar.clearWatchChannel.mutate({
            connectionId: connection.id,
          });
        } catch {
          // Ignore cleanup errors
        }

        return false;
      }
    },
    [],
  );

  /**
   * Check all connections and renew expiring webhooks
   */
  const checkAndRenew = useCallback(async () => {
    if (isRenewingRef.current) {
      console.log("[WebhookRenewal] Already checking, skipping");
      return;
    }

    isRenewingRef.current = true;

    try {
      // Fetch all connections
      const connections = await trpc.calendar.getConnections.query();

      if (!connections || connections.length === 0) {
        return;
      }

      const now = Date.now();
      let renewedCount = 0;

      for (const connection of connections) {
        // Skip inactive connections
        if (!connection.isActive) continue;

        // Check if webhook needs renewal
        if (connection.watchExpiration) {
          const expirationTime = new Date(connection.watchExpiration).getTime();
          const timeUntilExpiration = expirationTime - now;

          if (timeUntilExpiration < RENEWAL_THRESHOLD_MS) {
            console.log(
              "[WebhookRenewal] Webhook expiring soon for:",
              connection.id,
              "expires in:",
              Math.round(timeUntilExpiration / 1000 / 60),
              "minutes",
            );

            const renewed = await renewWebhook(
              connection as CalendarConnectionForRenewal,
            );
            if (renewed) renewedCount++;
          }
        } else {
          // No webhook registered - try to set one up
          const webhookUrl = `${process.env.EXPO_PUBLIC_BASE_URL}/api/calendar/webhook`;
          if (webhookUrl.startsWith("https://")) {
            console.log(
              "[WebhookRenewal] No webhook for connection:",
              connection.id,
              "- setting up",
            );
            const renewed = await renewWebhook(
              connection as CalendarConnectionForRenewal,
            );
            if (renewed) renewedCount++;
          }
        }
      }

      if (renewedCount > 0) {
        console.log("[WebhookRenewal] Renewed", renewedCount, "webhook(s)");
      }
    } catch (error) {
      console.error("[WebhookRenewal] Error checking webhooks:", error);
    } finally {
      isRenewingRef.current = false;
    }
  }, [renewWebhook]);

  // Set up periodic check
  useEffect(() => {
    if (!enabled) return;

    // Check immediately on mount
    void checkAndRenew();

    // Set up periodic check
    checkIntervalRef.current = setInterval(() => {
      void checkAndRenew();
    }, checkIntervalMs);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, checkIntervalMs, checkAndRenew]);

  return {
    checkAndRenew,
    renewWebhook,
  };
}
