/**
 * Database Seeding Script for Gently App
 *
 * This script generates realistic test data using Faker.js for:
 * - Users with profiles, emails, and admin status
 * - Devices with sync status, battery levels, and descriptions
 *
 * Configuration can be modified in SEED_CONFIG below.
 *
 * Usage:
 *   pnpm seed      - Full seed with configurable amounts
 *   pnpm seed:quick - Quick seed with minimal data for testing
 *
 * WARNING: This script clears existing data by default!
 */

import { faker } from "@faker-js/faker";

import { db } from "./client";
import { Device, user } from "./schema";

// Configuration for seed data
const SEED_CONFIG = {
  users: 10,
  devicesPerUser: 3, // 1-3 devices per user
};

// Helper function to generate a random number between min and max (inclusive)
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate realistic device titles
function generateDeviceTitle(): string {
  const types = ["Bedroom", "Living Room", "Office", "Kitchen", "Bathroom"];
  const descriptors = ["Smart", "Gentle", "Wake-up", "Vibration", "Sleep"];
  const devices = ["Device", "Monitor", "Sensor", "Assistant", "Hub"];

  return `${faker.helpers.arrayElement(types)} ${faker.helpers.arrayElement(descriptors)} ${faker.helpers.arrayElement(devices)}`;
}

async function seedUsers() {
  console.log("Seeding users...");

  const users = [];

  // First, add the specific admin users
  const adminUser1 = {
    id: faker.string.uuid(),
    name: "Oliver Lett",
    email: "oliver@gentlyus.com",
    emailVerified: true,
    isAdmin: true,
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date(),
  };

  const adminUser2 = {
    id: faker.string.uuid(),
    name: "Admin User",
    email: "admin@gentlyus.com",
    emailVerified: true,
    isAdmin: true,
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date(),
  };

  users.push(adminUser1, adminUser2);

  // Generate regular users
  for (let i = 0; i < SEED_CONFIG.users; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const newUser = {
      id: faker.string.uuid(),
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({
        firstName: firstName.toLowerCase(),
        lastName: lastName.toLowerCase(),
      }),
      emailVerified: faker.datatype.boolean(0.9),
      isAdmin: false,
      createdAt: faker.date.between({
        from: new Date("2023-06-15"),
        to: new Date(),
      }),
      updatedAt: faker.date.between({
        from: new Date("2023-06-15"),
        to: new Date(),
      }),
    };

    users.push(newUser);
  }

  await db.insert(user).values(users);
  console.log(`Created ${users.length} users`);

  return users;
}

async function seedDevices(
  users: { id: string; name: string; isAdmin?: boolean }[],
) {
  console.log("Seeding devices...");

  const devices = [];

  for (const currentUser of users) {
    // Admin users get at least 1 device, regular users get random amount
    const deviceCount = currentUser.isAdmin
      ? Math.max(1, randomBetween(1, SEED_CONFIG.devicesPerUser))
      : randomBetween(1, SEED_CONFIG.devicesPerUser);

    for (let i = 0; i < deviceCount; i++) {
      const createdAt = faker.date.between({
        from: new Date("2023-01-01"),
        to: new Date(),
      });

      const device = {
        title: generateDeviceTitle(),
        description: faker.lorem.sentence({ min: 5, max: 15 }),
        createdAt,
        syncStatus: faker.helpers.arrayElement([
          "NOT_SYNCED",
          "SYNCING",
          "SYNCED",
          "ERROR",
        ] as const),
        batteryLevel: randomBetween(10, 100),
        lastSync: faker.datatype.boolean(0.8)
          ? faker.date.between({ from: createdAt, to: new Date() })
          : null,
        userId: currentUser.id,
      };

      devices.push(device);
    }
  }

  const insertedDevices = await db.insert(Device).values(devices).returning();
  console.log(`Created ${insertedDevices.length} devices`);

  return insertedDevices;
}

async function main() {
  try {
    console.log("Starting database seeding...");
    console.log(`Configuration:
    - Users: ${SEED_CONFIG.users}
    - Devices per user: 1-${SEED_CONFIG.devicesPerUser}
    `);

    // Clear existing data
    console.log("Clearing existing data...");
    await db.delete(Device);
    await db.delete(user);
    console.log("Cleared existing data");

    // Seed data in order (users first, then devices)
    const users = await seedUsers();
    const devices = await seedDevices(users);

    console.log("Database seeding completed successfully!");
    console.log(`Summary:
    - Users created: ${users.length}
    - Devices created: ${devices.length}
    `);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function
if (import.meta.url === new URL(process.argv[1] ?? "", "file://").href) {
  main()
    .then(() => {
      console.log("Seeding process finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { main as seed };
