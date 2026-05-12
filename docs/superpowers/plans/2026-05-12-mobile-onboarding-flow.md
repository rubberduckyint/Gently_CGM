# Mobile onboarding flow + IA simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land sub-project D of the v1 alert-config design — a focused three-step onboarding (sign up → bracelet pair → Dexcom connect with hero CTA), a feature-flag module gating multi-device UI off in v1, and a hamburger menu that exposes a single "Dexcom Source" entry to the v1 user.

**Architecture:** A single source-of-truth feature-flag module (`feature-flags.ts`) drives every multi-device gate in the app. A new `(onboarding)` route group hosts the post-sign-in flow that runs until the user has both a paired bracelet and a connected Dexcom source. The root entry route now routes new users into onboarding and returning users to the dashboard.

**Tech Stack:** Expo SDK 55, Expo Router, React Native, NativeWind, React Query for tRPC state.

**Spec reference:** `../specs/2026-05-12-alert-config-and-onboarding-design.md` (this repo).

**Parallel work:** This plan is independent of `Gently_SRF/docs/superpowers/plans/2026-05-12-srf-alert-config-foundation.md` (Plan 1). Both can land independently. Plan 3 (Mobile alert-config UI) depends on Plan 1's deploy and will be written separately.

---

## File map

**New files:**
- `apps/expo/src/config/feature-flags.ts` — single source of truth for v1 gating
- `apps/expo/src/config/feature-flags.test.ts`
- `apps/expo/src/app/(onboarding)/_layout.tsx` — route group with a stacked navigator
- `apps/expo/src/app/(onboarding)/pair-bracelet.tsx` — wraps the existing pairing flow with onboarding chrome (next/skip suppressed in v1)
- `apps/expo/src/app/(onboarding)/connect-dexcom.tsx` — hero CTA screen
- `apps/expo/src/app/(onboarding)/index.tsx` — onboarding entry; routes to `pair-bracelet` or `connect-dexcom` based on what's missing

**Modified files:**
- `apps/expo/src/app/index.tsx` — after successful sign-in, route to `(onboarding)` if either the bracelet OR the Dexcom source is missing; otherwise to `dashboard`
- `apps/expo/src/app/dashboard.tsx` — same gating on mount (defends against direct navigation)
- `apps/expo/src/components/ui/HamburgerMenu.tsx` — items adapt to `MULTI_DEVICE_ENABLED`; "Dexcom Source" (singular) entry routes to the source's edit screen
- `apps/expo/src/app/cgm/index.tsx` — only render the multi-source list when `MULTI_DEVICE_ENABLED`; otherwise redirect to the user's single source's edit screen
- Anywhere else with "Sources" plural copy, "Add another," or follower-pattern UI — guarded by the flag

---

## Task 1: Create feature-flag module

**Files:**
- Create: `apps/expo/src/config/feature-flags.ts`
- Create: `apps/expo/src/config/feature-flags.test.ts`

- [ ] **Step 1: Write failing test**

In `apps/expo/src/config/feature-flags.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FEATURE_FLAGS } from "./feature-flags";

describe("FEATURE_FLAGS", () => {
  it("disables multi-device for v1", () => {
    expect(FEATURE_FLAGS.MULTI_DEVICE_ENABLED).toBe(false);
  });
  it("is a frozen const object (no runtime mutation)", () => {
    expect(Object.isFrozen(FEATURE_FLAGS)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
pnpm -F @gently/expo test -- feature-flags
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

In `apps/expo/src/config/feature-flags.ts`:

```ts
export const FEATURE_FLAGS = Object.freeze({
  MULTI_DEVICE_ENABLED: false,
} as const);

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
```

- [ ] **Step 4: Run tests**

```bash
pnpm -F @gently/expo test -- feature-flags
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/config/feature-flags.ts apps/expo/src/config/feature-flags.test.ts
git commit -m "$(cat <<'EOF'
Add feature-flag module for v1 single-device gating

