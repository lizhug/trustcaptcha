import { Webhook } from "@creem_io/nextjs";

import {
  syncCreemCheckoutEvent,
  syncCreemSubscriptionEvent,
} from "../../../../lib/billing/creem-webhook-service";

export const dynamic = "force-dynamic";

const handler = Webhook({
  onCheckoutCompleted: syncCreemCheckoutEvent,
  onSubscriptionActive: syncCreemSubscriptionEvent,
  onSubscriptionCanceled: syncCreemSubscriptionEvent,
  onSubscriptionExpired: syncCreemSubscriptionEvent,
  onSubscriptionPaid: syncCreemSubscriptionEvent,
  onSubscriptionPastDue: syncCreemSubscriptionEvent,
  onSubscriptionPaused: syncCreemSubscriptionEvent,
  onSubscriptionScheduledCancel: syncCreemSubscriptionEvent,
  onSubscriptionTrialing: syncCreemSubscriptionEvent,
  onSubscriptionUnpaid: syncCreemSubscriptionEvent,
  onSubscriptionUpdate: syncCreemSubscriptionEvent,
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET ?? "not-configured",
});

export async function POST(request: Parameters<typeof handler>[0]) {
  if (!process.env.CREEM_WEBHOOK_SECRET) {
    return Response.json({ error: "CREEM_NOT_CONFIGURED" }, { status: 503 });
  }
  return handler(request);
}
