import { z } from "zod";

import { verificationActionSchema } from "./challenges";

export const verifyTokenSchema = z.object({
  action: verificationActionSchema,
  token: z
    .string()
    .min(64)
    .max(2_048)
    .regex(/^tc1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
});

export type VerifyTokenRequest = z.infer<typeof verifyTokenSchema>;
