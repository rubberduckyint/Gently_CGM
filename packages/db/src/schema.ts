import { pgCuid2 } from "drizzle-cuid2";
import { relations, sql } from "drizzle-orm";
import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

// Enums
export const syncStatusEnum = pgEnum("SyncStatus", [
  "NOT_SYNCED",
  "SYNCING",
  "SYNCED",
  "ERROR",
]);

// Legacy enums removed - now using BLE protocol enums only

// BLE Protocol Enums
export const severityLevelEnum = pgEnum("SeverityLevel", [
  "INFORMATIONAL",
  "WARNING",
  "CRITICAL",
]);

export const ledPatternEnum = pgEnum("LedPattern", [
  "OFF",
  "SOLID",
  "BLINK_SLOW",
  "BLINK_FAST",
  "PULSE",
  "STROBE",
]);

export const ledColorEnum = pgEnum("LedColor", [
  "RED",
  "GREEN",
  "BLUE",
  "YELLOW",
  "MAGENTA",
  "CYAN",
  "WHITE",
]);

export const vibrationIntensityEnum = pgEnum("VibrationIntensity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "MAXIMUM",
]);

// User Preferences table for alarm defaults
export const UserPreferences = pgTable("UserPreferences", (t) => ({
  id: pgCuid2("id").defaultRandom().primaryKey(),
  userId: t
    .text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),

  // Default alarm settings
  defaultSeverityLevel: severityLevelEnum().default("INFORMATIONAL").notNull(),
  defaultLedPattern: ledPatternEnum().default("BLINK_SLOW").notNull(),
  defaultLedColor: ledColorEnum().default("BLUE").notNull(),
  defaultVibrationPattern: t.integer().default(1).notNull(),
  defaultVibrationIntensity: vibrationIntensityEnum()
    .default("MEDIUM")
    .notNull(),
  defaultSnoozePeriod: t.integer().default(5).notNull(), // minutes
  defaultSnoozeTimeout: t.integer().default(15).notNull(), // minutes
  defaultRetriggerDelay: t.integer().default(1).notNull(), // minutes
  defaultRetriggerTimeout: t.integer().default(5).notNull(), // minutes

  // Default notification settings
  defaultPushNotification: t.boolean().default(true).notNull(),
  defaultEmailNotification: t.boolean().default(false).notNull(),

  // Push notification token for this user
  pushNotificationToken: t.text(),

  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp({ withTimezone: true, mode: "string" })
    .$onUpdate(() => sql`NOW()`)
    .notNull(),
}));

// Calendar Connections table for Google Calendar OAuth
export const CalendarConnection = pgTable("CalendarConnection", (t) => ({
  id: pgCuid2("id").defaultRandom().primaryKey(),
  userId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  provider: t.text().notNull(), // "google"
  accountEmail: t.text().notNull(),

  // OAuth tokens
  accessToken: t.text().notNull(),
  refreshToken: t.text(),
  tokenExpiresAt: t.timestamp({ withTimezone: true }),

  // Connection metadata
  isActive: t.boolean().default(true).notNull(),
  lastSyncedAt: t.timestamp({ withTimezone: true }),

  // Incremental sync support
  syncToken: t.text(), // Google Calendar sync token for incremental sync
  calendarId: t.text().default("primary").notNull(), // Calendar ID being synced

  // Push notification (webhook) support
  watchChannelId: t.text(), // UUID for Google Calendar push channel
  watchResourceId: t.text(), // Resource ID from Google for the watch
  watchExpiration: t.timestamp({ withTimezone: true }), // When the watch expires

  // Sync status - set by webhook when changes occur while app is closed
  needsSync: t.boolean().default(false).notNull(),

  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp({ withTimezone: true, mode: "string" })
    .$onUpdate(() => sql`NOW()`)
    .notNull(),
}));

// Calendar Event Alarms - maps calendar events to created alarms
export const CalendarEventAlarm = pgTable("CalendarEventAlarm", (t) => ({
  id: pgCuid2("id").defaultRandom().primaryKey(),
  userId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  calendarConnectionId: t
    .text()
    .notNull()
    .references(() => CalendarConnection.id, { onDelete: "cascade" }),
  alarmId: t.text().references(() => Alarm.id, { onDelete: "set null" }),

  // Calendar event details
  eventId: t.text().notNull(), // Google Calendar event ID
  eventSummary: t.text().notNull(),
  eventStartTime: t.timestamp({ withTimezone: true }).notNull(),
  eventEndTime: t.timestamp({ withTimezone: true }),
  eventLocation: t.text(),
  eventEtag: t.text(), // ETag for change detection
  eventStatus: t.text().default("confirmed").notNull(), // "confirmed", "cancelled", "tentative"

  // Alarm configuration
  alarmMinutesBefore: t.integer().notNull(),

  // Sync tracking
  lastSynced: t.timestamp({ withTimezone: true }),

  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp({ withTimezone: true, mode: "string" })
    .$onUpdate(() => sql`NOW()`)
    .notNull(),
}));

