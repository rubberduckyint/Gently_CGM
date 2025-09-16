/**
 * Command Registration
 *
 * Auto-registers all BLE commands with the central registry.
 * This ensures all commands are available for discovery and execution.
 */

// Import all command classes
import { BasicConnectionCommand } from "./BasicConnectionCommand";
import { CreateEventCommand } from "./CreateEventCommand";
import { DeviceInfoCommand } from "./DeviceInfoCommand";
import { EnterDFUModeCommand } from "./EnterDFUModeCommand";
import { FindMeCommand } from "./FindMeCommand";
import { GetDeviceStatusCommand } from "./GetDeviceStatusCommand";
import { GetNumberOfEventsCommand } from "./GetNumberOfEventsCommand";
import { GetTimeCommand } from "./GetTimeCommand";
import { GetUptimeCommand } from "./GetUptimeCommand";
import { RebootDeviceCommand } from "./RebootDeviceCommand";
import { getBLECommandRegistry } from "./registry";
import { RemoveAllEventsCommand } from "./RemoveAllEventsCommand";
import { SetTimeCommand } from "./SetTimeCommand";

/**
 * Register all BLE commands with the central registry
 */
export function registerAllCommands(): void {
  const registry = getBLECommandRegistry();

  // Register core connection and device info commands
  registry.register(BasicConnectionCommand);
  registry.register(DeviceInfoCommand);
  registry.register(FindMeCommand);

  // Register device status and time commands
  registry.register(GetUptimeCommand);
  registry.register(GetDeviceStatusCommand);
  registry.register(GetTimeCommand);
  registry.register(SetTimeCommand);

  // Register device control commands
  registry.register(RebootDeviceCommand);
  registry.register(EnterDFUModeCommand);

  // Register event management commands
  registry.register(GetNumberOfEventsCommand);
  registry.register(RemoveAllEventsCommand);
  registry.register(CreateEventCommand);

  console.log(
    `✅ Registered ${registry.getStats().totalCommands} BLE commands`,
  );
}
