# Gently Mobile

iOS + Android Expo client for the Gently CGM alert system. The bracelet wears on the wrist; the phone is the messenger between the cloud and the bracelet.

When the user's glucose crosses a configured threshold, the unified backend ([Gently_SRF](../Gently_SRF/), `srf.gentlyus.com`) sends an Expo push tagged `type: "cgm_alert"`. The phone wakes briefly and sends a BLE command so the bracelet vibrates / lights / buzzes per the payload's pattern ids. The phone is purely the BLE messenger; SRF is the brain.

For full architectural framing see [`CLAUDE.md`](./CLAUDE.md) and the parent coordinator file at `../CLAUDE.md`.

## Quick start

```bash
# 1. Install
pnpm install

# 2. Run the Expo dev server (Android-first per CGM v1 plan)
pnpm -F @gently/expo dev:android      # or dev:ios

# 3. Sign in to skip BLE/hardware
#    Email: extraspecialtestuser@gentlyus.com
#    OTP:   123456
#    Activates the mock BLE service so you can exercise the app
#    without a paired Gently bracelet.
```

The mobile app talks to a backend at `EXPO_PUBLIC_BASE_URL` (defaults to `https://srf.gentlyus.com`). For local development against a locally-running SRF, point this at your dev URL in `apps/expo/.env`.

## Repo layout

```
apps/expo/         React Native mobile app (iOS + Android) — Expo SDK 55, Expo Router
packages/
  shared/          Mobile-only shared utils
  validators/      Mobile-only Zod schemas
tooling/
  eslint, prettier, typescript, github   workspace-shared configs
```

There's no Next.js, no DB, no server-side packages here. Anything backend-shaped lives in [Gently_SRF](../Gently_SRF/).

## Tech stack

