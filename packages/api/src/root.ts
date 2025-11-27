import { adminRouter } from "./router/admin";
import { alarmRouter } from "./router/alarm";
import { authRouter } from "./router/auth";
import { calendarRouter } from "./router/calendar";
import { deviceRouter } from "./router/device";
import { deviceShareRouter } from "./router/deviceShare";
import { notificationRouter } from "./router/notification";
import { userPreferencesRouter } from "./router/userPreferences";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  admin: adminRouter,
  alarm: alarmRouter,
  device: deviceRouter,
  deviceShare: deviceShareRouter,
  userPreferences: userPreferencesRouter,
  calendar: calendarRouter,
  notification: notificationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
