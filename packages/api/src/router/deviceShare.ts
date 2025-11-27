/**
 * Device Share Router
 * Handles device sharing invitations and permissions
 */

import { TRPCError } from "@trpc/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod/v4";

import { db } from "@gently/db/client";
import {
  CreateDeviceShareSchema,
  Device,
  DeviceShare,
  UpdateDeviceShareSchema,
  user,
} from "@gently/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Generate a secure random token for invitation links
function generateInvitationToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const deviceShareRouter = createTRPCRouter({
  // Get all shares for devices the current user owns
  getMyDeviceShares: protectedProcedure.query(async ({ ctx }) => {
    // Get all devices owned by the user
    const ownedDevices = await ctx.db
      .select({ id: Device.id })
      .from(Device)
      .where(eq(Device.userId, ctx.session.user.id));

    if (ownedDevices.length === 0) {
      return [];
    }

    const deviceIds = ownedDevices.map((d) => d.id);

    // Get all shares for these devices
    const shares = await ctx.db.query.DeviceShare.findMany({
      where: or(...deviceIds.map((id) => eq(DeviceShare.deviceId, id))),
      with: {
        device: true,
        sharedWithUser: true,
      },
    });

    return shares;
  }),

  // Get devices shared with the current user
  getSharedWithMe: protectedProcedure.query(async ({ ctx }) => {
    const shares = await ctx.db.query.DeviceShare.findMany({
      where: and(
        eq(DeviceShare.sharedWithUserId, ctx.session.user.id),
        eq(DeviceShare.status, "ACCEPTED"),
      ),
      with: {
        device: {
          with: {
            user: true, // Get the owner info
          },
        },
        invitedByUser: true,
      },
    });

    return shares;
  }),

  // Get pending invitations for the current user (by email)
  getPendingInvitations: protectedProcedure.query(async ({ ctx }) => {
    const userEmail = ctx.session.user.email;
    if (!userEmail) return [];

    const invitations = await ctx.db.query.DeviceShare.findMany({
      where: and(
        eq(DeviceShare.invitedEmail, userEmail),
        eq(DeviceShare.status, "PENDING"),
      ),
      with: {
        device: true,
        invitedByUser: true,
      },
    });

    return invitations;
  }),

  // Create a new device share invitation
  invite: protectedProcedure
    .input(CreateDeviceShareSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the device belongs to the current user
      const device = await ctx.db.query.Device.findFirst({
        where: and(
          eq(Device.id, input.deviceId),
          eq(Device.userId, ctx.session.user.id),
        ),
      });

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found or you don't have permission to share it",
        });
      }

      // Check if the user is trying to invite themselves
      if (input.invitedEmail === ctx.session.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot invite yourself to your own device",
        });
      }

      // Check if there's already a pending or accepted share for this email
      const existingShare = await ctx.db.query.DeviceShare.findFirst({
        where: and(
          eq(DeviceShare.deviceId, input.deviceId),
          eq(DeviceShare.invitedEmail, input.invitedEmail),
          or(
            eq(DeviceShare.status, "PENDING"),
            eq(DeviceShare.status, "ACCEPTED"),
          ),
        ),
      });

      if (existingShare) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This user already has access or a pending invitation",
        });
      }

      // Check if the invited user already has an account
      const invitedUser = await ctx.db.query.user.findFirst({
        where: eq(user.email, input.invitedEmail),
      });

      // Generate invitation token
      const invitationToken = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create the share
      const [share] = await ctx.db
        .insert(DeviceShare)
        .values({
          deviceId: input.deviceId,
          invitedEmail: input.invitedEmail,
          permission: input.permission,
          sharedWithUserId: invitedUser?.id ?? null,
          invitedByUserId: ctx.session.user.id,
          invitationToken,
          invitationExpiresAt: expiresAt,
          status: "PENDING",
        })
        .returning();

      // TODO: Send invitation email
      // This would use the email service to send an invitation
      // with a link containing the invitation token

      return {
        share,
        isNewUser: !invitedUser,
      };
    }),

  // Accept an invitation
  acceptInvitation: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.id, input.shareId),
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Verify the invitation is for the current user's email
      if (share.invitedEmail !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for you",
        });
      }

      if (share.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invitation is ${share.status.toLowerCase()}`,
        });
      }

      // Check if invitation has expired
      if (share.invitationExpiresAt && share.invitationExpiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      // Update the share
      const [updated] = await ctx.db
        .update(DeviceShare)
        .set({
          status: "ACCEPTED",
          sharedWithUserId: ctx.session.user.id,
          acceptedAt: new Date(),
        })
        .where(eq(DeviceShare.id, input.shareId))
        .returning();

      return updated;
    }),

  // Accept invitation by token (for new users or deep links)
  acceptByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const share = await db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.invitationToken, input.token),
        with: {
          device: true,
          invitedByUser: true,
        },
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invitation link",
        });
      }

      // Check if invitation has expired
      if (share.invitationExpiresAt && share.invitationExpiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      return {
        share,
        email: share.invitedEmail,
        deviceName: share.device.title,
        invitedBy: share.invitedByUser.name,
      };
    }),

  // Complete invitation acceptance after login/signup
  completeInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.invitationToken, input.token),
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invitation link",
        });
      }

      // Verify the invitation is for the current user's email
      if (share.invitedEmail !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation was sent to a different email address",
        });
      }

      if (share.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invitation is ${share.status.toLowerCase()}`,
        });
      }

      // Update the share
      const [updated] = await ctx.db
        .update(DeviceShare)
        .set({
          status: "ACCEPTED",
          sharedWithUserId: ctx.session.user.id,
          acceptedAt: new Date(),
          invitationToken: null, // Clear the token after use
        })
        .where(eq(DeviceShare.id, share.id))
        .returning();

      return updated;
    }),

  // Decline an invitation
  declineInvitation: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.id, input.shareId),
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Verify the invitation is for the current user
      if (share.invitedEmail !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for you",
        });
      }

      const [updated] = await ctx.db
        .update(DeviceShare)
        .set({ status: "DECLINED" })
        .where(eq(DeviceShare.id, input.shareId))
        .returning();

      return updated;
    }),

  // Respond to an invitation (accept or decline)
  respondToInvitation: protectedProcedure
    .input(z.object({ shareId: z.string(), accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.id, input.shareId),
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Verify the invitation is for the current user's email
      if (share.invitedEmail !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for you",
        });
      }

      if (share.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invitation is already ${share.status.toLowerCase()}`,
        });
      }

      // Check if invitation has expired
      if (share.invitationExpiresAt && share.invitationExpiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      const [updated] = await ctx.db
        .update(DeviceShare)
        .set({
          status: input.accept ? "ACCEPTED" : "DECLINED",
          sharedWithUserId: input.accept
            ? ctx.session.user.id
            : share.sharedWithUserId,
          acceptedAt: input.accept ? new Date() : null,
        })
        .where(eq(DeviceShare.id, input.shareId))
        .returning();

      return updated;
    }),

  // Revoke access (device owner only)
  revokeAccess: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.id, input.shareId),
        with: {
          device: true,
        },
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }

      // Verify the current user owns the device
      if (share.device.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to revoke this access",
        });
      }

      const [updated] = await ctx.db
        .update(DeviceShare)
        .set({ status: "REVOKED" })
        .where(eq(DeviceShare.id, input.shareId))
        .returning();

      return updated;
    }),

  // Remove my own access to a shared device
  removeMyAccess: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Find the share for this device where the current user is the shared user
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: and(
          eq(DeviceShare.deviceId, input.deviceId),
          eq(DeviceShare.sharedWithUserId, ctx.session.user.id),
          eq(DeviceShare.status, "ACCEPTED"),
        ),
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have access to this device",
        });
      }

      // Remove the share by setting status to DECLINED (user chose to leave)
      await ctx.db.delete(DeviceShare).where(eq(DeviceShare.id, share.id));

      return { success: true };
    }),

  // Update share settings (permission or notifications)
  update: protectedProcedure
    .input(UpdateDeviceShareSchema)
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.id, input.id),
        with: {
          device: true,
        },
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }

      // Device owner can update permission
      // Shared user can update their notification preferences
      const isOwner = share.device.userId === ctx.session.user.id;
      const isSharedUser = share.sharedWithUserId === ctx.session.user.id;

      if (!isOwner && !isSharedUser) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this share",
        });
      }

      // Only owner can change permission
      if (input.permission && !isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the device owner can change permissions",
        });
      }

      const [updated] = await ctx.db
        .update(DeviceShare)
        .set({
          ...(input.permission && { permission: input.permission }),
          ...(input.pushNotification !== undefined && {
            pushNotification: input.pushNotification,
          }),
          ...(input.emailNotification !== undefined && {
            emailNotification: input.emailNotification,
          }),
        })
        .where(eq(DeviceShare.id, input.id))
        .returning();

      return updated;
    }),

  // Leave a shared device (shared user removes themselves)
  leave: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.id, input.shareId),
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }

      if (share.sharedWithUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not shared on this device",
        });
      }

      // Delete the share record
      await ctx.db.delete(DeviceShare).where(eq(DeviceShare.id, input.shareId));

      return { success: true };
    }),

  // Resend invitation email
  resendInvitation: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.query.DeviceShare.findFirst({
        where: eq(DeviceShare.id, input.shareId),
        with: {
          device: true,
        },
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }

      // Verify the current user owns the device
      if (share.device.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to resend this invitation",
        });
      }

      if (share.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only resend pending invitations",
        });
      }

      // Generate new token and extend expiry
      const invitationToken = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [updated] = await ctx.db
        .update(DeviceShare)
        .set({
          invitationToken,
          invitationExpiresAt: expiresAt,
        })
        .where(eq(DeviceShare.id, input.shareId))
        .returning();

      // TODO: Send invitation email

      return updated;
    }),
});
