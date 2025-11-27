/**
 * Google Calendar Webhook Handler
 *
 * Receives push notifications from Google Calendar when events change.
 * This endpoint must be publicly accessible via HTTPS.
 *
 * Flow:
 * 1. Google sends a POST request when calendar changes occur
 * 2. We identify which user's calendar changed via the channel ID
 * 3. We trigger an incremental sync for that user's calendar
 *
 * Note: This is a server-side endpoint. The actual sync happens when
 * the user next opens the app, or via a background job.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@gently/db/client";
import { CalendarConnection } from "@gently/db/schema";

export async function POST(req: NextRequest) {
  try {
    // Google sends these headers with push notifications
    const channelId = req.headers.get("X-Goog-Channel-ID");
    const resourceState = req.headers.get("X-Goog-Resource-State");
    const resourceId = req.headers.get("X-Goog-Resource-ID");
    const messageNumber = req.headers.get("X-Goog-Message-Number");

    console.log("[Calendar Webhook] Received notification:", {
      channelId,
      resourceState,
      resourceId,
      messageNumber,
    });

    // Handle sync verification (initial setup)
    if (resourceState === "sync") {
      console.log("[Calendar Webhook] Sync verification received");
      return new NextResponse("OK", { status: 200 });
    }

    // Validate required headers
    if (!channelId) {
      console.error("[Calendar Webhook] Missing channel ID");
      return new NextResponse("Missing channel ID", { status: 400 });
    }

    // Find the calendar connection by watch channel ID
    const connection = await db.query.CalendarConnection.findFirst({
      where: eq(CalendarConnection.watchChannelId, channelId),
    });

    if (!connection) {
      console.warn(
        `[Calendar Webhook] Unknown channel ID: ${channelId}. May have been deleted.`,
      );
      // Return 200 to stop Google from retrying
      return new NextResponse("OK", { status: 200 });
    }

    // Verify resource ID matches
    if (resourceId && connection.watchResourceId !== resourceId) {
      console.warn(
        `[Calendar Webhook] Resource ID mismatch for channel ${channelId}`,
      );
      return new NextResponse("OK", { status: 200 });
    }

    // Resource states:
    // - "exists": Calendar was created or changed
    // - "not_exists": Calendar was deleted
    // - "sync": Initial sync verification

    if (resourceState === "exists") {
      // Calendar was modified - mark connection for sync
      // We don't do the sync here because:
      // 1. We don't have the user's access token readily available
      // 2. The sync should happen on the client side for BLE device updates
      // Instead, we set needsSync flag that the client checks on app open

      console.log(
        `[Calendar Webhook] Calendar changed for connection ${connection.id}, user ${connection.userId}`,
      );

      // Set needsSync flag - the client will check this and perform the sync
      await db
        .update(CalendarConnection)
        .set({
          needsSync: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(CalendarConnection.id, connection.id));

      // TODO: Send a push notification to the user's device
      // This would require integration with Expo Push Notifications
      // to wake up the app and trigger a sync

      console.log(
        `[Calendar Webhook] Marked connection ${connection.id} for sync (needsSync=true)`,
      );
    } else if (resourceState === "not_exists") {
      // Calendar was deleted
      console.log(
        `[Calendar Webhook] Calendar deleted for connection ${connection.id}`,
      );

      // Mark the connection as inactive
      await db
        .update(CalendarConnection)
        .set({
          isActive: false,
          watchChannelId: null,
          watchResourceId: null,
          watchExpiration: null,
        })
        .where(eq(CalendarConnection.id, connection.id));
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[Calendar Webhook] Error processing webhook:", error);
    // Return 200 to prevent Google from retrying
    // We log the error for debugging but don't want to spam retries
    return new NextResponse("OK", { status: 200 });
  }
}

// Google sends a GET request to verify the endpoint
export function GET() {
  return new NextResponse("Calendar webhook endpoint is active", {
    status: 200,
  });
}