export const Device = pgTable("Device", (t) => ({
  id: pgCuid2("id").defaultRandom().primaryKey(),
  title: t.text().notNull(),
  description: t.text().notNull(),
  serialNumber: t.text(), // Device serial number from BLE connection - used for device discovery
  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp({ withTimezone: true, mode: "string" })
    .$onUpdate(() => sql`NOW()`)
    .notNull(),
  syncStatus: syncStatusEnum().default("NOT_SYNCED").notNull(),
  batteryLevel: t.integer().default(100).notNull(),
  lastSync: t.timestamp(),
  userId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}));

export const Alarm = pgTable("Alarm", (t) => ({
  id: pgCuid2("id").defaultRandom().primaryKey(),
  title: t.text().notNull(),
  description: t.text(),
  isActive: t.boolean().default(true).notNull(),
  startDate: t.timestamp().defaultNow().notNull(),
  endDate: t.timestamp(),
  repeat: t.boolean().default(false).notNull(),
  cronExpression: t.text().notNull(),
  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp({ withTimezone: true, mode: "string" })
    .$onUpdate(() => sql`NOW()`)
    .notNull(),
  syncStatus: syncStatusEnum().default("NOT_SYNCED").notNull(),
  lastSync: t.timestamp(),
  deviceIndex: t.integer(), // The slot index on the physical device (0-49), null if not synced
  peripheralId: t.text(), // 10-character alphanumeric unique ID used to verify alarm on device
  // BLE Protocol fields (consolidated - these replace legacy color, priority, hapticChoice)
  severityLevel: severityLevelEnum().default("INFORMATIONAL").notNull(),
  ledPattern: ledPatternEnum().default("BLINK_SLOW").notNull(),
  ledColor: ledColorEnum().default("BLUE").notNull(),
  vibrationPattern: t.integer().default(1).notNull(),
  vibrationIntensity: vibrationIntensityEnum().default("MEDIUM").notNull(),
  snoozePeriod: t.integer().default(5).notNull(), // minutes
  snoozeTimeout: t.integer().default(15).notNull(), // minutes
  retriggerDelay: t.integer().default(1).notNull(), // minutes
  retriggerTimeout: t.integer().default(5).notNull(), // minutes
  // Notification settings
  pushNotification: t.boolean().default(true).notNull(),
  emailNotification: t.boolean().default(false).notNull(),
  userId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  deviceId: t.text().references(() => Device.id, { onDelete: "cascade" }),
}));

// Device Sharing Enums
export const deviceSharePermissionEnum = pgEnum("DeviceSharePermission", [
  "READ", // Can view device and alarms, receive notifications
  "WRITE", // Can also create/modify alarms
]);

export const deviceShareStatusEnum = pgEnum("DeviceShareStatus", [
  "PENDING", // Invitation sent, awaiting response
  "ACCEPTED", // User accepted the invitation
  "DECLINED", // User declined the invitation
  "REVOKED", // Owner revoked access
]);

// Device Share - grants access to a device for another user
export const DeviceShare = pgTable("DeviceShare", (t) => ({
  id: pgCuid2("id").defaultRandom().primaryKey(),
  deviceId: t
    .text()
    .notNull()
    .references(() => Device.id, { onDelete: "cascade" }),

  // The user who is being granted access (null if they don't have an account yet)
  sharedWithUserId: t.text().references(() => user.id, { onDelete: "cascade" }),

  // Email of the invited user (used for pending invitations)
  invitedEmail: t.text().notNull(),

  // Permission level
  permission: deviceSharePermissionEnum().default("READ").notNull(),

  // Status of the share
  status: deviceShareStatusEnum().default("PENDING").notNull(),

  // Notification preferences for shared users
  pushNotification: t.boolean().default(true).notNull(),
  emailNotification: t.boolean().default(false).notNull(),

  // Who sent the invitation
  invitedByUserId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Invitation tracking
  invitationToken: t.text(), // Unique token for accepting invitation via link
  invitationExpiresAt: t.timestamp({ withTimezone: true }), // When the invitation expires
  acceptedAt: t.timestamp({ withTimezone: true }), // When the user accepted

  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp({ withTimezone: true, mode: "string" })
    .$onUpdate(() => sql`NOW()`)
    .notNull(),
}));

