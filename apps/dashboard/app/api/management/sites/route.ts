import { createSiteSchema, siteListQuerySchema } from "@trustcaptcha/shared";

import {
  authorizeManagementRequest,
  hasValidMutationOrigin,
  managementError,
  managementSuccess,
} from "../../../../lib/api/management-auth";
import {
  createSite,
  listSites,
  SiteServiceError,
} from "../../../../lib/sites/site-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeManagementRequest("sites.read");
  if (!authorization.ok) return authorization.response;

  const query = siteListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!query.success) {
    return managementError(400, "INVALID_INPUT", query.error.flatten());
  }

  const result = await listSites(authorization.context, query.data);
  return Response.json(
    { data: result.data, success: true, total: result.total },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
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

  const parsed = createSiteSchema.safeParse(payload);
  if (!parsed.success) {
    return managementError(400, "INVALID_INPUT", parsed.error.flatten());
  }

  try {
    const site = await createSite(authorization.context, parsed.data);
    return managementSuccess(site, 201);
  } catch (error) {
    return siteErrorResponse(error);
  }
}

function siteErrorResponse(error: unknown): Response {
  if (error instanceof SiteServiceError) {
    const status =
      error.code === "INVALID_DOMAIN"
        ? 400
        : error.code === "PLAN_SITE_LIMIT"
          ? 403
          : 500;
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

  console.error("Failed to create site", error);
  return managementError(500, "INTERNAL_ERROR");
}
