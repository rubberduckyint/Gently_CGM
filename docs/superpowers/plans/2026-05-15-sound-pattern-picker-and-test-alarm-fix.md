# Sound Pattern Picker + Test This Alarm Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Edit Alarm screen's misleading "Sound" slider (currently labeled Off/Soft/Medium/Strong/Max as if it varied volume) with a discrete 5-card pattern picker that reflects the bracelet's actual capability — the buzzer is fixed-loudness, so the firmware can only vary beep patterns, not volume. Plus fix the "Test This Alarm" button which is silently failing because Mobile doesn't surface the `rule.test` mutation's `{ dispatched: false, reason }` response when the push can't be sent.

**Architecture:** The current `LevelSlider` for audio (`apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx:364-393`) maps `audioLevel: 0-4` to vague volume labels but only patterns 1 and 2 are implemented in `apps/expo/src/services/alerts/translator.ts:AUDIO_PATTERN_PARAMS`. Levels 3 and 4 silently emit nothing. The fix:

1. **Replace the slider with a 5-card horizontal row** mirroring the existing LED color picker visual (single-row wrapping grid, ~42×42 swatches with selection state). Each card represents one of: Off / Quick Beeps / Long Beeps / Steady Tone / Heartbeat.
2. **Expand `AUDIO_PATTERN_PARAMS`** to cover all 4 active patterns (Quick=patternId 1, Long=2, Steady=3, Heartbeat=4) with explicit `onMs` / `offMs` values.
3. **Tap-to-preview** uses the existing `rule.test` mutation with `override.audioLevel`, same pattern as the LED color picker preview.
4. **Test This Alarm fix** — `rule.test` returns `{ dispatched, payload, reason }`. Today Mobile ignores `dispatched`. Inspect it; show "Couldn't reach your bracelet" with the `reason` if `dispatched: false`. Most likely cause when this fires: push token is null/stale in `UserPreferences`.

**Tech Stack:** React Native + Expo SDK 55, `react-native-ble-manager` v12.4.5, tRPC v11. No native-side changes — JS-only.

---

## Background — what's broken

**Sound slider (UX bug):**
- Labels imply volume; reality is pattern selection.
- `AUDIO_PATTERN_PARAMS` in `apps/expo/src/services/alerts/translator.ts` only defines onMs/offMs for patternIds 1 and 2. Levels 3 and 4 hit `audioCommand()` which returns null → no BLE command → silent bracelet.
- SRF's `level-translator.ts` maps `audioLevel → audioPatternId` as `[null, 1, 2, 3, 4]`, so SRF sends `audioPatternId: 3` or `4` to Mobile, but Mobile drops them.

**Test This Alarm (functional bug):**
- Mobile audit confirms `trpc.rule.test.mutate(input)` is wired correctly at `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx:180`.
- SRF's `rule.test` correctly constructs a `cgm_alert` payload and sends an Expo Push (`packages/api/src/router/rule.ts:139-222`).
- BUT `rule.test` returns `{ dispatched: false, reason: "no_push_token" }` if the user's `UserPreferences.pushNotificationToken` is null or invalid. Mobile never inspects this — the mutation succeeds, button shows "Saved", user sees nothing happen on the bracelet.

**Code references (against current Mobile HEAD on main):**
- `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx:170-181` — `testRule` mutation declaration (no `onSuccess`)
- `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx:364-393` — Sound slider block
- `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx:417-477` — Test This Alarm button + error rendering
- `apps/expo/src/components/cgm/AlarmDetail/LightColorPicker.tsx:49-154` — visual baseline for the new pattern picker
- `apps/expo/src/services/alerts/translator.ts:40-60` — `AUDIO_PATTERN_PARAMS` table
- `apps/expo/src/services/ble/commands/triggerAudioPattern.ts` — firmware command (onMs/offMs/totalDurationSec)

