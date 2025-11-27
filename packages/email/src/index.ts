export * from "./types";
export * from "./sender";
export * from "./magic-link";
export * from "./otp";
export { default as MagicLinkEmail } from "./templates/magic-link";
export { default as OTPEmail } from "./templates/otp";
export { default as AlarmNotificationEmail } from "./templates/alarm-notification";
export type { AlarmNotificationEmailProps } from "./templates/alarm-notification";
