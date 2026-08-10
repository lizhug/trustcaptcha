import { timingSafeEqual } from "node:crypto";

import { getPrismaClient } from "@trustcaptcha/database";
import { getPlanEntitlements } from "@trustcaptcha/shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const prisma = getPrismaClient();
  const customers = await prisma.customer.findMany({
    select: { id: true, planTier: true },
    where: { status: "ACTIVE" },
  });
  let deleted = 0;
  for (const customer of customers) {
    const days = getPlanEntitlements(customer.planTier).dataRetentionDays;
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const result = await prisma.verificationLog.deleteMany({
      where: { createdAt: { lt: cutoff }, customerId: customer.id },
    });
    deleted += result.count;
  }
  return Response.json({ customers: customers.length, deleted, success: true });
}

function isAuthorized(value: string | null): boolean {
  const secret = process.env.RETENTION_CRON_SECRET;
  if (!secret || !value?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(value.slice(7));
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}
