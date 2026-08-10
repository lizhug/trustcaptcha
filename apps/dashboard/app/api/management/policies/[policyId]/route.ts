import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../../lib/api/management-auth";
import {
  deleteVerificationPolicy,
  VerificationPolicyServiceError,
} from "../../../../../lib/policies/verification-policy-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ policyId: string }> },
) {
  const authorization = await authorizeManagementRequest("policies.write");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request)) {
    return managementError(403, "INVALID_ORIGIN");
  }
  try {
    const { policyId } = await context.params;
    await deleteVerificationPolicy(authorization.context, policyId);
    return managementSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof VerificationPolicyServiceError) {
      return managementError(404, error.code);
    }
    console.error("Verification policy deletion failed", error);
    return managementError(500, "INTERNAL_ERROR");
  }
}
