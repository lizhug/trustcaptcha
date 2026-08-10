import { z } from "zod";

import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../lib/api/management-auth";
import {
  BillingServiceError,
  createCheckout,
} from "../../../../lib/billing/billing-service";

const checkoutSchema = z.object({
  billingCycle: z.enum(["monthly", "yearly"]),
  planTier: z.enum(["PRO", "SCALE", "PRIVATE"]),
});

export async function POST(request: Request) {
  const authorization = await authorizeManagementRequest("billing.manage");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request))
    return managementError(403, "INVALID_ORIGIN");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return managementError(400, "INVALID_JSON");
  }
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success)
    return managementError(400, "INVALID_INPUT", parsed.error.flatten());

  try {
    return managementSuccess(
      await createCheckout(authorization.context, parsed.data),
      201,
    );
  } catch (error) {
    return billingError(error);
  }
}

function billingError(error: unknown): Response {
  if (error instanceof BillingServiceError) {
    const status =
      error.code === "CREEM_NOT_CONFIGURED" ||
      error.code === "PORTAL_UNAVAILABLE"
        ? 503
        : error.code === "INVALID_PLAN"
          ? 400
          : 502;
    return managementError(status, error.code);
  }
  console.error("Checkout failed", error);
  return managementError(500, "INTERNAL_ERROR");
}
