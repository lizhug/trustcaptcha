import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../lib/api/management-auth";
import {
  BillingServiceError,
  createBillingPortal,
} from "../../../../lib/billing/billing-service";

export async function POST(request: Request) {
  const authorization = await authorizeManagementRequest("billing.manage");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request))
    return managementError(403, "INVALID_ORIGIN");

  try {
    return managementSuccess(await createBillingPortal(authorization.context));
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return managementError(
        error.code === "PORTAL_UNAVAILABLE" ? 409 : 502,
        error.code,
      );
    }
    console.error("Billing portal failed", error);
    return managementError(500, "INTERNAL_ERROR");
  }
}
