import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(256),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerAccountSchema = z
  .object({
    captchaToken: z
      .string()
      .min(64)
      .max(2_048)
      .regex(/^tc1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
    companyName: z.string().trim().min(2).max(160),
    email: z.string().trim().toLowerCase().email().max(320),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(12).max(256).regex(/[a-z]/i).regex(/\d/),
    website: z.string().max(0).optional(),
  })
  .strict();

export type RegisterAccountInput = z.infer<typeof registerAccountSchema>;
