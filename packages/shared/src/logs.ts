import { z } from "zod";

export const verificationLogQuerySchema = z
  .object({
    current: z.coerce.number().int().min(1).default(1),
    action: z
      .string()
      .trim()
      .max(32)
      .regex(/^[A-Za-z0-9/_-]+$/)
      .optional(),
    from: z.string().datetime({ offset: true }).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    requestId: z.string().trim().max(64).optional(),
    siteId: z.string().uuid().optional(),
    status: z
      .enum([
        "SUCCESS",
        "FAILED",
        "EXPIRED",
        "REPLAYED",
        "RATE_LIMITED",
        "INVALID",
      ])
      .optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .refine(
    ({ from, to }) =>
      !from || !to || new Date(from).getTime() <= new Date(to).getTime(),
    { message: "The start time must not be after the end time" },
  );

export type VerificationLogQuery = z.infer<typeof verificationLogQuerySchema>;
