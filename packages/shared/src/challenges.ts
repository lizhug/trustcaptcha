import { z } from "zod";

import { supportedLocales } from "./locales";

const nonceSchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const verificationActionSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9/_-]+$/)
  .default("generic");

export const verificationModeSchema = z
  .enum(["managed", "checkbox", "invisible", "non-interactive"])
  .default("managed");

export const interactionSignalsSchema = z
  .object({
    clickDurationMs: z.number().int().min(0).max(10_000),
    directionChanges: z.number().int().min(0).max(128),
    focusChanges: z.number().int().min(0).max(50),
    inputMethod: z.enum(["keyboard", "mouse", "pen", "touch", "unknown"]),
    moveEvents: z.number().int().min(0).max(256),
    pathEfficiency: z.number().int().min(0).max(100),
    pointerDistancePx: z.number().int().min(0).max(100_000),
    pointerDurationMs: z.number().int().min(0).max(300_000),
    trustedEvent: z.boolean(),
    visibilityChanges: z.number().int().min(0).max(50),
  })
  .strict()
  .superRefine((signals, context) => {
    if (signals.directionChanges > Math.max(0, signals.moveEvents - 2)) {
      context.addIssue({
        code: "custom",
        message: "directionChanges exceeds the available movement samples",
        path: ["directionChanges"],
      });
    }
    if (
      signals.moveEvents === 0 &&
      (signals.directionChanges !== 0 ||
        signals.pathEfficiency !== 0 ||
        signals.pointerDistancePx !== 0 ||
        signals.pointerDurationMs !== 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "pointer metrics require movement samples",
        path: ["moveEvents"],
      });
    }
  });

export const createChallengeSchema = z.object({
  action: verificationActionSchema,
  language: z.enum(supportedLocales).default("auto"),
  mode: verificationModeSchema,
  pageUrl: z.string().url().max(2_048).optional(),
  requestNonce: nonceSchema,
  siteKey: z
    .string()
    .min(16)
    .max(80)
    .regex(/^tc_pk_[A-Za-z0-9_-]+$/),
});

export const completeChallengeSchema = z.object({
  cookieEnabled: z.boolean(),
  interaction: interactionSignalsSchema.optional(),
  proofOfWork: z
    .object({
      nonce: z
        .string()
        .min(1)
        .max(16)
        .regex(/^[0-9a-z]+$/),
    })
    .strict()
    .optional(),
  requestNonce: nonceSchema,
  storageAvailable: z.boolean(),
  visualAnswer: z
    .object({ rotationQuarterTurns: z.number().int().min(0).max(3) })
    .strict()
    .optional(),
});

export const widgetConfigQuerySchema = z.object({
  siteKey: z
    .string()
    .min(16)
    .max(80)
    .regex(/^tc_pk_[A-Za-z0-9_-]+$/),
});

export type CreateChallengeRequest = z.infer<typeof createChallengeSchema>;
export type CompleteChallengeRequest = z.infer<typeof completeChallengeSchema>;
export type InteractionSignals = z.infer<typeof interactionSignalsSchema>;
export type VerificationAction = z.infer<typeof verificationActionSchema>;
export type VerificationMode = z.infer<typeof verificationModeSchema>;
