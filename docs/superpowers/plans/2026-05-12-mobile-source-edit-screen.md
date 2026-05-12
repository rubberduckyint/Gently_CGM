# Mobile source edit screen + alert-rule config UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land sub-project C + Mobile parts of sub-project A from the v1 alert-config design spec — the source edit screen at `/cgm/[sourceId]/edit` with per-rule alarm-style configuration (vibrate/audio levels, light color, threshold, repeat/escalate) segmented by user pack, plus a unit-of-measure picker on the existing `cgm/add.tsx` form.

**Architecture:** A single route `apps/expo/src/app/cgm/[sourceId]/edit.tsx` loads source details via `dexcom.list` + rules via `rule.listForSource`. A reusable `AlertRuleCard` component handles one rule at a time with optimistic-update mutations via `rule.update`. Threshold display converts between mg/dL and mmol/L based on the source's `unitOfMeasure`; canonical storage stays mg/dL on SRF. Critical-low has a client-side floor of 50 mg/dL with helper text, mirroring the SRF CHECK constraint shipped in Plan 1.

**Tech Stack:** Expo SDK 55, Expo Router, React Native, NativeWind/inline styles per existing patterns, React Query via tRPC v11, `@react-native-community/slider@^5.1.2` (already in `package.json`).

**Spec reference:** `../specs/2026-05-12-alert-config-and-onboarding-design.md` (this repo).

**Dependencies:**
- Requires SRF Plan 1 (`2026-05-12-srf-alert-config-foundation.md`) deployed — the `rule` tRPC router and `unitOfMeasure` column must be live in production.
- Independent of Plan 2 (onboarding flow) — Plan 2 wires the hamburger entry that lands on `/cgm/[sourceId]/edit`; this plan builds the screen itself. Either can ship first; both must ship to close the v1 loop.
- Independent of Plan 1.6 (credential encryption) — that's a backend hardening that doesn't change the wire shape Mobile consumes.

**`UserPreferences.segment` enum values:** the real values are `"diabetes"` and `"metabolic_health"` (not `"metabolic"` — that was a typo in earlier plan docs corrected by the SRF agent). Reference: `Gently_SRF/packages/db/src/schema/user-preferences.ts:7-10`.

---

## File map

**New files:**
- `apps/expo/src/app/cgm/[sourceId]/edit.tsx` — the source edit screen
- `apps/expo/src/components/cgm/AlertRuleCard.tsx` — reusable single-rule editor
- `apps/expo/src/components/cgm/UnitOfMeasurePicker.tsx` — segmented mg/dL ↔ mmol/L control
- `apps/expo/src/components/cgm/LevelSlider.tsx` — 0-4 stepped slider with text label
- `apps/expo/src/components/cgm/LightColorPicker.tsx` — None + 7 color chips
- `apps/expo/src/utils/glucose-units.ts` — `toMmolL(mgDl)`, `toMgDl(mmolL)`, formatters
- `apps/expo/src/utils/glucose-units.test.ts`
- `apps/expo/src/components/cgm/AlertRuleCard.test.tsx` (component snapshot if used)

**Modified files:**
- `apps/expo/src/app/cgm/add.tsx` — add unit-of-measure picker; send `unitOfMeasure` in the `dexcom.create` mutation
- `apps/expo/src/app/cgm/add.tsx` test (if present) — cover the new field
- `apps/expo/src/types/alert-payload.ts` — no change expected (wire schema stable per design spec)

---

## Task 1: Glucose unit conversion utilities

