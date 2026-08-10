import { getPrismaClient } from "@trustcaptcha/database";

const publicSiteSelection = {
  allowedOrigins: true,
  customerId: true,
  customer: { select: { planTier: true } },
  defaultLocale: true,
  id: true,
  riskThreshold: true,
  siteKey: true,
  status: true,
  supportedLocales: true,
  tokenTtlSeconds: true,
} as const;

export async function findActiveSiteByKey(siteKey: string) {
  return getPrismaClient().site.findFirst({
    where: { deletedAt: null, siteKey, status: "ACTIVE" },
    select: publicSiteSelection,
  });
}

export async function findActiveSiteById(id: string) {
  return getPrismaClient().site.findFirst({
    where: { deletedAt: null, id, status: "ACTIVE" },
    select: publicSiteSelection,
  });
}