**Out of scope:**
- Vibration slider — works as-intended (vibration motor genuinely varies intensity)
- Schema migration to rename `audio_level` column — not needed; we keep `0-4` semantics, just attach new meanings (0=Off, 1=Quick, 2=Long, 3=Steady, 4=Heartbeat)
- SRF translator changes — already maps the right range `[null, 1, 2, 3, 4]`, just needs Mobile to honor patterns 3 and 4
- Edit Alarm `rule.update` / `rule.create` proliferation bug — confirmed in Mobile audit that Edit Alarm screen uses `rule.update`. The proliferation is a SRF-side `dexcom.create` re-seed bug, handled in the SRF plan running in parallel
- Native module changes — none

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `apps/expo/src/components/cgm/AlarmDetail/SoundPatternPicker.tsx` | New 5-card pattern selector | Create |
| `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx` | Edit Alarm screen | Replace audio LevelSlider with SoundPatternPicker; wire `testRule.onSuccess` to inspect `dispatched` |
| `apps/expo/src/services/alerts/translator.ts` | Audio level → BLE params mapping | Expand `AUDIO_PATTERN_PARAMS` to patternIds 1-4 with new (onMs, offMs) timings |

No backend changes. Three Mobile files touched.

---

## Conventions

- Real-device testing for UI and BLE preview. Use `npx expo prebuild --clean -p android && pnpm -F @gently/expo android` after structural changes.
- Tap-to-preview tests need bracelet in range + connected.
- Existing snapshot tests / Vitest patterns for translator unit tests; mirror what's already in `translator.test.ts` if present.

---

## Tasks

### Task 1: Diagnostic — confirm push token state in production

**Goal:** Before assuming `rule.test` fails for the no-push-token reason, verify Dave's actual `UserPreferences.pushNotificationToken` is valid. If null/invalid, that's the root cause and Task 4 needs to handle it gracefully; if valid, the bug is elsewhere and we need a deeper trace.

- [ ] **Step 1: Run a query against prod via Railway Postgres UI**

```sql
SELECT
  user_id,
  push_notification_token IS NOT NULL AS has_token,
  LEFT(push_notification_token, 25) AS token_prefix,
  LENGTH(push_notification_token) AS token_length,
  updated_at
FROM user_preferences
ORDER BY updated_at DESC
LIMIT 5;
```

- [ ] **Step 2: Interpret**

- `has_token=false` for Dave's user → push token never registered or got cleared. Root cause of "test does nothing". Continue with Task 4 to surface the error.
- `has_token=true`, `token_prefix=ExponentPushToken[...]` → token looks valid. Either Expo Push is dropping it (unlikely silent), or Mobile registered a stale token after a fresh install. Continue with Task 4 anyway — surfacing the dispatched-false signal is correct regardless.
- `has_token=true` but `token_prefix` looks malformed (not starting with `ExponentPushToken[` or `ExpoPushToken[`) → token format issue. Mobile's token-registration code may have written the wrong value.

Report findings in the PR description. No commit from this task.

---

### Task 2: Expand `AUDIO_PATTERN_PARAMS` in the translator

**Goal:** Define explicit on/off timings for the four active patterns (Quick, Long, Steady, Heartbeat). Today only patterns 1 and 2 are populated; patterns 3 and 4 silently emit no BLE command.

**Files:**
- Modify: `apps/expo/src/services/alerts/translator.ts` — the `AUDIO_PATTERN_PARAMS` table (~line 40)
- Tests: `apps/expo/src/services/alerts/translator.test.ts` (create if not present, or extend)

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { audioCommand } from "./translator.js";