export const CreateDeviceSchema = createInsertSchema(Device, {
  title: z.string().min(1),
  description: z.string(),
  serialNumber: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true, // This will be set from the session
});

export const UpdateDeviceSchema = createInsertSchema(Device, {
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
})
  .omit({
    createdAt: true,
    updatedAt: true,
    userId: true, // This will be set from the session
  })
  .extend({
    id: z.string(), // Required for updates
  });

export const DeviceWhereUniqueSchema = z.object({
  id: z.string(),
});

export const DeviceSelectSchema = createSelectSchema(Device);

export const DeviceWithAlarmsCountSchema = DeviceSelectSchema.extend({
  _count: z.object({
    alarms: z.number(),
  }),
});

// Inferred TypeScript types from Drizzle
export type Device = typeof Device.$inferSelect;
export type NewDevice = typeof Device.$inferInsert;

// Type for device with alarm count using proper Drizzle types
export type DeviceWithAlarmsCount = Device & {
  _count: {
    alarms: number;
  };
};

// Device Share types
export type DeviceShare = typeof DeviceShare.$inferSelect;
export type NewDeviceShare = typeof DeviceShare.$inferInsert;
export type DeviceSharePermission = DeviceShare["permission"];
export type DeviceShareStatus = DeviceShare["status"];

// Device Share schemas
export const CreateDeviceShareSchema = z.object({
  deviceId: z.string(),
  invitedEmail: z.string().email(),
  permission: z.enum(["READ", "WRITE"]).default("READ"),
});

export const UpdateDeviceShareSchema = z.object({
  id: z.string(),
  permission: z.enum(["READ", "WRITE"]).optional(),
  pushNotification: z.boolean().optional(),
  emailNotification: z.boolean().optional(),
});

export type Alarm = typeof Alarm.$inferSelect;
export type NewAlarm = typeof Alarm.$inferInsert;

export const CreateAlarmSchema = createInsertSchema(Alarm, {
  title: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  repeat: z.boolean().optional(),
  cronExpression: z.string().min(1),
  // BLE Protocol fields (consolidated - replaces legacy color, priority, hapticChoice)
  severityLevel: z.enum(["INFORMATIONAL", "WARNING", "CRITICAL"]).optional(),
  ledPattern: z
    .enum(["OFF", "SOLID", "BLINK_SLOW", "BLINK_FAST", "PULSE", "STROBE"])
    .optional(),
  ledColor: z
    .enum(["RED", "GREEN", "BLUE", "YELLOW", "MAGENTA", "CYAN", "WHITE"])
    .optional(),
  vibrationPattern: z.number().int().min(1).max(63).optional(),
  vibrationIntensity: z.enum(["LOW", "MEDIUM", "HIGH", "MAXIMUM"]).optional(),
  deviceIndex: z.number().int().min(0).max(49).nullable().optional(), // Device slot 0-49
  snoozePeriod: z.number().int().min(1).max(60).optional(),
  snoozeTimeout: z.number().int().min(1).max(120).optional(),
  retriggerDelay: z.number().int().min(0).max(60).optional(), // 0 = disabled
  retriggerTimeout: z.number().int().min(0).max(120).optional(), // 0 = disabled
  pushNotification: z.boolean().optional(),
  emailNotification: z.boolean().optional(),
  deviceId: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  syncStatus: true, // This will be handled automatically
  lastSync: true, // This will be handled automatically
  userId: true, // This will be set from the session
});

export const UpdateAlarmSchema = CreateAlarmSchema.partial().extend({
  id: z.string(), // Required for updates
});

export const AlarmWhereUniqueSchema = z.object({
  id: z.string(),
});

export const AlarmSelectSchema = createSelectSchema(Alarm);

export const AlarmWithDeviceSchema = AlarmSelectSchema.extend({
  device: createSelectSchema(Device).nullable(),
});

export const AlarmListSchema = z.array(AlarmWithDeviceSchema);

// UserPreferences schemas
export const CreateUserPreferencesSchema = createInsertSchema(UserPreferences, {
  defaultVibrationPattern: z.number().int().min(0).max(63), // 6-bit value as per BLE protocol
  defaultSnoozePeriod: z.number().int().min(0).max(255),
  defaultSnoozeTimeout: z.number().int().min(0).max(255),
  defaultRetriggerDelay: z.number().int().min(0).max(255),
  defaultRetriggerTimeout: z.number().int().min(0).max(255),
  defaultPushNotification: z.boolean().optional(),
  defaultEmailNotification: z.boolean().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true, // This will be set from the session
});

