# Handoff: Gently — Dashboard, Edit Alarm, Onboarding

## Overview

Visual redesign of the Gently mobile app — a secondary alert accessory for CGM users. Covers four product surfaces:

1. **Onboarding · Pair bracelet** (4 states: instructions → scanning → found → connected)
2. **Onboarding · Connect Dexcom Share** (Hero CTA + Credentials form)
3. **Dashboard** (steady-state home; current glucose + connected device + connected Dexcom + armed alarms)
4. **Edit Alarm** detail view (vibration slider, volume slider, 6 LED colors, threshold stepper, timing rules)

Framing: **"secondary alert accessory" — never a primary alarm.** No medical-device claims anywhere in copy.

---

## About the Design Files

The files in this bundle are **design references created in HTML/React (Babel-in-browser)** — interactive prototypes showing the intended look and behavior. They are **not production code to copy directly**.

The task is to **recreate these designs in the Gently codebase** (React Native, per the spec) using the app's existing patterns, navigation stack, theming system, and component library. If a component already exists in the codebase that matches the design (e.g. a list row, a segmented control), use it and restyle to match — don't introduce parallel components.

The presentation host (`design-canvas.jsx`, `android-frame.jsx`) and the Babel build are for the design preview only — **ignore them** for implementation.

## Fidelity

**High-fidelity.** Exact colors, typography, spacing, copy, and interaction states. Recreate pixel-perfectly using React Native primitives + the app's existing styling layer. Where the prototype uses CSS-only effects that don't translate (e.g. `box-shadow` with multiple layers), use the closest RN equivalent (`shadowColor`/`elevation`).

---

## Design Tokens

### Brand
| Token | Value | Use |
|---|---|---|
| `cyan` | `#16BCE9` | Primary brand accent; CTAs, scanning ripples, LED indicator |
| `cyanDeep` | `#0E8FB6` | Brand cyan, AA-contrast on white. Used for "Save", "Edit", helper links, toggle active, slider fill, headings on light cards. |
| `cyanBg` | `#E4F5FB` | Soft cyan tint for "in range" hero, connection-success chips |
| `cyanBgSoft` | `#F1FAFD` | Lower-contrast cyan tint (e.g. floor-explainer card bg) |
| `inkH` | `#0C141C` | Headings, primary text, glucose value |
| `ink` | `#1A222C` | Body text |
| `ink2` | `#4E5A68` | Secondary text, helper copy |
| `ink3` | `#8390A0` | Tertiary text, metadata, uppercase eyebrows |
| `bg` | `#F2F4F7` | App background |
| `bgDeep` | `#E6EAF0` | Slightly deeper neutral (unused in v1) |
| `card` | `#FFFFFF` | Card surfaces |
| `rule` | `rgba(12,20,28,0.06)` | Hairline dividers inside grouped cards |
| `rule2` | `rgba(12,20,28,0.10)` | Stronger divider |

### Semantic (glucose state)

> Greens are **never** used. In-range uses brand cyan to stay on-brand. High = amber, Low/Critical = coral.

| Token | Value | Meaning |
|---|---|---|
| `sage` (in-range) | `#0E8FB6` | In-range cyan; same as `cyanDeep` |
| `sageBg` | `#E4F5FB` | In-range hero ambient |
| `amber` | `#C07A1C` | High alert |
| `amberBg` | `#FAEBD3` | High alert tint |
| `coral` | `#C24A4A` | Low / Critical low |
| `coralBg` | `#F8DCD9` | Low / Critical low tint |

### LED color choices (Edit Alarm view)

These are **physical bracelet LED colors** — not brand colors. Render as 42×42 swatches in a 6-up grid:

| id | hex | label |
|---|---|---|
| `red` | `#E25C5C` | Red |
| `amber` | `#E8A53A` | Amber |
| `yellow` | `#EAD24A` | Yellow |
| `green` | `#4FB36D` | Green |
| `cyan` | `#2BB5E0` | Cyan |
| `magenta` | `#C45EC0` | Magenta |

