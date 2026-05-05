import type { TRPCRouterRecord } from "@trpc/server";
import Expo from "expo-server-sdk";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import type { DbClient } from "@gently/db";
import { UserPreferences } from "@gently/db/schema";

import { protectedProcedure } from "../trpc";

// Expo push notification client
const expo = new Expo();

/**
 * Send a push notification to a user
 * This is a utility function that can be called from other routers
 */
export async function sendPushNotificationToUser(
  db: DbClient,
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
): Promise<{ success: boolean; message: string }> {
  try {
    // Get user's push notification token from UserPreferences
    const preferences = await db.query.UserPreferences.findFirst({
      where: eq(UserPreferences.userId, userId),
    });

    const pushToken = preferences?.pushNotificationToken;

    if (!pushToken) {
      console.log(`No push token found for user ${userId}`);
      return { success: false, message: "No push token registered" };
    }

    // Validate the token
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(
        `Invalid Expo push token for user ${userId}: ${String(pushToken)}`,
      );
      return { success: false, message: "Invalid push token" };
    }

    // Send the notification
    const messages = [
      {
        to: pushToken,
        sound: "default" as const,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      },
    ];

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    // Check for errors in tickets
    const ticket = tickets[0];
    if (ticket?.status === "error") {
      console.error(
        `Push notification error for user ${userId}:`,
        ticket.message,
      );
      return { success: false, message: ticket.message };
    }

    console.log(
      `Push notification sent to user ${userId}:`,
      notification.title,
    );
    return { success: true, message: "Push notification sent" };
  } catch (error) {
    console.error(`Failed to send push notification to user ${userId}:`, error);
    return { success: false, message: "Failed to send push notification" };
  }
}

export const notificationRouter = {
  // Register push notification token for the user
  registerPushToken: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        platform: z.enum(["ios", "android"]),
        deviceId: z.string().optional(), // The Gently device ID if applicable
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      // Validate the token format
      if (!Expo.isExpoPushToken(input.token)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Expo push token format",
        });
      }

      // Store the push token in UserPreferences
      await ctx.db
        .update(UserPreferences)
        .set({ pushNotificationToken: input.token })
        .where(eq(UserPreferences.userId, ctx.session.user.id));

      console.log(`Push token registered for user ${ctx.session.user.id}:`, {
        token: input.token.substring(0, 20) + "...",
        platform: input.platform,
        deviceId: input.deviceId,
      });

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
