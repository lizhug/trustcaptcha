import { upsertVerificationPolicySchema } from "@trustcaptcha/shared";

import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../lib/api/management-auth";
import {
  listVerificationPolicies,
  upsertVerificationPolicy,
  VerificationPolicyServiceError,
} from "../../../../lib/policies/verification-policy-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeManagementRequest("policies.read");
  if (!authorization.ok) return authorization.response;
  const siteId = new URL(request.url).searchParams.get("siteId");
  if (!siteId) return managementError(400, "SITE_ID_REQUIRED");
  const data = await listVerificationPolicies(authorization.context, siteId);
  return managementSuccess(data);
}

export async function POST(request: Request) {
  const authorization = await authorizeManagementRequest("policies.write");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request)) {
    return managementError(403, "INVALID_ORIGIN");
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return managementError(400, "INVALID_JSON");
  }
  const parsed = upsertVerificationPolicySchema.safeParse(payload);
  if (!parsed.success) {
    return managementError(400, "INVALID_INPUT", parsed.error.flatten());
  }
  try {
    return managementSuccess(
      await upsertVerificationPolicy(authorization.context, parsed.data),
    );
  } catch (error) {
    return policyError(error);
  }
}

function policyError(error: unknown) {
  if (error instanceof VerificationPolicyServiceError) {
    return managementError(
      error.code === "BRANDED_CHALLENGES_NOT_INCLUDED" ? 403 : 404,
      error.code,
    );
  }
  console.error("Verification policy operation failed", error);
  return managementError(500, "INTERNAL_ERROR");
}