MULTI_DEVICE_ENABLED is the single source of truth for hiding multi-source
nav and "Add another device" affordances in v1. Frozen object — no runtime
mutation. Flipping it back on later re-enables multi-source UI without
rewiring.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add onboarding-gate helper

**Files:**
- Create: `apps/expo/src/utils/onboarding-gate.ts`
- Create: `apps/expo/src/utils/onboarding-gate.test.ts`

This helper inspects the user's BLE-paired state and tRPC `cgmSource.list` to determine which onboarding step is incomplete. Returns the route the user should be sent to.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { nextOnboardingRoute } from "./onboarding-gate";

describe("nextOnboardingRoute", () => {
  it("returns pair-bracelet when no bracelet is paired", () => {
    expect(nextOnboardingRoute({ hasBracelet: false, sources: [] }))
      .toBe("/(onboarding)/pair-bracelet");
  });

  it("returns connect-dexcom when bracelet paired but no source", () => {
    expect(nextOnboardingRoute({ hasBracelet: true, sources: [] }))
      .toBe("/(onboarding)/connect-dexcom");
  });

  it("returns null when both bracelet paired and at least one source", () => {
    expect(nextOnboardingRoute({
      hasBracelet: true,
      sources: [{ id: "s1", displayName: "x", active: true }],
    })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
pnpm -F @gently/expo test -- onboarding-gate
```

Expected: FAIL.

- [ ] **Step 3: Implement**

In `apps/expo/src/utils/onboarding-gate.ts`:

```ts
export interface OnboardingState {
  hasBracelet: boolean;
  sources: { id: string; displayName: string; active: boolean }[];
}

export function nextOnboardingRoute(state: OnboardingState): string | null {
  if (!state.hasBracelet) return "/(onboarding)/pair-bracelet";
  if (state.sources.length === 0) return "/(onboarding)/connect-dexcom";
  return null;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm -F @gently/expo test -- onboarding-gate
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/utils/onboarding-gate.ts apps/expo/src/utils/onboarding-gate.test.ts
git commit -m "$(cat <<'EOF'
Add onboarding-gate helper

Returns the route the user should be sent to during v1 onboarding based on
whether a bracelet is paired and at least one Dexcom source exists. Returns
null when onboarding is complete (route to dashboard).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Build `(onboarding)` route group with layout

**Files:**
- Create: `apps/expo/src/app/(onboarding)/_layout.tsx`
- Create: `apps/expo/src/app/(onboarding)/index.tsx`

- [ ] **Step 1: Create the layout**

In `apps/expo/src/app/(onboarding)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,  // user must complete the flow
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="pair-bracelet" />
      <Stack.Screen name="connect-dexcom" />
    </Stack>
  );
}
```

- [ ] **Step 2: Create the onboarding entry**

In `apps/expo/src/app/(onboarding)/index.tsx`:

```tsx
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, router } from "expo-router";

import { trpc } from "~/utils/api";
import { useBLEContext } from "~/contexts/BLEContext";
import { nextOnboardingRoute } from "~/utils/onboarding-gate";

export default function OnboardingEntry() {
  const { isPaired } = useBLEContext();  // adjust per actual BLE context API
  const { data: sources, isLoading } = trpc.dexcom.list.useQuery();

  useEffect(() => {
    if (isLoading) return;
    const next = nextOnboardingRoute({
      hasBracelet: isPaired,
      sources: sources ?? [],
    });
    if (next) router.replace(next);
    else router.replace("/dashboard");
  }, [isPaired, sources, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
```

If `useBLEContext` does not expose `isPaired`, adapt to whatever the existing context surface is — the BLE context already tracks pairing state for the existing add-device flow.

- [ ] **Step 3: Verify Expo Router picks up the route group**

```bash
pnpm -F @gently/expo dev:android -- --clear
```

Expected: app builds, you can navigate to `/(onboarding)` manually for inspection.

- [ ] **Step 4: Commit**

```bash
git add "apps/expo/src/app/(onboarding)/"
git commit -m "$(cat <<'EOF'
Add (onboarding) route group with entry router

Onboarding layout disables gestures (user must complete the flow) and
hides headers. Entry route reads BLE pairing state and dexcom source list,
delegates to onboarding-gate helper to pick the next step.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Build the `pair-bracelet` onboarding screen

**Files:**
- Create: `apps/expo/src/app/(onboarding)/pair-bracelet.tsx`

This screen wraps or routes through the existing pairing flow at `apps/expo/src/app/add-device/index.tsx`. Approach: render the existing pairing UI inside the onboarding screen (preferred — avoids duplication) OR redirect to it and hook the success callback to advance onboarding.

Choose whichever is cleaner given the existing pairing component's shape. If the existing flow lives entirely in `add-device/index.tsx` as a screen (not a reusable component), the pragmatic move is to extract the inner pairing UI into a component, then render it both from `add-device/index.tsx` (unchanged behavior) and `(onboarding)/pair-bracelet.tsx` (new onboarding chrome).

- [ ] **Step 1: Inspect the existing flow**

Read `apps/expo/src/app/add-device/index.tsx`. Identify the pairing UI's pure-component layer vs. the screen-level navigation glue.

- [ ] **Step 2: Extract pairing UI into a reusable component (if needed)**

If the UI is currently inline in the screen, extract to `apps/expo/src/components/onboarding/PairBraceletPanel.tsx` (or a similar path). The component should:
- Take a callback prop `onPairingComplete: () => void`
- Not assume any specific surrounding navigation chrome

Update `add-device/index.tsx` to render this component with `onPairingComplete = () => router.replace("/dashboard")` (or whatever it does today).

- [ ] **Step 3: Build the onboarding wrapper**

In `apps/expo/src/app/(onboarding)/pair-bracelet.tsx`:

```tsx
import { View } from "react-native";
import { router } from "expo-router";

import { PairBraceletPanel } from "~/components/onboarding/PairBraceletPanel";
import { trpc } from "~/utils/api";

export default function PairBraceletScreen() {
  const utils = trpc.useUtils();

  return (
    <View style={{ flex: 1 }}>
      <PairBraceletPanel
        onPairingComplete={async () => {
          // After pairing, refetch the source list to determine whether
          // we should go to dexcom-connect or dashboard.
          await utils.dexcom.list.refetch();
          router.replace("/(onboarding)/connect-dexcom");
        }}
      />
    </View>
  );
}
```

- [ ] **Step 4: Test the flow manually**

Run the app on the emulator, force the user into onboarding (clear app state), confirm pairing screen renders and that completing pairing navigates to the Dexcom connect screen.

- [ ] **Step 5: Commit**

```bash
git add "apps/expo/src/app/(onboarding)/pair-bracelet.tsx" apps/expo/src/components/onboarding/ apps/expo/src/app/add-device/index.tsx
git commit -m "$(cat <<'EOF'
Add onboarding pair-bracelet screen

Wraps the existing pairing flow as a reusable PairBraceletPanel component
and renders it inside the (onboarding) route group with an
onPairingComplete handler that advances to connect-dexcom. The add-device
screen continues to use the same component with its existing post-pair
behavior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Build the `connect-dexcom` hero screen

**Files:**
- Create: `apps/expo/src/app/(onboarding)/connect-dexcom.tsx`

A single large centered call-to-action that taps through to the existing `cgm/add.tsx` form.

- [ ] **Step 1: Implement**

```tsx
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { buttons, buttonText, colors, containers } from "~/styles";  // adjust import

export default function ConnectDexcomHeroScreen() {
  return (
    <SafeAreaView style={containers.screen}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          One more step
        </Text>
        <Text
          style={{
            fontSize: 16,
            textAlign: "center",
            marginBottom: 48,
            color: colors.muted,
          }}
        >
          Connect your Dexcom Share account so Gently can keep watch for you.
        </Text>
        <Pressable
          style={[buttons.primary, { width: "100%", paddingVertical: 16 }]}
          onPress={() => router.push("/cgm/add")}
        >
          <Text style={[buttonText.primary, { fontSize: 18 }]}>
            Connect Dexcom Share
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

Style imports may need adapting to match the existing design system; the structure (hero CTA, centered, no skip) is the load-bearing part.

- [ ] **Step 2: Confirm `cgm/add.tsx` advances to dashboard after success**

The existing `cgm/add.tsx` (after Plan 1 lands, with seeding) should `router.replace("/dashboard")` on successful source creation. If it currently navigates somewhere else, adjust.

- [ ] **Step 3: Manual smoke test**

Force the user into onboarding, complete pairing, land on Connect Dexcom screen. Tap the CTA, complete the Dexcom form, confirm the user lands on `/dashboard` afterward.

- [ ] **Step 4: Commit**

```bash
git add "apps/expo/src/app/(onboarding)/connect-dexcom.tsx" apps/expo/src/app/cgm/add.tsx
git commit -m "$(cat <<'EOF'
Add onboarding connect-dexcom hero screen

Centered, full-screen hero CTA that taps through to the existing
cgm/add form. No skip affordance in v1. After successful source
creation, user lands on /dashboard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Route new users into onboarding from sign-in

**Files:**
- Modify: `apps/expo/src/app/index.tsx` (sign-in screen — post-sign-in navigation)
- Modify: `apps/expo/src/app/dashboard.tsx` (defensive redirect for direct navigation)

After Better-Auth sign-in succeeds, instead of going straight to `/dashboard`, route through `/(onboarding)`. Onboarding's entry screen detects whether to send the user further into the flow or straight to dashboard.

- [ ] **Step 1: Update `index.tsx` post-sign-in handler**

Find the success branch (after `trackLoginSuccess` or wherever sign-in concludes). Change the navigation:

```ts
// before
router.replace("/dashboard");

// after
router.replace("/(onboarding)");
```

Onboarding will redirect to dashboard if both prerequisites are met.

- [ ] **Step 2: Add defensive gate on `dashboard.tsx`**

```tsx
// near the top of the dashboard component, alongside other state:
const { isPaired } = useBLEContext();
const { data: sources, isLoading } = trpc.dexcom.list.useQuery();

useEffect(() => {
  if (isLoading) return;
  const next = nextOnboardingRoute({
    hasBracelet: isPaired,
    sources: sources ?? [],
  });
  if (next) router.replace(next);
}, [isPaired, sources, isLoading]);
```

This handles direct navigation, deep links, and edge cases where a user signs out and back in.

- [ ] **Step 3: Manual smoke test the flow**

Clear app data on the emulator, sign in as the test user, confirm:
- Lands on (onboarding) entry
- If bracelet not paired (test user mock auto-pairs), routes to pair-bracelet
- After pairing, routes to connect-dexcom
- After Dexcom source creation, lands on dashboard
- Signing out and back in skips onboarding if both prerequisites still exist

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/app/index.tsx apps/expo/src/app/dashboard.tsx
git commit -m "$(cat <<'EOF'
Route new users into (onboarding) after sign-in

Post-sign-in navigation goes to onboarding entry, which forwards based on
whether the user is missing a bracelet or a Dexcom source. Returning users
with both fall through to /dashboard. Dashboard adds a defensive gate so
direct-nav / deep-link entry routes back through onboarding if state is
incomplete.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update `HamburgerMenu` for single-device v1

**Files:**
- Modify: `apps/expo/src/components/ui/HamburgerMenu.tsx`
- The screen(s) that pass items into HamburgerMenu — likely `dashboard.tsx`, `cgm/index.tsx`, possibly others.

Hamburger items should adapt to `MULTI_DEVICE_ENABLED`:

- When `false` (v1): "Dexcom Source" (singular). Tap routes to the source's edit screen — for v1, this is the user's single source. Resolve the sourceId from `trpc.dexcom.list` (take the first row).
- When `true` (later): "Dexcom Sources" (plural). Tap routes to the source list (`/cgm`).

- [ ] **Step 1: Identify where items are built**

```bash
grep -rn "Dexcom Sources\|Sources\|cgm/" apps/expo/src --include="*.tsx" | head
```

Find every place a hamburger / drawer item references the multi-source list.

- [ ] **Step 2: Build a v1-aware items factory**

In `apps/expo/src/components/ui/hamburger-items.ts` (new file):

```ts
import { router } from "expo-router";

import { FEATURE_FLAGS } from "~/config/feature-flags";

export interface HamburgerItem {
  label: string;
  onPress: () => void;
}

export function buildHamburgerItems(opts: {
  primarySourceId: string | undefined;
}): HamburgerItem[] {
  const items: HamburgerItem[] = [];

  if (FEATURE_FLAGS.MULTI_DEVICE_ENABLED) {
    items.push({
      label: "Dexcom Sources",
      onPress: () => router.push("/cgm"),
    });
  } else if (opts.primarySourceId) {
    items.push({
      label: "Dexcom Source",
      onPress: () => router.push(`/cgm/${opts.primarySourceId}/edit`),
    });
  }

  // Other static items (Settings, Help, Sign out, etc.) appended here as
  // already-existing references in the codebase.
  return items;
}
```

The `/cgm/[sourceId]/edit` route is built in Plan 3. Until Plan 3 lands, this route will 404 — that's acceptable since v1 ships the two plans together.

- [ ] **Step 3: Use the factory from consuming screens**

At every `HamburgerMenu` consumer:

```tsx
const { data: sources } = trpc.dexcom.list.useQuery();
const primarySourceId = sources?.[0]?.id;
const items = buildHamburgerItems({ primarySourceId });

<HamburgerMenu options={items} />
```

- [ ] **Step 4: Test manually**

Confirm the hamburger shows "Dexcom Source" (singular) and tap routes to the edit screen (404 expected until Plan 3 lands).

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/components/ui/hamburger-items.ts apps/expo/src/components/ui/HamburgerMenu.tsx apps/expo/src/app/
git commit -m "$(cat <<'EOF'
Adapt HamburgerMenu items for single-device v1

When MULTI_DEVICE_ENABLED is false, show "Dexcom Source" (singular) that
routes directly to the user's single source's edit screen. When true,
revert to "Dexcom Sources" (plural) listing all sources. Item factory
lives in hamburger-items.ts as the single decision point.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Gate the `cgm/` list route behind the feature flag

**Files:**
- Modify: `apps/expo/src/app/cgm/index.tsx`

For v1, `/cgm` should not show the multi-source list; if a user lands there (deep link, etc.), redirect to the single source's edit screen.

- [ ] **Step 1: Update `cgm/index.tsx`**

At the top of the component:

```tsx
import { Redirect } from "expo-router";

import { FEATURE_FLAGS } from "~/config/feature-flags";
import { trpc } from "~/utils/api";

// inside the component
const { data: sources, isLoading } = trpc.dexcom.list.useQuery();

if (!FEATURE_FLAGS.MULTI_DEVICE_ENABLED) {
  if (isLoading) return <Loading />;
  const first = sources?.[0];
  if (first) return <Redirect href={`/cgm/${first.id}/edit`} />;
  return <Redirect href="/(onboarding)/connect-dexcom" />;
}

// Existing multi-source list rendering below — unchanged.
```

- [ ] **Step 2: Manual smoke test**

Navigate to `/cgm` directly (via deep link or a test button). Confirm v1 user is redirected to either the edit screen or back into onboarding.

- [ ] **Step 3: Commit**

```bash
git add apps/expo/src/app/cgm/index.tsx
git commit -m "$(cat <<'EOF'
Redirect /cgm list to single-source edit in v1

When MULTI_DEVICE_ENABLED is false, deep links to /cgm forward to the
user's only source's edit screen. If they somehow have no source yet,
forward back into the onboarding connect-dexcom step. Multi-source list
remains intact behind the flag for later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Scrub the codebase for "Sources" plural copy and "Add another" affordances

This is a sweep task — search-and-fix for any remaining v1-incongruous UI text or buttons.

- [ ] **Step 1: Grep**

```bash
grep -rn "Dexcom Sources\|My Sources\|Add another\|Add a Dexcom\|Manage sources" apps/expo/src --include="*.tsx" --include="*.ts" | grep -v node_modules
```

- [ ] **Step 2: Fix each hit**

For each match:
- If it's a screen behind `MULTI_DEVICE_ENABLED` gate (e.g., the kept-for-later list view), leave it.
- If it's user-facing v1 copy, change to the singular equivalent or remove the affordance.
- Anything implying multiple sources, follower flows, or device management beyond the singular pair: hide via the flag (don't delete).

- [ ] **Step 3: Manual UI walk-through**

Open the app on the emulator, navigate every visible screen, confirm no "Sources" plural appears outside flagged surfaces.

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/
git commit -m "$(cat <<'EOF'
Sweep v1 copy and affordances for single-device IA

Sources plural -> Source singular in user-facing copy. Add-another and
manage-sources affordances hidden via MULTI_DEVICE_ENABLED feature flag.
Code paths intact, only UI exposure changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: End-to-end verification

- [ ] **Step 1: Typecheck**

```bash
pnpm -F @gently/expo typecheck
```

Expected: PASS, except for the three pre-existing `defaultPushNotification` / `defaultEmailNotification` typecheck errors documented in coordinator memory. Do not address them in this plan.

- [ ] **Step 2: Lint**

```bash
pnpm -F @gently/expo lint
```

Expected: PASS.

- [ ] **Step 3: Tests**

```bash
pnpm -F @gently/expo test
```

Expected: PASS.

- [ ] **Step 4: Smoke test on emulator**

Walk a fresh user through the entire flow:
1. Clear app data
2. Sign in as test user (test mode + mock BLE)
3. Onboarding entry → pair-bracelet → connect-dexcom hero
4. Tap CTA → cgm/add → submit Dexcom creds
5. Land on dashboard
6. Open hamburger → confirm "Dexcom Source" (singular) appears
7. Tap it → route to `/cgm/<sourceId>/edit` (will 404 until Plan 3 lands; that's expected)
8. Sign out and back in → confirms onboarding is skipped (both prerequisites still met)

- [ ] **Step 5: Final commit + push**

If any final fixups are needed from the smoke test, commit them. Then:

```bash
git push origin main
```

Mobile is JS-only — no remote build pipeline. The Mobile changes are picked up by Dave's local Expo bundler on next reload.

- [ ] **Step 6: Notify coordinator**

Reply to coordinator: "Mobile Plan 2 (onboarding + IA) merged at HEAD `<sha>`. Plan 3 (alert-config UI) is unblocked from Mobile side; still depends on SRF Plan 1 deploy."

---

## What this plan does NOT cover

- The source edit screen itself (`/cgm/[sourceId]/edit`) — that's Plan 3. The hamburger tap will 404 until Plan 3 ships. Document this in the smoke test so the agent doesn't chase a ghost bug.
- The Dexcom-form unit-of-measure picker — that's Plan 3 (depends on SRF Plan 1's schema add).
- Alert-rule config UI — Plan 3.
- Password / region rotation in the source edit screen — deferred work, separate brief.
- Any backend (SRF) changes — Plan 1 is parallel and independent.

## Coordination notes

- This plan can land before, after, or in parallel with SRF Plan 1.
- Plan 3 depends on both this plan AND SRF Plan 1 being merged.
- The hamburger 404 between Plan 2 merging and Plan 3 landing is acceptable for an internal-only test build. If the gap is more than a few days, gate the hamburger item itself behind a "Plan 3 ready" flag (or leave it — internal users only).