describe("audioCommand", () => {
  it("returns null for audioPatternId=null (Off)", () => {
    expect(audioCommand(null, 10)).toBeNull();
  });

  it("returns Quick Beeps command for audioPatternId=1", () => {
    const cmd = audioCommand(1, 10);
    expect(cmd).not.toBeNull();
    expect(cmd?.onDurationMs).toBe(100);
    expect(cmd?.offDurationMs).toBe(100);
    expect(cmd?.totalDurationSeconds).toBe(10);
  });

  it("returns Long Beeps command for audioPatternId=2", () => {
    const cmd = audioCommand(2, 10);
    expect(cmd?.onDurationMs).toBe(500);
    expect(cmd?.offDurationMs).toBe(200);
  });

  it("returns Steady tone command for audioPatternId=3", () => {
    const cmd = audioCommand(3, 10);
    // Steady = continuous; offMs=0 means no gap, full-duration tone.
    expect(cmd?.onDurationMs).toBeGreaterThan(0);
    expect(cmd?.offDurationMs).toBe(0);
  });

  it("returns Heartbeat command for audioPatternId=4", () => {
    const cmd = audioCommand(4, 10);
    // Heartbeat = rapid pulse rhythm. Real heartbeat lub-dub isn't single
    // (on,off) — pick values that sound rhythmically distinct from the others.
    expect(cmd?.onDurationMs).toBe(80);
    expect(cmd?.offDurationMs).toBe(180);
  });
});
```

- [ ] **Step 2: Run; verify fail**

```bash
pnpm -F @gently/expo test
```

- [ ] **Step 3: Update `AUDIO_PATTERN_PARAMS`**

Replace the existing table:

```ts
// patternId → (onMs, offMs) — repeated for the duration of the alarm.
// patternId values match SRF's level-translator AUDIO_BY_LEVEL mapping:
// audioLevel 0 → null (Off, no command)
// audioLevel 1 → patternId 1 (Quick)
// audioLevel 2 → patternId 2 (Long)
// audioLevel 3 → patternId 3 (Steady)
// audioLevel 4 → patternId 4 (Heartbeat)
//
// The bracelet's buzzer is fixed-loudness — these patterns vary cadence,
// not volume. Tuned by ear; revisit if firmware exposes finer controls.
const AUDIO_PATTERN_PARAMS: Record<number, { onMs: number; offMs: number }> = {
  1: { onMs: 100, offMs: 100 }, // Quick — rapid alternating beeps
  2: { onMs: 500, offMs: 200 }, // Long — slower, more deliberate beeps
  3: { onMs: 2000, offMs: 0 },  // Steady — continuous tone within durationSec
  4: { onMs: 80, offMs: 180 },  // Heartbeat — rapid pulse rhythm
};
```

The `offMs: 0` for Steady relies on the firmware's behavior when offDurationMs is 0 — it should emit a continuous tone for the totalDurationSeconds. If the firmware engineer says offMs=0 is invalid, adjust to a very small value like 10ms.

- [ ] **Step 4: Run; verify pass**

- [ ] **Step 5: Commit**

```bash
git add apps/expo/src/services/alerts/translator.ts apps/expo/src/services/alerts/translator.test.ts
git commit -m "Expand AUDIO_PATTERN_PARAMS to cover patterns 1-4"
```

---

### Task 3: Build the `SoundPatternPicker` component

**Goal:** A new component that mirrors `LightColorPicker`'s visual style — a horizontal-wrapping row of 5 tappable cards, each representing one audio pattern (Off + 4 sound patterns). Selected card gets the cyan accent treatment.

**Files:**
- Create: `apps/expo/src/components/cgm/AlarmDetail/SoundPatternPicker.tsx`

- [ ] **Step 1: Read `LightColorPicker.tsx` for layout reference**

The picker should match LightColorPicker's structural pattern: section header with title + Turn off / Turn on toggle on the right, a wrapping row of swatch-like cards, and a selection label below ("Selected: Quick Beeps").

- [ ] **Step 2: Build the component**

```tsx
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { tokens } from "~/styles/tokens";
import { typographyV2 } from "~/styles/typography-v2";

// Five sound patterns, in display order. audioLevel column on alert_rule
// stores 0-4; the indices here match.
export const SOUND_PATTERNS = [
  { id: 0, label: "Off", glyph: "✕" },
  { id: 1, label: "Quick", glyph: "⋯" },
  { id: 2, label: "Long", glyph: "–" },
  { id: 3, label: "Steady", glyph: "▬" },
  { id: 4, label: "Heartbeat", glyph: "♥" },
] as const;

