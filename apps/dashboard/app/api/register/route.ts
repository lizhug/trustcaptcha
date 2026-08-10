import { registerAccountSchema } from "@trustcaptcha/shared";

import {
  registerAccount,
  RegistrationError,
} from "../../../lib/auth/registration";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return result(403, "INVALID_ORIGIN");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return result(400, "INVALID_JSON");
  }

  const parsed = registerAccountSchema.safeParse(payload);
  if (!parsed.success) return result(400, "INVALID_INPUT");

  try {
    const account = await registerAccount(parsed.data);
    return Response.json(
      { data: account, success: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RegistrationError) {
      const status =
        error.code === "ACCOUNT_EXISTS"
          ? 409
          : error.code === "SIGNUP_NOT_CONFIGURED" ||
              error.code === "UPSTREAM_UNAVAILABLE"
            ? 503
            : 403;
      return result(status, error.code);
    }
    if (isUniqueConstraintError(error)) return result(409, "ACCOUNT_EXISTS");
    console.error("Account registration failed", error);
    return result(500, "INTERNAL_ERROR");
  }
}

function hasValidOrigin(request: Request) {
  const expected = process.env.DASHBOARD_ORIGIN;
  const supplied = request.headers.get("origin");
  if (!expected || !supplied) return false;
  try {
    return new URL(supplied).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}

function result(status: number, code: string) {
  return Response.json(
    { errorCodes: [code], success: false },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
