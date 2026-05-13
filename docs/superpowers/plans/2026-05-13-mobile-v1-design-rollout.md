# Mobile v1 design rollout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the design handoff in `docs/design_handoff_gently_dashboard/` across the entire Mobile UI surface. Replace the inline-style scaffolding from Plans 2/2.5/3 with the new design system (tokens, typography, shared primitives) and rebuild four surfaces — Pair Bracelet onboarding, Connect Dexcom (hero + form), Dashboard, Edit Alarm — to high fidelity. Drop the dashboard range visualization for v1 (keep underlying helpers intact). Align LED color picker to hardware-supported set. Restructure Edit Alarm as a per-rule detail screen reached from the dashboard. Includes the running-list cleanups (location permissions, vestigial onboarding copy) and a small SRF coordination point (`rule.test` override).

**Architecture:**
- New `apps/expo/src/styles/tokens.ts` is the single source of truth for design tokens; existing `apps/expo/src/styles/` is refactored to consume it.
- Shared SVG primitives (`GentlyMark`, `GentlyWordmark`, `Bracelet`, icon set) live in `apps/expo/src/components/brand/` and `apps/expo/src/components/icons/`.
- Onboarding screens replace Plan 2's stub implementations; the route group structure stays the same.
- Dashboard's `CurrentGlucoseCard` from Plan 2.5 is rewritten; `rangeColor` helper stays in `glucose-units.ts` (referenced for accessibility / future re-enable) but its return value no longer drives any visible state.
- Source edit screen from Plan 3 is simplified to **connection settings only**; alert rules move to a per-rule detail screen at `/cgm/[sourceId]/alarms/[ruleId]/edit`.
- "Test this alarm" sends draft (not persisted) values via `rule.test` — requires a small SRF addition (Task 19) coordinated with the SRF agent.

**Tech Stack:** Expo SDK 55, Expo Router, React Native, NativeWind/StyleSheet (existing pattern), React Query via tRPC v11. Adds: `react-native-svg` (likely already present — verify), `expo-linear-gradient` for header gradients, `react-native-gesture-handler` + `react-native-reanimated` for the level slider drag interactions.

**Design reference (canonical):** `docs/design_handoff_gently_dashboard/README.md` for tokens, copy, motion timings, and per-screen specs. The `.jsx` files (`onboarding.jsx`, `variants.jsx`, `alarm-edit.jsx`) are reference prototypes — recreate in RN, don't copy. Files `app.jsx`, `android-frame.jsx`, `design-canvas.jsx` are preview chrome — ignore.

**Hardware-supported LED colors (firmware truth):** Blue, Green, Cyan, Red, Yellow, Magenta, White (plus Off). Source: `apps/expo/src/services/ble/commands/triggerLedPattern.ts:11`. Both the design handoff (which proposed 6 including amber) and the existing `LightColorPicker` (which had Purple + Orange) drift from this; Plan 4 aligns Mobile to the 7-color firmware set. SRF presets in `packages/alert-engine/src/presets.ts` use "Orange" for `falling_fast` — needs fixing to a supported color (probably "Yellow") in the SRF coordination task.

**Dependencies:**
- Hard: SRF auth-bootstrap fix (`dexcom.create` populates `accountId` + `encryptedSessionId`) must be live in production before the dashboard's current-glucose display can be meaningfully smoke-tested. Currently in flight per Dave's monitor.
- Hard: SRF `rule.test` override support (Task 19) before the Edit Alarm "Test this alarm" button works correctly with draft values.
- Soft: nothing else queued for Mobile from earlier plans.

---

## File map

**New files:**
- `apps/expo/src/styles/tokens.ts` — design tokens (color palette, typography, spacing, radius, shadow recipes)
- `apps/expo/src/styles/typography.ts` — SF Pro / Inter helpers, tabular-nums presets
- `apps/expo/src/components/brand/GentlyMark.tsx` — `•))` SVG mark
- `apps/expo/src/components/brand/GentlyWordmark.tsx` — "gently" wordmark + mark composite
- `apps/expo/src/components/brand/Bracelet.tsx` — bracelet illustration SVG (4 LED states)
- `apps/expo/src/components/brand/GentlyHeader.tsx` — header bar used across screens
- `apps/expo/src/components/icons/*.tsx` — icon set (Watch, Cloud, Bell, Chev, Check, TrendUp/Down/Flat, Menu, Pulse, etc.) as `react-native-svg` components
- `apps/expo/src/components/ui/StepIndicator.tsx` — 2-dot step pill for onboarding
- `apps/expo/src/components/ui/StatusPill.tsx` — bracelet/dexcom status pill on dashboard
- `apps/expo/src/components/ui/Segmented.tsx` — segmented control matching design spec
- `apps/expo/src/components/ui/Stepper.tsx` — −/+ stepper used by threshold input
- `apps/expo/src/components/cgm/AlarmDetail/LevelSlider.tsx` — new 5-position slider with snap-to-label
- `apps/expo/src/components/cgm/AlarmDetail/LightColorPicker.tsx` — 7-swatch grid (hardware colors)
- `apps/expo/src/components/cgm/AlarmDetail/index.tsx` — wires everything together
- `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx` — new Edit Alarm detail screen

**Modified files:**
- `apps/expo/src/styles/index.ts` — re-export from `tokens.ts` to preserve existing import sites
- `apps/expo/src/app/(onboarding)/pair-bracelet.tsx` — rewritten with 4-state visual (replaces redirect wrapper)
- `apps/expo/src/app/(onboarding)/connect-dexcom.tsx` — rewritten as hero CTA per design
- `apps/expo/src/app/cgm/add.tsx` — restyled as the Dexcom credentials form per design
- `apps/expo/src/app/dashboard.tsx` — rewritten with new design (no range bar; current glucose hero + status pills + alarms list)
- `apps/expo/src/app/cgm/[sourceId]/edit.tsx` — simplified to connection settings only (alarms moved to detail screen)
- `apps/expo/src/components/cgm/CurrentGlucoseCard.tsx` — restyled; removes background tinting (range visualization), keeps the data path
- `apps/expo/src/components/cgm/LightColorPicker.tsx` — replaced/aligned to 7 hardware colors (existing file deleted in favor of new AlarmDetail-local component)
- `apps/expo/src/services/alerts/translator.ts` — no change expected; verify color names match
- `apps/expo/app.config.ts` — remove `expo-location` plugin, drop `NSLocationWhenInUseUsageDescription` + `ACCESS_COARSE_LOCATION`
- `apps/expo/src/services/ble/utils.ts:34` — drop `ACCESS_FINE_LOCATION` from the Android 12+ permission array
- (Welcome-to-Gently 1-6 onboarding steps) — likely deleted entirely, superseded by the new `(onboarding)` flow. Verify in Task 17.