The form also has a "Turn off / Turn on" toggle separate from the swatches — selecting Off dims the grid to 40% opacity.

### Typography

| Use | Family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Wordmark "gently" | SF Pro Rounded / SF Pro Display | 24 | 500 | -0.01em |
| H1 (onboarding) | SF Pro Display | 26–30 | 600 | -0.02em |
| H1 (alarm edit) | SF Pro Display | 17 | 600 | -0.01em |
| Glucose hero value | SF Pro Display | **140** | 300 | -0.05em |
| Edit Alarm threshold | SF Pro Display | 72 | 300 | -0.04em |
| Slider value | SF Pro Display | 30 | 300 | -0.02em |
| Body | SF Pro Text / system | 14–15 | 400–500 | 0 |
| Eyebrow / label | SF Pro Text | 10.5–11.5 | 600–700 | **0.08–0.09em uppercase** |
| Numeric data | (any) | — | — | **`tabular-nums` + `font-feature-settings: "tnum" 1`** |

Use SF Pro on iOS and the matching Android equivalent on Android (Roboto or SF licensed). All numeric values (glucose, thresholds, slider values, timestamps, "84%") **must** use tabular numerals.

### Spacing & Radius

| Token | Value |
|---|---|
| Card radius | 18–24 px (large cards 20–24, list groups 18, primary CTA 16) |
| Pill / chip radius | 999 / 12–16 |
| Page horizontal padding | 18 px (frame edge) → 22–28 px for content |
| Section spacing | 22 px between groups |
| Card internal padding | 14–20 px |
| Status pill height | ~52 px |
| Primary CTA height | 52 px (16 px vertical) |
| Toggle | 52×32 with 26 knob |
| Slider knob | 26 px circle, 8 px track |
| Color swatch | 42 px circle |

### Shadows

```
card:        0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)
hover/found: 0 1px 0 rgba(12,20,28,0.04), 0 6px 18px rgba(12,20,28,0.06)
primary CTA: 0 1px 0 rgba(14,143,182,0.4), 0 8px 22px rgba(22,188,233,0.28)
```

In React Native: approximate with `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` (iOS) and `elevation` (Android, 1–6 depending on layer).

---

## Screens

### 1. Onboarding · Pair Bracelet
File reference: `onboarding.jsx` → `PairBracelet({state})`

**Header** (every onboarding screen):
- Left: 38×38 back chevron in a 4%-ink circle (hidden on first step)
- Center: `•))` Gently mark (27 px) + wordmark "gently" (24 px, weight 500)
- Right: 38×38 spacer for symmetry
- Below: 2-dot **step indicator**, active dot expands to 22×6 pill (cyan deep), inactive 6×6 (12%-ink)

**Bracelet illustration** (210 px tall area, centered):
- Wide pill-shaped charcoal body (180×104 with 52 px radius) over a vertical gradient `#5A636E → #3A424C → #222A33`
- Black silicone strap on both sides (68×36 each)
- Two brass pogo pins on top centerline (`#C9A461` with `#F2D58C` highlight)
- **Brushed-aluminum half-moon plate** inset on the right side — gradient `#E2E4E7 → #BCC0C5 → #9CA2A9`, with ~24 fine horizontal brushed-metal lines
- Etched `•))` gently glyph on the plate (low-contrast slate, opacity 0.55)
- LED slot at bottom (36×6, rounded 3) with the active light strip inside
- Drop shadow: `drop-shadow(0 12px 18px rgba(12,20,28,0.18))`

**States:**

