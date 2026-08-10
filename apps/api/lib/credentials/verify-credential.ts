import { createHash } from "node:crypto";

import { verify } from "@node-rs/argon2";
import { getPrismaClient } from "@trustcaptcha/database";

export type VerifiedCredential = {
  apiKeyId?: string;
  customerId: string;
  siteId?: string;
  type: "API_KEY" | "SITE_SECRET";
};

export function credentialRateLimitId(authorization: string | null): string {
  const parsed = parseCredential(authorization);
  if (parsed) return `${parsed.type}:${parsed.keyId}`;
  return `invalid:${createHash("sha256")
    .update(authorization ?? "missing")
    .digest("hex")
    .slice(0, 24)}`;
}

export async function verifyCredential(
  authorization: string | null,
): Promise<VerifiedCredential | null> {
  const parsed = parseCredential(authorization);
  const pepper = process.env.SECRET_HASH_PEPPER;
  if (!parsed || !pepper) return null;

  const prisma = getPrismaClient();

  if (parsed.type === "sk") {
    const site = await prisma.site.findFirst({
      where: {
        deletedAt: null,
        secretKeyId: parsed.keyId,
        status: "ACTIVE",
      },
      select: { customerId: true, id: true, secretHash: true },
    });
    if (
      !site ||
      !(await safeVerify(site.secretHash, `${parsed.value}.${pepper}`))
    ) {
      return null;
    }
    return {
      customerId: site.customerId,
      siteId: site.id,
      type: "SITE_SECRET",
    };
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyId: parsed.keyId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      scopes: { has: "VERIFY" },
      status: "ACTIVE",
    },
    select: { customerId: true, id: true, secretHash: true, siteId: true },
  });
  if (
    !apiKey ||
    !(await safeVerify(apiKey.secretHash, `${parsed.value}.${pepper}`))
  ) {
    return null;
  }
  return {
    apiKeyId: apiKey.id,
    customerId: apiKey.customerId,
    siteId: apiKey.siteId ?? undefined,
    type: "API_KEY",
  };
}

function parseCredential(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ") || authorization.length > 256) {
    return null;
  }
  const value = authorization.slice(7);
  const match = /^tc_(sk|ak)_([A-Za-z0-9_-]{16})_([A-Za-z0-9_-]{43})$/.exec(
    value,
  );
  if (!match?.[1] || !match[2] || !match[3]) return null;
  return { keyId: match[2], secret: match[3], type: match[1], value } as const;
}

async function safeVerify(hash: string, value: string): Promise<boolean> {
  try {
    return await verify(hash, value);
  } catch {
    return false;
  }
}
