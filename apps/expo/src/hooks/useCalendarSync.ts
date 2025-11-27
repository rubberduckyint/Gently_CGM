/**
 * Calendar Sync Hook
 *
 * Handles automatic background synchronization of calendar events
 * with their corresponding alarms. Detects changes (updates, cancellations)
 * and keeps alarms in sync with the source calendar.
 */

import type { AppStateStatus } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";

import type { GoogleCalendarEvent } from "~/services/googleCalendar";
import {
  fetchCalendarEventsIncremental,
  getAccessToken,
} from "~/services/googleCalendar";
import { trpc } from "~/utils/api";

// Sync every 5 minutes when app is active
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

// Minimum time between syncs (to prevent rapid re-syncs)
const MIN_SYNC_INTERVAL_MS = 30 * 1000;

export interface CalendarSyncState {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  lastSyncResult: {
    updated: number;
    cancelled: number;
    unchanged: number;
  } | null;
  error: string | null;
}

export interface UseCalendarSyncOptions {
  /** Enable automatic periodic sync when app is active */
  autoSync?: boolean;
  /** Sync interval in milliseconds (default: 5 minutes) */
  syncIntervalMs?: number;
  /** Show alerts for sync results */
  showAlerts?: boolean;
  /** Callback when sync detects changes that require device re-sync */
  onChangesDetected?: (changes: {
    updated: number;
    cancelled: number;
    updatedAlarmIds: string[];
    cancelledAlarmIds: string[];
  }) => void;
  /** Callback to trigger device sync when alarms are updated */
  onDeviceSyncNeeded?: (affectedAlarmIds: string[]) => void | Promise<void>;
}

// Type for calendar connection from the API
interface CalendarConnectionData {
  id: string;
  accessToken: string;
  syncToken: string | null;
  calendarId: string;
  isActive: boolean;
  needsSync: boolean;
}

