import { createHash } from "node:crypto";

import { getPrismaClient } from "@trustcaptcha/database";
import type {
  FlatCheckoutCompleted,
  FlatSubscriptionEvent,
} from "@creem_io/nextjs";

import { getPlanTierForProduct } from "./billing-service";

type SubscriptionEvent = FlatSubscriptionEvent<string>;

export async function syncCreemSubscriptionEvent(data: SubscriptionEvent) {
  const customerId = metadataCustomerId(data.metadata);
  const planTier = getPlanTierForProduct(data.product.id);
  if (!customerId || !planTier) {
    await recordIgnoredEvent(
      data.webhookId,
      data.webhookEventType,
      data,
      customerId,
    );
    return;
  }

  const status = normalizeStatus(data.status, data.webhookEventType);
  const shouldDowngrade = status === "PAUSED" || status === "EXPIRED";
  await processEvent({
    cancelAtPeriodEnd:
      data.webhookEventType === "subscription.scheduled_cancel" ||
      data.status === "scheduled_cancel",
    customerId,
    currentPeriodEnd: toDate(data.current_period_end_date),
    currentPeriodStart: toDate(data.current_period_start_date),
    eventId: data.webhookId,
    eventType: data.webhookEventType,
    payload: data,
    planTier,
    providerCustomerId: data.customer.id,
    providerProductId: data.product.id,
    providerSubscriptionId: data.id,
    shouldDowngrade,
    status,
  });
}

export async function syncCreemCheckoutEvent(data: FlatCheckoutCompleted) {
  if (!data.subscription) {
    await recordIgnoredEvent(
      data.webhookId,
      data.webhookEventType,
      data,
      metadataCustomerId(data.metadata),
    );
    return;
  }
  const customerId =
    metadataCustomerId(data.metadata) ??
    metadataCustomerId(data.subscription.metadata);
  const planTier = getPlanTierForProduct(data.product.id);
  if (!customerId || !planTier || !data.customer) {
    await recordIgnoredEvent(
      data.webhookId,
      data.webhookEventType,
      data,
      customerId,
    );
    return;
  }
  const status = normalizeStatus(
    data.subscription.status,
    data.webhookEventType,
  );
  await processEvent({
    cancelAtPeriodEnd: data.subscription.status === "scheduled_cancel",
    customerId,
    currentPeriodEnd: toDate(data.subscription.current_period_end_date),
    currentPeriodStart: toDate(data.subscription.current_period_start_date),
    eventId: data.webhookId,
    eventType: data.webhookEventType,
    payload: data,
    planTier,
    providerCustomerId: data.customer.id,
    providerProductId: data.product.id,
    providerSubscriptionId: data.subscription.id,
    shouldDowngrade: status === "PAUSED" || status === "EXPIRED",
    status,
  });
}

async function processEvent(input: {
  cancelAtPeriodEnd: boolean;
  customerId: string;
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  eventId: string;
  eventType: string;
  payload: unknown;
  planTier: "PRO" | "SCALE" | "PRIVATE";
  providerCustomerId: string;
  providerProductId: string;
  providerSubscriptionId: string;
  shouldDowngrade: boolean;
  status:
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "PAUSED"
    | "CANCELED"
    | "EXPIRED";
}) {
  const prisma = getPrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
        select: { id: true },
      });
      await tx.billingWebhookEvent.create({
        data: {
          customerId: customer?.id ?? null,
          eventType: input.eventType,
          payloadHash: hashPayload(input.payload),
          providerEventId: input.eventId,
        },
      });
      if (!customer) return;

      await tx.subscription.upsert({
        create: {
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          currentPeriodEnd: input.currentPeriodEnd,
          currentPeriodStart: input.currentPeriodStart,
          customerId: customer.id,
          planTier: input.planTier,
          providerCustomerId: input.providerCustomerId,
          providerProductId: input.providerProductId,
          providerSubscriptionId: input.providerSubscriptionId,
          status: input.status,
        },
        update: {
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          currentPeriodEnd: input.currentPeriodEnd,
          currentPeriodStart: input.currentPeriodStart,
          planTier: input.planTier,
          providerCustomerId: input.providerCustomerId,
          providerProductId: input.providerProductId,
          providerSubscriptionId: input.providerSubscriptionId,
          status: input.status,
        },
        where: { customerId: customer.id },
      });
      await tx.customer.update({
        data: { planTier: input.shouldDowngrade ? "FREE" : input.planTier },
        where: { id: customer.id },
      });
      await tx.auditLog.create({
        data: {
          action: "BILLING_SUBSCRIPTION_UPDATED",
          actorType: "SYSTEM",
          customerId: customer.id,
          metadata: {
            eventType: input.eventType,
            planTier: input.planTier,
            status: input.status,
          },
          targetId: input.providerSubscriptionId,
          targetType: "Subscription",
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return;
    throw error;
  }
}

async function recordIgnoredEvent(
  eventId: string,
  eventType: string,
  payload: unknown,
  customerId: string | null,
) {
  const prisma = getPrismaClient();
  try {
    await prisma.billingWebhookEvent.create({
      data: {
        customerId: customerId || null,
        eventType,
        payloadHash: hashPayload(payload),
        providerEventId: eventId,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
}

function metadataCustomerId(
  metadata: Record<string, unknown> | undefined,
): string | null {
  const value = metadata?.customerId ?? metadata?.referenceId;
  return typeof value === "string" && value.length <= 64 ? value : null;
}

function normalizeStatus(status: string, eventType: string) {
  if (eventType === "subscription.expired" || status === "expired")
    return "EXPIRED" as const;
  if (eventType === "subscription.paused" || status === "paused")
    return "PAUSED" as const;
  if (
    eventType === "subscription.past_due" ||
    eventType === "subscription.unpaid" ||
    status === "past_due" ||
    status === "unpaid"
  )
    return "PAST_DUE" as const;
  if (
    eventType === "subscription.canceled" ||
    eventType === "subscription.scheduled_cancel" ||
    status === "canceled" ||
    status === "scheduled_cancel"
  )
    return "CANCELED" as const;
  if (eventType === "subscription.trialing" || status === "trialing")
    return "TRIALING" as const;
  return "ACTIVE" as const;
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}
