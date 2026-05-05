# Gently

A health management platform for controlling a BLE smart bracelet. The bracelet delivers notifications via vibration, sound, and LED light patterns. The system consists of a React Native mobile app, a Next.js web dashboard, and a shared backend.

## Architecture

```
apps/
  expo/          React Native mobile app (iOS + Android)
  nextjs/        Next.js 15 web dashboard

packages/
  api/           tRPC API router definitions
  auth/          Better-Auth configuration
  db/            Drizzle ORM schema + PostgreSQL
  email/         React Email templates + SMTP sender
  shared/        Shared utilities
  validators/    Zod validation schemas

tooling/
  eslint/        Shared ESLint config
  prettier/      Code formatting
  typescript/    Shared tsconfig
```

**Monorepo**: Turborepo + pnpm workspaces. All packages are TypeScript with end-to-end type safety via tRPC.

## Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Mobile       | React Native, Expo SDK 55, Expo Router               |
| Web          | Next.js 15, React 19, Tailwind CSS v4                |
| Styling      | NativeWind (mobile), Tailwind + Radix UI (web)       |
| API          | tRPC with React Query                                |
| Auth         | Better-Auth (email OTP, Google OAuth, Apple Sign In)  |
| Database     | PostgreSQL 17, Drizzle ORM                           |
| BLE          | react-native-ble-manager, TEA encryption             |
| Email        | React Email, SMTP (MailHog in dev)                   |
| Analytics    | Vexo Analytics                                       |
| Build        | Turborepo, EAS Build (mobile), Node 22               |
| CI           | GitHub Actions (lint, format, typecheck)              |

## Getting Started

### Prerequisites

- Node.js >= 22.11.0
- pnpm 10.x (`corepack enable && corepack prepare`)
- Docker (for PostgreSQL + MailHog)
- Xcode (iOS development)
- Android Studio (Android development)
- EAS CLI (`npm install -g eas-cli`)

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres on :5832, MailHog on :8025)
docker compose up -d

# Copy environment variables
cp .env.bk .env
# Edit .env with your secrets (see Environment Variables below)

# Push database schema
pnpm db:push

# Optional: seed test data
pnpm -F @gently/db seed
```

### Development

```bash
# Run everything (mobile + web + API)
pnpm dev

# Web dashboard only
pnpm dev:next

# Mobile app
cd apps/expo
pnpm dev           # Expo dev server
pnpm ios           # Run on iOS simulator
pnpm android       # Run on Android emulator

# Database studio (GUI)
pnpm db:studio
```

### Quality

```bash
pnpm typecheck     # TypeScript validation
pnpm lint          # ESLint
pnpm format        # Prettier check
pnpm format:fix    # Auto-fix formatting
```

## Environment Variables

Create a `.env` file at the project root:

```bash
# Database
POSTGRES_URL="postgresql://gently:gently@localhost:5832/gently"

# Auth
AUTH_SECRET="<openssl rand -base64 32>"

# Email (SMTP)
EMAIL_SERVER_HOST="localhost"    # MailHog in dev, smtp.gmail.com in prod
EMAIL_SERVER_PORT="1025"         # 1025 for MailHog, 587 for Gmail
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM="noreply@gentlyus.com"

# URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
EXPO_PUBLIC_BASE_URL=http://localhost:3000

# Google OAuth
AUTH_GOOGLE_ID="<google-client-id>"
AUTH_GOOGLE_SECRET="<google-client-secret>"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="<google-web-client-id>"

