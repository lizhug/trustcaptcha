import { randomUUID } from "node:crypto";

import { getPrismaClient } from "@trustcaptcha/database";
import {
  TRUSTCAPTCHA_TEST_SECRET,
  TRUSTCAPTCHA_TEST_TOKEN_PASS,
  verifyTokenSchema,
} from "@trustcaptcha/shared";
import { tokenIdentifierHash, TokenServiceError } from "@trustcaptcha/token";

import {
  credentialRateLimitId,
  verifyCredential,
} from "../../../../lib/credentials/verify-credential";
import { getChallengeServices } from "../../../../lib/challenges/service";
import {
  recordVerificationLog,
  type VerificationLogInput,
} from "../../../../lib/logging/verification-log";
import { getClientIp, hmacBinding } from "../../../../lib/request-context";
import { getTokenServices } from "../../../../lib/tokens/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const latencyStartedAt = Date.now();
  const requestId = randomUUID();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return verifyError(requestId, 400, "INVALID_JSON");
  }

  const parsed = verifyTokenSchema.safeParse(payload);
  if (!parsed.success) return verifyError(requestId, 400, "INVALID_INPUT");

  if (
    request.headers.get("authorization") ===
    `Bearer ${TRUSTCAPTCHA_TEST_SECRET}`
  ) {
    const passed = parsed.data.token === TRUSTCAPTCHA_TEST_TOKEN_PASS;
    return verifyResult(
      requestId,
      passed,
      passed ? 99 : 0,
      120,
      passed ? undefined : ["TEST_BOT_DETECTED"],
      passed ? parsed.data.action : undefined,
    );
  }

  const ipAddress = getClientIp(request);
  let ipHash: string;
  try {
    ipHash = hmacBinding(ipAddress, "IP_HASH_PEPPER");
    const authorization = request.headers.get("authorization");
    const credentialId = credentialRateLimitId(authorization);
    const { challengeStore, rateLimiter } = getChallengeServices();
    const [credentialLimit, ipLimit] = await Promise.all([
      rateLimiter.consume(`verify:credential:${credentialId}`, 120, 60),
      rateLimiter.consume(`verify:ip:${ipHash}`, 300, 60),
    ]);
    const blocked = [credentialLimit, ipLimit].find(
      (result) => !result.allowed,
    );
    if (blocked) {
      return verifyError(requestId, 429, "RATE_LIMITED", {
        "Retry-After": String(blocked.retryAfterSeconds),
      });
    }

    const credential = await verifyCredential(authorization);
    if (!credential) return verifyError(requestId, 401, "INVALID_CREDENTIAL");

    const commonLog = {
      action: parsed.data.action,
      apiKeyId: credential.apiKeyId,
      customerId: credential.customerId,
      ipAddress,
      ipHash,
      latencyStartedAt,
      origin: request.headers.get("origin") ?? undefined,
      requestId,
      token: parsed.data.token,
      userAgent: request.headers.get("user-agent") ?? undefined,
    } satisfies Omit<
      VerificationLogInput,
      | "challengeId"
      | "failureCode"
      | "riskReasons"
      | "score"
      | "siteId"
      | "status"
      | "verificationDurationMs"
    >;

    const { consumptionStore, tokenService } = getTokenServices();
    let tokenPayload;
    try {
      tokenPayload = tokenService.verify(parsed.data.token);
    } catch (error) {
      if (error instanceof TokenServiceError) {
        if (credential.siteId) {
          await recordVerificationLog({
            ...commonLog,
            failureCode: error.code,
            siteId: credential.siteId,
            status: error.code === "TOKEN_EXPIRED" ? "EXPIRED" : "INVALID",
          });
        }
        return verifyResult(requestId, false, undefined, undefined, [
          error.code,
        ]);
      }
      throw error;
    }

    const site = await getPrismaClient().site.findFirst({
      where: {
        customerId: credential.customerId,
        deletedAt: null,
        id: tokenPayload.siteId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (
      !site ||
      (credential.siteId && credential.siteId !== tokenPayload.siteId)
    ) {
      const logSiteId = site?.id ?? credential.siteId;
      if (logSiteId) {
        await recordVerificationLog({
          ...commonLog,
          challengeId: tokenPayload.challengeId,
          failureCode: "TOKEN_SITE_MISMATCH",
          score: tokenPayload.score,
          siteId: logSiteId,
          status: "INVALID",
        });
      }
      return verifyResult(requestId, false, undefined, undefined, [
        "TOKEN_SITE_MISMATCH",
      ]);
    }

    if (tokenPayload.action !== parsed.data.action) {
      await recordVerificationLog({
        ...commonLog,
        challengeId: tokenPayload.challengeId,
        failureCode: "TOKEN_ACTION_MISMATCH",
        score: tokenPayload.score,
        siteId: site.id,
        status: "INVALID",
      });
      return verifyResult(requestId, false, undefined, undefined, [
        "TOKEN_ACTION_MISMATCH",
      ]);
    }

    const challenge = await challengeStore.get(tokenPayload.challengeId);
    const nowSeconds = Math.floor(Date.now() / 1_000);
    const consumeResult = await consumptionStore.consume({
      challengeId: tokenPayload.challengeId,
      expiresAtSeconds: tokenPayload.exp,
      jtiHash: tokenIdentifierHash(tokenPayload.jti),
      nowSeconds,
      siteId: tokenPayload.siteId,
    });
    const logDetails = {
      ...commonLog,
      challengeId: tokenPayload.challengeId,
      riskReasons: challenge?.reasons ?? [],
      score: tokenPayload.score,
      siteId: site.id,
      verificationDurationMs: challenge
        ? Math.max(0, Date.now() - challenge.createdAt)
        : undefined,
    };

    if (consumeResult !== "OK") {
      const errors = {
        BINDING_MISMATCH: "TOKEN_BINDING_MISMATCH",
        EXPIRED: "TOKEN_EXPIRED",
        MISSING: "TOKEN_STATE_MISSING",
        REPLAYED: "TOKEN_REPLAYED",
        TERMINAL: "TOKEN_INVALID_STATE",
      } as const;
      const failureCode = errors[consumeResult];
      await recordVerificationLog({
        ...logDetails,
        failureCode,
        status:
          consumeResult === "EXPIRED"
            ? "EXPIRED"
            : consumeResult === "REPLAYED"
              ? "REPLAYED"
              : "INVALID",
      });
      return verifyResult(requestId, false, undefined, undefined, [
        failureCode,
      ]);
    }

    await Promise.all([
      credential.apiKeyId
        ? getPrismaClient().apiKey.update({
            data: { lastUsedAt: new Date() },
            where: { id: credential.apiKeyId },
          })
        : Promise.resolve(),
      recordVerificationLog({ ...logDetails, status: "SUCCESS" }),
    ]);

    return verifyResult(
      requestId,
      true,
      tokenPayload.score,
      Math.max(0, tokenPayload.exp - nowSeconds),
      undefined,
      tokenPayload.action,
    );
  } catch (error) {
    console.error("Token verification failed", error);
    return verifyError(requestId, 503, "VERIFY_SERVICE_UNAVAILABLE");
  }
}

function verifyResult(
  requestId: string,
  success: boolean,
  score?: number,
  expire?: number,
  errorCodes?: string[],
  action?: string,
): Response {
  return Response.json(
    {
      ...(errorCodes ? { errorCodes } : {}),
      ...(action ? { action } : {}),
      ...(expire === undefined ? {} : { expire }),
      requestId,
      ...(score === undefined ? {} : { score }),
      success,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function verifyError(
  requestId: string,
  status: number,
  code: string,
  headers?: HeadersInit,
): Response {
  return Response.json(
    { errorCodes: [code], requestId, success: false },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}
