import { updateSiteSchema } from "@trustcaptcha/shared";

import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../../lib/api/management-auth";
import {
  deleteSite,
  SiteServiceError,
  updateSite,
} from "../../../../../lib/sites/site-service";

type SiteRouteContext = { params: Promise<{ siteId: string }> };

export async function PATCH(request: Request, context: SiteRouteContext) {
  const authorization = await authorizeManagementRequest("sites.write");
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

  const parsed = updateSiteSchema.safeParse(payload);
  if (!parsed.success) {
    return managementError(400, "INVALID_INPUT", parsed.error.flatten());
  }

  const { siteId } = await context.params;

  try {
    return managementSuccess(
      await updateSite(authorization.context, siteId, parsed.data),
    );
  } catch (error) {
    return siteMutationError(error);
  }
}

export async function DELETE(request: Request, context: SiteRouteContext) {
  const authorization = await authorizeManagementRequest("sites.delete");
  if (!authorization.ok) return authorization.response;
  if (!hasValidMutationOrigin(request)) {
    return managementError(403, "INVALID_ORIGIN");
  }

  const { siteId } = await context.params;

  try {
    await deleteSite(authorization.context, siteId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return siteMutationError(error);
  }
}

function siteMutationError(error: unknown): Response {
  if (error instanceof SiteServiceError) {
    const status = error.code === "NOT_FOUND" ? 404 : 400;
    return managementError(status, error.code);
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return managementError(409, "SITE_DOMAIN_EXISTS");
  }

  console.error("Failed to mutate site", error);
  return managementError(500, "INTERNAL_ERROR");
}
