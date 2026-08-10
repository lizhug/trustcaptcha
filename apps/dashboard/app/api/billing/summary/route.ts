import {
  authorizeManagementRequest,
  managementSuccess,
} from "../../../../lib/api/management-auth";
import { getBillingSummary } from "../../../../lib/billing/billing-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeManagementRequest("billing.read");
  if (!authorization.ok) return authorization.response;
  return managementSuccess(await getBillingSummary(authorization.context));
}