| Layer       | Tech |
| ----------- | ---- |
| Mobile      | React Native, Expo SDK 55, Expo Router, NativeWind |
| API client  | tRPC + React Query (consumes SRF's `AppRouter` type via tsconfig path) |
| Auth client | Better-Auth Expo client (OTP / Google / Apple) |
| BLE         | react-native-ble-manager + custom TEA-encrypted protocol |
| Push        | expo-notifications |
| Build       | Turborepo, EAS Build, Node 22, pnpm 10 |
| Analytics   | Vexo |

## Development

### Prerequisites

- Node.js >= 22.11.0
- pnpm 10.x (`corepack enable && corepack prepare`)
- Xcode (iOS development) and/or Android Studio (Android development)
- EAS CLI (`npm install -g eas-cli`) — for builds
- A locally-running [Gently_SRF](../Gently_SRF/) if you want a real backend round-trip

### Common commands

```bash
# Expo dev server (Metro)
pnpm -F @gently/expo dev:android      # or dev:ios

# Native run (Xcode / Gradle build)
pnpm -F @gently/expo android
pnpm -F @gently/expo ios

# Quality gates
pnpm typecheck
pnpm lint
pnpm format
pnpm format:fix
```

## Mobile builds (EAS)

Three build profiles in `apps/expo/eas.json`:

| Profile       | Purpose                | Distribution |
| ------------- | ---------------------- | ------------ |
| `development` | Dev client builds      | Internal     |
| `preview`     | Testing builds         | Internal     |
| `production`  | App Store / Play Store | Store        |

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios --profile production
```

**App identifiers:**

| Platform | Production            | Development               |
| -------- | --------------------- | ------------------------- |
| iOS      | `com.gentlyus.mobile` | `com.gentlyus.mobile-dev` |
| Android  | `com.gentlyus.gently` | `com.gentlyus.gently.dev` |

App Store Connect ID: `6752447097`
EAS Project ID: `e881c3b6-0d21-4cc4-8933-176c9d6eb00e`

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on PRs and pushes to `main`:

- ESLint across all workspaces
- Prettier format validation
- TypeScript type checking

## BLE device communication

The app communicates with Gently bracelets over Bluetooth Low Energy using a custom encrypted protocol. See [`apps/expo/BLE_protocol.md`](./apps/expo/BLE_protocol.md) for the full spec.

### Connection flow

1. Request Bluetooth permissions
2. Scan for devices advertising as "Gently"
3. Parse encrypted advertisement data (serial number, battery, firmware)
4. Connect with retry logic (3 attempts, configurable timeout)
5. Request MTU (Android)
6. Discover services, start notifications
7. Generate dynamic encryption key from device uptime + serial
8. Validate connection with device info query
9. Sync device clock

### Encryption

- **Algorithm:** TEA (Tiny Encryption Algorithm), 64-bit blocks, 128-bit key
- **Factory key:** Used for initial connection and uptime query
- **Dynamic key:** Generated per-session from factory key XOR'd with uptime bytes and serial number
- All command payloads are encrypted/decrypted at the transport layer

### BLE service UUIDs

| UUID   | Purpose                          |
| ------ | -------------------------------- |
| `F021` | Gently BLE Service               |
| `F023` | Request characteristic (write)   |
| `F024` | Response characteristic (notify) |

### Device commands

| Code   | Command                   | Purpose                        |
| ------ | ------------------------- | ------------------------------ |
| `0x01` | GET_UPTIME                | Device uptime (for key gen)    |
| `0x02` | GET_DEVICE_INFO           | Hardware/firmware version      |
| `0x0A` | GET_TIME                  | Read device clock              |
| `0x0B` | SET_TIME                  | Sync device clock              |
| `0x0C` | GET_DEVICE_STATUS         | Battery, charging, error codes |
| `0x10` | FIND_ME                   | Trigger sound/light to locate  |
| `0x11` | ENTER_DFU_MODE            | Firmware update mode           |
| `0x12` | REBOOT_BRACELET           | Restart device                 |
| `0x14` | TRIGGER_LED_PATTERN       | Activate LED with color/timing |
| `0x15` | TRIGGER_VIBRATION_PATTERN | Activate motor with pattern    |
| `0x16` | TRIGGER_AUDIO_PATTERN     | Activate buzzer with timing    |

### Device capabilities

- **Vibration motor:** 64 patterns (0-63), 4 intensity levels, 1-60s duration
- **LED:** 7 colors (Blue, Green, Cyan, Red, Yellow, Magenta, White), configurable on/off timing
- **Audio buzzer:** Configurable beep pattern (on/off duration), 1-60s total
- **Battery:** Voltage monitoring, charging detection, 5-level status (Critical to Full)
- **Notifications:** Async push from device for battery status (`0x80`), event state (`0x81`), time sync (`0x82`)

### Test mode

Signing in as `extraspecialtestuser@gentlyus.com` with OTP `123456` activates a mock BLE service that bypasses all Bluetooth operations. This lets Apple App Review test the app without a physical device.

## Authentication

Three sign-in methods via Better-Auth on SRF:

1. **Email OTP** (default) — 6-digit code
2. **Google OAuth** — Social login
3. **Apple Sign In** — iOS native auth

Sessions are stored in Expo SecureStore and forwarded as a cookie on every tRPC request to SRF.

## Mobile app structure

```
apps/expo/src/
  app/                    Expo Router screens
    index.tsx             Login
    dashboard.tsx         Device list + hamburger menu
    settings.tsx          User settings
    add-device/           Device pairing flow
    cgm/
      index.tsx           Dexcom Source list
      add.tsx             Connect Dexcom Share form
    devices/[deviceId]/
      index.tsx           Device detail + trigger buttons
      edit/               Edit device name
      delete/             Delete device
      ble-test.tsx        BLE command testing (debug)

  contexts/
    BLEContext.tsx        Global BLE state + connection management

  services/
    alerts/               SRF cgm_alert push → BLE bridge (subscriber + translator)
    ble/
      connection.ts       Connect/disconnect with retry
      manager.ts          Send/receive encrypted commands
      encryption.ts       TEA cipher + advertisement parsing
      storage.ts          Secure key storage
      notifications.ts    Parse async device notifications
      mockBLEService.ts   Simulated BLE for the test user
      commands/           Individual BLE command builders
    analytics/            Vexo event tracking
    notifications/        Expo push registration + foreground handler

  components/             Reusable UI components
  hooks/                  Custom React hooks
  styles/                 Design system tokens
  types/
    alert-payload.ts      Vendored copy of SRF's AlertPayload Zod schema
  utils/
    api.tsx               tRPC client (consumes SRF's AppRouter)
    auth.ts               Better-Auth Expo client
```

## Cross-repo contract surfaces

These must stay in lockstep with [Gently_SRF](../Gently_SRF/):

- **`AppRouter` tRPC types** via `apps/expo/tsconfig.json` path mapping. SRF's `pnpm -F @gently/api build` must be fresh.
- **`@trpc/*` versions** must match SRF's resolved versions exactly — version skew makes `inferRouterClient<AppRouter>` collapse sub-routers to `never`.
- **Push payload schema** is vendored at `apps/expo/src/types/alert-payload.ts`; drift breaks the alert pipeline silently.
- **Push token registration** is wired in `apps/expo/src/app/_layout.tsx` (compare-and-update on auth).
- **Alert dispatch** runs in `apps/expo/src/services/alerts/` on incoming `cgm_alert` pushes.

See [`CLAUDE.md`](./CLAUDE.md) for the load-bearing details.
