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

// User Preferences table
export const UserPreferences = pgTable("UserPreferences", (t) => ({
  id: pgCuid2("id").defaultRandom().primaryKey(),
  userId: t
    .text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),

  // Push notification token for this user
  pushNotificationToken: t.text(),

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

// Inferred TypeScript types from Drizzle
export type Device = typeof Device.$inferSelect;
export type NewDevice = typeof Device.$inferInsert;

// UserPreferences schemas
export const CreateUserPreferencesSchema = createInsertSchema(
  UserPreferences,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true, // This will be set from the session
});

export const UpdateUserPreferencesSchema =
  CreateUserPreferencesSchema.partial();

export const UserPreferencesSelectSchema = createSelectSchema(UserPreferences);

// Relations
export const userRelations = relations(user, ({ many, one }) => ({
  devices: many(Device),
  preferences: one(UserPreferences, {
    fields: [user.id],
    references: [UserPreferences.userId],
  }),
}));

export const deviceRelations = relations(Device, ({ one }) => ({
  user: one(user, {
    fields: [Device.userId],
    references: [user.id],
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

export * from "./auth-schema";
