import { ChallengeServiceError } from "@trustcaptcha/captcha-core";
import {
  completeChallengeSchema,
  TRUSTCAPTCHA_TEST_TOKEN_FAIL,
  TRUSTCAPTCHA_TEST_TOKEN_PASS,
} from "@trustcaptcha/shared";
import { tokenIdentifierHash } from "@trustcaptcha/token";

import { getChallengeServices } from "../../../../../../lib/challenges/service";
import { verifyProofOfWork } from "../../../../../../lib/challenges/proof-of-work";
import {
  allowedRequestOrigin,
  preflightResponse,
  publicError,
  publicSuccess,
} from "../../../../../../lib/public-api";
import {
  getClientIp,
  getUserAgent,
  hmacBinding,
} from "../../../../../../lib/request-context";
import { findActiveSiteById } from "../../../../../../lib/sites/public-site";
import { getTokenServices } from "../../../../../../lib/tokens/service";

type CompleteRouteContext = { params: Promise<{ challengeId: string }> };

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return preflightResponse(request);
}

export async function POST(request: Request, context: CompleteRouteContext) {
  let responseOrigin: string | undefined;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return publicError(400, "INVALID_JSON");
  }

  const parsed = completeChallengeSchema.safeParse(payload);
  if (!parsed.success) return publicError(400, "INVALID_INPUT");

  const { challengeId } = await context.params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(challengeId)) {
    return publicError(400, "INVALID_CHALLENGE_ID");
  }

  if (
    challengeId.startsWith("tc_test_pass_") ||
    challengeId.startsWith("tc_test_fail_")
  ) {
    const origin = request.headers.get("origin");
    if (!origin || !/^https?:\/\//.test(origin)) {
      return publicError(403, "ORIGIN_NOT_ALLOWED");
    }
    const passed = challengeId.startsWith("tc_test_pass_");
    return publicSuccess(
      {
        challengePassed: passed,
        expireAt: Date.now() + 120_000,
        reasons: [passed ? "TEST_ALWAYS_PASS" : "TEST_BOT_DETECTED"],
        score: passed ? 99 : 0,
        success: passed,
        testMode: true,
        token: passed
          ? TRUSTCAPTCHA_TEST_TOKEN_PASS
          : TRUSTCAPTCHA_TEST_TOKEN_FAIL,
      },
      origin,
    );
  }

  try {
    const { challengeService, challengeStore, rateLimiter } =
      getChallengeServices();
    const record = await challengeStore.get(challengeId);
    if (!record) return publicError(400, "CHALLENGE_NOT_FOUND");

    const site = await findActiveSiteById(record.siteId);
    if (!site) return publicError(400, "CHALLENGE_NOT_FOUND");

    const origin = allowedRequestOrigin(request, site.allowedOrigins);
    if (!origin) return publicError(403, "ORIGIN_NOT_ALLOWED");
    responseOrigin = origin;

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);
    const ipHash = hmacBinding(ip, "IP_HASH_PEPPER");
    const [challengeLimit, pairLimit, riskRate] = await Promise.all([
      rateLimiter.consume(`challenge:complete:${challengeId}`, 5, 300),
      rateLimiter.consume(
        `challenge:complete:pair:${site.id}:${ipHash}`,
        60,
        60,
      ),
      rateLimiter.consume(`risk:ip:${ipHash}`, 1_000, 300),
    ]);
    const blocked = [challengeLimit, pairLimit].find(
      (result) => !result.allowed,
    );
    if (blocked) {
      return publicError(429, "RATE_LIMITED", origin, {
        "Retry-After": String(blocked.retryAfterSeconds),
      });
    }

    const visualAnswerValid = record.visual
      ? parsed.data.visualAnswer !== undefined &&
        (record.visual.rotationQuarterTurns +
          parsed.data.visualAnswer.rotationQuarterTurns) %
          4 ===
          0
      : true;

    const result = await challengeService.complete({
      challengeId,
      expectedIpHash: ipHash,
      expectedNonceHash: hmacBinding(parsed.data.requestNonce),
      expectedUserAgentHash: hmacBinding(userAgent ?? ""),
      now: Date.now(),
      riskContext: {
        cookieEnabled:
          parsed.data.cookieEnabled && parsed.data.storageAvailable,
        interaction: parsed.data.interaction,
        ipRequestCount: riskRate.count,
        proofOfWorkValid: verifyProofOfWork(
          record,
          parsed.data.proofOfWork?.nonce,
        ),
        userAgent,
      },
      threshold: visualAnswerValid
        ? (record.riskThreshold ?? site.riskThreshold)
        : 101,
    });

    if (!result.passed) {
      return publicSuccess(
        {
          challengePassed: false,
          reasons: visualAnswerValid
            ? result.reasons
            : [...result.reasons, "VISUAL_ANSWER_INCORRECT"],
          score: result.score,
          success: false,
        },
        origin,
      );
    }

    const { consumptionStore, tokenService } = getTokenServices();
    const issued = tokenService.issue({
      action: result.record.action,
      challengeId,
      score: result.score,
      siteId: site.id,
      ttlSeconds: site.tokenTtlSeconds,
    });
    const issuedState = await consumptionStore.markIssued({
      challengeId,
      expiresAtSeconds: issued.payload.exp,
      jtiHash: tokenIdentifierHash(issued.payload.jti),
      nowSeconds: Math.floor(Date.now() / 1_000),
    });
    if (issuedState !== "OK") {
      throw new Error(`TOKEN_ISSUE_STATE_${issuedState}`);
    }

    return publicSuccess(
      {
        challengePassed: true,
        expireAt: issued.payload.exp * 1_000,
        reasons: result.reasons,
        score: result.score,
        success: true,
        token: issued.token,
      },
      origin,
    );
  } catch (error) {
    if (error instanceof ChallengeServiceError) {
      const status = error.code === "CHALLENGE_BINDING_MISMATCH" ? 403 : 400;
      return publicError(status, error.code, responseOrigin);
    }
    console.error("Challenge completion failed", error);
    return publicError(503, "CHALLENGE_SERVICE_UNAVAILABLE", responseOrigin);
  }
}