| State | Heading | Body | CTA | LED |
|---|---|---|---|---|
| `instruct` | "Pair your Gently" | "Press and hold the button on your bracelet until the light flashes blue." | Ghost button "Looking for your bracelet…" (with cyan-deep spinner) | Slow pulse, 1.4 s |
| `scanning` | "Looking for your bracelet…" | "Keep the bracelet within arm's reach of your phone." | Ghost "Cancel". Three cyan ripple rings emanate from the body. | Fast pulse, 0.9 s |
| `discovered` | "Bracelet found" | "Tap below to finish pairing." | Device card (see below) replaces CTA | Steady |
| `success` | "Connected" | "Your bracelet is paired and ready." | Primary "Continue" | Cyan-deep check badge overlaid on plate |

**Tip card** (instruct only): cyan-bg-soft rounded card with a black mini circle (10 px cyan dot inside, 10 px glow) + "Light flashing blue? Pairing mode is on. Keep the bracelet still for a few seconds."

**Discovered device card**:
- White card, 20 px radius, 16 px padding, hover-level shadow
- 46×46 black circle on the left containing a 10 px cyan dot with bloom
- Title `GENTLY-A8F2C1` (15/600) + `fw 2.1.4` eyebrow
- Below: battery glyph + "84%  ·  Strong signal" (tabular)
- Right: solid cyan "Pair" pill (8×14, fontSize 13, weight 600)

**Footer**: 11.5 px hint "Need help? **Pairing tips**" with the link in cyan-deep.

---

### 2. Onboarding · Connect Dexcom — Hero CTA
File reference: `onboarding.jsx` → `DexcomHero`

- Header + 2-dot step indicator (step 1 active)
- "Bracelet paired" chip: rounded 999, cyan-bg + cyan-deep text, check icon left
- Centered hero (vertically flexed):
  - **Connection diagram**: two 64-px circular "nodes" connected by a 56-px dashed cyan line. Left node = Gently mark, right node = cloud icon (this one has a stronger glow ring `0 0 0 1px rgba(22,188,233,0.4) + 0 6px 18px rgba(22,188,233,0.18)`)
  - H1 "One more step" (30/600/-0.02em)
  - Body "Connect your Dexcom Share account so Gently can keep watch for you." (15, ink2, max-width 300, center)
- Primary CTA "Connect Dexcom Share"
- Subtext (2 lines, 11.5): "You'll sign in with your Dexcom Share credentials. / Gently never sees your readings without your consent."

---

### 3. Onboarding · Dexcom Credentials Form
File reference: `onboarding.jsx` → `DexcomForm`

- Header + step indicator (step 1 active)
- H1 "Connect Dexcom Share" (22/600) + sub "Sign in with the account you use at **dexcom.com/share**."
- Each field group = uppercase 11/700 label (eyebrow, 28-px horizontal padding, 18 px top spacing) + white card with input/control inside.

| Field | Control | Helper / right |
|---|---|---|
| **Region** | Segmented: `US` / `Outside US` / `Japan` (default `US`) | — |
| **Username** | Plain text input, placeholder "username or email" | Helper: "Use your Dexcom Share username (or email)." |
| **Password** | Secure text input | "Show / Hide" toggle on right, in cyan-deep |
| — | Trust line outside cards | Shield icon (cyan-deep) + "Encrypted with AES-256-GCM. Your password is never returned by our API. **Privacy details**" |
| **Display name** `optional` | Plain text, placeholder "Defaults to your username" | `optional` chip after label (10 px, 5%-ink bg, 4 px radius) |
| **Glucose units** | Segmented: `mg/dL` (sub: US) / `mmol/L` (sub: OUS · JP). Default `mg/dL`. | — |

**Submit**: Primary CTA "Connect". Subtext: "Takes about 10–30 seconds. We'll seed your alarms with safe defaults."

**Segmented control** internals: 6 px padded `rgba(12,20,28,0.04)` container, 18 px radius, child buttons swap to white with `0 1px 2px rgba(12,20,28,0.08)` shadow when active. Active label is `inkH` 700; inactive `ink2` 500.