export const UpdateUserPreferencesSchema =
  CreateUserPreferencesSchema.partial();

export const UserPreferencesSelectSchema = createSelectSchema(UserPreferences);

// Calendar Connection Schemas
export const CreateCalendarConnectionSchema = createInsertSchema(
  CalendarConnection,
).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCalendarConnectionSchema =
  CreateCalendarConnectionSchema.partial();

export const CalendarConnectionSelectSchema =
  createSelectSchema(CalendarConnection);

// Calendar Event Alarm Schemas
export const CreateCalendarEventAlarmSchema = createInsertSchema(
  CalendarEventAlarm,
  {
    eventId: z.string().min(1),
    eventSummary: z.string().min(1),
    eventStartTime: z.date(),
    eventEndTime: z.date().optional(),
    eventLocation: z.string().optional(),
    alarmMinutesBefore: z.number().int().min(0).max(1440), // Max 24 hours
  },
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true, // Set from session
});

export const UpdateCalendarEventAlarmSchema =
  CreateCalendarEventAlarmSchema.partial();

export const CalendarEventAlarmSelectSchema =
  createSelectSchema(CalendarEventAlarm);

// Relations
export const userRelations = relations(user, ({ many, one }) => ({
  devices: many(Device),
  alarms: many(Alarm),
  preferences: one(UserPreferences, {
    fields: [user.id],
    references: [UserPreferences.userId],
  }),
  calendarConnections: many(CalendarConnection),
  calendarEventAlarms: many(CalendarEventAlarm),
  // Device shares - devices shared with this user
  sharedDevices: many(DeviceShare, { relationName: "sharedWith" }),
  // Device shares - invitations this user has sent
  sentInvitations: many(DeviceShare, { relationName: "invitedBy" }),
}));

export const deviceRelations = relations(Device, ({ one, many }) => ({
  user: one(user, {
    fields: [Device.userId],
    references: [user.id],
  }),
  alarms: many(Alarm),
  // Users this device is shared with
  shares: many(DeviceShare),
}));

export const deviceShareRelations = relations(DeviceShare, ({ one }) => ({
  device: one(Device, {
    fields: [DeviceShare.deviceId],
    references: [Device.id],
  }),
  sharedWithUser: one(user, {
    fields: [DeviceShare.sharedWithUserId],
    references: [user.id],
    relationName: "sharedWith",
  }),
  invitedByUser: one(user, {
    fields: [DeviceShare.invitedByUserId],
    references: [user.id],
    relationName: "invitedBy",
  }),
}));

export const alarmRelations = relations(Alarm, ({ one }) => ({
  user: one(user, {
    fields: [Alarm.userId],
    references: [user.id],
  }),
  device: one(Device, {
    fields: [Alarm.deviceId],
    references: [Device.id],
  }),
  calendarEventAlarm: one(CalendarEventAlarm, {
    fields: [Alarm.id],
    references: [CalendarEventAlarm.alarmId],
  }),
}));

export const userPreferencesRelations = relations(
  UserPreferences,
  ({ one }) => ({
    user: one(user, {
      fields: [UserPreferences.userId],
      references: [user.id],
    }),
  }),
);

export const calendarConnectionRelations = relations(
  CalendarConnection,
  ({ one, many }) => ({
    user: one(user, {
      fields: [CalendarConnection.userId],
      references: [user.id],
    }),
    calendarEventAlarms: many(CalendarEventAlarm),
  }),
);

export const calendarEventAlarmRelations = relations(
  CalendarEventAlarm,
  ({ one }) => ({
    user: one(user, {
      fields: [CalendarEventAlarm.userId],
      references: [user.id],
    }),
    calendarConnection: one(CalendarConnection, {
      fields: [CalendarEventAlarm.calendarConnectionId],
      references: [CalendarConnection.id],
    }),
    alarm: one(Alarm, {
      fields: [CalendarEventAlarm.alarmId],
      references: [Alarm.id],
    }),
  }),
);

// Export enum value types for type-safe usage
export type SeverityLevel = typeof Alarm.$inferSelect.severityLevel;
export type LedPattern = typeof Alarm.$inferSelect.ledPattern;
export type LedColor = typeof Alarm.$inferSelect.ledColor;
export type VibrationIntensity = typeof Alarm.$inferSelect.vibrationIntensity;

export * from "./auth-schema";
