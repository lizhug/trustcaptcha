import {
  isTrustCaptchaTestSiteKey,
  widgetConfigQuerySchema,
} from "@trustcaptcha/shared";

import {
  allowedRequestOrigin,
  preflightResponse,
  publicError,
  publicSuccess,
} from "../../../../../lib/public-api";
import { findActiveSiteByKey } from "../../../../../lib/sites/public-site";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return preflightResponse(request);
}

export async function GET(request: Request) {
  const parsed = widgetConfigQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!parsed.success) return publicError(400, "INVALID_INPUT");

  if (isTrustCaptchaTestSiteKey(parsed.data.siteKey)) {
    const origin = testRequestOrigin(request);
    if (!origin) return publicError(403, "ORIGIN_NOT_ALLOWED");
    return publicSuccess(
      {
        defaultLocale: "auto",
        modes: ["managed", "checkbox", "invisible", "non-interactive"],
        siteKey: parsed.data.siteKey,
        size: "normal",
        supportedLocales: ["auto"],
        testMode: true,
        theme: "light",
      },
      origin,
    );
  }

  const site = await findActiveSiteByKey(parsed.data.siteKey);
  if (!site) return publicError(404, "SITE_NOT_FOUND");

  const origin = allowedRequestOrigin(request, site.allowedOrigins);
  if (!origin) return publicError(403, "ORIGIN_NOT_ALLOWED");

  return publicSuccess(
    {
      defaultLocale: site.defaultLocale,
      modes: ["managed", "checkbox", "invisible", "non-interactive"],
      siteKey: site.siteKey,
      size: "normal",
      supportedLocales: site.supportedLocales,
      theme: "light",
    },
    origin,
  );
}

function testRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin && /^https?:\/\//.test(origin) ? origin : null;
}
