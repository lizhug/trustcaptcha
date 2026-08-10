import { createDecipheriv } from "node:crypto";
import { isIP } from "node:net";

import { getPrismaClient } from "@trustcaptcha/database";
import type { VerificationLogQuery } from "@trustcaptcha/shared";

import type { AuthContext } from "../auth/session";

const logSelection = {
  action: true,
  apiKey: { select: { id: true, name: true, prefix: true } },
  apiLatencyMs: true,
  challengeId: true,
  createdAt: true,
  failureCode: true,
  id: true,
  ipAddressEncrypted: true,
  ipHash: true,
  origin: true,
  requestId: true,
  riskReasons: true,
  score: true,
  site: { select: { id: true, name: true } },
  status: true,
  tokenFingerprint: true,
  userAgent: true,
  userAgentHash: true,
  verificationDurationMs: true,
} as const;

export async function listVerificationLogs(
  context: AuthContext,
  query: VerificationLogQuery,
) {
  const prisma = getPrismaClient();
  const where = createWhere(context, query);
  const [data, total] = await Promise.all([
    prisma.verificationLog.findMany({
      orderBy: { createdAt: "desc" },
      select: logSelection,
      skip: (query.current - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.verificationLog.count({ where }),
  ]);
  return { data: sanitizeLogs(data), total };
}

export async function exportVerificationLogs(
  context: AuthContext,
  query: VerificationLogQuery,
) {
  const prisma = getPrismaClient();
  const data = await prisma.verificationLog.findMany({
    orderBy: { createdAt: "desc" },
    select: logSelection,
    take: 10_000,
    where: createWhere(context, query),
  });
  await prisma.auditLog.create({
    data: {
      action: "EXPORT_CREATED",
      actorType: "USER",
      actorUserId: context.userId,
      customerId: context.customerId,
      metadata: { format: "csv", recordCount: data.length },
      targetType: "VerificationLog",
    },
  });

  const sanitizedData = sanitizeLogs(data);
  const header = [
    "createdAt",
    "requestId",
    "action",
    "site",
    "status",
    "score",
    "failureCode",
    "riskReasons",
    "apiLatencyMs",
    "verificationDurationMs",
    "ipAddress",
    "ipHash",
    "userAgent",
    "origin",
    "apiKey",
  ];
  const rows = sanitizedData.map((log) => [
    log.createdAt.toISOString(),
    log.requestId,
    log.action,
    log.site.name,
    log.status,
    log.score,
    log.failureCode,
    log.riskReasons.join("|"),
    log.apiLatencyMs,
    log.verificationDurationMs,
    log.ipAddress,
    log.ipHash,
    log.userAgent,
    log.origin,
    log.apiKey?.name,
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function decryptIpAddress(
  encryptedValue: Uint8Array<ArrayBufferLike> | null,
): string | null {
  const serializedKey = process.env.IP_ENCRYPTION_KEY;
  if (!serializedKey || !encryptedValue) return null;

  try {
    const key = Buffer.from(serializedKey, "base64url");
    const encrypted = Buffer.from(encryptedValue);
    if (
      key.byteLength !== 32 ||
      encrypted.byteLength < 30 ||
      encrypted[0] !== 1
    ) {
      return null;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      encrypted.subarray(1, 13),
    );
    decipher.setAuthTag(encrypted.subarray(13, 29));
    return Buffer.concat([
      decipher.update(encrypted.subarray(29)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function maskIpAddress(ipAddress: string | null): string | null {
  if (!ipAddress) return null;
  const address = ipAddress.split("%")[0] ?? ipAddress;
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split(".");
    return `${octets.slice(0, 3).join(".")}.0`;
  }
  if (version !== 6) return null;

  if (address.includes(".")) {
    const separator = address.lastIndexOf(":");
    const ipv4 = maskIpAddress(address.slice(separator + 1));
    return ipv4 ? `${address.slice(0, separator + 1)}${ipv4}` : null;
  }

  const [left = "", right = ""] = address.split("::", 2);
  const leftGroups = left ? left.split(":") : [];
  const rightGroups = right ? right.split(":") : [];
  const omitted = Math.max(0, 8 - leftGroups.length - rightGroups.length);
  const groups = [
    ...leftGroups,
    ...Array<string>(omitted).fill("0"),
    ...rightGroups,
  ];
  return `${groups.slice(0, 4).join(":")}::`;
}

function sanitizeLogs<
  T extends { ipAddressEncrypted: Uint8Array<ArrayBufferLike> | null },
>(logs: T[]) {
  return logs.map(({ ipAddressEncrypted, ...log }) => ({
    ...log,
    ipAddress: maskIpAddress(decryptIpAddress(ipAddressEncrypted)),
  }));
}

function createWhere(context: AuthContext, query: VerificationLogQuery) {
  return {
    ...(query.action ? { action: query.action } : {}),
    customerId: context.customerId,
    ...(query.requestId
      ? {
          requestId: {
            contains: query.requestId,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(query.siteId ? { siteId: query.siteId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {}),
  };
}