**Error states (implement, not pictured)**:
- `AccountPasswordInvalid`: inline form error "Username or password is incorrect. Check that you can sign in at dexcom.com/share."
- Wrong region: "Couldn't find a Dexcom account in this region. Try Outside US or Japan."
- Network: "Couldn't reach Dexcom. Check your connection and try again."
- Server: friendly fallback with "Try again" button.

---

### 4. Dashboard
File reference: `variants.jsx` → `VariantA({value, trend, minsAgo})`

**Range tinting** — the top of the page has a vertical gradient from a range-tinted color (top) to `bg` (60%):

| Range | Tint top | Accent |
|---|---|---|
| In range (80–180) | `cyanBg` `#E4F5FB` | `sage`/`cyanDeep` `#0E8FB6` |
| High (>180) | `amberBg` `#FAEBD3` | `amber` `#C07A1C` |
| Low (<80) | `coralBg` `#F8DCD9` | `coral` `#C24A4A` |

**Header**: same Gently wordmark + hamburger (38×38 cool-ink button on the right).

**Hero block** (22–24 px padding):
1. Row: eyebrow "CURRENT GLUCOSE" left, "2 min ago" tabular right
2. Big value: **140 px** SF Pro Display 300 weight, tabular, -0.05em tracking; e.g. "124"
3. Inline with value: trend icon (28–32 px, tinted by accent) + "mg/dL" eyebrow below it
4. Status line: 6×6 colored dot + "In range" (or "Above range" / "Below range") in inkH 600 + " · steady" in ink3
5. **Range bar**: 8 px track, in-range region is `sage @ 35% opacity`, current position is a 12 px ink dot ringed by 3 px bg color. Tick labels below: 40 · 75 · 180 · 260 (75/180 in cyan-deep)

**Status pills row** (10 px gap, full width split):
- "BRACELET — Connected · 84%" with watch icon + 8 px green-deep dot (use cyan-deep, not green) and a colored glow `4 px alpha22`
- "DEXCOM — Syncing" with cloud icon
- Each pill: white, 18 px radius, card shadow

**Alarms section**:
- Row: "ALARMS ARMED" eyebrow left, "Edit" link (cyan-deep) right
- Three white cards stacked, 10 px gap, 20 px radius, each containing:
  - 42×42 tinted icon circle (tier color)
  - Title (15/700) + threshold (e.g. "≥ 220 mg/dL" tabular) + summary "vib 3 · vol 2 · Amber" in ink3
  - Critical tier carries a small "FLOOR 50" pill in coral on coralBg
  - Right-aligned chevron

**Auto-refresh**: every 60 seconds and on app focus. Background color animates between tints when crossing a threshold (250 ms ease).

**No tap action on the value itself in v1.** Cards are tappable into Edit Alarm.

---

### 5. Edit Alarm
File reference: `alarm-edit.jsx` → `AlarmEdit({tier, threshold, accent, tint, isFloor, defaultColor, defaultVibe, defaultAudio})`

**Top app row**: back (38 chevron), centered title (eyebrow "ALARM" + bold tier name), "Save" right (cyan-deep, 15/600).

**Threshold hero card** (white, 24 radius):
- Tier badge: 36 circle tinted by `tint`, bell icon in `accent`
- Eyebrow + label: "ALERT WHEN ABOVE / BELOW" + tier description
- Toggle on the right (52×32; cyan-deep when on, `#D2D8E0` off)
- **Stepper**: −  72 px tabular value  + (steppers are 44 circles in `#EEF1F5`). Min for critical-low **clamped at 50**.
- Critical low only: cyan-bg-soft callout below stepper with info circle icon + "The bracelet hardware enforces a **50 mg/dL floor** on critical-low. You can't set this any lower — it's a safety stop."

**Vibration card** + **Volume card** (white, 18 radius each, 14 padding):

