# Gently Mobile

This repo is **Gently Mobile** — the user-facing iOS + Android client for the Gently CGM alert system. Expo app + custom BLE bracelet protocol. Mobile-only.

The unified backend lives at sibling repo `Gently_SRF/` (`srf.gentlyus.com`): tRPC API + admin web dashboard + Dexcom poller + Better-Auth + Drizzle/Postgres. The phone is purely the BLE messenger; SRF is the brain. Full cross-repo architecture lives in the parent coordinator file at `~/Projects/Gently_CGM/CLAUDE.md`.

## What Mobile does

User signs in (Better-Auth via SRF), enters Dexcom credentials, pairs the bracelet over BLE, and configures alert thresholds + alarm style. SRF stores all of that and runs the polling/alert engine. When SRF's worker fires an Expo push tagged `type: "cgm_alert"`, Mobile wakes briefly and sends BLE commands so the bracelet vibrates / lights / buzzes per the payload's pattern ids.

## Stack

| Layer | Tech |
|---|---|
| Mobile | React Native, Expo SDK 55, Expo Router, NativeWind |
| API client | tRPC + React Query (consumes SRF's `AppRouter` type via tsconfig path) |
| Auth client | Better-Auth Expo client (OTP / Google / Apple) |
| BLE | react-native-ble-manager + custom TEA-encrypted protocol |
| Push | expo-notifications |
| Build | Turborepo, EAS Build, Node 22, pnpm 10 |
| Analytics | Vexo |

There's no Next.js, no Drizzle, no Postgres in this repo. Anything backend-shaped lives in `Gently_SRF/`.

## Repo layout

```
apps/expo/         React Native mobile app (iOS + Android) — Expo SDK 55, Expo Router
packages/
  shared/          Mobile-only shared utils
  validators/      Mobile-only Zod schemas
tooling/
  eslint, prettier, typescript, github   workspace-shared configs
```

`apps/expo/src/services/alerts/` is the SRF→bracelet bridge; `apps/expo/src/services/ble/` is the BLE protocol implementation; `apps/expo/src/services/notifications/` is the Expo push integration.

## Cross-repo contract surfaces

These must stay in lockstep with `Gently_SRF/`. Drift on any of them breaks the user-facing alert pipeline silently.

- **`AppRouter` tRPC types.** `apps/expo/tsconfig.json` has a path mapping `"@gently/api": ["../../../Gently_SRF/packages/api/dist/index.d.ts"]`. SRF's `pnpm -F @gently/api build` must be fresh for Mobile typecheck to see the latest router shape.
- **`@trpc/*` versions must match SRF's resolved versions exactly.** Version skew makes `inferRouterClient<AppRouter>` collapse sub-routers to `never` (the `TRPCBuiltRouter` internal type shape changes between minor versions). Symptom and fix: see commit `f092f5b`.
- **Push payload schema is VENDORED.** `apps/expo/src/types/alert-payload.ts` is a hand-port of `Gently_SRF/packages/contract/src/alert-payload.ts`. Mobile parses incoming push `data` against it; a parse failure means no BLE dispatch and no log of why. If SRF changes the schema, hand-port the change here in the same session.
- **Push token registration.** Mobile calls `trpc.userPreferences.update.mutate({ pushNotificationToken })` once per authenticated session (compare-and-update for idempotency, resets on sign-out). Wired in `apps/expo/src/app/_layout.tsx`. See commit `64f0c22`.
- **Alert dispatch.** `apps/expo/src/services/alerts/` validates incoming `type: "cgm_alert"` pushes, translates payload → BLE command requests, dispatches sequentially via `BLEContext.sendBLECommand`. Vibration/audio pattern-id → firmware-params mapping lives in `translator.ts`. See commit `7114db6`.

## BLE protocol (relevant context)

- Service UUID `F021`, request char `F023` (write), response char `F024` (notify)
- TEA encryption (64-bit block, 128-bit key)
- Per-session dynamic key derived from device uptime XOR factory key XOR serial number
- Connection flow: scan for "Gently"-advertising devices → parse encrypted advert (serial / battery / firmware) → connect with 3-attempt retry → request MTU (Android) → discover services → derive key → validate → sync clock
- Commands: get/set time, get device info/status, find-me, DFU, reboot, trigger LED pattern, trigger vibration pattern, trigger audio pattern
- Bracelet capabilities: 64 vibration patterns × 4 intensities × 1–60s; 7 LED colors with configurable on/off timing; configurable buzzer beep pattern; battery monitoring with 5-level status; async push notifications from device; Find Me; DFU mode

## Constraints

- **Solo dev, free-tier Apple Developer account.** Apple Sign In and Push Notification entitlements aren't available on personal-team device builds. Some capabilities have to be stripped for personal-team builds. The CGM alarm path uses **Expo Push** (not direct APNs) specifically to sidestep this.
- **Background BLE on iOS is constrained.** This is one of the reasons the CGM alarm engine lives on the cloud, not on the phone. iOS killed-state alert delivery to the bracelet specifically needs native BLE state restoration that isn't wired yet — Android-first per below.
- **Test user:** `extraspecialtestuser@gentlyus.com` / OTP `123456` bypasses BLE entirely with a mock service so Apple App Review can test without hardware.

## Platform priority for CGM v1 work

CGM v1 development is **Android-first**. Dave develops on Android (his daily-driver platform; faster iteration). iOS is the second-platform polish + release pass once Android end-to-end is proven.

When working on CGM-related features in this repo:
- Default test target is **Android** (emulator + a paired Gently bracelet for BLE round-trips).
- Validate the silent-push → BLE write path on Android first.
- iOS-specific work (background BLE timing, personal-team push reliability, BackgroundTasks) is deferred to the iOS pass — not blocking for the Android-first build.
- The architecture (Expo Push, cloud-mediated alarms, mobile alert dispatcher) supports both platforms by design — Android-first is a dev-cycle choice, not an architectural one.

Pre-existing app surfaces (auth, device pairing, BLE protocol) remain platform-balanced as before.

## Platforms / build

- iOS: `com.gentlyus.mobile` (prod), `com.gentlyus.mobile-dev` (dev)
- Android: `com.gentlyus.gently` (prod), `com.gentlyus.gently.dev` (dev)
- App Store Connect ID `6752447097`, EAS project `e881c3b6-0d21-4cc4-8933-176c9d6eb00e`
- EAS profiles: `development` / `preview` / `production`

## Architecture docs

`docs/01` through `docs/05` were authored 2026-05-05 against an earlier 3-repo / 2-backend plan (a separate `Gently_CGM_Cloud` repo, JWT auth seam, `cgm-api.gently.us`, etc.). That plan was abandoned 2026-05-07 in favor of consolidation into `Gently_SRF`. `docs/03`, `04`, `05` carry explicit OBSOLETE banners; `docs/01`/`02` describe Dexcom audience segments and integration shape that's still partially relevant but framed against the abandoned topology. Treat all five as historical reference, not source of truth.

Source of truth for current architecture:
- `~/Projects/Gently_CGM/CLAUDE.md` — parent coordinator (cross-repo product flow, skill cadence, security boundaries)
- `Gently_SRF/CLAUDE.md` — backend specifics (Dexcom Share details, alert preset packs, schema)
- This file — Mobile specifics