export type SoundPatternId = 0 | 1 | 2 | 3 | 4;

interface SoundPatternPickerProps {
  value: SoundPatternId;
  onChange: (v: SoundPatternId) => void;
  /** Called when user taps a card — used to fire a one-shot preview. */
  onPreview?: (v: SoundPatternId) => void;
}

export function SoundPatternPicker({
  value,
  onChange,
  onPreview,
}: SoundPatternPickerProps) {
  const selectedLabel = useMemo(
    () => SOUND_PATTERNS.find((p) => p.id === value)?.label ?? "Off",
    [value],
  );

  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text style={[typographyV2.eyebrow, { color: tokens.color.ink3 }]}>
          SOUND
        </Text>
        <Pressable onPress={() => onChange(0)}>
          <Text
            style={[
              typographyV2.body,
              {
                color: value === 0 ? tokens.color.ink3 : tokens.color.cyanDeep,
              },
            ]}
          >
            {value === 0 ? "Off" : "Turn off"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {SOUND_PATTERNS.filter((p) => p.id !== 0).map((p) => {
          const selected = p.id === value;
          const off = value === 0;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                onChange(p.id);
                onPreview?.(p.id);
              }}
              style={{
                minWidth: 64,
                height: 56,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: tokens.color.card,
                borderWidth: 2,
                borderColor: selected
                  ? tokens.color.cyanDeep
                  : "transparent",
                opacity: off ? 0.4 : 1,
                alignItems: "center",
                justifyContent: "center",
                ...(selected
                  ? {
                      shadowColor: tokens.color.cyanDeep,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 4,
                    }
                  : {}),
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: selected ? tokens.color.cyanDeep : tokens.color.ink1,
                  fontWeight: "600",
                }}
              >
                {p.glyph}
              </Text>
              <Text
                style={[
                  typographyV2.caption,
                  {
                    color: selected ? tokens.color.cyanDeep : tokens.color.ink2,
                    marginTop: 2,
                  },
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        style={[
          typographyV2.caption,
          { color: tokens.color.ink3, marginTop: 8 },
        ]}
      >
        {"Selected: "}
        <Text style={{ color: tokens.color.ink1 }}>{selectedLabel}</Text>
      </Text>
    </View>
  );
}
```

Adapt `tokens` / `typographyV2` imports to match what `LightColorPicker.tsx` uses if the paths differ.

- [ ] **Step 3: No tests yet** — visual component, exercised via the Edit Alarm screen integration in Task 4.

- [ ] **Step 4: Commit**

```bash
git add apps/expo/src/components/cgm/AlarmDetail/SoundPatternPicker.tsx
git commit -m "Add SoundPatternPicker component for Edit Alarm screen"
```

---

### Task 4: Wire SoundPatternPicker into Edit Alarm + fix Test This Alarm

**Goal:** Replace the existing audio `LevelSlider` with the new picker. Connect tap-to-preview through `rule.test`. Fix the silent failure of Test This Alarm by inspecting the mutation's `{ dispatched, reason }` response.

**Files:**
- Modify: `apps/expo/src/app/cgm/[sourceId]/alarms/[ruleId]/edit.tsx`

- [ ] **Step 1: Replace the SOUND section**

Around line 364-393, replace the existing `<View>` containing the SOUND eyebrow + LevelSlider with:

```tsx
<View
  style={[
    tokens.shadow.card,
    {
      backgroundColor: tokens.color.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 14,
    },
  ]}
>
  <SoundPatternPicker
    value={(local.audioLevel ?? 0) as SoundPatternId}
    onChange={(v) => {
      applyChange({ audioLevel: v });
    }}
    onPreview={(v) => previewAudio(v)}
  />
</View>
```

Add the import at the top of the file:

```tsx
import {
  SoundPatternPicker,
  type SoundPatternId,
} from "~/components/cgm/AlarmDetail/SoundPatternPicker";
```

Remove the now-unused `AUDIO_LABELS` constant (and any other audio-slider-specific imports / state if they exist only for the slider).

- [ ] **Step 2: Inspect `testRule` mutation's `dispatched` response**

Around line 171-181 (the existing `testRule` declaration), extend with `onSuccess` and `onError` handlers:

```tsx
const testRule = useMutation({
  mutationFn: (input: {
    ruleId: string;
    override?: {
      vibrationLevel?: number;
      audioLevel?: number;
      ledColor?: string | null;
      durationSec?: number;
    };
  }) => trpc.rule.test.mutate(input),
  onSuccess: (result) => {
    if (!result.dispatched) {
      // SRF couldn't deliver the test push — most likely the user's
      // pushNotificationToken is null or invalid. Surface a clear message
      // instead of letting the button silently succeed.
      const reason =
        result.reason === "no_push_token"
          ? "We don't have a valid push notification token registered for this device. Try signing out and back in."
          : `Test couldn't be delivered (${result.reason ?? "unknown"}).`;
      setTestErrorMsg(reason);
    } else {
      setTestErrorMsg(null);
    }
  },
});
```

Add a local state variable for the test error around the other `useState` calls:

```tsx
const [testErrorMsg, setTestErrorMsg] = useState<string | null>(null);
```

- [ ] **Step 3: Render the testErrorMsg below the button**

Find the existing `testRule.error` rendering (around line 466-477). Replace or augment so both `testRule.error` (network / TRPCError) AND `testErrorMsg` (returned dispatched: false) render:

```tsx
{(testRule.error || testErrorMsg) && (
  <Text
    style={[
      typographyV2.body,
      {
        color: tokens.color.coral,
        marginTop: 10,
        textAlign: "center",
        paddingHorizontal: 12,
      },
    ]}
  >
    {testRule.error
      ? /rate_limit|too many/i.test(testRule.error.message)
        ? "Too many test alarms. Try again in a minute."
        : `Test failed: ${testRule.error.message}`
      : testErrorMsg}
  </Text>
)}
```

- [ ] **Step 4: Typecheck + lint**

```bash
pnpm -F @gently/expo typecheck && pnpm -F @gently/expo lint
```
Expected: clean.

- [ ] **Step 5: Real-device test**

```bash
npx expo prebuild --clean -p android
pnpm -F @gently/expo android
```

Test scenarios:

1. **Sound picker visual** — Open Edit Alarm screen. Confirm 4 pattern cards (Quick / Long / Steady / Heartbeat) plus an Off toggle at the top-right. Tapping a card selects it with cyan border, fires the bracelet's preview tone matching that pattern.
2. **Persistence** — Tap Long → exit screen → return to Edit Alarm. Long should still be selected.
3. **Test This Alarm — happy path** (assuming valid push token): tap "Test this alarm". Bracelet vibrates / lights / buzzes within ~3s.
4. **Test This Alarm — no token path** (use Task 1's diagnostic to confirm token state first): if your push token is currently null or invalid, the button should now show "We don't have a valid push notification token..." Otherwise the bug is at a different layer and we'll need a follow-up investigation.

- [ ] **Step 6: Commit**

```bash
git add apps/expo/src/app/\(...\)/edit.tsx  # adjust path escaping for your shell
git commit -m "Replace audio slider with SoundPatternPicker + surface test-dispatch errors"
```

---

### Task 5: Acceptance + cleanup

**Goal:** Verify the four code paths work together on a clean install + capture the production push-token state for the SRF coordinator.

- [ ] **Step 1: Run the full acceptance matrix**

| Scenario | Expected |
|---|---|
| Open Edit Alarm, tap each of the 5 sound options | Each selects + previews on bracelet (audible/perceptible difference between Quick / Long / Steady / Heartbeat) |
| Tap "Off" toggle (top-right) | All 4 pattern cards dim (opacity 0.4); audioLevel saved as 0; no preview fires |
| Tap "Test this alarm" with valid push token | Bracelet fires within ~3s |
| Tap "Test this alarm" with invalid/no push token | Error message renders: "We don't have a valid push notification token..." |
| Persist across screen reload | Selection survives navigation away + back |
| Persist across app reload | Selection survives full app kill + relaunch |

- [ ] **Step 2: Report results in PR description**

Note any preview-timing oddities (e.g., heartbeat sounds too similar to quick). Adjust `AUDIO_PATTERN_PARAMS` if needed — small follow-up commit is fine. Report Task 1's push-token query result.

- [ ] **Step 3: Final commit if any timing adjustments**

```bash
git add apps/expo/src/services/alerts/translator.ts
git commit -m "Tune audio pattern timings after real-device test"
```

---

## Notes for the executing agent

1. **Real-device required for the preview tests (Task 4 step 5, Task 5).** Mobile dev-client install must be fresh: `npx expo prebuild --clean -p android && pnpm -F @gently/expo android`. Bracelet must be paired and connected before testing previews.

2. **Logging:** Expo Dev Tools logging was flaky in the morning's session. Use `adb logcat -s ReactNativeJS:V | grep -E "alerts|BLE Reconnect|BLE Context"` in a separate terminal.

3. **Task 1 (push-token diagnostic) is read-only** — running the SQL doesn't touch state. Do this before Task 4 so you can validate "Test This Alarm" behavior against known token state.

4. **SRF side is untouched.** The audio-level → patternId mapping in SRF's `level-translator.ts` already covers patterns 1-4. The only Mobile-Mobile drift this fix resolves is the missing patterns 3 and 4 in `AUDIO_PATTERN_PARAMS`.

5. **Cross-repo touchpoints:** None. Mobile-only. SRF's parallel plan (dexcom.create idempotency + source-deactivate cleanup) is independent.

6. **Coordinator owns final production restart.** Railway worker is currently paused (`Start Command = sleep infinity`) pending the SRF plan's PR audit and merge. This Mobile plan doesn't depend on the worker being live — bracelet preview goes Mobile → BLE directly, not through SRF. But validating the full Test This Alarm round-trip (Task 4 step 5 happy path) DOES require the worker to be live so the SRF rule.test can complete its push.

7. **Out of scope:**
   - Vibration slider — works as intended (motor genuinely varies intensity)
   - Schema rename of `audio_level` column — semantics shifted but range stays 0-4; no migration needed
   - Mobile Edit Alarm rule.update / rule.create bug — confirmed not a bug; Edit Alarm correctly uses rule.update. The rule proliferation root cause was SRF's `dexcom.create` re-seeding, fixed in the parallel SRF plan
   - Push token re-registration flow — if Task 1's diagnostic shows token is null, the fix at this layer is just showing the error. Re-registration is wired in `apps/expo/src/app/_layout.tsx` per commit `64f0c22`; debugging that specifically is a follow-up if Task 1 surfaces the issue.

---

## Self-review

- **Spec coverage:** Sound slider redesigned to discrete pattern picker per Dave's hardware-reality directive (T3, T4). Audio mapping extended to cover patterns 3 and 4 that were silently dropping (T2). Test This Alarm silent failure surfaced via dispatched-flag inspection (T4 step 2). Push-token state captured for diagnostic (T1).
- **Placeholder scan:** Each code block is complete. UI component fully specified. No "TBD" or vague "add appropriate styling."
- **Type consistency:** `SoundPatternId = 0 | 1 | 2 | 3 | 4` consistent with `audio_level` schema (integer 0-4). `audioCommand`'s return type unchanged. `rule.test` response shape (`{ dispatched, payload, reason }`) matches SRF's `packages/api/src/router/rule.ts:139-222`.
- **File:line citations** target current Mobile main. Executor should `git pull origin main` before starting to ensure they're on top of this morning's BLE reconnect work.
