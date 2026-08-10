import { z } from "zod";

export const verificationPolicyPresetSchema = z.enum([
  "CONVERSION",
  "BALANCED",
  "STRICT",
  "CUSTOM",
]);

export const verificationPolicyModeSchema = z.enum([
  "MANAGED",
  "INVISIBLE",
  "CHECKBOX",
  "NON_INTERACTIVE",
]);

export const policyChallengeSchema = z.enum(["POW", "CHECKBOX", "VISUAL"]);

export const upsertVerificationPolicySchema = z.object({
  action: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^(\*|[A-Za-z0-9/_-]+)$/),
  allowedChallenges: z.array(policyChallengeSchema).min(1).max(3),
  failMode: z.enum(["CLOSED", "OPEN"]),
  immunitySeconds: z.number().int().min(60).max(86_400),
  maxAttempts: z.number().int().min(1).max(10),
  mode: verificationPolicyModeSchema,
  preset: verificationPolicyPresetSchema,
  riskThreshold: z.number().int().min(1).max(100).nullable(),
  siteId: z.string().uuid(),
});

export type UpsertVerificationPolicyInput = z.infer<
  typeof upsertVerificationPolicySchema
>;
