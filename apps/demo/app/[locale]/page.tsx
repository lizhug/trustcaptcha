import { PUBLIC_PLAN_PRICING } from "@trustcaptcha/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CaptchaDemo } from "../../components/captcha-demo";
import {
  dictionaries,
  isMarketingLocale,
  localeNames,
  marketingLocales,
  type MarketingLocale,
} from "../../lib/marketing-i18n";

type PageContext = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageContext): Promise<Metadata> {
  const { locale } = await params;
  if (!isMarketingLocale(locale)) return {};
  const copy = dictionaries[locale];
  const languages = Object.fromEntries(
    marketingLocales.map((item) => [item, `/${item}`]),
  );
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: { ...languages, "x-default": "/en" },
    },
    keywords: [
      "CAPTCHA",
      "bot protection",
      "human verification",
      "branded CAPTCHA",
      "privacy CAPTCHA",
      "TrustCaptcha",
    ],
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      images: [
        { alt: "TrustCaptcha adaptive human verification", url: "/og.png" },
      ],
      locale: copy.code.replace("-", "_"),
      siteName: "TrustCaptcha",
      type: "website",
      url: `/${locale}`,
    },
    twitter: {
      card: "summary_large_image",
      title: copy.metaTitle,
      description: copy.metaDescription,
      images: ["/og.png"],
    },
  };
}

