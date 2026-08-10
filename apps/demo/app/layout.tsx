import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import "./globals.css";

const title = "TrustCaptcha — Adaptive CAPTCHA & Bot Protection";
const description =
  "Privacy-aware human verification for modern web apps, with Managed, Invisible and Checkbox modes, action-bound tokens and server-side risk enforcement.";

export function generateMetadata(): Metadata {
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "http://localhost:4303";
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    applicationName: "TrustCaptcha",
    alternates: { canonical: "/" },
    category: "security",
    keywords: [
      "CAPTCHA",
      "bot protection",
      "human verification",
      "adaptive CAPTCHA",
      "invisible CAPTCHA",
      "Next.js CAPTCHA",
      "SaaS security",
      "anti automation",
    ],
    openGraph: {
      title,
      description,
      images: [
        { alt: "TrustCaptcha adaptive human verification", url: "/og.png" },
      ],
      locale: "en_US",
      siteName: "TrustCaptcha",
      type: "website",
      url: "/",
    },
    robots: {
      follow: true,
      googleBot: {
        follow: true,
        index: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
      index: true,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#081633",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = (await headers()).get("x-trustcaptcha-locale") ?? "en";
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
