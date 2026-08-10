import { NextResponse, type NextRequest } from "next/server";

import { marketingLocales } from "./lib/marketing-i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    const locale = detectLocale(request.headers.get("accept-language"));
    return NextResponse.redirect(new URL(`/${locale}`, request.url), 307);
  }
  const segment = pathname.split("/")[1];
  if (
    !segment ||
    !marketingLocales.includes(segment as (typeof marketingLocales)[number])
  ) {
    return NextResponse.next();
  }
  const headers = new Headers(request.headers);
  headers.set("x-trustcaptcha-locale", segment);
  return NextResponse.next({ request: { headers } });
}

function detectLocale(acceptLanguage: string | null) {
  for (const value of (acceptLanguage ?? "").split(",")) {
    const language = value.split(";")[0]?.trim().toLowerCase() ?? "";
    if (
      language.startsWith("zh-tw") ||
      language.startsWith("zh-hk") ||
      language.startsWith("zh-hant")
    )
      return "zh-TW";
    if (language.startsWith("zh")) return "zh-CN";
    if (language.startsWith("pt")) return "pt-BR";
    for (const locale of ["ja", "ko", "es", "de", "fr", "en"] as const) {
      if (language.startsWith(locale)) return locale;
    }
  }
  return "en";
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|og.png|manifest.webmanifest).*)",
  ],
};
