import { randomUUID } from "node:crypto";

import { getPrismaClient } from "@trustcaptcha/database";
import {
  PLAN_ENTITLEMENTS,
  PUBLIC_PLAN_PRICING,
  type PlanTier,
} from "@trustcaptcha/shared";
import { Creem } from "creem";

import type { AuthContext } from "../auth/session";

export type BillingCycle = "monthly" | "yearly";

export class BillingServiceError extends Error {
  constructor(
    public readonly code:
      | "CREEM_NOT_CONFIGURED"
      | "INVALID_PLAN"
      | "PORTAL_UNAVAILABLE"
      | "PROVIDER_ERROR",
  ) {
    super(code);
  }
}

const purchasablePlans = ["PRO", "SCALE", "PRIVATE"] as const;

export async function getBillingSummary(context: AuthContext) {
  const prisma = getPrismaClient();
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const [customer, monthlyUsage] = await Promise.all([
    prisma.customer.findUniqueOrThrow({
      where: { id: context.customerId },
      select: {
        planTier: true,
        subscription: {
          select: {
            cancelAtPeriodEnd: true,
            currentPeriodEnd: true,
            currentPeriodStart: true,
            planTier: true,
            providerCustomerId: true,
            status: true,
          },
        },
      },
    }),
    prisma.verificationLog.count({
      where: { customerId: context.customerId, createdAt: { gte: monthStart } },
    }),
  ]);
  const entitlements = PLAN_ENTITLEMENTS[customer.planTier];

  return {
    configured: {
      checkout: Boolean(process.env.CREEM_API_KEY) && hasAnyProductConfigured(),
      portal: Boolean(
        process.env.CREEM_API_KEY && customer.subscription?.providerCustomerId,
      ),
      webhook: Boolean(process.env.CREEM_WEBHOOK_SECRET),
    },
    entitlements,
    monthlyUsage,
    planTier: customer.planTier,
    pricing: PUBLIC_PLAN_PRICING,
    subscription: customer.subscription,
    usagePercent: Math.min(
      100,
      Math.round((monthlyUsage / entitlements.monthlyRequests) * 10_000) / 100,
    ),
  };
}

export async function createCheckout(
  context: AuthContext,
  input: { billingCycle: BillingCycle; planTier: PlanTier },
) {
  if (
    !purchasablePlans.includes(
      input.planTier as (typeof purchasablePlans)[number],
    )
  ) {
    throw new BillingServiceError("INVALID_PLAN");
  }
  const productId = getProductId(input.planTier, input.billingCycle);
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey || !productId) {
    throw new BillingServiceError("CREEM_NOT_CONFIGURED");
  }

  const creem = new Creem({
    apiKey,
    server: process.env.CREEM_TEST_MODE === "false" ? "prod" : "test",
    timeoutMs: 12_000,
  });
  const dashboardUrl = (
    process.env.PUBLIC_DASHBOARD_URL ?? "http://localhost:4301"
  ).replace(/\/$/, "");

  try {
    const checkout = await creem.checkouts.create({
      customer: context.userEmail ? { email: context.userEmail } : undefined,
      metadata: {
        billingCycle: input.billingCycle,
        customerId: context.customerId,
        planTier: input.planTier,
      },
      productId,
      requestId: `tc_${randomUUID()}`,
      successUrl: `${dashboardUrl}/billing?checkout=success`,
      units: 1,
    });
    if (!checkout.checkoutUrl) throw new Error("Checkout URL missing");
    return { checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    console.error("Creem checkout creation failed", error);
    throw new BillingServiceError("PROVIDER_ERROR");
  }
}

export async function createBillingPortal(context: AuthContext) {
  const prisma = getPrismaClient();
  const subscription = await prisma.subscription.findUnique({
    where: { customerId: context.customerId },
    select: { providerCustomerId: true },
  });
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey || !subscription?.providerCustomerId) {
    throw new BillingServiceError("PORTAL_UNAVAILABLE");
  }
  const creem = new Creem({
    apiKey,
    server: process.env.CREEM_TEST_MODE === "false" ? "prod" : "test",
    timeoutMs: 12_000,
  });

  try {
    const links = await creem.customers.generateBillingLinks({
      customerId: subscription.providerCustomerId,
    });
    return { portalUrl: links.customerPortalLink };
  } catch (error) {
    console.error("Creem portal creation failed", error);
    throw new BillingServiceError("PROVIDER_ERROR");
  }
}

export function getPlanTierForProduct(
  productId: string,
): Exclude<PlanTier, "FREE"> | null {
  for (const tier of purchasablePlans) {
    for (const cycle of ["monthly", "yearly"] as const) {
      if (getProductId(tier, cycle) === productId) return tier;
    }
  }
  return null;
}

function getProductId(tier: PlanTier, cycle: BillingCycle): string | undefined {
  return process.env[`CREEM_${tier}_${cycle.toUpperCase()}_PRODUCT_ID`];
}

function hasAnyProductConfigured(): boolean {
  return purchasablePlans.some((tier) =>
    (["monthly", "yearly"] as const).some((cycle) =>
      Boolean(getProductId(tier, cycle)),
    ),
  );
}
