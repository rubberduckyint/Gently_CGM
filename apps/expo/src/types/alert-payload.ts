/**
 * AlertPayload contract — push payload from SRF's worker to Mobile.
 *
 * ⚠️ VENDORED COPY. Source of truth lives in
 * `Gently_SRF/packages/contract/src/alert-payload.ts`. Drift between the
 * two breaks the alert pipeline silently (parse failure on Mobile = no
 * BLE dispatch). If SRF changes the schema, hand-port the change here in
 * the same session.
 *
 * Vendored (rather than imported via tsconfig path mapping like
 * `@gently/api`) because Zod runs at runtime, not just at typecheck —
 * we need an actual JS object, not a type. Re-tooling SRF to expose a
 * pre-built bundle for cross-repo runtime use is overkill for v1.
 */

import { z } from "zod/v4";

export const RuleKindSchema = z.enum([
  "low",
  "high",
  "falling_fast",
  "rising_fast",
  "stale",
  "spike_above",
  "sustained_above",
  "post_meal_unresolved",
  "tir_breach",
]);

export type RuleKind = z.infer<typeof RuleKindSchema>;

export const AlertPayloadSchema = z.object({
  type: z.literal("cgm_alert"),
  alertEventId: z.string().uuid(),
  ruleKind: RuleKindSchema,
  glucose: z.number().int().nullable(),
  trend: z.string(),
  vibrationPatternId: z.number().int().nullable(),
  ledColor: z.string().nullable(),
  ledOnMs: z.number().int().nullable(),
  ledOffMs: z.number().int().nullable(),
  audioPatternId: z.number().int().nullable(),
  durationSec: z.number().int(),
});

export type AlertPayload = z.infer<typeof AlertPayloadSchema>;
