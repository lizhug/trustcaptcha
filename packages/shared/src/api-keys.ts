import { z } from "zod";

const apiKeyScopeSchema = z.enum(["VERIFY", "READ_LOGS", "MANAGE_SITES"]);

export const createApiKeySchema = z.object({
  expiresAt: z.string().datetime({ offset: true }).optional(),
  name: z.string().trim().min(2).max(120),
  scopes: z.array(apiKeyScopeSchema).min(1).max(3),
  siteId: z.string().uuid().nullable().optional(),
});

export const apiKeyListQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  name: z.string().trim().max(120).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  siteId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "REVOKED", "EXPIRED"]).optional(),
});

export const rotateApiKeySchema = z.object({
  gracePeriodSeconds: z.coerce.number().int().min(0).max(86_400).default(300),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type RotateApiKeyInput = z.infer<typeof rotateApiKeySchema>;
