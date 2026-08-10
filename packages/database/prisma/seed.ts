import { hash } from "@node-rs/argon2";

import { createPrismaClient } from "../src/client";

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const customerName =
  process.env.SEED_CUSTOMER_NAME?.trim() || "TrustCaptcha Demo";
const customerSlug =
  process.env.SEED_CUSTOMER_SLUG?.trim() || "trustcaptcha-demo";
const demoSiteKey = process.env.SEED_DEMO_SITE_KEY?.trim();
const demoSiteSecret = process.env.SEED_DEMO_SITE_SECRET?.trim();
const demoOrigin =
  process.env.SEED_DEMO_ORIGIN?.trim() || "http://localhost:4303";
const signupOrigin = process.env.SEED_SIGNUP_ORIGIN?.trim();
const secretPepper = process.env.SECRET_HASH_PEPPER;

if (!databaseUrl || !adminEmail || !adminPassword) {
  throw new Error(
    "DATABASE_URL, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required for seeding",
  );
}

if (adminPassword.length < 12) {
  throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 characters");
}

const prisma = createPrismaClient(databaseUrl);

async function main() {
  const passwordHash = await hash(adminPassword, {
    algorithm: 2,
    memoryCost: 19_456,
    outputLen: 32,
    parallelism: 1,
    timeCost: 2,
  });
  const demoSecretMatch = demoSiteSecret
    ? /^tc_sk_([A-Za-z0-9_-]{16})_([A-Za-z0-9_-]{43})$/.exec(demoSiteSecret)
    : null;
  if (
    (demoSiteKey || demoSiteSecret) &&
    (!demoSiteKey || !demoSecretMatch || !secretPepper)
  ) {
    throw new Error(
      "SEED_DEMO_SITE_KEY, a valid SEED_DEMO_SITE_SECRET and SECRET_HASH_PEPPER are required together",
    );
  }
  const demoSecretHash =
    demoSiteSecret && secretPepper
      ? await hash(`${demoSiteSecret}.${secretPepper}`, {
          algorithm: 2,
          memoryCost: 19_456,
          outputLen: 32,
          parallelism: 1,
          timeCost: 2,
        })
      : undefined;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, status: "ACTIVE" },
      create: {
        email: adminEmail,
        name: "TrustCaptcha Admin",
        passwordHash,
      },
    });

    const customer = await tx.customer.upsert({
      where: { slug: customerSlug },
      update: { name: customerName, status: "ACTIVE" },
      create: { name: customerName, slug: customerSlug },
    });

    await tx.customerMember.upsert({
      where: {
        customerId_userId: { customerId: customer.id, userId: user.id },
      },
      update: { role: "ADMIN", status: "ACTIVE" },
      create: {
        customerId: customer.id,
        role: "ADMIN",
        userId: user.id,
      },
    });

    if (demoSiteKey && demoSiteSecret && demoSecretMatch && demoSecretHash) {
      const secretKeyId = demoSecretMatch[1]!;
      const secretPart = demoSecretMatch[2]!;
      await tx.site.upsert({
        where: { siteKey: demoSiteKey },
        update: {
          allowedOrigins: [
            ...new Set([demoOrigin, signupOrigin].filter(Boolean)),
          ] as string[],
          deletedAt: null,
          secretHash: demoSecretHash,
          secretKeyId,
          secretLastFour: secretPart.slice(-4),
          secretPrefix: `tc_sk_${secretKeyId}`,
          status: "ACTIVE",
          updatedById: user.id,
        },
        create: {
          allowedOrigins: [
            ...new Set([demoOrigin, signupOrigin].filter(Boolean)),
          ] as string[],
          createdById: user.id,
          customerId: customer.id,
          domain: "localhost",
          name: "Docker Demo",
          secretHash: demoSecretHash,
          secretKeyId,
          secretLastFour: secretPart.slice(-4),
          secretPrefix: `tc_sk_${secretKeyId}`,
          siteKey: demoSiteKey,
          updatedById: user.id,
        },
      });
    }
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