**Coordination point (separate SRF commit, not in this Mobile plan):**
- `Gently_SRF/packages/api/src/router/rule.ts` — `rule.test` accepts optional `override` payload (partial alarm-style fields). Hand off to SRF agent via the brief in Task 19.

---

## Task 1: Design tokens module

**Files:**
- Create: `apps/expo/src/styles/tokens.ts`
- Modify: `apps/expo/src/styles/index.ts`

Establishes the single source of truth for the v1 design palette, typography, spacing, radius, and shadow recipes. Subsequent tasks consume from this module exclusively.

- [ ] **Step 1: Write tests for the token shape**

In `apps/expo/src/styles/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { tokens } from "./tokens";

describe("design tokens", () => {
  it("exposes brand cyan", () => {
    expect(tokens.color.cyan).toBe("#16BCE9");
    expect(tokens.color.cyanDeep).toBe("#0E8FB6");
    expect(tokens.color.cyanBg).toBe("#E4F5FB");
  });
  it("exposes semantic colors (no green)", () => {
    expect(tokens.color.amber).toBe("#C07A1C");
    expect(tokens.color.coral).toBe("#C24A4A");
    expect(tokens.color).not.toHaveProperty("green");
  });
  it("exposes radius scale", () => {
    expect(tokens.radius.card).toBe(20);
    expect(tokens.radius.pill).toBe(999);
  });
  it("exposes typography weights as strings (RN compatible)", () => {
    expect(tokens.font.weightStrong).toBe("700");
  });
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm -F @gently/expo test -- tokens
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `tokens.ts`**

Build out the full token tree per the design README's "Design Tokens" section. Top-level shape:

```ts
export const tokens = {
  color: {
    cyan: "#16BCE9",
    cyanDeep: "#0E8FB6",
    cyanBg: "#E4F5FB",
    cyanBgSoft: "#F1FAFD",
    inkH: "#0C141C",
    ink: "#1A222C",
    ink2: "#4E5A68",
    ink3: "#8390A0",
    bg: "#F2F4F7",
    bgDeep: "#E6EAF0",
    card: "#FFFFFF",
    rule: "rgba(12,20,28,0.06)",
    rule2: "rgba(12,20,28,0.10)",
    amber: "#C07A1C",
    amberBg: "#FAEBD3",
    coral: "#C24A4A",
    coralBg: "#F8DCD9",
    // LED swatches (firmware-supported only — 7 colors plus off)
    led: {
      blue: "#3D6FE8",
      green: "#4FB36D",
      cyan: "#2BB5E0",
      red: "#E25C5C",
      yellow: "#EAD24A",
      magenta: "#C45EC0",
      white: "#F5F5F5",
    },
  },
  radius: {
    card: 20,
    cardLarge: 24,
    list: 18,
    cta: 16,
    pill: 999,
  },
  spacing: {
    pageHorizontal: 18,
    contentHorizontal: 24,
    section: 22,
    cardInternal: 16,
  },
  shadow: {
    card: {
      shadowColor: "#0C141C",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    hover: {
      shadowColor: "#0C141C",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 3,
    },
    primary: {
      shadowColor: "#16BCE9",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 22,
      elevation: 4,
    },
  },
  font: {
    weightStrong: "700",
    weightMedium: "500",
    weightLight: "300",
  },
} as const;
```

Refer to the README's design tokens table for any value you're unsure about — match exactly.

- [ ] **Step 4: Wire into existing styles entry**

In `apps/expo/src/styles/index.ts`, re-export everything from `tokens.ts` and additionally export the legacy `colors` / `typography` / etc. objects for backwards compat — populate them from `tokens` where they overlap. This prevents needing to touch every consumer in one shot.

- [ ] **Step 5: Run tests + typecheck**

```bash
pnpm -F @gently/expo test -- tokens
pnpm -F @gently/expo typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/expo/src/styles/
git commit -m "$(cat <<'EOF'
Add design-token module per v1 design handoff

Single source of truth for brand palette, semantic colors, LED swatches
(7 firmware-supported colors), radius scale, spacing, and shadow recipes.
Backwards-compatible: existing styles/index.ts continues to export the
legacy color/typography shapes, populated from tokens.ts where overlapping.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Typography helper + font loading

**Files:**
- Create: `apps/expo/src/styles/typography.ts`
- Modify: `apps/expo/app.config.ts` (font plugin)
- Modify: `apps/expo/src/app/_layout.tsx` (font preloading)

iOS uses `System` which resolves to SF Pro automatically. Android needs Inter as a fallback (do **not** use Roboto per the design README).

- [ ] **Step 1: Add Inter as Expo font assets**

Use `expo-font` to load Inter (Regular, Medium, Semibold, Bold, Light) — variable font preferred if available. Place font files in `apps/expo/assets/fonts/` and reference in `app.config.ts`. Confirm `expo-font` is in `package.json` (likely already present from Expo SDK 55 defaults).

- [ ] **Step 2: Implement typography presets**

In `apps/expo/src/styles/typography.ts`:

```ts
import { Platform } from "react-native";
import { tokens } from "./tokens";

const baseFamily = Platform.select({
  ios: "System",        // resolves to SF Pro
  android: "Inter",     // loaded via expo-font
  default: "System",
});

export const typography = {
  wordmark: {
    fontFamily: baseFamily,
    fontSize: 24,
    fontWeight: tokens.font.weightMedium,
    letterSpacing: -0.24,
  },
  h1Onboarding: {
    fontFamily: baseFamily,
    fontSize: 28,
    fontWeight: "600" as const,
    letterSpacing: -0.56,
  },
  h1AlarmEdit: {
    fontFamily: baseFamily,
    fontSize: 17,
    fontWeight: "600" as const,
    letterSpacing: -0.17,
  },
  glucoseHero: {
    fontFamily: baseFamily,
    fontSize: 140,
    fontWeight: tokens.font.weightLight,
    letterSpacing: -7.0,
  },
  threshold: {
    fontFamily: baseFamily,
    fontSize: 72,
    fontWeight: tokens.font.weightLight,
    letterSpacing: -2.88,
  },
  sliderValue: {
    fontFamily: baseFamily,
    fontSize: 30,
    fontWeight: tokens.font.weightLight,
    letterSpacing: -0.6,
  },
  body: {
    fontFamily: baseFamily,
    fontSize: 15,
    fontWeight: "400" as const,
  },
  eyebrow: {
    fontFamily: baseFamily,
    fontSize: 11,
    fontWeight: tokens.font.weightStrong,
    letterSpacing: 0.99, // ≈ 0.09em at 11px
    textTransform: "uppercase" as const,
  },
};

// Helper for tabular numerals — pass result into <Text fontVariant=...> prop
export const tabularNums = ["tabular-nums" as const];
```

- [ ] **Step 3: Preload fonts in `_layout.tsx`**

Wire `expo-font`'s `useFonts` hook into the root layout; render an Activity Indicator until loaded.

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/styles/typography.ts apps/expo/app.config.ts apps/expo/src/app/_layout.tsx apps/expo/assets/fonts/
git commit -m "$(cat <<'EOF'
Add typography presets + Inter font loading

SF Pro on iOS via System; Inter loaded via expo-font on Android.
Tabular-nums helper exported for numeric displays (glucose, threshold,
slider values, timestamps). All typography presets reference tokens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Port brand SVGs (GentlyMark, GentlyWordmark, Bracelet)

**Files:**
- Create: `apps/expo/src/components/brand/GentlyMark.tsx`
- Create: `apps/expo/src/components/brand/GentlyWordmark.tsx`
- Create: `apps/expo/src/components/brand/Bracelet.tsx`
- Create: `apps/expo/src/components/brand/GentlyHeader.tsx`

`react-native-svg` is the implementation tool. Reference the SVG markup in `docs/design_handoff_gently_dashboard/variants.jsx` (search for `GentlyMark`) and `onboarding.jsx` (search for `Bracelet`).

- [ ] **Step 1: Port GentlyMark**

`•))` cyan dot + two descending-opacity arcs. ~20 lines of `Svg`/`Circle`/`Path` JSX. Props: `size`, `tintColor` (defaults to `tokens.color.cyan`).

- [ ] **Step 2: Port GentlyWordmark**

Composite: GentlyMark on the left + "gently" `<Text>` on the right (uses `typography.wordmark`). Props: `size`, `markSize`, `tone` ("light" | "dark").

- [ ] **Step 3: Port Bracelet illustration**

The biggest of the three — ~120 lines per the README. Props: `state: "instruct" | "scanning" | "discovered" | "success"`. The LED state at the bottom changes per `state` (slow pulse, fast pulse, steady, check overlay). For pulse animation use `react-native-reanimated`'s `useSharedValue` + `withRepeat`.

- [ ] **Step 4: Port GentlyHeader**

Common header bar: 38×38 back chevron (hidden conditionally), centered GentlyWordmark, 38×38 right spacer. Reused across onboarding + dashboard. Props: `showBack`, `onBack`, `right` (optional right slot).

- [ ] **Step 5: Smoke test**

Stand up a temporary route or stories screen to visually verify each SVG matches the design. Manual eye check. No automated visual test in v1.

- [ ] **Step 6: Commit**

```bash
git add apps/expo/src/components/brand/
git commit -m "$(cat <<'EOF'
Port GentlyMark, GentlyWordmark, Bracelet, GentlyHeader SVGs

All four primitives ported from design handoff JSX into react-native-svg.
Bracelet has 4 LED states driven by react-native-reanimated for pulse
and ripple animations. GentlyHeader is the shared screen-top bar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Port the icon set

**Files:**
- Create: `apps/expo/src/components/icons/` (one file per icon)
- Create: `apps/expo/src/components/icons/index.ts` (barrel)

Hairline 1.6-1.8 stroke icons referenced from `variants.jsx`'s `Icon` map. Port each as a separate file (Watch, Cloud, Bell, Chev, Check, TrendUp, TrendDown, TrendFlat, Menu, Pulse, Info, Shield) using `react-native-svg`.

- [ ] **Step 1: Survey existing icon library**

```bash
grep -rn "Ionicons\|FontAwesome\|MaterialIcons\|@expo/vector-icons" apps/expo/src --include="*.tsx" --include="*.ts" 2>/dev/null | head
```

Identify if any of the design's icons can be sourced from `@expo/vector-icons` rather than ported by hand. Stroke icons typically need to be ported; filled icons usually have library equivalents.

- [ ] **Step 2: Port each icon as a separate file**

Each accepts `size: number` (default 24), `color: string` (default `tokens.color.ink`), and `strokeWidth: number` (default 1.6). Keep files small (~10-30 lines each).

- [ ] **Step 3: Barrel export**

In `apps/expo/src/components/icons/index.ts`, re-export everything for ergonomic consumption: `import { Watch, Cloud, Bell } from "~/components/icons";`.

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/components/icons/
git commit -m "$(cat <<'EOF'
Port v1 icon set as react-native-svg components

Hairline stroke icons (1.6 default) sized to 24 by default; color
defaults to tokens.color.ink. Used across onboarding, dashboard, and
alarm-detail screens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Shared UI primitives (Segmented, Stepper, StepIndicator, StatusPill)

**Files:**
- Create: `apps/expo/src/components/ui/StepIndicator.tsx`
- Create: `apps/expo/src/components/ui/StatusPill.tsx`
- Create: `apps/expo/src/components/ui/Segmented.tsx`
- Create: `apps/expo/src/components/ui/Stepper.tsx`

These are reused across onboarding + dashboard + alarm-detail.

- [ ] **Step 1: Implement StepIndicator**

2-dot pill. Active dot expands to 22×6 cyan-deep pill; inactive 6×6 in 12%-ink. Props: `current: 0 | 1`. 200ms ease transition.

- [ ] **Step 2: Implement StatusPill**

White card, 18px radius, card shadow. Props: `icon` (component), `label` (string), `value` (string), `accentColor` (default cyan-deep), `dot` (optional — colored 8px circle with glow). Used for "BRACELET — Connected · 84%" and "DEXCOM — Syncing" on the dashboard.

- [ ] **Step 3: Implement Segmented**

Segmented control per the design's "Region" / "Glucose units" pickers. 6px padded `rgba(12,20,28,0.04)` container, 18px radius. Active child = white + shadow; inactive = transparent. Props: `value`, `onChange`, `options: { value, label, sub? }[]`.

- [ ] **Step 4: Implement Stepper**

−/+ stepper used on the Edit Alarm threshold. 44px circles, plain `#EEF1F5` background. Props: `value`, `onChange`, `min`, `max`, `step` (default 1), `disabled`.

- [ ] **Step 5: Snapshot tests**

Light snapshot tests for each, just to lock the markup. No need for interaction tests beyond basic press handlers.

- [ ] **Step 6: Commit**

```bash
git add apps/expo/src/components/ui/StepIndicator.tsx apps/expo/src/components/ui/StatusPill.tsx apps/expo/src/components/ui/Segmented.tsx apps/expo/src/components/ui/Stepper.tsx
git commit -m "$(cat <<'EOF'
Add v1 shared UI primitives: StepIndicator, StatusPill, Segmented, Stepper

Used across onboarding + dashboard + alarm-detail. All consume design
tokens; no inline color/spacing values.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Rebuild Pair Bracelet onboarding screen

**Files:**
- Modify: `apps/expo/src/app/(onboarding)/pair-bracelet.tsx` (full rewrite)
- Possibly modify: `apps/expo/src/components/onboarding/PairBraceletPanel.tsx` if it exists (from Plan 2)

Per design README §1 ("Onboarding · Pair Bracelet"). Four states: `instruct → scanning → discovered → success`. Drive from existing BLE service.

- [ ] **Step 1: Implement the 4-state screen**

State machine local to the screen. Bracelet illustration receives `state` prop. Step indicator with current=0. The CTA changes per state (instruction "Looking for your bracelet…" → "Cancel" → device card replaces CTA → "Continue"). Tip card visible on `instruct` only.

- [ ] **Step 2: Wire to BLE service**

`useBLEContext()` provides scan/discover/pair primitives. Map BLE events to the four state transitions. `discovered → success` auto-advances ~1s after pair completes. After success, `router.replace("/(onboarding)/connect-dexcom")`.

- [ ] **Step 3: Implement timeout copy**

30s of `scanning` with no result → "Make sure your bracelet's light is flashing blue. Tap to try again." (per README §Interactions). Reset to `instruct`.

- [ ] **Step 4: Smoke test on emulator**

Test user flow: app cold start → onboarding entry → pair-bracelet → mock BLE auto-pairs → advances to Dexcom hero. No visual regressions vs design.

- [ ] **Step 5: Commit**

```bash
git add "apps/expo/src/app/(onboarding)/pair-bracelet.tsx" apps/expo/src/components/onboarding/
git commit -m "$(cat <<'EOF'
Rebuild pair-bracelet onboarding screen per v1 design

Four states driven by BLE service: instruct, scanning, discovered,
success. Uses Bracelet SVG with state-driven LED animation, tip card on
instruct only, device card on discovered. Success auto-advances to
connect-dexcom after ~1s.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Rebuild Connect Dexcom hero screen

**Files:**
- Modify: `apps/expo/src/app/(onboarding)/connect-dexcom.tsx` (full rewrite)

Per design README §2 ("Onboarding · Connect Dexcom — Hero CTA").

- [ ] **Step 1: Implement the hero**

Header + step indicator (current=1). "Bracelet paired" chip below header. Centered connection diagram (two 64px nodes connected by a 56px dashed cyan line). H1 "One more step" + body. Primary CTA "Connect Dexcom Share" → `router.push("/cgm/add")`. Subtext below CTA.

- [ ] **Step 2: Commit**

```bash
git add "apps/expo/src/app/(onboarding)/connect-dexcom.tsx"
git commit -m "$(cat <<'EOF'
Rebuild connect-dexcom hero per v1 design

Centered hero CTA with connection diagram (Gently mark ⇢ cloud node).
"Bracelet paired" chip confirms prior step. Primary CTA routes to
cgm/add for credentials.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Rebuild Dexcom credentials form (cgm/add)

**Files:**
- Modify: `apps/expo/src/app/cgm/add.tsx` (full rewrite of presentation; preserve mutation logic)

Per design README §3 ("Onboarding · Dexcom Credentials Form").

- [ ] **Step 1: Implement the form**

Header + step indicator (current=1). H1 "Connect Dexcom Share". Field groups in white cards with uppercase eyebrow labels:
- Region: `Segmented` (US default / Outside US / Japan)
- Username: plain `<TextInput>`, helper "Use your Dexcom Share username (or email)."
- Password: secure input + "Show/Hide" toggle in cyan-deep
- Trust line outside cards: Shield icon + "Encrypted with AES-256-GCM. Your password is never returned by our API. **Privacy details**" (link is non-functional placeholder for v1.5).
- Display name `optional`: plain `<TextInput>` + `optional` chip after label
- Glucose units: `Segmented` (mg/dL default / mmol/L)
- Primary CTA "Connect" with in-button spinner during submit

- [ ] **Step 2: Wire error states**

Implement the 4 designed error states (per README §Dexcom form §error states):
- `AccountPasswordInvalid` → inline form error
- Wrong region → inline error
- Network → friendly retry
- Server → fallback with "Try again" button

Map errors from `dexcom.create`'s `TRPCError` `data.code` / `message` to these branches.

- [ ] **Step 3: Smoke test**

Submit with intentionally wrong password → "Username or password is incorrect" appears inline. Submit valid → spinner → success → routes to dashboard.

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/app/cgm/add.tsx
git commit -m "$(cat <<'EOF'
Rebuild Dexcom credentials form per v1 design

Segmented controls for region and units, segmented Show/Hide for
password, trust line about AES-256-GCM, inline error states for the
four documented Dexcom failure modes. Mutation logic unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Rebuild dashboard (no range visualization)

**Files:**
- Modify: `apps/expo/src/app/dashboard.tsx` (full rewrite)
- Modify: `apps/expo/src/components/cgm/CurrentGlucoseCard.tsx` (rewrite without range tinting)

Per design README §4 ("Dashboard") — **with the range bar and range-tinting REMOVED** per coordinator decision 2026-05-13. The dashboard shows only the current value; underlying `rangeColor` / `glucose-units` helpers stay in place (referenced by alarm rules) but no longer drive visible state.

- [ ] **Step 1: Rewrite `CurrentGlucoseCard`**

Top of dashboard, no background tinting:
- Eyebrow row: "CURRENT GLUCOSE" left, relative-time right (tabular)
- Big value: 140px SF Pro Display 300 weight, tabular. Color: `tokens.color.inkH` (not range-tinted).
- Inline trend icon + "mg/dL"/"mmol/L" eyebrow
- Status line: small `•` + "Steady" / "Rising" / "Falling" etc. (from `trendLabel` helper)
- **No range bar.** Skip the entire range-bar block from design §4 item 5.
- Auto-refresh every 60s + on focus (already wired in Plan 2.5 — preserve).

Plain white card background. No animated bg color crossfade.

- [ ] **Step 2: Rewrite `dashboard.tsx`**

Top-to-bottom:
- GentlyHeader with hamburger (no back chevron)
- `CurrentGlucoseCard` (as above)
- Status pills row: bracelet status (from BLEContext.battery + connected) + Dexcom status (from `dexcom.list` row: `credActive`, `credLastSuccessAt` for staleness). Render with `StatusPill` primitive.
- Alarms section: eyebrow "ALARMS ARMED" + "Edit" link (routes to source edit). Below: list of armed rule cards (3 default visible). Each card tappable → routes to `/cgm/[sourceId]/alarms/[ruleId]/edit` (Task 12).
- Critical_low cards carry "FLOOR 50" pill in coral.

- [ ] **Step 3: Verify no range visualization remains**

Search for `RANGE_BG`, `RANGE_FG`, `rangeColor` usage in render code. The helper function stays exported from `glucose-units.ts`, but only used by alert rules — not the dashboard.

- [ ] **Step 4: Smoke test**

Open dashboard with active source. Confirm: value renders, status pills correct, alarm cards render (3 diabetes pack rules), tap-through to alarm-detail works. No background tinting on glucose card.

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/app/dashboard.tsx apps/expo/src/components/cgm/CurrentGlucoseCard.tsx
git commit -m "$(cat <<'EOF'
Rebuild dashboard per v1 design (range visualization deferred)

CurrentGlucoseCard: 140px hero value with trend, no range banding or
bg tint. Status pills for bracelet + Dexcom connectivity. Alarms armed
list with tap-through to per-rule detail screen.

rangeColor helper retained in glucose-units.ts for alarm-rule logic;
not consumed by any visible dashboard state. Range bar and range-color
crossfade explicitly deferred to a later release.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: LevelSlider component with snap-to-label

**Files:**
- Create: `apps/expo/src/components/cgm/AlarmDetail/LevelSlider.tsx`
- Create: `apps/expo/src/components/cgm/AlarmDetail/LevelSlider.test.tsx`

Replace the 4-snap slider from Plan 3 (which used `@react-native-community/slider`) with a custom 5-snap (0-4) slider using `react-native-gesture-handler` + `react-native-reanimated`, per the design's interaction spec.

- [ ] **Step 1: Write failing tests**

Behavior tests via React Testing Library:
- Renders 5 labels (passed in via props)
- Tapping a label snaps the value to that index
- Active label is rendered with accent color + 700 weight; inactive in ink3

```tsx
it("snaps to the label index when tapped", () => {
  const onChange = vi.fn();
  const { getByText } = render(
    <LevelSlider
      value={0}
      onChange={onChange}
      labels={["Off", "Soft", "Medium", "Strong", "Max"]}
      accent={tokens.color.cyanDeep}
    />,
  );
  fireEvent.press(getByText("Strong"));
  expect(onChange).toHaveBeenCalledWith(3);
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm -F @gently/expo test -- LevelSlider
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

- 8px track, fill in accent color
- Tick marks at indices 1/2/3 (white when ≤ value, 18%-ink otherwise)
- 26px white knob with cyan-deep inner 8px dot + designed shadow
- Drag via PanGesture → snap to nearest integer
- Tappable labels below (5 buttons across)
- Active label: 700 weight in accent; others 500 in ink3
- 140ms transition on knob/fill when not dragging

Props: `value: number`, `onChange: (v: number) => void`, `labels: string[]`, `accent: string`, `readOut: { value: string; label: string }` (rendered above the track).

- [ ] **Step 4: Run tests**

```bash
pnpm -F @gently/expo test -- LevelSlider
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/components/cgm/AlarmDetail/LevelSlider.tsx apps/expo/src/components/cgm/AlarmDetail/LevelSlider.test.tsx
git commit -m "$(cat <<'EOF'
Add LevelSlider with snap-to-label for alarm-style editor

5-snap (0-4) custom slider built on gesture-handler + reanimated.
Tappable labels snap; drag snaps to nearest integer; knob and fill
animate with 140ms ease on change (no transition during drag).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: LightColorPicker aligned to hardware-supported 7 colors

**Files:**
- Create: `apps/expo/src/components/cgm/AlarmDetail/LightColorPicker.tsx`
- Modify (delete): `apps/expo/src/components/cgm/LightColorPicker.tsx` (Plan 3's version — superseded)

Hardware-supported colors per `apps/expo/src/services/ble/commands/triggerLedPattern.ts:11`: **Blue, Green, Cyan, Red, Yellow, Magenta, White** (plus Off as a separate toggle, not a grid color).

- [ ] **Step 1: Implement the picker**

6-column grid (7 colors fits in 1 row + wrap to 2). 42px circular swatches consuming `tokens.color.led`. Selected swatch: 2px white + 4px accent ring + drop shadow + scale(1.02) + 18px white check overlay.

A "Turn off / Turn on" toggle at the top of the section. When `lightOn === false`: grid drops to 40% opacity, caption reads "Selected: **Off**". When on, caption reads "Selected: **{color name}**".

Props: `value: string | null` (color name lowercase, e.g. "red"; null = off), `onChange: (next: string | null) => void`.

Selected color stored as the lowercase name to align with the translator's `LED_COLOR_BY_NAME` case-insensitive map at `services/alerts/translator.ts:29`.

- [ ] **Step 2: Delete the Plan 3 version**

```bash
git rm apps/expo/src/components/cgm/LightColorPicker.tsx
```

Update any references — search for the old import path and redirect to the new location. Likely only the old source-edit screen used it.

- [ ] **Step 3: Snapshot test**

Light snapshot to lock the rendered shape. Interaction test: tapping a swatch fires `onChange` with the right name. Tapping the toggle off → caption flips to "Selected: Off".

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/components/cgm/AlarmDetail/LightColorPicker.tsx
git rm apps/expo/src/components/cgm/LightColorPicker.tsx
git commit -m "$(cat <<'EOF'
Replace LightColorPicker with hardware-aligned 7-color version

7 firmware-supported colors per triggerLedPattern.ts (Blue, Green,
Cyan, Red, Yellow, Magenta, White). Separate Off toggle above the
grid. Selected swatch ringed in the color with check overlay. Stored
value is the lowercase color name (matches translator case-insensitive
lookup at services/alerts/translator.ts:29).

Plan 3's picker (which had non-firmware-supported Purple and Orange,
and was missing Cyan and Magenta) is removed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Edit Alarm detail screen — route + scaffolding

**Files:**
- Create: `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx`

Per design README §5 ("Edit Alarm"). This is the new nav target from the dashboard's alarm cards.

- [ ] **Step 1: Implement route + data loading**

```tsx
const { sourceId, ruleId } = useLocalSearchParams<{ sourceId: string; ruleId: string }>();
const rulesQ = trpc.rule.listForSource.useQuery({ sourceId });
const sourcesQ = trpc.dexcom.list.useQuery();
const rule = rulesQ.data?.find((r) => r.id === ruleId);
const source = sourcesQ.data?.find((s) => s.id === sourceId);

// Local draft state — committed on Save
const [draft, setDraft] = useState<Rule | null>(null);
useEffect(() => { if (rule && !draft) setDraft(rule); }, [rule]);
const dirty = useMemo(() => draft && rule && !shallowEqual(draft, rule), [draft, rule]);
```

Top app row: back chevron (warn if `dirty` before nav), centered title (eyebrow "ALARM" + tier name like "Critical Low"), "Save" link in cyan-deep on the right.

If `dirty` is false, Save is disabled (or hidden). On Save: `rule.update` mutation fires, on success refetch + back-nav.

- [ ] **Step 2: Confirm-if-dirty back behavior**

`navigation.addListener("beforeRemove", e => { if (dirty) { e.preventDefault(); /* show Alert.alert */ } })`.

- [ ] **Step 3: Smoke test the empty shell**

Route resolves, draft initializes from server data, Save disabled when not dirty, dirty-back triggers confirm dialog (use a placeholder no-op render for the threshold/sliders/light/timing sections — those get filled in Tasks 13-15).

- [ ] **Step 4: Commit**

```bash
git add "apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx"
git commit -m "$(cat <<'EOF'
Add Edit Alarm detail screen — route + data loading + dirty tracking

New route at /cgm/[sourceId]/alarms/[ruleId]/edit. Loads rule via
rule.listForSource, copies into local draft on mount, tracks dirty
vs server. Save disabled until dirty; back nav with unsaved changes
opens a confirm dialog. Body sections to be filled in Tasks 13-15.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Edit Alarm — threshold hero card

**Files:**
- Modify: `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx`

Per design README §5 "Threshold hero card".

- [ ] **Step 1: Implement the threshold card**

Inside the existing screen, just below the app row. White card, 24 radius:
- Tier badge: 36 circle in `tint` (cyan-bg for low/critical_low, amber-bg for high, etc.), bell icon in `accent`
- Eyebrow "ALERT WHEN ABOVE" / "ALERT WHEN BELOW" + tier description ("Sustained low blood sugar")
- Enabled toggle on the right (52×32 cyan-deep on, `#D2D8E0` off) — controls `draft.enabled`
- Big stepper row: − (44 circle) | 72px tabular value | + (44 circle). Steppers are `tokens.color.ink3` background `#EEF1F5`. Updates `draft.threshold`.

Critical_low only: cyan-bg-soft callout below the stepper with info-circle icon + "The bracelet hardware enforces a **50 mg/dL floor** on critical-low. You can't set this any lower — it's a safety stop." (full copy from README). Stepper's − button is `disabled` at 50.

Unit conversion: if `source.unitOfMeasure === "mmol_l"`, the displayed value renders via `toMmolL(draft.threshold).toFixed(1)` (and steps in 0.1 increments). Server-side storage remains canonical mg/dL — convert back via `toMgDl` on stepper change.

- [ ] **Step 2: Smoke test the stepper bounds**

- Above-range tier (high): stepper goes 100-400 mg/dL in 5-step increments
- Below-range tier (low): stepper goes 50-100 mg/dL in 1-step increments
- Critical-low tier: stepper goes 50-70 mg/dL in 1-step increments; − disabled at 50

- [ ] **Step 3: Commit**

```bash
git add "apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx"
git commit -m "$(cat <<'EOF'
Edit Alarm — threshold hero card with stepper + critical-low floor

72px tabular value, ±44 circle steppers. Tier-aware bounds and step
sizes. Critical-low shows the hardware safety-floor callout and
disables − at 50 mg/dL. mmol/L mode converts display + step granularity.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Edit Alarm — vibration + audio level sliders + light color picker

**Files:**
- Modify: `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx`

- [ ] **Step 1: Wire LevelSlider for vibration**

White card (18 radius, 14 padding). Title "VIBRATION" eyebrow. `LevelSlider` with labels `Off`, `Soft`, `Medium`, `Strong`, `Max` and accent `tokens.color.cyanDeep`. Bound to `draft.vibrationLevel`.

Readout above the track: `<value tabular 30/300>` " · " `<label>` left; "0 – 4" right (12/600 ink3).

- [ ] **Step 2: Wire LevelSlider for audio**

Same shape, eyebrow "VOLUME", labels `Silent`, `Quiet`, `Mid`, `Loud`, `Loudest`. Bound to `draft.audioLevel`.

- [ ] **Step 3: Wire LightColorPicker**

White card, eyebrow "LIGHT COLOR" + "Turn off / Turn on" link-action on the right (toggles `draft.ledColor` between null and the previous color, preserving last selection in a `useRef`).

- [ ] **Step 4: Smoke test**

Each slider snaps to label taps; dragging works; on-state of light color picker reflects `draft.ledColor !== null`. All changes update `draft` (visible via the Save button enabling).

- [ ] **Step 5: Commit**

```bash
git add "apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx"
git commit -m "$(cat <<'EOF'
Edit Alarm — vibration + audio sliders + light color picker

Three modality controls below the threshold card. Each modality is
independent: vibration_level 0-4, audio_level 0-4, ledColor (null OR
one of 7 hardware-supported color names). Any combination is valid.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Edit Alarm — Test alarm button + Timing rows + footer

**Files:**
- Modify: `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx`

- [ ] **Step 1: Implement Test alarm CTA**

Full-width cyan primary button "Test this alarm" with pulse icon. Subtext: "Sends the pattern above to your bracelet right now."

On press: call `trpc.rule.test.mutate` with `{ ruleId, override: { vibrationLevel: draft.vibrationLevel, audioLevel: draft.audioLevel, ledColor: draft.ledColor, durationSec: draft.durationSec } }`.

**Note:** this requires SRF Task 19 (rule.test accepts override). Until that ships, the override is ignored and the test uses the persisted rule's values. Document this as a known limitation; it self-resolves when Task 19 deploys.

Show inline error if `rate_limit` is hit (3/min per user from Plan 1).

- [ ] **Step 2: Implement timing rows**

White grouped list (14px padding rows, hairline rule between). Three rows:
- "Duration" → seconds input (1-60), default 10
- "Repeat after" → minutes input (nullable, "Off" if null)
- "Escalate after" → minutes input (nullable, "Off" if null)

Bind each to `draft.durationSec`, `draft.repeatAfterMin`, `draft.escalateAfterMin`.

- [ ] **Step 3: Footer copy**

Below everything: "Secondary alert only. Keep your Dexcom alerts on — Gently is here to make sure you notice." — small text, ink3.

- [ ] **Step 4: Smoke test**

Press Test alarm → push notification arrives within seconds → mock BLE / real bracelet fires per draft values (once Task 19 deploys). Timing rows persist on Save.

- [ ] **Step 5: Commit**

```bash
git add "apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx"
git commit -m "$(cat <<'EOF'
Edit Alarm — Test alarm CTA + timing rows + footer copy

Test alarm sends current draft (not persisted) via rule.test with an
override payload. SRF's rule.test must accept the override param to
honor draft values — coordinated as a separate SRF commit (see plan
Task 19).

Timing rows for duration, repeat, escalate as nullable minute inputs.
Footer reinforces secondary-alert framing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Simplify source-edit screen + rewire navigation

**Files:**
- Modify: `apps/expo/src/app/cgm/[sourceId]/edit.tsx` (significant simplification)
- Modify: `apps/expo/src/components/ui/hamburger-items.ts` (label may shift)

The source-edit screen from Plan 3 currently holds connection settings AND alarm rule cards. With Plan 4, alarm rules move to the detail screen (Task 12). The source-edit screen becomes connection-only.

- [ ] **Step 1: Strip alarm rule cards from source-edit screen**

Remove the alarm-rule rendering section entirely. Keep:
- Header: source displayName
- Connection section: region (read-only), username (read-only), unit-of-measure picker
- Disconnect button at the bottom

Restyle per the new design tokens — white cards, 20 radius, proper spacing.

- [ ] **Step 2: Update navigation from dashboard alarm cards**

In `apps/expo/src/app/dashboard.tsx` (already touched in Task 9), each alarm card's `onPress` should route to `/cgm/[sourceId]/alarms/[ruleId]/edit`.

In the dashboard's "Edit" link (top-right of the alarms section): route to the first alarm rule's detail screen, OR to source-edit (just connection settings now). Decide based on what feels right; recommend routing to source-edit so the user can change unit-of-measure / disconnect from there.

- [ ] **Step 3: Smoke test**

Dashboard → tap alarm card → detail screen for that rule. Source-edit screen via hamburger → only shows connection settings. Disconnect still works.

- [ ] **Step 4: Commit**

```bash
git add "apps/expo/src/app/cgm/[sourceId]/edit.tsx" apps/expo/src/app/dashboard.tsx
git commit -m "$(cat <<'EOF'
Simplify source-edit; route dashboard alarms to detail screen

Source edit screen drops the per-rule cards (they live on the new
/cgm/[sourceId]/alarms/[ruleId]/edit detail screen now). Source edit
keeps connection settings + unit-of-measure + disconnect.

Dashboard alarm cards now navigate to the detail screen on tap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Cleanups — location permissions + vestigial onboarding

**Files:**
- Modify: `apps/expo/app.config.ts`
- Modify: `apps/expo/src/services/ble/utils.ts`
- Delete: any leftover "Welcome to Gently 1-6 steps" content

- [ ] **Step 1: Remove unused location permissions (from running list)**

- `app.config.ts:plugins[]` → remove `"expo-location"` (no code imports it; verify with grep first).
- `app.config.ts:ios.infoPlist` → remove `NSLocationWhenInUseUsageDescription`.
- `app.config.ts:android.permissions` → remove `"android.permission.ACCESS_COARSE_LOCATION"`. Keep `ACCESS_FINE_LOCATION` for the legitimate pre-Android-12 BLE fallback.
- `apps/expo/src/services/ble/utils.ts:34` → remove `ACCESS_FINE_LOCATION` from the Android 12+ permission request array. Pre-12 fallback at `:52-54` stays.

- [ ] **Step 2: Find + delete vestigial "Welcome to Gently" 1-6 steps**

```bash
grep -rn "Welcome to Gently\|Welcome.*Gently\|Step 1.*Step 6\|getting started" apps/expo/src --include="*.tsx" --include="*.ts" 2>/dev/null | head
```

Identify the old timer-bracelet onboarding screens. If any are still routed: delete or replace with the new `(onboarding)` flow built in Tasks 6-7. If they're already unreferenced cruft (likely after Plan 2's IA changes): delete the files outright.

- [ ] **Step 3: Smoke test**

App install on a fresh emulator: no location prompt (Android 12+ confirmed). No vestigial welcome screens accessible from any route.

- [ ] **Step 4: Commit**

```bash
git add apps/expo/app.config.ts apps/expo/src/services/ble/utils.ts
git rm -r path/to/old/welcome-screens
git commit -m "$(cat <<'EOF'
Cleanup: drop unused location permissions + vestigial Welcome screens

- expo-location plugin removed (no consumers)
- NSLocationWhenInUseUsageDescription removed (iOS doesn't need it)
- ACCESS_COARSE_LOCATION removed (no callers)
- ACCESS_FINE_LOCATION dropped from Android 12+ request (still requested
  on pre-12 for legitimate legacy BLE scanning fallback)
- Old timer-bracelet 'Welcome to Gently' 1-6 screens deleted —
  superseded by the new (onboarding) flow

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Global typecheck, lint, and end-to-end smoke

- [ ] **Step 1: Typecheck**

```bash
pnpm -F @gently/expo typecheck
```

Expected: PASS, with the three pre-existing settings.tsx errors (defaultPushNotification / defaultEmailNotification) continuing to be acknowledged but not addressed.

- [ ] **Step 2: Lint**

```bash
pnpm -F @gently/expo lint
```

Expected: PASS.

- [ ] **Step 3: All unit + snapshot tests**

```bash
pnpm -F @gently/expo test
```

Expected: PASS.

- [ ] **Step 4: End-to-end manual smoke test on emulator**

Walk a fresh user (clear app data) through the full v1 flow:

1. Sign in as test user
2. Onboarding routes → pair-bracelet → mock pairs → connect-dexcom hero → cgm/add form (new design) → submit creds
3. Lands on dashboard with new design (no range bar, big glucose value, status pills, alarms list)
4. Tap an alarm card → Edit Alarm detail screen
5. Tweak threshold, levels, color → Save → returns to dashboard with updated armed-state
6. Tap "Test this alarm" → expect a push within seconds + bracelet (or mock) fires the draft pattern (once SRF Task 19 deploys)
7. Hamburger → "Dexcom Source" → simplified source-edit screen → confirm only connection settings present
8. Disconnect source → returns to dashboard, source removed, alarms section empties

- [ ] **Step 5: Push**

```bash
git push origin main
```

- [ ] **Step 6: Notify coordinator**

Reply: "Mobile Plan 4 (v1 design rollout) merged at HEAD `<sha>`. All 18 tasks shipped. Smoke test green per design spec. Awaiting SRF Task 19 (rule.test override) to fully validate the 'Test this alarm' draft path."

---

## Task 19: SRF coordination — `rule.test` accepts override payload

**This task is for the SRF agent, not Mobile.** Coordinator hands off via the brief below.

**Files (SRF):**
- Modify: `Gently_SRF/packages/api/src/router/rule.ts` (extend `test` procedure)
- Modify: `Gently_SRF/packages/api/src/router/__tests__/rule.test.ts`
- Bonus: fix `Gently_SRF/packages/alert-engine/src/presets.ts` — `falling_fast` rule currently has `ledColor: "Orange"`, which is not a firmware-supported color (translator returns null → LED is silently off). Change to a supported color (Yellow is the closest visual; Magenta also reasonable). Same review pass for the rest of `DIABETES_PRESETS` and `METABOLIC_PRESETS`.

**Brief for SRF session:**

> Coordinator: small SRF addition to support the v1 Mobile redesign's "Test this alarm" button (Plan 4, Task 15). The button lets users preview alarm-style settings while editing — using the **draft** values (not persisted). Currently `rule.test` reads the rule row and uses its persisted alarm style; this means edits don't preview until Save.
>
> Please extend `rule.test`'s input schema to accept an optional `override` object:
>
> ```ts
> z.object({
>   ruleId: z.uuid(),
>   override: z.object({
>     vibrationLevel: z.number().int().min(0).max(4).optional(),
>     audioLevel: z.number().int().min(0).max(4).optional(),
>     ledColor: z.string().nullable().optional(),
>     durationSec: z.number().int().min(1).max(60).optional(),
>   }).optional(),
> })
> ```
>
> When constructing the synthetic AlertPayload, take override values where present, falling back to the persisted rule row for missing fields. Run the level-translator against the override (where present) before populating `vibrationPatternId` / `audioPatternId` on the payload.
>
> Existing tests should still pass (no override = behaves identically). Add one new test: `rule.test` with `override.vibrationLevel = 4` while the persisted rule has `vibrationLevel = 1` → the dispatched AlertPayload's vibrationPatternId reflects level 4, not level 1.
>
> **Bonus cleanup (same commit OK or separate, your call):** `packages/alert-engine/src/presets.ts` `DIABETES_PRESETS` has `falling_fast` with `ledColor: "Orange"`. Firmware doesn't support Orange (only Blue, Green, Cyan, Red, Yellow, Magenta, White per `Gently_Mobile/apps/expo/src/services/ble/commands/triggerLedPattern.ts:11`). The translator returns `null` for unrecognized colors → LED is silently off on that rule. Change to a supported color — Yellow recommended (matches the "warning" feeling). Audit the rest of `DIABETES_PRESETS` and `METABOLIC_PRESETS` for any other unsupported colors.
>
> Single focused commit (or 2 if you do the bonus separately). Push. After Railway redeploys, Mobile's Test alarm button immediately starts honoring draft state without further Mobile changes.

---

## What this plan does NOT cover

- **Range bar visualization on dashboard** — explicitly deferred per coordinator decision 2026-05-13. `rangeColor` helper retained for future re-enable.
- **Animated dashboard bg-color crossfade** — same; deferred.
- **Onboarding step indicator beyond 2 dots** — design has 2 dots for v1 (pair, dexcom). Adding more steps later (e.g. "configure alerts") is a future expansion.
- **Privacy details link from the trust line** — placeholder for v1.5 (depends on legal/privacy policy work tracked in `project_compliance_audit.md`).
- **Time-series chart on dashboard** — design didn't include one. Future plan.
- **Multi-source UI** — feature-flagged off (`MULTI_DEVICE_ENABLED`).
- **Password / region rotation on source-edit screen** — deferred, separate work.

## Coordination notes

- **Hard dependency on SRF auth-bootstrap fix** in flight per Dave's monitor (2026-05-13). Without it, dashboard's CurrentGlucoseCard remains "No reading yet" — Plan 4's visuals will render, but glucose values won't flow until auth bootstraps. Smoke test full chain after that fix lands.
- **Soft dependency on SRF Task 19** (rule.test override). Plan 4 ships its Mobile bits regardless; Test alarm button will use persisted-rule values until Task 19 deploys, then automatically picks up draft-override behavior.
- Plans 2, 2.5, 3 are largely **superseded** by Plan 4's redesign — their scaffolding remains in git history but the user-visible UI is replaced. Functional contracts (tRPC consumers, BLE wiring, auth flow, etc.) are preserved.
