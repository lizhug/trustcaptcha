import { z } from "zod";

import { supportedLocales } from "./locales";

const localeSchema = z.enum(supportedLocales);

export const createSiteSchema = z.object({
  domain: z.string().trim().min(1).max(512),
  name: z.string().trim().min(2).max(120),
});

export const updateSiteSchema = z
  .object({
    domain: z.string().trim().min(1).max(512).optional(),
    defaultLocale: localeSchema.optional(),
    name: z.string().trim().min(2).max(120).optional(),
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
    supportedLocales: z.array(localeSchema).min(1).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const siteListQuerySchema = z.object({
  current: z.coerce.number().int().min(1).default(1),
  domain: z.string().trim().max(253).optional(),
  name: z.string().trim().max(120).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
