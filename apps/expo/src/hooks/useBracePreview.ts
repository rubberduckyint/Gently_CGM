/**
 * useBracePreview — slider-friendly debounced previews of the three
 * bracelet feedback modalities (vibration intensity, audio level, LED color).
 *
 * Each call schedules a 1-second one-shot preview on the bracelet via direct
 * BLE command. Successive calls within ~350ms cancel the pending preview, so
 * dragging a slider doesn't spam the bracelet with rapid-fire commands —
 * only the final value fires. Errors (busy bracelet, disconnected) are
 * swallowed: previews are best-effort UX feedback, never load-bearing.
 *
 * Intentionally bypasses the SRF→push→Mobile alarm path — these are tactile
 * confirmations, not real alarms.
 */

import { useCallback, useEffect, useRef } from "react";

import { useBLE } from "~/contexts/BLEContext";
import { createTriggerAudioPatternRequest } from "~/services/ble/commands/triggerAudioPattern";
import { createTriggerLedPatternRequest } from "~/services/ble/commands/triggerLedPattern";
import { createTriggerVibrationPatternRequest } from "~/services/ble/commands/triggerVibrationPattern";
import {
  LedColor,
  VibrationIntensity,
  VibrationPattern,
} from "~/services/ble/types";

const PREVIEW_DURATION_SEC = 1;
// Debounce must be > (preview duration + BLE round-trip + bracelet
// processing). Firmware minimum duration_sec is 1 (= 1000ms pattern), plus
// ~200ms BLE write RTT, plus pattern-start latency on bracelet. The
// firmware doesn't queue — it rejects new commands with
// BLE_RSP_STATUS_ERROR_BUSY (0x02) while a subsystem is still active.
// 1500ms gives a 500ms safety margin on top of the 1s pattern.
const PREVIEW_DEBOUNCE_MS = 1500;

// Slider has 5 levels (0=off..4=max). Level 0 = silent / no fire.
const VIB_LEVEL_TO_INTENSITY: Record<number, VibrationIntensity> = {
  1: VibrationIntensity.LOW,
  2: VibrationIntensity.MEDIUM,
  3: VibrationIntensity.HIGH,
  4: VibrationIntensity.MAXIMUM,
};

// Audio buzzer has fixed loudness — vary the beep PATTERN (length + count)
// so each level feels distinct: level 1 a brief blip, level 4 a sustained
// triple-beep urgency. (on_ms + off_ms) must be ≤ duration_sec × 1000.
const AUDIO_LEVEL_TO_PATTERN: Record<
  number,
  { onMs: number; offMs: number }
> = {
  1: { onMs: 100, offMs: 0 }, // single brief blip
  2: { onMs: 400, offMs: 0 }, // single longer beep
  3: { onMs: 200, offMs: 200 }, // double-beep pattern
  4: { onMs: 200, offMs: 100 }, // triple-beep urgency
};

const LED_COLOR_BY_NAME: Record<string, LedColor> = {
  blue: LedColor.BLUE,
  green: LedColor.GREEN,
  cyan: LedColor.CYAN,
  red: LedColor.RED,
  yellow: LedColor.YELLOW,
  magenta: LedColor.MAGENTA,
  white: LedColor.WHITE,
};

export function useBracePreview() {
  const ble = useBLE();
  const timers = useRef<{
    vib: ReturnType<typeof setTimeout> | null;
    led: ReturnType<typeof setTimeout> | null;
    audio: ReturnType<typeof setTimeout> | null;
  }>({ vib: null, led: null, audio: null });

  useEffect(() => {
    const t = timers.current;
    return () => {
      if (t.vib) clearTimeout(t.vib);
      if (t.led) clearTimeout(t.led);
      if (t.audio) clearTimeout(t.audio);
    };
  }, []);

  const previewVibration = useCallback(
    (level: number) => {
      console.log(`[preview] previewVibration called with level=${level}`);
      if (timers.current.vib) clearTimeout(timers.current.vib);
      timers.current.vib = setTimeout(() => {
        const connected = ble.isDeviceConnected();
        console.log(
          `[preview] vib fire: level=${level}, connected=${connected}`,
        );
        if (!connected) return;
        const intensity = VIB_LEVEL_TO_INTENSITY[level];
        if (intensity === undefined) {
          console.log(`[preview] vib level ${level} has no intensity mapping`);
          return;
        }
        try {
          const cmd = createTriggerVibrationPatternRequest({
            vibrationPattern: VibrationPattern.QUICK,
            vibrationIntensity: intensity,
            totalDurationSeconds: PREVIEW_DURATION_SEC,
          });
          void ble.sendBLECommand(cmd).catch(() => {
            /* preview is best-effort; swallow BUSY/timeout */
          });
        } catch {
          /* invalid params (shouldn't happen with mapped enums); swallow */
        }
      }, PREVIEW_DEBOUNCE_MS);
    },
    [ble],
  );

  const previewLed = useCallback(
    (colorName: string | null) => {
      if (timers.current.led) clearTimeout(timers.current.led);
      timers.current.led = setTimeout(() => {
        if (!ble.isDeviceConnected() || !colorName) return;
        const color = LED_COLOR_BY_NAME[colorName.toLowerCase()];
        if (color === undefined) return;
        try {
          const cmd = createTriggerLedPatternRequest({
            ledColor: color,
            onDurationMs: 1000,
            offDurationMs: 0,
            totalDurationSeconds: PREVIEW_DURATION_SEC,
          });
          void ble.sendBLECommand(cmd).catch(() => {
            /* swallow */
          });
        } catch {
          /* swallow */
        }
      }, PREVIEW_DEBOUNCE_MS);
    },
    [ble],
  );

  const previewAudio = useCallback(
    (level: number) => {
      if (timers.current.audio) clearTimeout(timers.current.audio);
      timers.current.audio = setTimeout(() => {
        if (!ble.isDeviceConnected()) return;
        const pattern = AUDIO_LEVEL_TO_PATTERN[level];
        if (!pattern) return;
        try {
          const cmd = createTriggerAudioPatternRequest({
            onDurationMs: pattern.onMs,
            offDurationMs: pattern.offMs,
            totalDurationSeconds: PREVIEW_DURATION_SEC,
          });
          void ble.sendBLECommand(cmd).catch(() => {
            /* swallow */
          });
        } catch {
          /* swallow */
        }
      }, PREVIEW_DEBOUNCE_MS);
    },
    [ble],
  );

  return { previewVibration, previewLed, previewAudio };
}
