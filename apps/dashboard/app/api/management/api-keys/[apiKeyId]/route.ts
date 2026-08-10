import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
} from "../../../../../lib/api/management-auth";
import {
  ApiKeyServiceError,
  revokeApiKey,
} from "../../../../../lib/api-keys/api-key-service";

type ApiKeyRouteContext = { params: Promise<{ apiKeyId: string }> };

export async function DELETE(request: Request, context: ApiKeyRouteContext) {
  const authorization = await authorizeManagementRequest("apiKeys.write");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request))
    return managementError(403, "INVALID_ORIGIN");
  try {
    const { apiKeyId } = await context.params;
    await revokeApiKey(authorization.context, apiKeyId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiKeyError(error);
  }
}

function apiKeyError(error: unknown): Response {
  if (error instanceof ApiKeyServiceError) {
    return managementError(error.code === "NOT_FOUND" ? 404 : 400, error.code);
  }
  console.error("Failed to revoke API key", error);
  return managementError(500, "INTERNAL_ERROR");
}
