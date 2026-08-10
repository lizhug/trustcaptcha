import { randomBytes } from "node:crypto";

import { hash } from "@node-rs/argon2";
import { getPrismaClient } from "@trustcaptcha/database";
import {
  getPlanEntitlements,
  type CreateSiteInput,
  type UpdateSiteInput,
} from "@trustcaptcha/shared";

import type { AuthContext } from "../auth/session";

const siteSelection = {
  createdAt: true,
  defaultLocale: true,
  domain: true,
  id: true,
  name: true,
  secretLastFour: true,
  secretPrefix: true,
  siteKey: true,
  status: true,
  supportedLocales: true,
  updatedAt: true,
} as const;

export class SiteServiceError extends Error {
  constructor(
    readonly code:
      | "INVALID_DOMAIN"
      | "NOT_FOUND"
      | "PLAN_SITE_LIMIT"
      | "SECRET_CONFIG_MISSING",
    message: string,
  ) {
    super(message);
  }
}

export function normalizeSiteDomain(input: string): {
  allowedOrigin: string;
  domain: string;
} {
  const trimmed = input.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new SiteServiceError("INVALID_DOMAIN", "Enter a valid domain");
  }

  const domain = url.hostname.toLowerCase().replace(/\.$/, "");
  const isLocal =
    domain === "localhost" || domain === "127.0.0.1" || domain === "[::1]";

  if (
    !domain ||
    domain.length > 253 ||
    !["http:", "https:"].includes(url.protocol) ||
    (!isLocal && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new SiteServiceError(
      "INVALID_DOMAIN",
      "Use an HTTPS origin without a path, query, credentials or fragment",
    );
  }

  const allowedOrigin = `${url.protocol}//${domain}${url.port ? `:${url.port}` : ""}`;
  return { allowedOrigin, domain };
}

export function generateSiteCredentials() {
  const siteKey = `tc_pk_${randomBytes(18).toString("base64url")}`;
  const secretKeyId = randomBytes(12).toString("base64url");
  const secretPart = randomBytes(32).toString("base64url");
  const secretKey = `tc_sk_${secretKeyId}_${secretPart}`;

  return {
    secretKey,
    secretKeyId,
    secretLastFour: secretPart.slice(-4),
    secretPrefix: `tc_sk_${secretKeyId}`,
    siteKey,
  };
}

export async function createSite(context: AuthContext, input: CreateSiteInput) {
  const prisma = getPrismaClient();
  const pepper = process.env.SECRET_HASH_PEPPER;

  if (!pepper) {
    throw new SiteServiceError(
      "SECRET_CONFIG_MISSING",
      "Secret hashing is not configured",
    );
  }

  const normalized = normalizeSiteDomain(input.domain);
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: context.customerId },
    select: { planTier: true },
  });
  const siteCount = await prisma.site.count({
    where: { customerId: context.customerId, deletedAt: null },
  });
  if (siteCount >= getPlanEntitlements(customer.planTier).maxSites) {
    throw new SiteServiceError(
      "PLAN_SITE_LIMIT",
      "Your current plan has reached its site limit",
    );
  }
  const credentials = generateSiteCredentials();
  const secretHash = await hash(`${credentials.secretKey}.${pepper}`, {
    algorithm: 2,
    memoryCost: 19_456,
    outputLen: 32,
    parallelism: 1,
    timeCost: 2,
  });

  const site = await prisma.$transaction(async (tx) => {
    const created = await tx.site.create({
      data: {
        allowedOrigins: [normalized.allowedOrigin],
        createdById: context.userId,
        customerId: context.customerId,
        domain: normalized.domain,
        name: input.name,
        secretHash,
        secretKeyId: credentials.secretKeyId,
        secretLastFour: credentials.secretLastFour,
        secretPrefix: credentials.secretPrefix,
        siteKey: credentials.siteKey,
        updatedById: context.userId,
      },
      select: siteSelection,
    });

    await tx.verificationPolicy.create({
      data: {
        action: "*",
        allowedChallenges: ["POW", "CHECKBOX"],
        customerId: context.customerId,
        failMode: "CLOSED",
        mode: "MANAGED",
        preset: "BALANCED",
        siteId: created.id,
      },
    });

    await tx.auditLog.createMany({
      data: [
        {
          action: "SITE_CREATED",
          actorType: "USER",
          actorUserId: context.userId,
          customerId: context.customerId,
          metadata: { domain: created.domain, name: created.name },
          targetId: created.id,
          targetType: "Site",
        },
        {
          action: "SITE_SECRET_VIEWED",
          actorType: "USER",
          actorUserId: context.userId,
          customerId: context.customerId,
          metadata: { delivery: "creation_response" },
          targetId: created.id,
          targetType: "Site",
        },
      ],
    });

    return created;
  });

  return { ...site, secretKey: credentials.secretKey };
}

export async function listSites(
  context: AuthContext,
  query: {
    current: number;
    domain?: string;
    name?: string;
    pageSize: number;
    status?: "ACTIVE" | "DISABLED";
  },
) {
  const prisma = getPrismaClient();
  const where = {
    customerId: context.customerId,
    deletedAt: null,
    ...(query.domain
      ? {
          domain: {
            contains: query.domain.toLowerCase(),
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(query.name
      ? { name: { contains: query.name, mode: "insensitive" as const } }
      : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.site.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: siteSelection,
      skip: (query.current - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.site.count({ where }),
  ]);

  return { data, total };
}

export async function updateSite(
  context: AuthContext,
  siteId: string,
  input: UpdateSiteInput,
) {
  const prisma = getPrismaClient();
  const normalized = input.domain
    ? normalizeSiteDomain(input.domain)
    : undefined;
  const data = {
    ...(normalized
      ? {
          allowedOrigins: [normalized.allowedOrigin],
          domain: normalized.domain,
        }
      : {}),
    ...(input.name ? { name: input.name } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.defaultLocale ? { defaultLocale: input.defaultLocale } : {}),
    ...(input.supportedLocales
      ? { supportedLocales: input.supportedLocales }
      : {}),
    updatedById: context.userId,
  };

  return prisma.$transaction(async (tx) => {
    const result = await tx.site.updateMany({
      where: { customerId: context.customerId, deletedAt: null, id: siteId },
      data,
    });

    if (result.count !== 1) {
      throw new SiteServiceError("NOT_FOUND", "Site not found");
    }

    const updated = await tx.site.findFirstOrThrow({
      where: { customerId: context.customerId, id: siteId },
      select: siteSelection,
    });

    await tx.auditLog.create({
      data: {
        action: "SITE_UPDATED",
        actorType: "USER",
        actorUserId: context.userId,
        customerId: context.customerId,
        metadata: { fields: Object.keys(input) },
        targetId: siteId,
        targetType: "Site",
      },
    });

    return updated;
  });
}

export async function deleteSite(context: AuthContext, siteId: string) {
  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    const result = await tx.site.updateMany({
      where: { customerId: context.customerId, deletedAt: null, id: siteId },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
        updatedById: context.userId,
      },
    });

    if (result.count !== 1) {
      throw new SiteServiceError("NOT_FOUND", "Site not found");
    }

    await tx.auditLog.create({
      data: {
        action: "SITE_DELETED",
        actorType: "USER",
        actorUserId: context.userId,
        customerId: context.customerId,
        targetId: siteId,
        targetType: "Site",
      },
    });
  });
}
