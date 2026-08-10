import { randomBytes } from "node:crypto";

import { hash } from "@node-rs/argon2";
import { getPrismaClient } from "@trustcaptcha/database";
import type {
  CreateApiKeyInput,
  RotateApiKeyInput,
} from "@trustcaptcha/shared";

import type { AuthContext } from "../auth/session";

const apiKeySelection = {
  createdAt: true,
  expiresAt: true,
  id: true,
  lastFour: true,
  lastUsedAt: true,
  name: true,
  prefix: true,
  scopes: true,
  site: { select: { id: true, name: true } },
  status: true,
} as const;

export class ApiKeyServiceError extends Error {
  constructor(
    readonly code:
      | "EXPIRY_MUST_BE_FUTURE"
      | "NOT_FOUND"
      | "ROTATION_ALREADY_STARTED"
      | "SECRET_CONFIG_MISSING"
      | "SITE_NOT_FOUND",
  ) {
    super(code);
  }
}

export function generateApiKeyCredentials() {
  const keyId = randomBytes(12).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  return {
    keyId,
    lastFour: secret.slice(-4),
    plaintext: `tc_ak_${keyId}_${secret}`,
    prefix: `tc_ak_${keyId}`,
  };
}

export async function createApiKey(
  context: AuthContext,
  input: CreateApiKeyInput,
) {
  const prisma = getPrismaClient();
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
  if (expiresAt && expiresAt <= new Date()) {
    throw new ApiKeyServiceError("EXPIRY_MUST_BE_FUTURE");
  }

  if (input.siteId) {
    const site = await prisma.site.findFirst({
      where: {
        customerId: context.customerId,
        deletedAt: null,
        id: input.siteId,
      },
      select: { id: true },
    });
    if (!site) throw new ApiKeyServiceError("SITE_NOT_FOUND");
  }

  const credentials = generateApiKeyCredentials();
  const secretHash = await hashApiKey(credentials.plaintext);
  const created = await prisma.$transaction(async (tx) => {
    const apiKey = await tx.apiKey.create({
      data: {
        createdById: context.userId,
        customerId: context.customerId,
        expiresAt,
        keyId: credentials.keyId,
        lastFour: credentials.lastFour,
        name: input.name,
        prefix: credentials.prefix,
        scopes: [...new Set(input.scopes)],
        secretHash,
        siteId: input.siteId || null,
      },
      select: apiKeySelection,
    });
    await tx.auditLog.create({
      data: {
        action: "API_KEY_CREATED",
        actorType: "USER",
        actorUserId: context.userId,
        customerId: context.customerId,
        metadata: { scopes: input.scopes, siteId: input.siteId ?? null },
        targetId: apiKey.id,
        targetType: "ApiKey",
      },
    });
    return apiKey;
  });

  return { ...withEffectiveStatus(created), apiKey: credentials.plaintext };
}

export async function listApiKeys(
  context: AuthContext,
  query: {
    current: number;
    name?: string;
    pageSize: number;
    siteId?: string;
    status?: "ACTIVE" | "REVOKED" | "EXPIRED";
  },
) {
  const prisma = getPrismaClient();
  const now = new Date();
  const statusWhere =
    query.status === "ACTIVE"
      ? {
          status: "ACTIVE" as const,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        }
      : query.status === "EXPIRED"
        ? {
            OR: [
              { status: "EXPIRED" as const },
              { status: "ACTIVE" as const, expiresAt: { lte: now } },
            ],
          }
        : query.status
          ? { status: query.status }
          : {};
  const where = {
    customerId: context.customerId,
    ...(query.name
      ? { name: { contains: query.name, mode: "insensitive" as const } }
      : {}),
    ...(query.siteId ? { siteId: query.siteId } : {}),
    ...statusWhere,
  };
  const [data, total] = await Promise.all([
    prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: apiKeySelection,
      skip: (query.current - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.apiKey.count({ where }),
  ]);
  return { data: data.map(withEffectiveStatus), total };
}

export async function revokeApiKey(context: AuthContext, apiKeyId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => {
    const result = await tx.apiKey.updateMany({
      data: {
        revokedAt: new Date(),
        revokedById: context.userId,
        status: "REVOKED",
      },
      where: { customerId: context.customerId, id: apiKeyId },
    });
    if (result.count !== 1) throw new ApiKeyServiceError("NOT_FOUND");
    await tx.auditLog.create({
      data: {
        action: "API_KEY_REVOKED",
        actorType: "USER",
        actorUserId: context.userId,
        customerId: context.customerId,
        targetId: apiKeyId,
        targetType: "ApiKey",
      },
    });
  });
}

