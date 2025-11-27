import type { TRPCRouterRecord } from "@trpc/server";
import { render } from "@react-email/components";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";

import { Alarm, user } from "@gently/db/schema";
import { AlarmNotificationEmail, EmailSender } from "@gently/email";

import { protectedProcedure } from "../trpc";

// Email configuration should be passed from environment
// This will be configured when the notification router is initialized
let emailSender: EmailSender | null = null;

export function initNotificationRouter(config: {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  emailFrom?: string;
}) {
  if (config.smtpHost && config.smtpPort && config.emailFrom) {
    emailSender = new EmailSender({
      smtpHost: config.smtpHost,
      smtpPort: Number(config.smtpPort),
      smtpUser: config.smtpUser,
      smtpPassword: config.smtpPassword,
      emailFrom: config.emailFrom,
    });
  }
}

export const notificationRouter = {
  // Send email notification when an alarm is triggered
  sendAlarmEmail: protectedProcedure
    .input(
      z.object({
        alarmId: z.string(),
        deviceName: z.string().optional(),
      }),
    )
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Verify the alarm exists and belongs to the current user
      const alarm = await ctx.db.query.Alarm.findFirst({
        where: and(
          eq(Alarm.id, input.alarmId),
          eq(Alarm.userId, ctx.session.user.id),
        ),
        with: {
          device: true,
        },
      });

      if (!alarm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alarm not found",
        });
      }

      // Check if email notification is enabled for this alarm
      if (!alarm.emailNotification) {
        return {
          success: false,
          message: "Email notifications are disabled for this alarm",
        };
      }

      // Get user email
      const currentUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, ctx.session.user.id),
      });

      if (!currentUser?.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User email not found",
        });
      }

      if (!emailSender) {
        console.warn(
          "Email service not configured. Skipping email notification.",
        );
        return {
          success: false,
          message: "Email service not configured",
        };
      }

      try {
        const deviceName =
          input.deviceName ?? alarm.device?.title ?? "Gently Device";
        const triggeredAt = new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        });

        // Render the email template
        const emailHtml = await render(
          AlarmNotificationEmail({
            alarmTitle: alarm.title,
            alarmDescription: alarm.description ?? undefined,
            deviceName,
            triggeredAt,
            productName: "Gently",
          }),
        );

        // Create plain text version
        const emailText = `
Alarm Triggered: ${alarm.title}

${alarm.description ? `Description: ${alarm.description}\n` : ""}
Device: ${deviceName}
Triggered at: ${triggeredAt}

This notification was sent because you enabled email notifications for this alarm in your Gently app.

To stop receiving these notifications, disable email notifications for this alarm in the Gently app settings.

Gently - Your personal vibration and light notification device
`.trim();

        await emailSender.sendEmail({
          to: currentUser.email,
          subject: `⏰ Alarm Triggered: ${alarm.title}`,
          text: emailText,
          html: emailHtml,
        });

        return {
          success: true,
          message: "Email notification sent successfully",
        };
      } catch (error) {
        console.error("Failed to send alarm email notification:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send email notification",
        });
      }
    }),

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
    .mutation(({ input, ctx }) => {
      // Store the push token - this would typically be stored in a user_push_tokens table
      // For now, we'll log it and return success
      // TODO: Create user_push_tokens table and store tokens
      console.log(`Push token registered for user ${ctx.session.user.id}:`, {
        token: input.token.substring(0, 20) + "...",
        platform: input.platform,
        deviceId: input.deviceId,
      });

      return { success: true };
    }),

  // Check notification settings for an alarm
  getNotificationSettings: protectedProcedure
    .input(z.object({ alarmId: z.string() }))
    .output(
      z.object({
        pushNotification: z.boolean(),
        emailNotification: z.boolean(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const alarm = await ctx.db.query.Alarm.findFirst({
        where: and(
          eq(Alarm.id, input.alarmId),
          eq(Alarm.userId, ctx.session.user.id),
        ),
      });

      if (!alarm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alarm not found",
        });
      }

      return {
        pushNotification: alarm.pushNotification,
        emailNotification: alarm.emailNotification,
      };
    }),

  // Update notification settings for an alarm
  updateNotificationSettings: protectedProcedure
    .input(
      z.object({
        alarmId: z.string(),
        pushNotification: z.boolean().optional(),
        emailNotification: z.boolean().optional(),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { alarmId, ...settings } = input;

      // Verify the alarm exists and belongs to the current user
      const alarm = await ctx.db.query.Alarm.findFirst({
        where: and(
          eq(Alarm.id, alarmId),
          eq(Alarm.userId, ctx.session.user.id),
        ),
      });

      if (!alarm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alarm not found",
        });
      }

      await ctx.db.update(Alarm).set(settings).where(eq(Alarm.id, alarmId));

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