**Files:**
- Create: `apps/expo/src/utils/glucose-units.ts`
- Create: `apps/expo/src/utils/glucose-units.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  toMmolL,
  toMgDl,
  formatGlucose,
  clampCriticalLow,
} from "./glucose-units";

describe("glucose-units", () => {
  it("converts mg/dL to mmol/L (rounded to 1 decimal)", () => {
    expect(toMmolL(70)).toBe(3.9);
    expect(toMmolL(180)).toBe(10.0);
    expect(toMmolL(50)).toBe(2.8);
  });

  it("converts mmol/L to mg/dL (rounded to nearest integer)", () => {
    expect(toMgDl(3.9)).toBe(70);
    expect(toMgDl(10.0)).toBe(180);
    expect(toMgDl(2.8)).toBe(50);
  });

  it("round-trip preserves whole mg/dL values within 1 mg/dL", () => {
    for (const mg of [50, 70, 100, 140, 180, 250, 300]) {
      const round = toMgDl(toMmolL(mg));
      expect(Math.abs(round - mg)).toBeLessThanOrEqual(1);
    }
  });

  it("formatGlucose renders with the right unit suffix", () => {
    expect(formatGlucose(70, "mg_dl")).toBe("70 mg/dL");
    expect(formatGlucose(70, "mmol_l")).toBe("3.9 mmol/L");
  });

  it("clampCriticalLow rejects below 50 mg/dL", () => {
    expect(clampCriticalLow(49)).toBe(50);
    expect(clampCriticalLow(50)).toBe(50);
    expect(clampCriticalLow(70)).toBe(70);
  });
});
```

- [ ] **Step 2: Verify fail**

```bash
pnpm -F @gently/expo test -- glucose-units
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

In `apps/expo/src/utils/glucose-units.ts`:

```ts
const MG_PER_MMOL = 18.018;

export type GlucoseUnit = "mg_dl" | "mmol_l";

export function toMmolL(mgDl: number): number {
  return Math.round((mgDl / MG_PER_MMOL) * 10) / 10;
}

export function toMgDl(mmolL: number): number {
  return Math.round(mmolL * MG_PER_MMOL);
}

export function formatGlucose(mgDl: number, unit: GlucoseUnit): string {
  if (unit === "mmol_l") return `${toMmolL(mgDl).toFixed(1)} mmol/L`;
  return `${mgDl} mg/dL`;
}

export const CRITICAL_LOW_FLOOR_MG_DL = 50;