export function useCalendarSync(options: UseCalendarSyncOptions = {}) {
  const {
    autoSync = true,
    syncIntervalMs = SYNC_INTERVAL_MS,
    showAlerts = false,
    onChangesDetected,
    onDeviceSyncNeeded,
  } = options;

  const [syncState, setSyncState] = useState<CalendarSyncState>({
    isSyncing: false,
    lastSyncAt: null,
    lastSyncResult: null,
    error: null,
  });

  const [connections, setConnections] = useState<CalendarConnectionData[]>([]);
  const lastSyncTimeRef = useRef<number>(0);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const mountedRef = useRef(true);

  /**
   * Fetch calendar connections from the API
   */
  const fetchConnections = useCallback(async () => {
    try {
      const result = await trpc.calendar.getConnections.query();
      if (mountedRef.current) {
        setConnections(result as CalendarConnectionData[]);
      }
      return result as CalendarConnectionData[];
    } catch (error) {
      console.error("[CalendarSync] Failed to fetch connections:", error);
      return [];
    }
  }, []);

  /**
   * Perform incremental sync for a single calendar connection
   */
  const syncConnection = useCallback(
    async (connection: {
      id: string;
      accessToken: string;
      syncToken: string | null;
      calendarId: string;
      needsSync?: boolean;
    }) => {
      try {
        // Get fresh access token
        const accessToken = await getAccessToken();

        // Fetch changes using incremental sync
        const { events, nextSyncToken } = await fetchCalendarEventsIncremental(
          accessToken,
          connection.calendarId,
          connection.syncToken ?? undefined,
        );

        if (events.length === 0 && nextSyncToken) {
          // No changes, just update the sync token
          await trpc.calendar.updateSyncToken.mutate({
            connectionId: connection.id,
            syncToken: nextSyncToken,
          });

          // Clear needsSync flag if it was set
          if (connection.needsSync) {
            await trpc.calendar.clearNeedsSync.mutate({
              connectionId: connection.id,
            });
          }

          return { updated: 0, cancelled: 0, unchanged: 0 };
        }

        // Process the changes
        const result = await trpc.calendar.syncEvents.mutate({
          connectionId: connection.id,
          events: events.map((event: GoogleCalendarEvent) => ({
            eventId: event.id,
            eventStatus: event.status,
            eventSummary: event.summary,
            eventStartTime: event.start.dateTime
              ? new Date(event.start.dateTime)
              : event.start.date
                ? new Date(event.start.date)
                : undefined,
            eventEndTime: event.end.dateTime
              ? new Date(event.end.dateTime)
              : event.end.date
                ? new Date(event.end.date)
                : undefined,
            eventLocation: event.location,
            eventEtag: event.etag,
          })),
          syncToken: nextSyncToken,
        });

        // Clear needsSync flag after successful sync
        if (connection.needsSync) {
          await trpc.calendar.clearNeedsSync.mutate({
            connectionId: connection.id,
          });
        }

        return {
          updated: result.updated,
          cancelled: result.cancelled,
          unchanged: result.unchanged,
          updatedAlarmIds: result.updatedAlarms,
          cancelledAlarmIds: result.cancelledAlarms,
        };
      } catch (error) {
        console.error(
          `[CalendarSync] Error syncing connection ${connection.id}:`,
          error,
        );
        throw error;
      }
    },
    [],
  );

  /**
   * Sync all active calendar connections
   */
  const syncAll = useCallback(
    async (force = false) => {
      // Prevent rapid re-syncs
      const now = Date.now();
      if (!force && now - lastSyncTimeRef.current < MIN_SYNC_INTERVAL_MS) {
        console.log("[CalendarSync] Skipping sync - too soon since last sync");
        return;
      }

      // Fetch fresh connections data
      const currentConnections = await fetchConnections();

      if (!currentConnections || currentConnections.length === 0) {
        return;
      }

      const activeConnections = currentConnections.filter((c) => c.isActive);
      if (activeConnections.length === 0) {
        return;
      }

      // Check if any connections need sync (webhook notified of changes while app was closed)
      const connectionsNeedingSync = activeConnections.filter(
        (c) => c.needsSync,
      );
      if (connectionsNeedingSync.length > 0) {
        console.log(
          `[CalendarSync] ${connectionsNeedingSync.length} connection(s) need sync (changes detected while app was closed)`,
        );
      }

      if (mountedRef.current) {
        setSyncState((prev) => ({
          ...prev,
          isSyncing: true,
          error: null,
        }));
      }

      const totalResults = {
        updated: 0,
        cancelled: 0,
        unchanged: 0,
        updatedAlarmIds: [] as string[],
        cancelledAlarmIds: [] as string[],
      };

      try {
        // Prioritize connections that need sync (webhook notified of changes)
        const sortedConnections = [...activeConnections].sort((a, b) => {
          if (a.needsSync && !b.needsSync) return -1;
          if (!a.needsSync && b.needsSync) return 1;
          return 0;
        });

        for (const connection of sortedConnections) {
          try {
            const result = await syncConnection({
              id: connection.id,
              accessToken: connection.accessToken,
              syncToken: connection.syncToken,
              calendarId: connection.calendarId,
              needsSync: connection.needsSync,
            });

            totalResults.updated += result.updated;
            totalResults.cancelled += result.cancelled;
            totalResults.unchanged += result.unchanged;
            if (result.updatedAlarmIds) {
              totalResults.updatedAlarmIds.push(...result.updatedAlarmIds);
            }
            if (result.cancelledAlarmIds) {
              totalResults.cancelledAlarmIds.push(...result.cancelledAlarmIds);
            }
          } catch (error) {
            console.error(
              `[CalendarSync] Failed to sync connection ${connection.id}:`,
              error,
            );
            // Continue with other connections
          }
        }

        lastSyncTimeRef.current = now;

        if (mountedRef.current) {
          setSyncState({
            isSyncing: false,
            lastSyncAt: new Date(),
            lastSyncResult: {
              updated: totalResults.updated,
              cancelled: totalResults.cancelled,
              unchanged: totalResults.unchanged,
            },
            error: null,
          });
        }

        // Notify about changes
        if (totalResults.updated > 0 || totalResults.cancelled > 0) {
          onChangesDetected?.({
            updated: totalResults.updated,
            cancelled: totalResults.cancelled,
            updatedAlarmIds: totalResults.updatedAlarmIds,
            cancelledAlarmIds: totalResults.cancelledAlarmIds,
          });

          // Trigger device re-sync if callback provided
          const affectedAlarmIds = [
            ...totalResults.updatedAlarmIds,
            ...totalResults.cancelledAlarmIds,
          ];
          if (affectedAlarmIds.length > 0 && onDeviceSyncNeeded) {
            try {
              await onDeviceSyncNeeded(affectedAlarmIds);
            } catch (error) {
              console.error(
                "[CalendarSync] Failed to trigger device sync:",
                error,
              );
            }
          }

          if (showAlerts) {
            const messages = [];
            if (totalResults.updated > 0) {
              messages.push(
                `${totalResults.updated} alarm${totalResults.updated > 1 ? "s" : ""} updated`,
              );
            }
            if (totalResults.cancelled > 0) {
              messages.push(
                `${totalResults.cancelled} alarm${totalResults.cancelled > 1 ? "s" : ""} removed`,
              );
            }
            Alert.alert("Calendar Sync", messages.join(", "));
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (mountedRef.current) {
          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            error: message,
          }));
        }
        console.error("[CalendarSync] Sync failed:", error);
      }
    },
    [
      fetchConnections,
      syncConnection,
      onChangesDetected,
      onDeviceSyncNeeded,
      showAlerts,
    ],
  );

  /**
   * Force a full resync (clears sync token)
   */
  const forceFullSync = useCallback(async () => {
    const currentConnections = await fetchConnections();
    if (!currentConnections) return;

    for (const connection of currentConnections.filter((c) => c.isActive)) {
      try {
        await trpc.calendar.clearSyncToken.mutate({
          connectionId: connection.id,
        });
      } catch (error) {
        console.error(
          `[CalendarSync] Failed to clear sync token for ${connection.id}:`,
          error,
        );
      }
    }

    // Now sync
    await syncAll(true);
  }, [fetchConnections, syncAll]);

  // Fetch connections on mount
  useEffect(() => {
    mountedRef.current = true;
    void fetchConnections();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchConnections]);

  // Set up periodic sync when app is active
  useEffect(() => {
    if (!autoSync) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        /inactive|background/.test(appStateRef.current) &&
        nextAppState === "active"
      ) {
        // App came to foreground - sync immediately
        console.log("[CalendarSync] App became active, triggering sync");
        void syncAll();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    // Set up periodic sync
    syncIntervalRef.current = setInterval(() => {
      if (AppState.currentState === "active") {
        console.log("[CalendarSync] Periodic sync triggered");
        void syncAll();
      }
    }, syncIntervalMs);

    // Initial sync when hook mounts (after connections are fetched)
    const initialSyncTimeout = setTimeout(() => {
      void syncAll();
    }, 1000); // Small delay to let connections fetch complete

    return () => {
      subscription.remove();
      clearTimeout(initialSyncTimeout);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncIntervalMs, syncAll]);

  return {
    ...syncState,
    connections,
    syncAll,
    forceFullSync,
    syncConnection,
  };
}
