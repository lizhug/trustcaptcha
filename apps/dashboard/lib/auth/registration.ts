import { randomBytes } from "node:crypto";

import { hash } from "@node-rs/argon2";
import { getPrismaClient } from "@trustcaptcha/database";
import type { RegisterAccountInput } from "@trustcaptcha/shared";

export class RegistrationError extends Error {
  constructor(
    readonly code:
      | "ACCOUNT_EXISTS"
      | "CAPTCHA_FAILED"
      | "SIGNUP_NOT_CONFIGURED"
      | "UPSTREAM_UNAVAILABLE",
  ) {
    super(code);
  }
}

export async function registerAccount(input: RegisterAccountInput) {
  await verifySignupCaptcha(input.captchaToken);

  const prisma = getPrismaClient();
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw new RegistrationError("ACCOUNT_EXISTS");

  const passwordHash = await hash(input.password, {
    algorithm: 2,
    memoryCost: 19_456,
    outputLen: 32,
    parallelism: 1,
    timeCost: 2,
  });
  const customerSlug = createCustomerSlug(input.companyName);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
      select: { email: true, id: true, name: true },
    });
    const customer = await tx.customer.create({
      data: { name: input.companyName, slug: customerSlug },
      select: { id: true, name: true, slug: true },
    });
    await tx.customerMember.create({
      data: {
        customerId: customer.id,
        role: "ADMIN",
        userId: user.id,
      },
    });
    return { customer, user };
  });
}

async function verifySignupCaptcha(token: string) {
  const apiUrl = process.env.TRUSTCAPTCHA_API_URL;
  const secret = process.env.TRUSTCAPTCHA_SIGNUP_SECRET;
  if (!apiUrl || !secret) {
    throw new RegistrationError("SIGNUP_NOT_CONFIGURED");
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/v1/verify`, {
      body: JSON.stringify({ action: "account/register", token }),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new RegistrationError("UPSTREAM_UNAVAILABLE");
  }

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
  } | null;
  if (!response.ok || payload?.success !== true) {
    throw new RegistrationError(
      response.status >= 500 ? "UPSTREAM_UNAVAILABLE" : "CAPTCHA_FAILED",
    );
  }
}

function createCustomerSlug(companyName: string) {
  const base = companyName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 58);
  return `${base || "workspace"}-${randomBytes(5).toString("hex")}`;
}