export function clampCriticalLow(mgDl: number): number {
  return Math.max(mgDl, CRITICAL_LOW_FLOOR_MG_DL);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm -F @gently/expo test -- glucose-units
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/utils/glucose-units.ts apps/expo/src/utils/glucose-units.test.ts
git commit -m "$(cat <<'EOF'
Add glucose-unit conversion utilities

Canonical storage is mg/dL; UI displays in the source's unit. Includes
the critical-low hardware floor of 50 mg/dL clamp, mirroring the SRF
CHECK constraint.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: UnitOfMeasurePicker component

**Files:**
- Create: `apps/expo/src/components/cgm/UnitOfMeasurePicker.tsx`

A simple segmented control. Pressed segment fires `onChange` with the new unit.

- [ ] **Step 1: Implement**

```tsx
import { Pressable, Text, View } from "react-native";

import { colors } from "~/styles";  // adjust to existing pattern
import type { GlucoseUnit } from "~/utils/glucose-units";

interface Props {
  value: GlucoseUnit;
  onChange: (next: GlucoseUnit) => void;
}

export function UnitOfMeasurePicker({ value, onChange }: Props) {
  return (
    <View style={{ flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
      {(["mg_dl", "mmol_l"] as const).map((unit) => {
        const active = unit === value;
        return (
          <Pressable
            key={unit}
            onPress={() => onChange(unit)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.onPrimary : colors.text,
                fontWeight: active ? "700" : "500",
              }}
            >
              {unit === "mg_dl" ? "mg/dL" : "mmol/L"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

Adapt the imports and style props to match this app's existing component patterns (find a similar segmented control or button group already in the codebase if one exists; reuse rather than re-style).

- [ ] **Step 2: Commit**

```bash
git add apps/expo/src/components/cgm/UnitOfMeasurePicker.tsx
git commit -m "$(cat <<'EOF'
Add UnitOfMeasurePicker segmented control

Two-segment picker for mg/dL ↔ mmol/L. Used in the cgm/add form (Task 3)
and the source edit screen (Task 5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add unit-of-measure to `cgm/add.tsx`

**Files:**
- Modify: `apps/expo/src/app/cgm/add.tsx`

- [ ] **Step 1: Locate the form's state, layout, and submit handler**

Find:
- The `useState` for username/password/region/displayName
- The `<TextInput>` rendering
- The submit handler that calls `trpc.dexcom.create.mutate`

- [ ] **Step 2: Add state, picker, and mutation input**

```tsx
import { UnitOfMeasurePicker } from "~/components/cgm/UnitOfMeasurePicker";
import type { GlucoseUnit } from "~/utils/glucose-units";

// inside the component, alongside existing useState calls:
const [unitOfMeasure, setUnitOfMeasure] = useState<GlucoseUnit>("mg_dl");

// in the render, below the other inputs (or wherever fits the layout):
<View style={{ marginTop: 16 }}>
  <Text style={typography.label}>Glucose units</Text>
  <UnitOfMeasurePicker value={unitOfMeasure} onChange={setUnitOfMeasure} />
</View>

// in the submit handler, include unitOfMeasure in the mutation input:
await mutation.mutateAsync({
  region: trimmedRegion,
  username: username.trim(),
  password: password.trim(),
  displayName: displayName.trim() || undefined,
  unitOfMeasure,
});
```

- [ ] **Step 3: Smoke test in the emulator**

Run the app, sign in as test user, navigate to cgm/add. Pick mmol/L. Submit with real Dexcom creds. After source creation, `trpc.dexcom.list` should return the new source with `unitOfMeasure: "mmol_l"` (verify via React Query devtools or by tap-checking the source).

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/app/cgm/add.tsx
git commit -m "$(cat <<'EOF'
Add unit-of-measure picker to cgm/add form

User picks mg/dL or mmol/L when connecting Dexcom; sent to SRF in
dexcom.create. Source stores it; future reads convert thresholds for
display.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: LevelSlider component (vibrate/audio 0-4)

**Files:**
- Create: `apps/expo/src/components/cgm/LevelSlider.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Text, View } from "react-native";
import Slider from "@react-native-community/slider";

import { colors } from "~/styles";  // adjust

const LABELS = ["Off", "Light", "Medium", "Strong", "Max"] as const;

interface Props {
  label: string;       // e.g. "Vibrate" or "Audio"
  value: number;       // 0-4
  onChange: (next: number) => void;
}

export function LevelSlider({ label, value, onChange }: Props) {
  const clamped = Math.min(Math.max(Math.round(value), 0), 4);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: colors.muted }}>{LABELS[clamped]}</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={4}
        step={1}
        value={clamped}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
      />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/expo/src/components/cgm/LevelSlider.tsx
git commit -m "$(cat <<'EOF'
Add LevelSlider component (0=Off, 1-4=intensity)

Used for both vibrate and audio levels on the AlertRuleCard. Labels
match the SRF level-translator semantics.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: LightColorPicker component

**Files:**
- Create: `apps/expo/src/components/cgm/LightColorPicker.tsx`

Per `Gently_Mobile/CLAUDE.md`, the bracelet supports 7 LED colors plus off. Render a row of color chips + a "None" option.

- [ ] **Step 1: Implement**

```tsx
import { Pressable, Text, View } from "react-native";

import { colors as palette } from "~/styles";  // adjust

const LED_COLORS = [
  { id: "Red",    swatch: "#E53935" },
  { id: "Yellow", swatch: "#FBC02D" },
  { id: "Green",  swatch: "#43A047" },
  { id: "Blue",   swatch: "#1E88E5" },
  { id: "Purple", swatch: "#8E24AA" },
  { id: "Orange", swatch: "#FB8C00" },
  { id: "White",  swatch: "#F5F5F5" },
] as const;

interface Props {
  value: string | null;   // null = off
  onChange: (next: string | null) => void;
}

export function LightColorPicker({ value, onChange }: Props) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: "600", marginBottom: 8 }}>Light</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable
          onPress={() => onChange(null)}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "transparent",
            borderWidth: value === null ? 3 : 1,
            borderColor: value === null ? palette.primary : palette.border,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="No light"
          accessibilityState={{ selected: value === null }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600" }}>OFF</Text>
        </Pressable>
        {LED_COLORS.map(({ id, swatch }) => (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityLabel={`Color ${id}`}
            accessibilityState={{ selected: value === id }}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: swatch,
              borderWidth: value === id ? 3 : 1,
              borderColor: value === id ? palette.primary : palette.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/expo/src/components/cgm/LightColorPicker.tsx
git commit -m "$(cat <<'EOF'
Add LightColorPicker component

7 color chips + an explicit Off option, matching the 7 LED colors the
bracelet firmware supports per CLAUDE.md. Value is the color name
(e.g. "Red") or null for off.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: AlertRuleCard component

**Files:**
- Create: `apps/expo/src/components/cgm/AlertRuleCard.tsx`

This is the big one. One card per `alert_rule` row. Shows: kind label, enabled toggle, threshold input (with unit conversion + critical-low floor), vibrate slider, audio slider, light picker, duration / repeat / escalate inputs, Test alarm button.

- [ ] **Step 1: Define the component shell**

```tsx
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { LevelSlider } from "./LevelSlider";
import { LightColorPicker } from "./LightColorPicker";
import type { RouterOutputs } from "~/utils/api";
import { trpc } from "~/utils/api";
import {
  type GlucoseUnit,
  clampCriticalLow,
  toMgDl,
  toMmolL,
  CRITICAL_LOW_FLOOR_MG_DL,
} from "~/utils/glucose-units";
import { colors, typography } from "~/styles";

type Rule = RouterOutputs["rule"]["listForSource"][number];

interface Props {
  rule: Rule;
  unit: GlucoseUnit;
}

const KIND_LABELS: Record<string, string> = {
  low: "Low",
  critical_low: "Critical Low",
  high: "High",
  falling_fast: "Falling fast",
  rising_fast: "Rising fast",
  stale: "Stale reading",
  spike_above: "Spike above",
  sustained_above: "Sustained above",
  post_meal_unresolved: "Post-meal unresolved",
  tir_breach: "Time-in-range breach",
};

export function AlertRuleCard({ rule, unit }: Props) {
  const [local, setLocal] = useState(rule);
  const update = trpc.rule.update.useMutation({
    onError: () => setLocal(rule),  // revert on failure
  });
  const test = trpc.rule.test.useMutation();
  const utils = trpc.useUtils();

  function patch(next: Partial<Rule>) {
    setLocal({ ...local, ...next });
    update.mutate(
      { ruleId: rule.id, ...next },
      {
        onSuccess: () => {
          utils.rule.listForSource.invalidate({ sourceId: rule.cgmSourceId });
        },
      },
    );
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        opacity: local.enabled ? 1 : 0.6,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={typography.heading}>{KIND_LABELS[local.kind] ?? local.kind}</Text>
        <Switch value={local.enabled} onValueChange={(v) => patch({ enabled: v })} />
      </View>

      {/* Threshold — null for engine-evaluated rules like post_meal / tir_breach */}
      {local.threshold !== null && (
        <ThresholdRow
          kind={local.kind}
          mgDl={local.threshold}
          unit={unit}
          onChange={(nextMgDl) => patch({ threshold: nextMgDl })}
        />
      )}

      <LevelSlider
        label="Vibrate"
        value={local.vibrationLevel}
        onChange={(v) => patch({ vibrationLevel: v })}
      />
      <LevelSlider
        label="Audio"
        value={local.audioLevel}
        onChange={(v) => patch({ audioLevel: v })}
      />
      <LightColorPicker
        value={local.ledColor}
        onChange={(c) => patch({ ledColor: c })}
      />

      <DurationInputs
        durationSec={local.durationSec}
        repeatAfterMin={local.repeatAfterMin}
        escalateAfterMin={local.escalateAfterMin}
        onChange={(next) => patch(next)}
      />

      <Pressable
        onPress={() => test.mutate({ ruleId: rule.id })}
        disabled={test.isPending}
        style={{
          marginTop: 12,
          paddingVertical: 10,
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {test.isPending ? <ActivityIndicator /> : <Text style={{ fontWeight: "600" }}>Test alarm</Text>}
      </Pressable>
      {test.error && (
        <Text style={{ color: colors.error, marginTop: 8, fontSize: 12 }}>
          {test.error.message}
        </Text>
      )}
    </View>
  );
}

// ThresholdRow handles unit display + critical-low floor enforcement
function ThresholdRow({
  kind, mgDl, unit, onChange,
}: {
  kind: string;
  mgDl: number;
  unit: GlucoseUnit;
  onChange: (nextMgDl: number) => void;
}) {
  const display = unit === "mmol_l" ? toMmolL(mgDl).toFixed(1) : String(mgDl);
  const [draft, setDraft] = useState(display);

  function commit() {
    const parsed = parseFloat(draft);
    if (Number.isNaN(parsed)) {
      setDraft(display);
      return;
    }
    let next = unit === "mmol_l" ? toMgDl(parsed) : Math.round(parsed);
    if (kind === "critical_low") next = clampCriticalLow(next);
    onChange(next);
    setDraft(unit === "mmol_l" ? toMmolL(next).toFixed(1) : String(next));
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: "600", marginBottom: 4 }}>
        Threshold ({unit === "mmol_l" ? "mmol/L" : "mg/dL"})
      </Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onEndEditing={commit}
        keyboardType="decimal-pad"
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 16,
        }}
      />
      {kind === "critical_low" && (
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
          Minimum {CRITICAL_LOW_FLOOR_MG_DL} mg/dL — hardware safety limit.
        </Text>
      )}
    </View>
  );
}

function DurationInputs({
  durationSec, repeatAfterMin, escalateAfterMin, onChange,
}: {
  durationSec: number;
  repeatAfterMin: number | null;
  escalateAfterMin: number | null;
  onChange: (next: Partial<Rule>) => void;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <NumericRow
        label="Duration (sec)"
        value={durationSec}
        onChange={(v) => onChange({ durationSec: Math.max(1, Math.min(60, v)) })}
      />
      <NumericRow
        label="Repeat every (min)"
        nullable
        value={repeatAfterMin}
        onChange={(v) => onChange({ repeatAfterMin: v })}
      />
      <NumericRow
        label="Escalate after (min)"
        nullable
        value={escalateAfterMin}
        onChange={(v) => onChange({ escalateAfterMin: v })}
      />
    </View>
  );
}

function NumericRow({
  label, value, onChange, nullable = false,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  nullable?: boolean;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <Text style={{ flex: 1, fontWeight: "500" }}>{label}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={() => {
          if (draft === "" && nullable) {
            onChange(null);
            return;
          }
          const n = parseInt(draft, 10);
          if (Number.isNaN(n)) {
            setDraft(value === null ? "" : String(value));
            return;
          }
          onChange(n);
        }}
        keyboardType="number-pad"
        style={{
          width: 80,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 6,
          textAlign: "right",
        }}
      />
    </View>
  );
}
```

- [ ] **Step 2: Adapt style imports**

Replace `~/styles` imports with whatever the existing app uses. If there's no shared `colors`/`typography` object, use NativeWind classes or inline styles matching the existing component conventions.

- [ ] **Step 3: Commit**

```bash
git add apps/expo/src/components/cgm/AlertRuleCard.tsx
git commit -m "$(cat <<'EOF'
Add AlertRuleCard component

One card per alert_rule row. Threshold field handles unit conversion
and critical-low floor enforcement; level sliders + light picker drive
alarm style; Test alarm button calls rule.test. Optimistic updates
revert on mutation failure.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Source edit screen — skeleton with data loading

**Files:**
- Create: `apps/expo/src/app/cgm/[sourceId]/edit.tsx`

- [ ] **Step 1: Implement the skeleton**

```tsx
import { useLocalSearchParams, router, Stack } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlertRuleCard } from "~/components/cgm/AlertRuleCard";
import { UnitOfMeasurePicker } from "~/components/cgm/UnitOfMeasurePicker";
import { trpc } from "~/utils/api";
import { colors, containers, typography } from "~/styles";

const DIABETES_KINDS = ["low", "critical_low", "high", "falling_fast", "stale"];
const METABOLIC_KINDS = [
  "spike_above",
  "sustained_above",
  "post_meal_unresolved",
  "tir_breach",
  "low",
];

export default function SourceEditScreen() {
  const { sourceId } = useLocalSearchParams<{ sourceId: string }>();
  const sourcesQ = trpc.dexcom.list.useQuery();
  const rulesQ = trpc.rule.listForSource.useQuery({ sourceId });
  const prefsQ = trpc.userPreferences.get.useQuery();
  const updateSource = trpc.dexcom.update.useMutation({
    onSuccess: () => sourcesQ.refetch(),
  });

  if (sourcesQ.isLoading || rulesQ.isLoading || prefsQ.isLoading) {
    return (
      <SafeAreaView style={containers.screen}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const source = sourcesQ.data?.find((s) => s.id === sourceId);
  if (!source) {
    return (
      <SafeAreaView style={containers.screen}>
        <Text>Source not found.</Text>
      </SafeAreaView>
    );
  }

  // Segment defaults to "diabetes" if UserPreferences row hasn't been set
  // (real enum values: "diabetes" | "metabolic_health" per
  // Gently_SRF/packages/db/src/schema/user-preferences.ts)
  const segment = prefsQ.data?.segment ?? "diabetes";
  const visibleKinds = segment === "metabolic_health" ? METABOLIC_KINDS : DIABETES_KINDS;
  const visibleRules = (rulesQ.data ?? []).filter((r) => visibleKinds.includes(r.kind));

  return (
    <SafeAreaView style={containers.screen}>
      <Stack.Screen options={{ title: source.displayName }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Source identity */}
        <View style={{ marginBottom: 24 }}>
          <Text style={typography.heading}>Connection</Text>
          <LabelValueRow label="Region" value={source.region?.toUpperCase() ?? "—"} />
          <LabelValueRow label="Username" value={source.username ?? "—"} />
          <View style={{ marginTop: 16 }}>
            <Text style={typography.label}>Glucose units</Text>
            <UnitOfMeasurePicker
              value={source.unitOfMeasure ?? "mg_dl"}
              onChange={(next) => updateSource.mutate({ sourceId, unitOfMeasure: next })}
            />
          </View>
        </View>

        {/* Alert rules */}
        <View style={{ marginBottom: 24 }}>
          <Text style={typography.heading}>Alerts</Text>
          {visibleRules.length === 0 ? (
            <Text style={{ color: colors.muted, marginTop: 8 }}>
              No alert rules yet. They are created automatically when a Dexcom source is added.
              If you don't see any here, remove and re-add this source.
            </Text>
          ) : (
            visibleRules.map((rule) => (
              <AlertRuleCard
                key={rule.id}
                rule={rule}
                unit={source.unitOfMeasure ?? "mg_dl"}
              />
            ))
          )}
        </View>

        {/* Delete source */}
        <Pressable
          onPress={() => confirmDelete(sourceId)}
          style={{
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: 10,
            backgroundColor: colors.errorSurface ?? "#FEE",
            marginTop: 32,
          }}
        >
          <Text style={{ color: colors.error, fontWeight: "700" }}>
            Disconnect Dexcom source
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LabelValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
      <Text style={{ fontWeight: "500" }}>{label}</Text>
      <Text style={{ color: colors.muted }}>{value}</Text>
    </View>
  );
}

function confirmDelete(sourceId: string) {
  Alert.alert(
    "Disconnect Dexcom source?",
    "Glucose monitoring and alerts will stop. Your credentials will be removed.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => {
          // wired in Task 9 (delete mutation)
        },
      },
    ],
  );
}
```

- [ ] **Step 2: Confirm the route resolves**

```bash
pnpm -F @gently/expo dev:android -- --clear
```

Expected: navigating to `/cgm/<sourceId>/edit` renders the page. If queries error, fix the import paths or tRPC method names per current code.

- [ ] **Step 3: Commit**

```bash
git add "apps/expo/src/app/cgm/[sourceId]/edit.tsx"
git commit -m "$(cat <<'EOF'
Add source edit screen skeleton

Loads source from dexcom.list, rules from rule.listForSource, and the
user's preference segment. Renders source identity, alert-rule cards
filtered by pack, unit-of-measure picker, and a placeholder
disconnect button. Defensive empty-state message if rules haven't
been seeded yet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Unit-of-measure round-trip on the edit screen

Source-level `unitOfMeasure` is loaded from `dexcom.list` (per Plan 1, the procedure returns the field). Changing the picker calls `dexcom.update` with `unitOfMeasure`. After mutation success, the source list refetches and all rule cards re-render with the new display unit.

This is exercised by the existing Task 7 wiring. Add coverage to verify the round trip:

- [ ] **Step 1: Manual smoke test**

1. Open the edit screen for your source.
2. Toggle the unit picker from mg/dL to mmol/L.
3. All threshold values on rule cards should re-render in mmol/L (e.g., 70 → 3.9, 250 → 13.9).
4. Toggle back to mg/dL.
5. Values return to original integers.

- [ ] **Step 2: Edit a threshold while in mmol/L mode**

1. Set a Low threshold to `4.0` mmol/L.
2. Switch back to mg/dL.
3. Value should now read `72` mg/dL (4.0 × 18.018 = 72.07, rounded).
4. Confirm no off-by-one issues for `70` ↔ `3.9` round-trip.

- [ ] **Step 3: Edit a critical-low threshold and try to set it below 50 mg/dL**

1. Try setting critical-low to `40` mg/dL (or `2.0` mmol/L in mmol/L mode).
2. Client should clamp to 50 mg/dL (or 2.8 mmol/L).
3. Server's CHECK constraint provides defense in depth — if the clamp ever fails client-side, the server rejects with a clear message.

- [ ] **Step 4: Commit any fixes**

If the manual smoke test revealed any rendering or conversion bugs, commit fixes here:

```bash
git add apps/expo/src/components/cgm/AlertRuleCard.tsx apps/expo/src/utils/glucose-units.ts
git commit -m "Fix glucose unit round-trip edge cases discovered during smoke test"
```

---

## Task 9: Wire the disconnect-source flow

**Files:**
- Modify: `apps/expo/src/app/cgm/[sourceId]/edit.tsx` (the `confirmDelete` function and its `onPress` wiring)

The placeholder from Task 7 needs to call `dexcom.delete` (or `dexcom.update` with `active: false` — check current SRF surface).

- [ ] **Step 1: Look up the SRF procedure**

```bash
grep -n "delete\|deactivate\|active: false" ../Gently_SRF/packages/api/src/router/dexcom.ts | head
```

If there's a real `dexcom.delete` procedure, use it. If only `dexcom.update({ active: false })` exists, use that and treat the source as "disconnected" rather than hard-deleted. Either is fine for v1.

- [ ] **Step 2: Implement the mutation**

```tsx
const deleteMutation = trpc.dexcom.update.useMutation({  // or dexcom.delete if it exists
  onSuccess: () => router.replace("/dashboard"),
});

function confirmDelete() {
  Alert.alert(
    "Disconnect Dexcom source?",
    "Glucose monitoring and alerts will stop. Your credentials will be removed.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ sourceId, active: false }),
      },
    ],
  );
}
```

- [ ] **Step 3: Smoke test**

Open edit screen, tap Disconnect, confirm. Should land on `/dashboard`. The source should no longer appear in `dexcom.list` results (or appears with `active: false` if soft-delete).

- [ ] **Step 4: Commit**

```bash
git add "apps/expo/src/app/cgm/[sourceId]/edit.tsx"
git commit -m "$(cat <<'EOF'
Wire source disconnect to dexcom.update({ active: false })

User can disconnect their source from the edit screen. Soft delete via
the existing dexcom.update mutation; hard delete is deferred work.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: End-to-end smoke test

- [ ] **Step 1: Typecheck**

```bash
pnpm -F @gently/expo typecheck
```

Expected: PASS, except for the three pre-existing `defaultPushNotification` / `defaultEmailNotification` typecheck errors in `apps/expo/src/app/settings.tsx` documented in coordinator memory. Do not address them here.

- [ ] **Step 2: Lint + tests**

```bash
pnpm -F @gently/expo lint
pnpm -F @gently/expo test
```

Expected: PASS.

- [ ] **Step 3: Manual full-flow smoke test on the emulator**

Walk a fresh user through the full v1 flow:

1. Clear app data.
2. Sign in as test user → onboarding → pair-bracelet → connect-dexcom hero → cgm/add (with new unit picker).
3. After source creation, hamburger → "Dexcom Source" → edit screen.
4. Confirm all 5 diabetes-pack rule cards render (low, critical_low, high, falling_fast, stale).
5. Toggle the unit picker; thresholds re-render correctly.
6. Adjust the Low threshold; switch unit and back; value persists correctly.
7. Try to set critical_low below 50 mg/dL; clamp engages.
8. Tap Test alarm on the Low card; `[alerts] Dispatching N BLE command(s)` log fires within ~1s.
9. Disable a rule; reopen the screen; rule renders greyed out and stays disabled.
10. Disconnect source; lands on dashboard; source no longer appears.

- [ ] **Step 4: Push**

```bash
git push origin main
```

- [ ] **Step 5: Notify coordinator**

Reply: "Mobile Plan 3 (source edit + alert-config UI) merged at HEAD `<sha>`. v1 alert-config surface is complete. Smoke test green; Test alarm verified end-to-end."

---

## What this plan does NOT cover

- **Password / region rotation** in the source edit screen — deferred work; the original `dexcom.update` UI brief still lives in coordinator memory.
- **Hard delete** of a source (with cascading glucose_reading cleanup) — soft-delete via `active: false` is the v1 path. Hard delete + right-to-deletion audit is in `project_compliance_audit.md`.
- **Current-glucose card on dashboard** — Plan 2.5 covers that separately; not blocking this plan.
- **Onboarding flow** — Plan 2 covers it independently.
- **SRF schema / backend / `rule` router** — Plan 1 (already deployed).

## Coordination notes

- Depends on Plan 1 being live. Verify `curl https://srf.gentlyus.com/api/health` returns 200 and the new `rule` router types are available in Mobile's `@gently/api` workspace package (if Mobile's lockfile doesn't pick them up, `pnpm install --force` per `Gently_SRF/CLAUDE.md` operational note).
- Plan 2 (onboarding) is independent — either order works. Both must ship to close the v1 surface.
- Plan 1.6 (credential encryption) is independent — does not change wire format Mobile consumes.
- If `trpc.rule.test` rate-limit fires during smoke testing, wait the 60s window and retry. Plan 1's rate limiter is 3 calls per user per minute.