export default async function LocalizedMarketingPage({ params }: PageContext) {
  const { locale: localeValue } = await params;
  if (!isMarketingLocale(localeValue)) notFound();
  const locale: MarketingLocale = localeValue;
  const copy = dictionaries[locale];
  const apiBaseUrl = process.env.PUBLIC_API_URL ?? "http://localhost:4302";
  const dashboardUrl =
    process.env.PUBLIC_DASHBOARD_URL ?? "http://localhost:4301";
  const siteKey = process.env.DEMO_SITE_KEY ?? "";
  const siteUrl = (
    process.env.PUBLIC_SITE_URL ?? "http://localhost:4303"
  ).replace(/\/$/, "");
  const planTiers = ["FREE", "PRO", "SCALE", "PRIVATE"] as const;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "TrustCaptcha",
        url: `${siteUrl}/${locale}`,
      },
      {
        "@type": "SoftwareApplication",
        name: "TrustCaptcha",
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web",
        description: copy.definition,
        offers: planTiers.map((tier, index) => ({
          "@type": "Offer",
          name: copy.planNames[index],
          price: PUBLIC_PLAN_PRICING[tier].monthlyUsd,
          priceCurrency: "USD",
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: copy.faqs.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link
          className="brand-lockup"
          href={`/${locale}#top`}
          aria-label="TrustCaptcha home"
        >
          <BrandMark />
          <span>
            Trust<span>Captcha</span>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#product">{copy.nav[0]}</a>
          <a href="#security">{copy.nav[1]}</a>
          <a href="#pricing">{copy.nav[2]}</a>
          <a href="#faq">{copy.nav[3]}</a>
        </nav>
        <div className="header-tools">
          <Link className="header-docs" href="/docs">
            Docs
          </Link>
          <details className="language-menu">
            <summary>{localeNames[locale]}</summary>
            <div>
              {marketingLocales.map((item) => (
                <Link href={`/${item}`} hrefLang={item} key={item}>
                  {localeNames[item]}
                </Link>
              ))}
            </div>
          </details>
          <a className="header-cta" href={dashboardUrl}>
            {copy.openConsole}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </header>

      <main id="main-content">
        <section className="hero section-shell" id="top">
          <div className="hero-copy">
            <p className="eyebrow">
              <span aria-hidden="true" />
              {copy.eyebrow}
            </p>
            <h1>
              {copy.hero[0]}
              <span>{copy.hero[1]}</span>
            </h1>
            <p className="hero-summary">{copy.summary}</p>
            <div className="hero-actions">
              <a className="primary-cta" href="#live-demo">
                {copy.tryDemo}
                <span aria-hidden="true">→</span>
              </a>
              <a className="text-cta" href="#pricing">
                {copy.seePricing}
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <ul className="hero-proof">
              {copy.proof.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="hero-product" id="live-demo">
            <div className="signal-orbit orbit-one" aria-hidden="true" />
            <div className="signal-orbit orbit-two" aria-hidden="true" />
            <div className="product-window">
              <div className="window-bar" aria-hidden="true">
                <span />
                <span />
                <span />
                <p>secure.example.com / account</p>
              </div>
              <CaptchaDemo
                apiBaseUrl={apiBaseUrl}
                language={locale}
                siteKey={siteKey}
              />
            </div>
          </div>
        </section>

        <section className="definition-strip">
          <div className="section-shell localized-definition">
            <p>{copy.definition}</p>
            <dl>
              {copy.facts.map(([term, value]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="product-section section-shell" id="product">
          <div className="section-heading">
            <p className="eyebrow">
              <span aria-hidden="true" />
              TrustCaptcha
            </p>
            <h2>{copy.modesTitle}</h2>
            <p>{copy.modesSummary}</p>
          </div>
          <div className="mode-grid four-up">
            {copy.modes.map(([name, description], index) => (
              <article className="mode-card" key={name}>
                <div className="mode-card-top">
                  <span>0{index + 1}</span>
                  <small>{index === 0 ? "Recommended" : "Adaptive"}</small>
                </div>
                <h3>{name}</h3>
                <p>{description}</p>
                <div className="mode-visual managed">
                  <i />
                  <i />
                  <i />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="security-section" id="security">
          <div className="section-shell brand-challenge-layout">
            <div className="security-copy">
              <p className="eyebrow light">
                <span aria-hidden="true" />
                Brand challenges
              </p>
              <h2>{copy.brandTitle}</h2>
              <p>{copy.brandSummary}</p>
              <ul className="brand-points">
                {copy.brandPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div
              className="brand-visual-card"
              aria-label="Branded image orientation challenge preview"
            >
              <div className="brand-preview-image">
                <BrandMark />
              </div>
              <p>↻ 90° · 180° · 270°</p>
              <strong>Policy-controlled visual step-up</strong>
            </div>
          </div>
        </section>

        <section className="pricing-section section-shell" id="pricing">
          <div className="section-heading">
            <p className="eyebrow">
              <span aria-hidden="true" />
              Pricing
            </p>
            <h2>{copy.pricingTitle}</h2>
            <p>{copy.pricingSummary}</p>
          </div>
          <div className="pricing-grid">
            {planTiers.map((tier, index) => {
              const price = PUBLIC_PLAN_PRICING[tier];
              return (
                <article
                  className={`pricing-card ${tier === "PRO" ? "featured" : ""}`}
                  key={tier}
                >
                  {tier === "PRO" && (
                    <span className="popular-badge">Popular</span>
                  )}
                  <h3>{copy.planNames[index]}</h3>
                  <div className="price">
                    <strong>${price.monthlyUsd}</strong>
                    <span>{copy.perMonth}</span>
                  </div>
                  {price.yearlyUsd > 0 && (
                    <p className="annual-price">
                      ${price.yearlyUsd}
                      {copy.perYear}
                    </p>
                  )}
                  <ul>
                    {copy.planFeatures[index]?.map((feature) => (
                      <li key={feature}>✓ {feature}</li>
                    ))}
                  </ul>
                  <a
                    className={tier === "PRO" ? "primary-cta" : "plan-cta"}
                    href={`${dashboardUrl}/register${tier === "FREE" ? "" : `?plan=${tier.toLowerCase()}`}`}
                  >
                    {tier === "FREE"
                      ? copy.currentFree
                      : `${copy.choose} ${copy.planNames[index]}`}
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="faq-section section-shell" id="faq">
          <div className="section-heading">
            <p className="eyebrow">
              <span aria-hidden="true" />
              GEO-ready answers
            </p>
            <h2>{copy.faqTitle}</h2>
          </div>
          <div className="faq-list">
            {copy.faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta section-shell">
          <div>
            <h2>{copy.ctaTitle}</h2>
            <p>{copy.ctaSummary}</p>
            <a className="primary-cta" href={`${dashboardUrl}/register`}>
              {copy.openConsole}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>
      <footer className="site-footer section-shell">
        <Link className="brand-lockup" href={`/${locale}`}>
          <BrandMark />
          <span>
            Trust<span>Captcha</span>
          </span>
        </Link>
        <p>{copy.footer}</p>
        <div>
          {marketingLocales.map((item) => (
            <Link href={`/${item}`} hrefLang={item} key={item}>
              {localeNames[item]}
            </Link>
          ))}
        </div>
      </footer>
    </>
  );
}

function BrandMark() {
  return (
    <svg className="brand-logo" viewBox="0 0 48 48" aria-hidden="true">
      <path className="logo-ring" d="M34.8 40.2A18 18 0 1 1 41.7 26" />
      <path className="logo-t" d="M13 15.5h20v5.5h-7v16h-6V21h-7z" />
      <path className="logo-check" d="m28.5 32 5 5 10-12" />
    </svg>
  );
}
