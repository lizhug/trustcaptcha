import {
  apiKeyListQuerySchema,
  createApiKeySchema,
} from "@trustcaptcha/shared";

import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../lib/api/management-auth";
import {
  ApiKeyServiceError,
  createApiKey,
  listApiKeys,
} from "../../../../lib/api-keys/api-key-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeManagementRequest("apiKeys.read");
  if (!authorization.ok) return authorization.response;
  const query = apiKeyListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!query.success)
    return managementError(400, "INVALID_INPUT", query.error.flatten());
  const result = await listApiKeys(authorization.context, query.data);
  return Response.json(
    { data: result.data, success: true, total: result.total },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const authorization = await authorizeManagementRequest("apiKeys.write");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request))
    return managementError(403, "INVALID_ORIGIN");

  try {
    const parsed = createApiKeySchema.safeParse(await request.json());
    if (!parsed.success)
      return managementError(400, "INVALID_INPUT", parsed.error.flatten());
    return managementSuccess(
      await createApiKey(authorization.context, parsed.data),
      201,
    );
  } catch (error) {
    return apiKeyError(error);
  }
}

function apiKeyError(error: unknown): Response {
  if (error instanceof ApiKeyServiceError) {
    const status =
      error.code === "NOT_FOUND" || error.code === "SITE_NOT_FOUND" ? 404 : 400;
    return managementError(status, error.code);
  }
  console.error("Failed to manage API key", error);
  return managementError(500, "INTERNAL_ERROR");
}
