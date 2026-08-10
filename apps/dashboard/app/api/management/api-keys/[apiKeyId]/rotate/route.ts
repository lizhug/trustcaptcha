import { rotateApiKeySchema } from "@trustcaptcha/shared";

import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../../../lib/api/management-auth";
import {
  ApiKeyServiceError,
  rotateApiKey,
} from "../../../../../../lib/api-keys/api-key-service";

type ApiKeyRouteContext = { params: Promise<{ apiKeyId: string }> };

export async function POST(request: Request, context: ApiKeyRouteContext) {
  const authorization = await authorizeManagementRequest("apiKeys.rotate");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request))
    return managementError(403, "INVALID_ORIGIN");
  try {
    const parsed = rotateApiKeySchema.safeParse(await request.json());
    if (!parsed.success)
      return managementError(400, "INVALID_INPUT", parsed.error.flatten());
    const { apiKeyId } = await context.params;
    return managementSuccess(
      await rotateApiKey(authorization.context, apiKeyId, parsed.data),
    );
  } catch (error) {
    return apiKeyError(error);
  }
}

function apiKeyError(error: unknown): Response {
  if (error instanceof ApiKeyServiceError) {
    return managementError(error.code === "NOT_FOUND" ? 404 : 400, error.code);
  }
  console.error("Failed to rotate API key", error);
  return managementError(500, "INTERNAL_ERROR");
}
