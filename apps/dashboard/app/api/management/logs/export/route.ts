import { verificationLogQuerySchema } from "@trustcaptcha/shared";

import {
  authorizeManagementRequest,
  managementError,
} from "../../../../../lib/api/management-auth";
import { exportVerificationLogs } from "../../../../../lib/logs/verification-log-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeManagementRequest("logs.export");
  if (!authorization.ok) return authorization.response;
  const query = verificationLogQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!query.success)
    return managementError(400, "INVALID_INPUT", query.error.flatten());
  const csv = await exportVerificationLogs(authorization.context, query.data);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="trustcaptcha-verifications-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
