import { randomUUID } from "node:crypto";

import type { Permission } from "../auth/permissions";
import { hasPermission } from "../auth/permissions";
import { getAuthContext, type AuthContext } from "../auth/session";

type ApiAuthorizationResult =
  | { context: AuthContext; ok: true }
  | { ok: false; response: Response };

export async function authorizeManagementRequest(
  permission: Permission,
): Promise<ApiAuthorizationResult> {
  const context = await getAuthContext();

  if (!context) {
    return {
      ok: false,
      response: managementError(401, "UNAUTHENTICATED"),
    };
  }

  if (!hasPermission(context.role, permission)) {
    return {
      ok: false,
      response: managementError(403, "FORBIDDEN"),
    };
  }

  return { context, ok: true };
}

export function hasValidMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const expectedOrigin =
    process.env.DASHBOARD_ORIGIN ?? new URL(request.url).origin;
  return origin === expectedOrigin;
}

export function managementError(
  status: number,
  code: string,
  details?: unknown,
): Response {
  return Response.json(
    {
      details,
      errorCodes: [code],
      requestId: randomUUID(),
      success: false,
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function managementSuccess(data: unknown, status = 200): Response {
  return Response.json(
    { data, success: true },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
