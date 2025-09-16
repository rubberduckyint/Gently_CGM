// Commands module exports - re-export all command functions for easy importing

// Core command infrastructure
export { sendSecureCommand } from "./core";

// Base command architecture
export * from "./base";
export * from "./registry";

// Command registration (imports this to auto-register all commands)
export { registerAllCommands } from "./registerCommands";

// Individual BLE Command Classes
export { BasicConnectionCommand } from "./BasicConnectionCommand";
export { CreateEventCommand } from "./CreateEventCommand";
export { DeviceInfoCommand } from "./DeviceInfoCommand";
export { FindMeCommand } from "./FindMeCommand";
export { GetUptimeCommand } from "./GetUptimeCommand";
export { GetDeviceStatusCommand } from "./GetDeviceStatusCommand";
export { GetTimeCommand } from "./GetTimeCommand";
export { SetTimeCommand } from "./SetTimeCommand";
export { RebootDeviceCommand } from "./RebootDeviceCommand";
export { EnterDFUModeCommand } from "./EnterDFUModeCommand";
export { GetNumberOfEventsCommand } from "./GetNumberOfEventsCommand";
export { RemoveAllEventsCommand } from "./RemoveAllEventsCommand";

// Legacy device info commands (for backward compatibility)
export { readSecureDeviceInfo, readDeviceInfo } from "./deviceInfo";

// Legacy device status commands (for backward compatibility)
export { readSecureBatteryLevel, readSecureDeviceTime } from "./deviceStatus";

// Comprehensive device details
export { readComprehensiveDeviceDetails } from "./comprehensive";

// Device details and time retrieval
export { getDeviceDetailsAndTime } from "./deviceDetails";

// Event/alarm commands
export { syncDeviceAlarms } from "./events";
export type { SyncResult, DeviceDetailsResult } from "./events";

// Advertisement parsing
export {
  decryptAdvertisementPayload,
  parseManufacturerData,
  parseGentlyAdvertisementPayload,
} from "./advertisement";
