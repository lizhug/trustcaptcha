import type { MetadataRoute } from "next";

import { marketingLocales } from "../lib/marketing-i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4303"
  ).replace(/\/$/, "");
  const languages = Object.fromEntries(
    marketingLocales.map((locale) => [locale, `${siteUrl}/${locale}`]),
  );
  return marketingLocales.map(
    (locale) =>
      ({
        alternates: { languages },
        changeFrequency: "weekly",
        lastModified: new Date(),
        priority: locale === "en" ? 1 : 0.9,
        url: `${siteUrl}/${locale}`,
      }) as const,
  );
}
