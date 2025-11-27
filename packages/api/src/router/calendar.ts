/**
 * Calendar Integration Router
 * Handles Google Calendar OAuth and event synchronization
 */

import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { z } from "zod/v4";

import {
  Alarm,
  CalendarConnection,
  CalendarEventAlarm,
  CreateCalendarConnectionSchema,
  UserPreferences,
} from "@gently/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const calendarRouter = createTRPCRouter({
  // Get all calendar connections for the authenticated user
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select()
      .from(CalendarConnection)
      .where(eq(CalendarConnection.userId, ctx.session.user.id))
      .orderBy(desc(CalendarConnection.createdAt));
  }),

  // Get a specific calendar connection
  getConnection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const connection = await ctx.db.query.CalendarConnection.findFirst({
        where: and(
          eq(CalendarConnection.id, input.id),
          eq(CalendarConnection.userId, ctx.session.user.id),
        ),
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return connection;
    }),

  // Create a new calendar connection (called after OAuth)
  createConnection: protectedProcedure
    .input(CreateCalendarConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .insert(CalendarConnection)
        .values({
          ...input,
          userId: ctx.session.user.id,
        })
        .returning();

      return connection;
    }),

  // Update calendar connection tokens
  updateTokens: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [updated] = await ctx.db
        .update(CalendarConnection)
        .set(updates)
        .where(
          and(
            eq(CalendarConnection.id, id),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return updated;
    }),

  // Toggle connection active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(CalendarConnection)
        .set({ isActive: input.isActive })
        .where(
          and(
            eq(CalendarConnection.id, input.id),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return updated;
    }),

  // Delete a calendar connection
  deleteConnection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(CalendarConnection)
        .where(
          and(
            eq(CalendarConnection.id, input.id),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!result.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return { success: true };
    }),

  // Update last synced timestamp
  updateLastSynced: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(CalendarConnection)
        .set({ lastSyncedAt: new Date() })
        .where(
          and(
            eq(CalendarConnection.id, input.id),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return updated;
    }),

  // Create alarms from calendar events
  createAlarmsFromEvents: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        events: z.array(
          z.object({
            eventId: z.string(),
            eventSummary: z.string(),
            eventStartTime: z.date(),
            eventEndTime: z.date().optional(),
            eventLocation: z.string().optional(),
            alarmMinutesBefore: z.number().int().min(0).max(1440),
          }),
        ),
        deviceId: z.string().optional(), // Optional device to sync to
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify connection exists and belongs to user
      const connection = await ctx.db.query.CalendarConnection.findFirst({
        where: and(
          eq(CalendarConnection.id, input.connectionId),
          eq(CalendarConnection.userId, ctx.session.user.id),
        ),
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      // Get user's default alarm preferences
      const preferences = await ctx.db.query.UserPreferences.findFirst({
        where: eq(UserPreferences.userId, ctx.session.user.id),
      });

      const createdAlarms: {
        alarm: typeof Alarm.$inferSelect;
        eventMapping: typeof CalendarEventAlarm.$inferSelect;
      }[] = [];

      // Generate unique 10-character alphanumeric peripheral ID
      const generatePeripheralId = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 10; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Create alarms for each event
      for (const event of input.events) {
        // Calculate alarm time (event start time minus minutes before)
        const alarmTime = new Date(event.eventStartTime);
        alarmTime.setMinutes(alarmTime.getMinutes() - event.alarmMinutesBefore);

        // Generate cron expression for the specific date/time
        // Note: This uses UTC time, but the client-side BLE sync will regenerate
        // the cron using local time from startDate
        // Include day-of-week so the device doesn't interpret * as "every day"
        const dayOfWeek = alarmTime.getUTCDay(); // 0=Sunday, 1=Monday, etc.
        const cronExpression = `${alarmTime.getUTCMinutes()} ${alarmTime.getUTCHours()} ${alarmTime.getUTCDate()} ${alarmTime.getUTCMonth() + 1} ${dayOfWeek}`;

        // Ensure ledPattern is a valid BLE pattern (not "OFF")
        // If user has "OFF" as default, use "BLINK_SLOW" instead since OFF doesn't make sense for alarms
        const effectiveLedPattern =
          preferences?.defaultLedPattern === "OFF"
            ? "BLINK_SLOW"
            : (preferences?.defaultLedPattern ?? "BLINK_SLOW");

        // Create the alarm
        const [alarm] = await ctx.db
          .insert(Alarm)
          .values({
            title: event.eventSummary,
            description: `Reminder for calendar event${event.eventLocation ? ` at ${event.eventLocation}` : ""}`,
            cronExpression,
            startDate: alarmTime,
            endDate: event.eventEndTime ?? undefined,
            isActive: true,
            repeat: false, // Calendar events are one-time by default
            userId: ctx.session.user.id,
            deviceId: input.deviceId,
            peripheralId: generatePeripheralId(), // Required for BLE sync event name
            // Use user's default preferences
            severityLevel: preferences?.defaultSeverityLevel ?? "INFORMATIONAL",
            ledPattern: effectiveLedPattern,
            ledColor: preferences?.defaultLedColor ?? "BLUE",
            vibrationPattern: preferences?.defaultVibrationPattern ?? 1,
            vibrationIntensity:
              preferences?.defaultVibrationIntensity ?? "MEDIUM",
            snoozePeriod: preferences?.defaultSnoozePeriod ?? 5,
            snoozeTimeout: preferences?.defaultSnoozeTimeout ?? 15,
            retriggerDelay: preferences?.defaultRetriggerDelay ?? 1,
            retriggerTimeout: preferences?.defaultRetriggerTimeout ?? 5,
            pushNotification: preferences?.defaultPushNotification ?? true,
            emailNotification: preferences?.defaultEmailNotification ?? false,
            syncStatus: "NOT_SYNCED",
          })
          .returning();

        if (!alarm) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create alarm for event ${event.eventSummary}`,
          });
        }

        // Create the event-alarm mapping
        const eventMappingResult = await ctx.db
          .insert(CalendarEventAlarm)
          .values({
            userId: ctx.session.user.id,
            calendarConnectionId: input.connectionId,
            alarmId: alarm.id,
            eventId: event.eventId,
            eventSummary: event.eventSummary,
            eventStartTime: event.eventStartTime,
            eventEndTime: event.eventEndTime ?? undefined,
            eventLocation: event.eventLocation ?? undefined,
            alarmMinutesBefore: event.alarmMinutesBefore,
          })
          .returning();

        const eventMapping = eventMappingResult[0];
        if (!eventMapping) {
          // Rollback: delete the alarm if mapping creation failed
          await ctx.db.delete(Alarm).where(eq(Alarm.id, alarm.id));
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create event mapping for ${event.eventSummary}`,
          });
        }

        createdAlarms.push({ alarm, eventMapping });
      }

      // Update last synced timestamp
      await ctx.db
        .update(CalendarConnection)
        .set({ lastSyncedAt: new Date() })
        .where(eq(CalendarConnection.id, input.connectionId));

      return {
        success: true,
        created: createdAlarms.length,
        alarms: createdAlarms,
      };
    }),

  // Get all calendar event IDs that are linked to alarms for a connection
  getLinkedEventIds: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const linkedEvents = await ctx.db
        .select({ eventId: CalendarEventAlarm.eventId })
        .from(CalendarEventAlarm)
        .where(
          and(
            eq(CalendarEventAlarm.calendarConnectionId, input.connectionId),
            eq(CalendarEventAlarm.userId, ctx.session.user.id),
            // Only include events where the alarm still exists (not deleted)
            isNotNull(CalendarEventAlarm.alarmId),
          ),
        );

      return linkedEvents.map((e) => e.eventId);
    }),

  // Update sync token after incremental sync
  updateSyncToken: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        syncToken: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(CalendarConnection)
        .set({
          syncToken: input.syncToken,
          lastSyncedAt: new Date(),
        })
        .where(
          and(
            eq(CalendarConnection.id, input.connectionId),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return updated;
    }),

  // Clear sync token (forces full resync)
  clearSyncToken: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(CalendarConnection)
        .set({ syncToken: null })
        .where(
          and(
            eq(CalendarConnection.id, input.connectionId),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return updated;
    }),

  // Clear needsSync flag after sync completes
  clearNeedsSync: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(CalendarConnection)
        .set({ needsSync: false })
        .where(
          and(
            eq(CalendarConnection.id, input.connectionId),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return updated;
    }),

  // Sync calendar events - handles creates, updates, and cancellations
  syncEvents: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        events: z.array(
          z.object({
            eventId: z.string(),
            eventStatus: z.enum(["confirmed", "tentative", "cancelled"]),
            eventSummary: z.string().optional(),
            eventStartTime: z.date().optional(),
            eventEndTime: z.date().optional(),
            eventLocation: z.string().optional(),
            eventEtag: z.string().optional(),
          }),
        ),
        syncToken: z.string().optional(), // New sync token to store
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify connection exists and belongs to user
      const connection = await ctx.db.query.CalendarConnection.findFirst({
        where: and(
          eq(CalendarConnection.id, input.connectionId),
          eq(CalendarConnection.userId, ctx.session.user.id),
        ),
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      const changes = {
        updated: 0,
        cancelled: 0,
        unchanged: 0,
        updatedAlarms: [] as string[],
        cancelledAlarms: [] as string[],
      };

      // Get existing event mappings for this connection
      const existingMappings = await ctx.db
        .select()
        .from(CalendarEventAlarm)
        .where(
          and(
            eq(CalendarEventAlarm.calendarConnectionId, input.connectionId),
            eq(CalendarEventAlarm.userId, ctx.session.user.id),
            isNotNull(CalendarEventAlarm.alarmId),
          ),
        );

      const mappingsByEventId = new Map(
        existingMappings.map((m) => [m.eventId, m]),
      );

      for (const event of input.events) {
        const existingMapping = mappingsByEventId.get(event.eventId);

        if (!existingMapping) {
          // Event not tracked - skip (user didn't select this event)
          continue;
        }

        if (event.eventStatus === "cancelled") {
          // Event was cancelled - delete the alarm
          if (existingMapping.alarmId) {
            await ctx.db
              .delete(Alarm)
              .where(eq(Alarm.id, existingMapping.alarmId));
            changes.cancelledAlarms.push(existingMapping.alarmId);
          }

          // Update the mapping to reflect cancellation
          await ctx.db
            .update(CalendarEventAlarm)
            .set({
              eventStatus: "cancelled",
              alarmId: null, // Clear the alarm reference
              lastSynced: new Date(),
            })
            .where(eq(CalendarEventAlarm.id, existingMapping.id));

          changes.cancelled++;
        } else if (event.eventStartTime) {
          // Check if time changed
          const existingStart = existingMapping.eventStartTime.getTime();
          const newStart = event.eventStartTime.getTime();

          if (existingStart !== newStart && existingMapping.alarmId) {
            // Time changed - update the alarm
            const alarmTime = new Date(event.eventStartTime);
            alarmTime.setMinutes(
              alarmTime.getMinutes() - existingMapping.alarmMinutesBefore,
            );

            // Regenerate cron expression
            const dayOfWeek = alarmTime.getUTCDay();
            const cronExpression = `${alarmTime.getUTCMinutes()} ${alarmTime.getUTCHours()} ${alarmTime.getUTCDate()} ${alarmTime.getUTCMonth() + 1} ${dayOfWeek}`;

            await ctx.db
              .update(Alarm)
              .set({
                title: event.eventSummary ?? existingMapping.eventSummary,
                startDate: alarmTime,
                endDate: event.eventEndTime ?? existingMapping.eventEndTime,
                cronExpression,
                syncStatus: "NOT_SYNCED", // Mark for re-sync to device
              })
              .where(eq(Alarm.id, existingMapping.alarmId));

            // Update the mapping
            await ctx.db
              .update(CalendarEventAlarm)
              .set({
                eventSummary:
                  event.eventSummary ?? existingMapping.eventSummary,
                eventStartTime: event.eventStartTime,
                eventEndTime:
                  event.eventEndTime ?? existingMapping.eventEndTime,
                eventLocation:
                  event.eventLocation ?? existingMapping.eventLocation,
                eventEtag: event.eventEtag,
                eventStatus: event.eventStatus,
                lastSynced: new Date(),
              })
              .where(eq(CalendarEventAlarm.id, existingMapping.id));

            changes.updatedAlarms.push(existingMapping.alarmId);
            changes.updated++;
          } else {
            // No time change - just update metadata
            await ctx.db
              .update(CalendarEventAlarm)
              .set({
                eventSummary:
                  event.eventSummary ?? existingMapping.eventSummary,
                eventLocation:
                  event.eventLocation ?? existingMapping.eventLocation,
                eventEtag: event.eventEtag,
                eventStatus: event.eventStatus,
                lastSynced: new Date(),
              })
              .where(eq(CalendarEventAlarm.id, existingMapping.id));

            // Update alarm title if summary changed
            if (
              event.eventSummary &&
              event.eventSummary !== existingMapping.eventSummary &&
              existingMapping.alarmId
            ) {
              await ctx.db
                .update(Alarm)
                .set({ title: event.eventSummary })
                .where(eq(Alarm.id, existingMapping.alarmId));
            }

            changes.unchanged++;
          }
        }
      }

      // Update sync token if provided
      if (input.syncToken) {
        await ctx.db
          .update(CalendarConnection)
          .set({
            syncToken: input.syncToken,
            lastSyncedAt: new Date(),
          })
          .where(eq(CalendarConnection.id, input.connectionId));
      }

      return {
        success: true,
        ...changes,
      };
    }),

  // Get all linked events with their current status (for sync checking)
  getLinkedEvents: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.db
        .select({
          id: CalendarEventAlarm.id,
          eventId: CalendarEventAlarm.eventId,
          eventSummary: CalendarEventAlarm.eventSummary,
          eventStartTime: CalendarEventAlarm.eventStartTime,
          eventEndTime: CalendarEventAlarm.eventEndTime,
          eventStatus: CalendarEventAlarm.eventStatus,
          eventEtag: CalendarEventAlarm.eventEtag,
          alarmId: CalendarEventAlarm.alarmId,
          lastSynced: CalendarEventAlarm.lastSynced,
        })
        .from(CalendarEventAlarm)
        .where(
          and(
            eq(CalendarEventAlarm.calendarConnectionId, input.connectionId),
            eq(CalendarEventAlarm.userId, ctx.session.user.id),
            // Only include non-cancelled events with alarms
            isNotNull(CalendarEventAlarm.alarmId),
            ne(CalendarEventAlarm.eventStatus, "cancelled"),
          ),
        );

      return events;
    }),

  // Store webhook channel info
  updateWatchChannel: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        watchChannelId: z.string(),
        watchResourceId: z.string(),
        watchExpiration: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { connectionId, ...updates } = input;

      const [updated] = await ctx.db
        .update(CalendarConnection)
        .set(updates)
        .where(
          and(
            eq(CalendarConnection.id, connectionId),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return updated;
    }),

  // Clear webhook channel info
  clearWatchChannel: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(CalendarConnection)
        .set({
          watchChannelId: null,
          watchResourceId: null,
          watchExpiration: null,
        })
        .where(
          and(
            eq(CalendarConnection.id, input.connectionId),
            eq(CalendarConnection.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar connection not found",
        });
      }

      return updated;
    }),

  // Get connections that need webhook renewal (expiring soon)
  getConnectionsNeedingRenewal: protectedProcedure.query(async ({ ctx }) => {
    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    return await ctx.db
      .select()
      .from(CalendarConnection)
      .where(
        and(
          eq(CalendarConnection.userId, ctx.session.user.id),
          eq(CalendarConnection.isActive, true),
          sql`${CalendarConnection.watchExpiration} < ${oneHourFromNow}`,
        ),
      );
  }),
});