# Apple Sign In
APPLE_TEAM_ID="K2ZWWF4P2G"
APPLE_KEY_ID="R984ML9MQ8"
APPLE_CLIENT_ID="com.gentlyus.gently.web"
APPLE_APP_BUNDLE_ID="com.gentlyus.gently"
APPLE_PRIVATE_KEY="<apple-private-key>"
```

## Infrastructure

### Local Development

Docker Compose provides:
- **PostgreSQL 17** on port `5832` (user: gently, pass: gently, db: gently)
- **MailHog** on port `1025` (SMTP) / `8025` (web UI for viewing emails)

### Mobile Builds (EAS)

Three build profiles in `apps/expo/eas.json`:

| Profile       | Purpose              | Distribution |
| ------------- | -------------------- | ------------ |
| `development` | Dev client builds    | Internal     |
| `preview`     | Testing builds       | Internal     |
| `production`  | App Store / Play Store | Store      |

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

**App identifiers:**

| Platform | Production                | Development                |
| -------- | ------------------------- | -------------------------- |
| iOS      | `com.gentlyus.mobile`     | `com.gentlyus.mobile-dev`  |
| Android  | `com.gentlyus.gently`     | `com.gentlyus.gently.dev`  |

App Store Connect ID: `6752447097`
EAS Project ID: `e881c3b6-0d21-4cc4-8933-176c9d6eb00e`

### Web Deployment

The Next.js app is configured for standard Node.js hosting. Turbo remote caching uses Vercel tokens (configured in CI via `TURBO_TEAM` and `TURBO_TOKEN`).

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on PRs and pushes to `main`:
- ESLint across all workspaces
- Prettier format validation
- TypeScript type checking

## BLE Device Communication

The app communicates with Gently bracelets over Bluetooth Low Energy using a custom encrypted protocol. See `apps/expo/BLE_protocol.md` for the full spec.

### Connection Flow

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

- **Algorithm**: TEA (Tiny Encryption Algorithm), 64-bit blocks, 128-bit key
- **Factory key**: Used for initial connection and uptime query
- **Dynamic key**: Generated per-session from factory key XOR'd with uptime bytes and serial number
- All command payloads are encrypted/decrypted at the transport layer

### BLE Service UUIDs

| UUID   | Purpose                        |
| ------ | ------------------------------ |
| `F021` | Gently BLE Service             |
| `F023` | Request characteristic (write) |
| `F024` | Response characteristic (notify) |

### Device Commands

| Code   | Command                    | Purpose                        |
| ------ | -------------------------- | ------------------------------ |
| `0x01` | GET_UPTIME                 | Device uptime (for key gen)    |
| `0x02` | GET_DEVICE_INFO            | Hardware/firmware version       |
| `0x0A` | GET_TIME                   | Read device clock              |
| `0x0B` | SET_TIME                   | Sync device clock              |
| `0x0C` | GET_DEVICE_STATUS          | Battery, charging, error codes |
| `0x10` | FIND_ME                    | Trigger sound/light to locate  |
| `0x11` | ENTER_DFU_MODE             | Firmware update mode           |
| `0x12` | REBOOT_BRACELET            | Restart device                 |
| `0x14` | TRIGGER_LED_PATTERN        | Activate LED with color/timing |
| `0x15` | TRIGGER_VIBRATION_PATTERN  | Activate motor with pattern    |
| `0x16` | TRIGGER_AUDIO_PATTERN      | Activate buzzer with timing    |

### Device Capabilities

- **Vibration motor**: 64 patterns (0-63), 4 intensity levels, 1-60s duration
- **LED**: 7 colors (Blue, Green, Cyan, Red, Yellow, Magenta, White), configurable on/off timing
- **Audio buzzer**: Configurable beep pattern (on/off duration), 1-60s total
- **Battery**: Voltage monitoring, charging detection, 5-level status (Critical to Full)
- **Notifications**: Async push from device for battery status (0x80), event state (0x81), time sync (0x82)

### Test Mode

A test user (`extraspecialtestuser@gentlyus.com`, OTP: `123456`) bypasses all Bluetooth operations using a mock BLE service. This allows Apple App Review testing without a physical device.

## Authentication

Three sign-in methods:

1. **Email OTP** (default) - 6-digit code sent via email
2. **Google OAuth** - Social login
3. **Apple Sign In** - iOS native auth

Sessions are managed by Better-Auth with JWT tokens stored in Expo SecureStore (mobile) or HTTP-only cookies (web).

## Mobile App Structure

```
apps/expo/src/
  app/                    Expo Router screens
    index.tsx             Login
    dashboard.tsx         Device list
    settings.tsx          User settings
    add-device/           Device pairing flow
    devices/[deviceId]/
      index.tsx           Device detail + trigger buttons
      edit/               Edit device name
      delete/             Delete device
      ble-test.tsx        BLE command testing (debug)

  contexts/
    BLEContext.tsx         Global BLE state + connection management

  services/
    ble/
      connection.ts       Connect/disconnect with retry
      manager.ts          Send/receive encrypted commands
      encryption.ts       TEA cipher + advertisement parsing
      storage.ts          Secure key storage
      notifications.ts    Parse async device notifications
      mockBLEService.ts   Simulated BLE for test users
      commands/            Individual BLE command builders
    analytics/            Vexo event tracking
    notifications/        Push notification infrastructure

  components/             Reusable UI components
  hooks/                  Custom React hooks
  styles/                 Design system tokens
  types/                  Shared TypeScript types
  utils/                  Helper functions
```

## Database Schema

```
User            Better-Auth managed user record
Device          id, title, description, serialNumber, batteryLevel, syncStatus, userId
UserPreferences id, userId, pushNotificationToken
```

Managed via Drizzle ORM. Push schema changes with `pnpm db:push`. View data with `pnpm db:studio`.
