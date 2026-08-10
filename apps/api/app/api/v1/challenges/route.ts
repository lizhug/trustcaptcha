import { randomBytes, randomInt } from "node:crypto";

import { ChallengeServiceError } from "@trustcaptcha/captcha-core";
import {
  createChallengeSchema,
  getPlanEntitlements,
  isTrustCaptchaTestSiteKey,
  TRUSTCAPTCHA_TEST_SITE_KEY_FAIL,
} from "@trustcaptcha/shared";

import { getChallengeServices } from "../../../../lib/challenges/service";
import {
  policyModeToPublicMode,
  resolveVerificationPolicy,
  selectBrandAsset,
} from "../../../../lib/policies/verification-policy";
import {
  allowedRequestOrigin,
  preflightResponse,
  publicError,
  publicSuccess,
} from "../../../../lib/public-api";
import {
  getClientIp,
  getUserAgent,
  hmacBinding,
} from "../../../../lib/request-context";
import { findActiveSiteByKey } from "../../../../lib/sites/public-site";

const CHALLENGE_TTL_SECONDS = 300;
const AUTOMATION_PATTERN =
  /(?:bot|crawler|spider|headless|phantomjs|selenium|playwright|puppeteer)/i;

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return preflightResponse(request);
}

export async function POST(request: Request) {
  let responseOrigin: string | undefined;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return publicError(400, "INVALID_JSON");
  }

  const parsed = createChallengeSchema.safeParse(payload);
  if (!parsed.success) return publicError(400, "INVALID_INPUT");

  if (isTrustCaptchaTestSiteKey(parsed.data.siteKey)) {
    const origin = request.headers.get("origin");
    if (!origin || !/^https?:\/\//.test(origin)) {
      return publicError(403, "ORIGIN_NOT_ALLOWED");
    }
    const outcome =
      parsed.data.siteKey === TRUSTCAPTCHA_TEST_SITE_KEY_FAIL ? "fail" : "pass";
    return publicSuccess(
      {
        challengeId: `tc_test_${outcome}_${randomBytes(14).toString("base64url")}`,
        expireAt: Date.now() + 120_000,
        language: parsed.data.language,
        mode: "invisible",
        success: true,
        testMode: true,
      },
      origin,
      201,
    );
  }

  try {
    const site = await findActiveSiteByKey(parsed.data.siteKey);
    if (!site) return publicError(404, "SITE_NOT_FOUND");

    const origin = allowedRequestOrigin(request, site.allowedOrigins);
    if (!origin) return publicError(403, "ORIGIN_NOT_ALLOWED");
    responseOrigin = origin;

    if (parsed.data.pageUrl && new URL(parsed.data.pageUrl).origin !== origin) {
      return publicError(403, "PAGE_ORIGIN_MISMATCH", origin);
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);
    const ipHash = hmacBinding(ip, "IP_HASH_PEPPER");
    const userAgentHash = hmacBinding(userAgent ?? "");
    const { challengeService, rateLimiter } = getChallengeServices();
    const entitlements = getPlanEntitlements(site.customer.planTier);
    const [ipLimit, siteLimit, pairLimit, riskRate, monthlyQuota, policy] =
      await Promise.all([
        rateLimiter.consume(`challenge:create:ip:${ipHash}`, 60, 60),
        rateLimiter.consume(`challenge:create:site:${site.id}`, 600, 60),
        rateLimiter.consume(
          `challenge:create:pair:${site.id}:${ipHash}`,
          30,
          60,
        ),
        rateLimiter.consume(`risk:ip:${ipHash}`, 1_000, 300),
        rateLimiter.consume(
          `quota:customer:${site.customerId}:${utcMonthKey()}`,
          entitlements.monthlyRequests,
          secondsUntilNextUtcMonth(),
        ),
        resolveVerificationPolicy(site.id, parsed.data.action),
      ]);
    const blocked = [ipLimit, siteLimit, pairLimit].find(
      (result) => !result.allowed,
    );
    if (blocked) {
      return publicError(429, "RATE_LIMITED", origin, {
        "Retry-After": String(blocked.retryAfterSeconds),
      });
    }
    if (!monthlyQuota.allowed) {
      return publicError(429, "MONTHLY_QUOTA_EXCEEDED", origin, {
        "Retry-After": String(monthlyQuota.retryAfterSeconds),
      });
    }

    const elevatedRisk =
      !userAgent?.trim() ||
      AUTOMATION_PATTERN.test(userAgent) ||
      riskRate.count > 10;
    const configuredMode = policyModeToPublicMode(policy.mode);
    const language = resolveSiteLanguage(
      parsed.data.language,
      site.defaultLocale,
      site.supportedLocales,
    );
    const responseMode =
      configuredMode === "managed"
        ? elevatedRisk
          ? "checkbox"
          : parsed.data.mode === "managed"
            ? "invisible"
            : parsed.data.mode
        : configuredMode;
    const asset =
      entitlements.brandedChallenges &&
      policy.allowedChallenges.includes("VISUAL") &&
      (elevatedRisk || policy.preset === "STRICT")
        ? await selectBrandAsset(site.id)
        : null;
    const visual = asset
      ? { assetId: asset.id, rotationQuarterTurns: randomInt(1, 4) }
      : undefined;
    const mode =
      visual || responseMode === "checkbox" ? "checkbox" : "invisible";
    const proofOfWork =
      policy.allowedChallenges.includes("POW") &&
      (AUTOMATION_PATTERN.test(userAgent ?? "") || riskRate.count > 30)
        ? {
            algorithm: "SHA-256" as const,
            difficulty: 12,
            salt: randomBytes(16).toString("base64url"),
          }
        : undefined;

    const challenge = await challengeService.create({
      action: parsed.data.action,
      id: randomBytes(24).toString("base64url"),
      ipHash,
      mode,
      now: Date.now(),
      proofOfWork,
      riskThreshold: policy.riskThreshold ?? site.riskThreshold,
      requestNonceHash: hmacBinding(parsed.data.requestNonce),
      siteId: site.id,
      ttlSeconds: CHALLENGE_TTL_SECONDS,
      userAgentHash,
      visual,
    });

    return publicSuccess(
      {
        challengeId: challenge.id,
        expireAt: challenge.expireAt,
        language,
        mode: visual ? "checkbox" : responseMode,
        ...(challenge.proofOfWork
          ? { proofOfWork: challenge.proofOfWork }
          : {}),
        ...(visual && asset
          ? {
              visual: {
                altText: asset.altText,
                assetUrl: `${new URL(request.url).origin}/api/v1/assets/${asset.id}`,
                rotationQuarterTurns: visual.rotationQuarterTurns,
              },
            }
          : {}),
        success: true,
      },
      origin,
      201,
    );
  } catch (error) {
    if (error instanceof ChallengeServiceError) {
      return publicError(409, error.code, responseOrigin);
    }
    console.error("Challenge creation failed", error);
    return publicError(503, "CHALLENGE_SERVICE_UNAVAILABLE", responseOrigin);
  }
}

function utcMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function secondsUntilNextUtcMonth(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.max(60, Math.ceil((next - now.getTime()) / 1_000));
}

function resolveSiteLanguage(
  requested: string,
  defaultLocale: string,
  supportedLocales: string[],
): string {
  if (
    supportedLocales.includes("auto") ||
    supportedLocales.includes(requested)
  ) {
    return requested;
  }
  return defaultLocale === "auto" ? "en" : defaultLocale;
}
