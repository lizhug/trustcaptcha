import { createCipheriv, createHash, randomBytes } from "node:crypto";

import { getPrismaClient } from "@trustcaptcha/database";

export type VerificationLogInput = {
  action: string;
  apiKeyId?: string;
  challengeId?: string;
  customerId: string;
  failureCode?: string;
  ipAddress: string;
  ipHash: string;
  latencyStartedAt: number;
  origin?: string;
  requestId: string;
  riskReasons?: string[];
  score?: number;
  siteId: string;
  status:
    | "SUCCESS"
    | "FAILED"
    | "EXPIRED"
    | "REPLAYED"
    | "RATE_LIMITED"
    | "INVALID";
  token?: string;
  userAgent?: string;
  verificationDurationMs?: number;
};

export async function recordVerificationLog(input: VerificationLogInput) {
  try {
    await getPrismaClient().verificationLog.create({
      data: {
        action: input.action,
        apiKeyId: input.apiKeyId,
        apiLatencyMs: Math.max(0, Date.now() - input.latencyStartedAt),
        challengeId: input.challengeId,
        customerId: input.customerId,
        failureCode: input.failureCode,
        ipAddressEncrypted: encryptIpAddress(input.ipAddress),
        ipHash: input.ipHash,
        origin: input.origin?.slice(0, 255),
        requestId: input.requestId,
        riskReasons: {
          set: Array.isArray(input.riskReasons) ? input.riskReasons : [],
        },
        score: input.score,
        siteId: input.siteId,
        status: input.status,
        tokenFingerprint: input.token
          ? createHash("sha256").update(input.token).digest("hex").slice(0, 32)
          : undefined,
        userAgent: input.userAgent?.slice(0, 512),
        userAgentHash: input.userAgent
          ? createHash("sha256").update(input.userAgent).digest("hex")
          : undefined,
        verificationDurationMs: input.verificationDurationMs,
      },
    });
  } catch (error) {
    // Verification remains available during an observability outage.
    console.error("Failed to persist verification log", error);
  }
}

export function encryptIpAddress(
  ipAddress: string,
): Uint8Array<ArrayBuffer> | undefined {
  const serializedKey = process.env.IP_ENCRYPTION_KEY;
  if (!serializedKey) return undefined;
  const key = Buffer.from(serializedKey, "base64url");
  if (key.byteLength !== 32) {
    throw new Error("IP_ENCRYPTION_KEY must be a 32-byte base64url value");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(ipAddress, "utf8"),
    cipher.final(),
  ]);
  const encrypted = Buffer.concat([
    Buffer.from([1]),
    iv,
    cipher.getAuthTag(),
    ciphertext,
  ]);
  const owned = new Uint8Array(encrypted.byteLength);
  owned.set(encrypted);
  return owned;
}