Each contains a `LevelSlider`:
- Readout: `<value tabular 30/300>` " · " `<label>` left; "0 – 4" right (12/600 ink3)
- Track 8 px, `rgba(12,20,28,0.07)`. Fill in `cyanDeep`. Tick marks at 1/2/3 (white when ≤ value, 18%-ink otherwise). Knob 26 circle white with cyan-deep inner 8 dot + shadow `0 2px 6px rgba(12,20,28,0.18), 0 0 0 1px rgba(12,20,28,0.06)`. Drag with pointer events; tapping a label snaps to that level.
- Labels: 5 buttons across the bottom
  - Vibration: `Off`, `Soft`, `Medium`, `Strong`, `Max`
  - Volume: `Silent`, `Quiet`, `Mid`, `Loud`, `Loudest`
  - Active label: 700 weight in accent color, 0.02em tracking; others 500 in ink3

**Light color** group: label "LIGHT COLOR" + "Turn off / Turn on" toggle action on the right.
- Card with 6-column grid of 42-px circular swatches (see LED color table).
- Selected swatch: `0 0 0 2px #fff, 0 0 0 4px <color>, 0 6px 14px <color>55`, scale(1.02), with a 18 px white check inside.
- Below: centered "Selected: **Amber**" caption.
- When `lightOn === false`: grid drops to 40% opacity and the caption reads "Selected: **Off**".

**Test bracelet** primary CTA — full-width cyan button "Test this alarm" with a pulse icon. Subtext: "Sends the pattern above to your bracelet right now."

**Timing** group (white grouped list, 14 padding rows, hairline rule between):
- "Duration"        →  `30 sec`
- "Repeat after"    →  `5 min`
- "Escalate after"  →  `10 min`

**Footer copy**: "Secondary alert only. Keep your Dexcom alerts on — Gently is here to make sure you notice."

---

## Interactions & Behavior

### Onboarding
- Step indicator advances when each step completes
- No skip / no "do this later" affordances
- Pair flow auto-advances `discovered → success` after the user taps "Pair" pill on the device card
- Success state auto-advances to the Dexcom step after ~1 s
- Bluetooth permission denied / off → in-app explainer (not designed yet — implement with existing app modal pattern)
- 30 sec no-discovery timeout from scanning: surface "Make sure your bracelet's light is flashing blue. Tap to try again."

### Dexcom form
- Region default `US`, units default `mg/dL`
- Submit shows in-button spinner with label "Connecting…"
- On success → dashboard with seeded default alert rules

### Dashboard
- 60-second auto-refresh + refresh on app focus
- Background tint animates 250 ms ease on range transitions
- Alarm card tap → opens Edit Alarm with that tier
- "Edit" header link → opens the alarm list (or first tier, defer to engineering)

### Edit Alarm
- All controls live-update local state; nothing is committed until **Save**
- "Test this alarm" sends a one-shot BLE command using current draft values
- Critical-low stepper **clamps** at the 50 mg/dL floor (disable the − button at 50)
- Toggle "Light color" off → swatches dim to 40% but selection is preserved
- Back without saving → confirm if dirty

### Motion
- Step indicator dot expand: 200 ms transition
- Slider knob/fill: 140 ms transition (no transition while dragging — `touchAction: none` + `setPointerCapture`)
- Range-bg cross-fade: 250 ms
- Bracelet LED `gPulse`: 1.4 s (instruct) / 0.9 s (scanning), ease-in-out, opacity 1 ↔ 0.35
- Scanning ripples: 1.8 s ease-out, scale 0.5 → 1.7, opacity 0.6 → 0, three rings staggered 0 / 0.6 / 1.2 s

---

## State Management

