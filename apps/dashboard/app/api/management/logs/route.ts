import { verificationLogQuerySchema } from "@trustcaptcha/shared";

import {
  authorizeManagementRequest,
  managementError,
} from "../../../../lib/api/management-auth";
import { listVerificationLogs } from "../../../../lib/logs/verification-log-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeManagementRequest("logs.read");
  if (!authorization.ok) return authorization.response;
  const query = verificationLogQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!query.success)
    return managementError(400, "INVALID_INPUT", query.error.flatten());
  const result = await listVerificationLogs(authorization.context, query.data);
  return Response.json(
    { data: result.data, success: true, total: result.total },
    { headers: { "Cache-Control": "no-store" } },
  );
}
