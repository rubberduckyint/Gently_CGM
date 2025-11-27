/**
 * Push Notifications Service
 *
 * Handles local and push notifications for the Gently app.
 * Used to notify users when alarms trigger on their bracelet.
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
});

export interface AlarmNotificationData {
  alarmId: string;
  alarmTitle: string;
  eventIndex: number;
  deviceId?: string;
  deviceName?: string;
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  let token: string | null = null;

  // Must be on a physical device
  if (!Device.isDevice) {
    console.log("⚠️ Push notifications require a physical device");
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
    console.log("❌ Push notification permissions not granted");
    return null;
  }

  try {
    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.warn("⚠️ No EAS project ID found, using experience ID fallback");
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });

    token = tokenData.data;
    console.log("✅ Push token obtained:", token);
  } catch (error) {
    console.error("❌ Error getting push token:", error);
  }

  // Android-specific channel configuration
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("alarms", {
      name: "Alarm Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#3b82f6",
      sound: "default",
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    await Notifications.setNotificationChannelAsync("general", {
      name: "General Notifications",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  return token;
}

/**
 * Show a local notification when an alarm triggers
 */
export async function showAlarmNotification(
  data: AlarmNotificationData,
): Promise<void> {
  const { alarmTitle, eventIndex, deviceName } = data;

  const title = "🔔 Alarm Triggered";
  const body = alarmTitle
    ? `${alarmTitle}${deviceName ? ` on ${deviceName}` : ""}`
    : `Alarm #${eventIndex + 1} is going off${deviceName ? ` on ${deviceName}` : ""}`;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: "alarm_triggered",
          ...data,
        },
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true, // Notification stays until dismissed
        autoDismiss: false,
      },
      trigger: null, // Show immediately
    });

    console.log(`📲 Local notification shown: ${title} - ${body}`);
  } catch (error) {
    console.error("❌ Error showing notification:", error);
  }
}

/**
 * Clear alarm notification when acknowledged
 */
export async function clearAlarmNotification(alarmId?: string): Promise<void> {
  try {
    if (alarmId) {
      // Clear specific notification by identifier
      await Notifications.dismissNotificationAsync(alarmId);
    } else {
      // Clear all notifications
      await Notifications.dismissAllNotificationsAsync();
    }
    console.log("🧹 Alarm notifications cleared");
  } catch (error) {
    console.error("❌ Error clearing notifications:", error);
  }
}

/**
 * Add a listener for notification responses (when user taps notification)
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Add a listener for notifications received while app is foregrounded
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Get the current notification permissions status
 */
export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === Notifications.PermissionStatus.GRANTED;
}

/**
 * Set badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error("❌ Error setting badge count:", error);
  }
}

/**
 * NotificationService class for simplified access to notification functions
 */
export class NotificationService {
  private static isInitialized = false;
  private static pushToken: string | null = null;

  /**
   * Initialize the notification service
   * Should be called early in the app lifecycle
   */
  static async initialize(): Promise<string | null> {
    if (this.isInitialized) {
      return this.pushToken;
    }

    try {
      this.pushToken = await registerForPushNotificationsAsync();
      this.isInitialized = true;
      console.log("✅ NotificationService initialized");
      return this.pushToken;
    } catch (error) {
      console.error("❌ Failed to initialize NotificationService:", error);
      return null;
    }
  }

  /**
   * Get the current push token
   */
  static getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if the service is initialized
   */
  static getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Show an alarm notification
   */
  static async showAlarmNotification(
    alarmTitle: string,
    deviceName?: string,
    eventIndex = 0,
    alarmId?: string,
  ): Promise<void> {
    await showAlarmNotification({
      alarmId: alarmId ?? `alarm-${eventIndex}`,
      alarmTitle,
      eventIndex,
      deviceName,
    });
  }

  /**
   * Clear alarm notifications
   */
  static async clearAlarmNotifications(alarmId?: string): Promise<void> {
    await clearAlarmNotification(alarmId);
  }

  /**
   * Check notification permissions
   */
  static async checkPermissions(): Promise<boolean> {
    const status = await getNotificationPermissionStatus();
    return status === Notifications.PermissionStatus.GRANTED;
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    return requestNotificationPermissions();
  }
}