| Screen | State | Notes |
|---|---|---|
| Pair bracelet | `pairState: 'instruct' \| 'scanning' \| 'discovered' \| 'success'` | Driven by BLE service |
| Dexcom form | `region`, `username`, `password`, `displayName`, `units`, `pwShown`, `submitting`, `error` | local form state |
| Dashboard | `glucose`, `trend`, `lastReadingAt`, `bracelet.connected`, `bracelet.battery`, `source.status`, `alarms[]` | from app store |
| Edit Alarm | `enabled`, `threshold`, `vibe`, `audio`, `color`, `lightOn`, `duration`, `repeatAfter`, `escalateAfter`, `dirty` | local draft until Save |

---

## Assets

All visual assets are SVG-rendered in code (no bitmap dependencies):

- **Gently mark** `•))` — see `GentlyMark` in `variants.jsx`. Cyan dot + two arcs at descending opacity. Reuse as a single icon component in RN (e.g. `react-native-svg`).
- **Wordmark** "gently" — typeset, not a logo file. SF Pro Rounded / SF Pro Display 24/500/-0.01em.
- **Bracelet illustration** — pure SVG, see `Bracelet` in `onboarding.jsx`. Includes brushed-aluminum plate via clip-path + horizontal stroke pattern. Can be lifted directly; ~120 lines.
- **All other icons** — hairline 1.6/1.8 stroke icons (Watch, Cloud, Bell, Chev, Check, TrendUp/Down/Flat, Menu, Pulse, etc.). See the `Icon` map in `variants.jsx`. Use the codebase's icon library if equivalent icons exist; otherwise port these.

No external image files.

---

## Files in this bundle

| File | Purpose |
|---|---|
| `Gently Dashboard.html` | Entry point — open in a browser to view all screens on the design canvas |
| `variants.jsx` | **Design tokens (`G`), `Icon` map, `GentlyMark`/`GentlyWordmark`, `GentlyHeader`, `StatusPill`, `VariantA` (dashboard)** |
| `alarm-edit.jsx` | Edit Alarm view, `LevelSlider`, `ColorSwatch`, `Toggle`, `Stepper` |
| `onboarding.jsx` | `PairBracelet`, `Bracelet` SVG, `DexcomHero`, `DexcomForm`, `SegmentRow`, `InputRow` |
| `app.jsx` | Mounts the design canvas — ignore for implementation |
| `android-frame.jsx` | Preview-only Android device frame — **ignore** |
| `design-canvas.jsx` | Preview-only canvas host — **ignore** |

> Implementation lives in the three `*.jsx` files in the top half of the table. The bottom three are presentation chrome.

---

## Implementation notes for React Native

1. **Replace `<div>` with `<View>`** and `<span>` with `<Text>`. The design's CSS-in-JS objects translate almost 1:1 to RN `StyleSheet`s; the differences are:
   - `boxShadow` → `shadowColor` + `shadowOffset` + `shadowOpacity` + `shadowRadius` (iOS) and `elevation` (Android)
   - `gap` works in modern RN; `padding`/`margin` shorthands work
   - `linear-gradient` → `react-native-linear-gradient` or `expo-linear-gradient`
   - `transition`/`animation` → `Animated` or `react-native-reanimated`
   - `pointer-events` for the slider → use RN `PanResponder` or `Gesture.Pan()` from `react-native-gesture-handler`

2. **SVG** — use `react-native-svg`. The Bracelet, GentlyMark, and Icon set port directly.

3. **Tabular numerals** — set `fontVariant={['tabular-nums']}` on any `<Text>` displaying numbers.

4. **System fonts** — on iOS, "System" gives SF Pro automatically. On Android, ship SF Pro as a custom font, or fall back to Inter (acceptable substitute) — do not use Roboto, it changes the character.

5. **Range tinting animation** — the dashboard's animated bg color crossfade is the trickiest piece. Use `Animated.interpolateColor` keyed off the range bucket.

6. **Slider** — the design uses a custom slider with 5 snap positions and tappable labels. Don't use the platform native slider; port `LevelSlider` from `alarm-edit.jsx` using `react-native-gesture-handler` + `Reanimated`.