export async function rotateApiKey(
  context: AuthContext,
  apiKeyId: string,
  input: RotateApiKeyInput,
) {
  const prisma = getPrismaClient();
  const current = await prisma.apiKey.findFirst({
    where: {
      customerId: context.customerId,
      id: apiKeyId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      status: "ACTIVE",
    },
    select: {
      expiresAt: true,
      name: true,
      rotatedTo: { select: { id: true } },
      scopes: true,
      siteId: true,
    },
  });
  if (!current) throw new ApiKeyServiceError("NOT_FOUND");
  if (current.rotatedTo) {
    throw new ApiKeyServiceError("ROTATION_ALREADY_STARTED");
  }

  const credentials = generateApiKeyCredentials();
  const secretHash = await hashApiKey(credentials.plaintext);
  const now = new Date();
  const graceExpiresAt = new Date(
    now.getTime() + input.gracePeriodSeconds * 1_000,
  );
  const oldExpiresAt =
    current.expiresAt && current.expiresAt < graceExpiresAt
      ? current.expiresAt
      : graceExpiresAt;

  const rotated = await prisma.$transaction(async (tx) => {
    await tx.apiKey.update({
      data:
        input.gracePeriodSeconds === 0
          ? {
              revokedAt: now,
              revokedById: context.userId,
              status: "REVOKED",
            }
          : { expiresAt: oldExpiresAt },
      where: { id: apiKeyId },
    });
    const replacement = await tx.apiKey.create({
      data: {
        createdById: context.userId,
        customerId: context.customerId,
        keyId: credentials.keyId,
        lastFour: credentials.lastFour,
        name: current.name,
        prefix: credentials.prefix,
        rotatedFromId: apiKeyId,
        scopes: current.scopes,
        secretHash,
        siteId: current.siteId,
      },
      select: apiKeySelection,
    });
    await tx.auditLog.create({
      data: {
        action: "API_KEY_ROTATED",
        actorType: "USER",
        actorUserId: context.userId,
        customerId: context.customerId,
        metadata: { gracePeriodSeconds: input.gracePeriodSeconds },
        targetId: replacement.id,
        targetType: "ApiKey",
      },
    });
    return replacement;
  });

  return {
    ...withEffectiveStatus(rotated),
    apiKey: credentials.plaintext,
    previousKeyExpiresAt: oldExpiresAt,
  };
}

async function hashApiKey(plaintext: string): Promise<string> {
  const pepper = process.env.SECRET_HASH_PEPPER;
  if (!pepper) throw new ApiKeyServiceError("SECRET_CONFIG_MISSING");
  return hash(`${plaintext}.${pepper}`, {
    algorithm: 2,
    memoryCost: 19_456,
    outputLen: 32,
    parallelism: 1,
    timeCost: 2,
  });
}

function withEffectiveStatus<
  T extends { expiresAt: Date | null; status: string },
>(apiKey: T) {
  return {
    ...apiKey,
    status:
      apiKey.status === "ACTIVE" &&
      apiKey.expiresAt &&
      apiKey.expiresAt <= new Date()
        ? ("EXPIRED" as const)
        : apiKey.status,
  };
}
