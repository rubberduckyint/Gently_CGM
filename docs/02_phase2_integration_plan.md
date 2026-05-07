# Gently CGM × Dexcom — Phase 2 Integration Plan (v2)

**Date:** 2026-05-05
**Companion to:** `01_dexcom_share_architecture_map.md` and `03_separated_cloud_architecture.md`
**Scope:** How the Dexcom Share path drops into a new, independent CGM Cloud (separate repo, separate CC project) that talks to the existing Gently mobile app.

---

## Audience reminder

Gently CGM serves multiple segments — T1D/T2D/gestational diabetes, pre-diabetics, and metabolic-health/wellness users on Stelo/Lingo/Levels. Architecture is identical for all; only the alert preset pack and onboarding copy differ. See doc #1 for full segment list.

---

## What changed now that we've seen the existing app + the separated-cloud decision

Three updates to fold in:

1. **Bracelet is BLE-only** (Service `F021` over react-native-ble-manager). The phone has to be the BLE bridge. SugarPixel-style device-direct-to-cloud doesn't apply.
2. **CGM Cloud is its own repo + own CC project.** Not in the existing Turborepo. Its own Postgres, hosting, secret store, observability. Tied to Gently Core only by a JWT auth seam (doc #3).
3. **Dexcom Share is real-time (~5 min cadence).** The 1hr/3hr delay applies only to the official Web API v3, not Share.

---

## End-to-end architecture (BLE-bridge variant)

```
[Sensor] ──5 min──▶ [Dexcom Cloud] ◀── poll 60s ── [CGM Cloud: Node + Postgres]
                                                          │
                                                          │  alert engine: thresholds,
                                                          │  rate-of-change, spike,
                                                          │  return-to-baseline,
                                                          │  stale-data, dedupe by WT,
                                                          │  escalation timers
                                                          │
                                                          ▼
                                                     APNs / FCM via Expo
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ Expo app (BG)   │
                                                 │ wakes, decrypts │
                                                 │ payload         │
                                                 └────────┬────────┘
                                                          │
                                                          │ BLE write to F023
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ Gently bracelet │
                                                 │ vibrate / LED / │
                                                 │ buzzer pattern  │
                                                 └─────────────────┘
```

**Cardinal principle:** the *brain* lives on the server, the *hand* is the phone, the *output* is the bracelet. Threshold decisions, dedupe, and escalation timers all happen server-side. The phone is a dumb relay that decrypts a push and writes a BLE command. Only design that survives iOS background BLE constraints + sleeping phones.

### Phone ↔ cloud — two flows

Worth being explicit about how the mobile app talks to the cloud:

- **Alarms (push):** cloud-initiated. Always-on, works regardless of app foreground state. Cloud → Expo Push → silent wake → BLE write to bracelet → ack back to cloud.
- **Live UI (pull):** mobile-initiated. Foreground only. While the dashboard is visible, the app calls `cgmApi.readings.latest.query()` every 30 seconds and re-renders. Same data the cloud's poller already produces — no separate phone-side Dexcom poll, no Dexcom credentials on the phone.

The phone **does not** poll Dexcom Share directly in v1. The cloud holds the credentials; the phone reads from the cloud. Future option: opt-in direct-poll fallback when the cloud is unreachable, storing creds in iOS Keychain. Half-day of work, not v1 scope.

---

## Where each piece lives

| Concern | Location | New / Existing |
|---|---|---|
| Dexcom Share client | `gently-cgm-cloud` repo, `packages/dexcom` | NEW — TS port of `pydexcom` |
| Cloud poller worker | `gently-cgm-cloud`, `apps/worker` | NEW — Node 22 process, 60s loop |
| Alert engine | `gently-cgm-cloud`, `packages/alert-engine` | NEW — pure functions, easy to unit test |
| API (tRPC) | `gently-cgm-cloud`, `apps/api` | NEW — separate from Gently Core's tRPC |
| DB schema | `gently-cgm-cloud`, `packages/db` | NEW — own Postgres instance |
| Web dashboard | `gently-cgm-cloud`, `apps/web` | NEW — separate Next.js, separate domain |
| Auth-seam contract types | `gently-cgm-cloud`, `packages/contract` | NEW — JWT verifier, alert payload Zod schema |
| Push delivery | `gently-cgm-cloud`, `apps/worker` | NEW — Expo Push API |
| Mobile app shell + BLE service | Gently Core repo, `apps/expo` | EXISTING |
| Mobile CGM feature module | Gently Core repo, `apps/expo/src/features/cgm/` | NEW in existing repo |
| Mobile CGM API client | Gently Core repo, `apps/expo/src/services/api/cgm.ts` | NEW in existing repo |

The mobile app is the *only* place code lives in both worlds. Everything else is cleanly separated.

---

## DB schema (Drizzle, in CGM Cloud's own Postgres)

Seven tables. The schema is built around a **CGM source** (one wearer's Dexcom data stream) and a many-to-many **subscription** join with `cgm_user`. This shape supports family-follower fan-out in v1 (one source → many subscribers, each with their own bracelet, push token, and rules) and the mirror v2 case (one user following many sources) without further migration.

User identity is mirrored from Gently Core's Better-Auth (`userId` is a UUID issued by Gently Core; no FK across DBs — just trust the JWT).

```ts
// packages/db/src/schema/index.ts in gently-cgm-cloud

export const cgmUser = pgTable('cgm_user', {
  userId: uuid('user_id').primaryKey(),                  // mirrors Gently Core's user.id
  segment: text('segment', { enum: ['diabetes', 'metabolic_health', 'unspecified'] })
    .notNull().default('unspecified'),
  expoPushToken: text('expo_push_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// One row per CGM data stream — i.e. per Dexcom Share connection / wearer.
// Created when an owner connects their (or someone they care for) Dexcom account.
export const cgmSource = pgTable('cgm_source', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').notNull(),          // who connected the credentials
  displayName: text('display_name').notNull(),           // "My CGM" / "Aiden" / "Mom"
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dexcomCredential = pgTable('dexcom_credential', {
  id: uuid('id').primaryKey().defaultRandom(),
  cgmSourceId: uuid('cgm_source_id').notNull()
    .references(() => cgmSource.id, { onDelete: 'cascade' })
    .unique(),                                            // 1:1 with cgm_source
  region: text('region', { enum: ['us', 'ous', 'jp'] }).notNull().default('us'),
  username: text('username').notNull(),                  // Dexcom Share username
  encryptedPassword: text('encrypted_password').notNull(),// AES-GCM, key in env/KMS
  accountId: uuid('account_id'),                         // cached from Auth endpoint
  sessionId: uuid('session_id'),                         // cached, refreshed on expiry
  sessionRefreshedAt: timestamp('session_refreshed_at'),
  lastPolledAt: timestamp('last_polled_at'),
  lastSuccessAt: timestamp('last_success_at'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Many-to-many: each (user, source) pair has one row.
// Owner = whoever connected the credentials; followers join via invite.
export const cgmSubscription = pgTable('cgm_subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  cgmSourceId: uuid('cgm_source_id').notNull()
    .references(() => cgmSource.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'follower'] }).notNull(),
  acceptedAt: timestamp('accepted_at'),                  // null until follower accepts the invite
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userSourceIdx: uniqueIndex('user_source_idx').on(t.userId, t.cgmSourceId),
  sourceIdx: index('subscription_source_idx').on(t.cgmSourceId),
}));

// Pending invites (short-lived tokens). Resolved into cgm_subscription rows on accept.
export const cgmInvite = pgTable('cgm_invite', {
  id: uuid('id').primaryKey().defaultRandom(),
  cgmSourceId: uuid('cgm_source_id').notNull()
    .references(() => cgmSource.id, { onDelete: 'cascade' }),
  invitedByUserId: uuid('invited_by_user_id').notNull(),
  token: text('token').notNull().unique(),               // cryptographically random
  expiresAt: timestamp('expires_at').notNull(),          // typically 7 days
  consumedAt: timestamp('consumed_at'),                  // set when accepted
  consumedByUserId: uuid('consumed_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const glucoseReading = pgTable('glucose_reading', {
  id: uuid('id').primaryKey().defaultRandom(),
  cgmSourceId: uuid('cgm_source_id').notNull(),          // readings belong to a source, not a user
  value: integer('value').notNull(),                     // mg/dL
  trend: text('trend').notNull(),
  wallTime: timestamp('wall_time').notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (t) => ({
  sourceTimeIdx: uniqueIndex('source_walltime_idx').on(t.cgmSourceId, t.wallTime),
  sourceTimeDescIdx: index('source_walltime_desc_idx').on(t.cgmSourceId, t.wallTime.desc()),
}));

// Rules are per-(subscriber, source). Mom and dad following the same kid each have
// their own rules, their own thresholds, their own bracelet patterns.
export const alertRule = pgTable('alert_rule', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),                     // who gets alerted
  cgmSourceId: uuid('cgm_source_id').notNull(),          // about which source's data
  kind: text('kind', {
    enum: [
      // diabetes pack
      'low', 'high', 'falling_fast', 'rising_fast', 'stale',
      // metabolic-health pack
      'spike_above', 'sustained_above', 'post_meal_unresolved', 'tir_breach',
    ],
  }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  threshold: integer('threshold'),
  durationMin: integer('duration_min'),                  // for sustained / post_meal / tir
  vibrationPatternId: integer('vibration_pattern_id'),
  ledColor: text('led_color'),
  ledOnMs: integer('led_on_ms'),
  ledOffMs: integer('led_off_ms'),
  audioPatternId: integer('audio_pattern_id'),
  durationSec: integer('duration_sec').notNull().default(10),
  repeatAfterMin: integer('repeat_after_min'),
  escalateAfterMin: integer('escalate_after_min'),
}, (t) => ({
  userSourceIdx: index('rule_user_source_idx').on(t.userId, t.cgmSourceId),
}));

export const alertEvent = pgTable('alert_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  cgmSourceId: uuid('cgm_source_id').notNull(),
  ruleId: uuid('rule_id').notNull(),
  glucoseReadingId: uuid('glucose_reading_id'),
  firedAt: timestamp('fired_at').defaultNow().notNull(),
  pushedAt: timestamp('pushed_at'),
  acknowledgedAt: timestamp('acknowledged_at'),
  escalatedAt: timestamp('escalated_at'),
}, (t) => ({
  unackedIdx: index('unacked_events_idx')
    .on(t.firedAt)
    .where(sql`acknowledged_at IS NULL`),
}));
```

Encryption: AES-256-GCM at write, key in env (`DEXCOM_CRED_KEY`). Add a `keyVersion` column when migrating to KMS.

---

## The poller worker

Single Node 22 process running as a Railway service. Loop:

```ts
// apps/worker/src/poll.ts (sketch)
import cron from 'node-cron';
import { db } from '@cgm/db';
import { fetchLatest } from '@cgm/dexcom';
import { evaluateRules } from '@cgm/alert-engine';

cron.schedule('* * * * *', async () => {     // every 60s, one tick per cgm_source
  const creds = await db.query.dexcomCredential.findMany({ where: eq(active, true) });

  await Promise.all(creds.map(async (c) => {
    try {
      const reading = await fetchLatest(c);                       // c.cgmSourceId now
      if (!reading) return;

      // 1. Insert keyed on the source. Once per source per WT.
      const inserted = await db.insert(glucoseReading)
        .values({ cgmSourceId: c.cgmSourceId, value: reading.value, trend: reading.trend, wallTime: reading.wallTime })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) return;                          // duplicate

      // 2. Fan out to every active subscriber of this source.
      const subs = await db.query.cgmSubscription.findMany({
        where: and(eq(cgmSubscription.cgmSourceId, c.cgmSourceId), eq(cgmSubscription.active, true)),
      });

      const recent = await db.query.glucoseReading.findMany({
        where: eq(glucoseReading.cgmSourceId, c.cgmSourceId),
        orderBy: desc(glucoseReading.wallTime),
        limit: 24,
      });

      // 3. Each subscriber has their own rules — evaluate per subscriber.
      for (const sub of subs) {
        const rules = await db.query.alertRule.findMany({
          where: and(
            eq(alertRule.userId, sub.userId),
            eq(alertRule.cgmSourceId, c.cgmSourceId),
            eq(alertRule.enabled, true),
          ),
        });
        const fires = evaluateRules(rules, reading, recent);
        for (const fire of fires) {
          await dispatchAlert(sub.userId, c.cgmSourceId, fire, inserted[0].id);
        }
      }
    } catch (e) {
      await markFailure(c.id, e);
    }
  }));
});
```

At single-digit thousands of users, one Postgres + one worker is fine. Beyond that, swap `node-cron` for `pg-boss` or `Inngest` for retries, durable scheduling, observability. Don't pre-optimize.

---

## Push transport: Expo's push service

Use **Expo Push Notifications** (`expo-server-sdk` on the worker, `expo-notifications` on device).

- Free, unified API for both APNs and FCM.
- **Solves the personal-team Apple constraint:** Expo's relay handles APNs server-side; you don't need APNs auth keys on a personal Apple Dev account.
- Notification = high-priority data payload (`content-available: 1` on iOS) so the app wakes silently, plus a fallback alert UI if BLE delivery fails.

Mobile handler in the existing Expo app:

```ts
// apps/expo/src/features/cgm/notifications.ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: false, shouldPlaySound: false }),
});

Notifications.addNotificationReceivedListener(async (n) => {
  const payload = n.request.content.data as AlertPayload;
  if (payload.type === 'cgm_alert') {
    await BLEContext.dispatchAlert(payload);                 // existing BLE builders
    await cgmApi.alert.acknowledgeDelivered.mutate({ id: payload.id });
  }
});
```

The mobile side already has the BLE command builders; the CGM module just wires `dispatchAlert` to them.

---

## Alert preset packs

### Diabetes management pack

| Rule | Default | LED | Vibration | Audio | Duration |
|---|---|---|---|---|---|
| Low | < 70 mg/dL | Red | Pattern 12, max | Pattern A | 30s, repeat every 2 min |
| High | > 250 mg/dL | Yellow | Pattern 5, mid | none | 15s, repeat every 5 min |
| Falling fast | > 3 mg/dL/min | Magenta | Pattern 8, high | none | 10s, repeat 1× after 1 min |
| Stale data | > 20 min | Cyan | Pattern 3, low | none | 5s |

### Metabolic-health pack

| Rule | Default | LED | Vibration | Audio | Duration |
|---|---|---|---|---|---|
| Spike above | > 140 mg/dL | Yellow | Pattern 4, low | none | 5s, no repeat |
| Sustained above | > 120 for 90 min | Yellow | Pattern 6, low | none | 8s, repeat 1× after 30 min |
| Post-meal unresolved | not back to ≤ 110 within 120 min | Magenta | Pattern 7, mid | none | 8s, no repeat |
| Time-in-range breach | < 70% TIR over rolling 24 hr | Cyan | Pattern 2, low | none | 5s, daily summary |
| Low (safety) | < 70 mg/dL | Red | Pattern 12, max | Pattern A | 30s, repeat every 2 min |

The "Low" rule appears in both packs — it's a baseline safety alert regardless of segment.

### UX

Onboarding asks: *"How will you primarily use Gently CGM?"* with two cards (Diabetes management / Metabolic health) and an "Other / let me customize" option. Selection sets the segment + applies the pack defaults. Each rule remains fully customizable (LED color, on/off ms, vibration pattern + intensity + duration, audio pattern + duration, repeat config) from the rules screen.

---

## Answers to the original nine open questions

### 1. Data source(s)
**v1: Dexcom Share** (covers G6, G7, Stelo).
**v1.1 priority: Abbott Libre via LibreLinkUp.** Bumped from afterthought to high priority because Libre dominates the wellness/metabolic-health segments — Stelo and Lingo both run on Libre-style sensors, and skipping Libre would lose roughly half of the non-diabetic audience.
**v1.1 also: Nightscout URL** as an additional input — de-facto standard in the T1D community, cheap to add, earns trust.
**Future: Dexcom Real-Time Partner API**, slotted in as a swap behind the same alert engine when partnership lands.
Apple Health is not a real fallback for live alerts (batch-synced and laggy); treat it as a "view your history" feature in the web dashboard, not a data source for alerts.

### 2. Where does threshold logic run?
**Server-side (CGM Cloud), full stop.** iOS will kill a backgrounded Expo app within ~30 sec; you cannot rely on phone-side polling for a 3 a.m. low alert. Server-side state machines make escalation and dedupe trivial. The phone is a transport, not a decision-maker.

### 3. Alert mapping UX
Two preset packs (above) selectable in onboarding, plus full customization. Web dashboard mirrors the same UI.

### 4. Repeat / escalation
Server-side timer per `alertEvent`:

```
fire → push → wait acknowledgedAt
  ├── ack within X min → done
  └── no ack
       └── after repeatAfterMin → re-fire (same payload)
            └── after escalateAfterMin → escalate (max intensity + buzzer)
                 └── (optional v1.5) after Y min → SMS to emergency contact via Twilio
```

### 5. Acknowledgement
The bracelet has no input. Ack via:
1. **Tap the push notification** (iOS / Android action button) → `alert.acknowledge` mutation on CGM Cloud.
2. **Open the app** → "I'm OK" button on the alert screen.
3. **(Future)** Accelerometer-based tap detection on the bracelet firmware — separate firmware project, right long-term design.

For v1, ship #1 and #2.

### 6. Offline behavior
- **Phone offline (sensor → phone → Dexcom cloud broken):** the cloud poller stops getting fresh readings → the **stale-data alert** fires. Frame in onboarding: "Gently CGM can only see your glucose when your phone has internet."
- **Phone online but our cloud unreachable:** Expo push queues; delivers on reconnect. Mobile app shows a "last seen" timestamp on the dashboard so the user can spot a broken chain.

### 7. Auth with Dexcom
Share doesn't use OAuth, so:
- Onboarding has a fork: *"Are you connecting your own CGM, or following someone who invited you?"*
  - **Connecting own CGM:** "Sign in to Dexcom Share" with username + password + display name ("My CGM" / "Aiden" / "Mom") → CGM Cloud creates a `cgm_source`, attempts `AuthenticatePublisherAccount` + `LoginPublisherAccountById`, stores creds (encrypted) keyed on the source, creates a `cgm_subscription` with role=`owner`.
  - **Following an invite:** paste invite token (or open invite link) → consumes `cgm_invite`, creates `cgm_subscription` with role=`follower`, no Dexcom credentials needed.
- "Disconnect Dexcom" in settings → deletes the credential and source (cascades to subscriptions, readings, rules, events). Followers of that source get notified that the source went away.

Better-Auth handles the *Gently* user (in Gently Core); CGM Cloud only stores Dexcom Share credentials when a source is being connected.

### 7a. Family-follower fan-out (v1)

One CGM source can have many subscribers. Each subscriber has their own bracelet, push token, and per-source alert rules.

- **Inviting a follower:** owner generates an invite from their dashboard → CGM Cloud writes a `cgm_invite` row with a random token + 7-day expiry → owner shares the invite link or short code with the follower (out-of-band: text, email, AirDrop). No email/SMS infrastructure needed in v1.
- **Accepting:** follower opens the invite in the Gently app, signs into their Gently account, taps Accept → `cgm_invite` consumed, `cgm_subscription` row written with role=`follower`, `acceptedAt = now`.
- **Per-subscriber rules:** the follower picks a preset pack (diabetes / metabolic-health) and customizes; rules are scoped to (`userId`, `cgmSourceId`).
- **Revocation:** owner sees a "Manage followers" screen and can flip `cgm_subscription.active = false` to stop alerts for a follower. Cascade-delete on the source removes them entirely.
- **Caregiver-only users:** a Gently user can have zero owned sources but multiple follower subscriptions. Onboarding handles this — they never need to connect a Dexcom account themselves.
- **Multi-source per user (v2):** same schema supports it. v1 mobile UI scopes everything to one active source the user is viewing; v2 adds a source-picker.

### 8. Latency budget

| Hop | Time |
|---|---|
| Sensor → Dexcom cloud (5-min cadence) | up to 5 min |
| Dexcom cloud → our poll (60s cadence) | up to 60s |
| Alert engine + Expo push dispatch | < 1s |
| Push transit | 1–10s |
| Phone wake + BLE command | < 1s |
| **Worst case from threshold cross to bracelet buzz** | **~6–7 min** |

Consistent with Dexcom Follow's own latency. Acceptable as a *secondary* alert; **not** a primary alarm — that needs Real-Time Partner API + FDA framing.

### 9. Liability / regulatory
Frame carefully:

- Always "alert accessory" / "secondary informational alert." Never "replaces Dexcom alarms."
- Onboarding screen: "Gently CGM shows you Dexcom data with a short delay. Keep your Dexcom alarms enabled."
- TOS: not a medical device, no diagnosis, no treatment recommendations.
- File for Dexcom Strategic Partnership in parallel — denial is informative, acceptance unlocks Real-Time API later.
- Don't reference FDA clearance unless/until Dexcom partner status comes through.
- Regulatory exposure concentrates on the diabetes segment; the wellness segment carries lower stakes — but conservative copy applies to all users for safety.

---

## Phase 2 build order

Each step shippable; total ~4–5 weeks of focused solo dev with v1 family-follower fan-out included.

1. **POC (1 day):** TS port of pydexcom in `packages/dexcom`. CLI prints latest reading from your test account.
2. **Auth seam (1–2 days):** `apps/api` `whoami` endpoint, Better-Auth scoped JWT mint on Gently Core, JWKS verify on CGM Cloud. (Doc #3.)
3. **Schema migrations (1 day):** seven tables above (`cgm_user`, `cgm_source`, `dexcom_credential`, `cgm_subscription`, `cgm_invite`, `glucose_reading`, `alert_rule`, `alert_event`). Cred encryption helper. Worker skeleton.
4. **Owner onboarding + Dexcom connect (2 days):** `dexcom.connect` (creates source + credential + owner subscription in one transaction), `dexcom.disconnect`, `dexcom.status`, `cgm.setSegment`. Mobile + web screens.
5. **Worker fan-out + alert engine (3 days):** pure functions in `packages/alert-engine`, unit-tested. Worker iterates by source, fans out per subscriber. Unit tests use fixture readings (CSV from your test account, both diabetes and metabolic-health traces).
6. **Expo push wiring (1 day):** worker dispatches push per subscriber, mobile handler decodes payload and calls existing BLE command builders.
7. **Invitation flow (3 days):** `invites.create` / `invites.accept` / `invites.revoke` tRPC routes. Owner UI for "Manage followers" (web + mobile). Follower UI for "Accept invite" + the onboarding fork ("connect own CGM" vs "follow an invite").
8. **Rules UI (3–4 days):** preset cards (both packs) + custom mapper, scoped per (subscriber, source). Web dashboard parity (read-only history is enough for v1).
9. **Escalation + ack (2 days):** server-side timers, push action buttons, acknowledge route. Acks are per-subscriber — one parent acking does not ack for the other.
10. **Stale-data + offline UX (1–2 days):** stale-data alert, "last seen" indicator, copy.
11. **Disclaimer / TOS / onboarding copy (1 day):** real legalese; consider a paid hour with a regulatory lawyer for Class II accessory framing. Caregiver-mode copy ("you're following X's CGM") needs its own pass.
12. **(Parallel)** File the Dexcom Strategic Partnership Interest Questionnaire.

---

## Risks specific to this stack

> Platform note: v1 development is **Android-first**. iOS is the second-platform release pass once Android end-to-end is proven. Most of the iOS-specific items below are concerns to revisit during the iOS pass, not blockers for the Android-first build.

- **Android (primary v1 platform):**
  - **BLE permissions on Android 12+** (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`) require runtime permission requests. Existing app handles this; verify the CGM module path doesn't bypass it.
  - **Doze mode + battery optimization:** silent FCM data pushes are high-priority and wake the app reliably from Doze, so the cloud-mediated alarm path works without a Foreground Service. If we ever want offline-resilient phone-side polling (v2), a Foreground Service becomes necessary.
  - **Android push reliability is more predictable than iOS** — fewer surprises. Validate the BLE write happens within the FCM wake window; should be plenty of time.
- **iOS (deferred — second-platform release pass):**
  - **Personal-team Apple builds:** Expo push relay sidesteps direct APNs entitlement gate. Validate silent push wakes the app on a personal-team build during the iOS pass. If unreliable, budget for a paid developer account at that point.
  - **Background BLE on iOS:** even with Expo push waking the app, you have a few seconds of CPU before iOS suspends again. Keep the handler hot path tight — no network calls between push receipt and BLE write. Send the alarm command first, ack the server second.
- **Solo-dev ops burden:** the worker process is one more thing to keep alive. Use Railway (existing team experience). Add a dead-simple healthcheck that fails when `lastSuccessAt` for any active credential is > 5 min stale across the fleet.
- **TEA-encrypted BLE:** existing protocol handles encryption between phone and bracelet. Don't redesign.
- **Two-cloud coordination:** users won't notice if both backends are healthy; they'll notice immediately if either is down. Status page that pings both is worth the half-day.

---

## Resolved decisions (was: open questions)

- ✅ **Region:** US-first. OUS later if/when demand warrants.
- ✅ **Family followers:** **In v1.** One CGM source → many subscribers, each with their own bracelet, push token, and rules. Schema also supports v2 (one user → many sources) without further migration; v2 just exposes it in the UI.
- ✅ **Hosting target:** Railway. Full reasoning in `05_stack_decisions.md`.
- ✅ **Credential encryption key management:** env var (`DEXCOM_CRED_KEY`) for v1. KMS migration before any meaningful user count.
- ⏳ **Apple paid dev account:** confirm or budget. Personal-team works for development; paid required for App Store distribution.
- ⏳ **CGM Cloud branding:** user-visible as part of "Gently" (one brand) per `03_separated_cloud_architecture.md`; backend services named for engineering clarity.
