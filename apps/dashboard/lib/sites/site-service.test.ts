import { describe, expect, it } from "vitest";

import {
  generateSiteCredentials,
  normalizeSiteDomain,
  SiteServiceError,
} from "./site-service";

describe("normalizeSiteDomain", () => {
  it("normalizes public domains to an HTTPS origin", () => {
    expect(normalizeSiteDomain("Example.COM.")).toEqual({
      allowedOrigin: "https://example.com",
      domain: "example.com",
    });
  });

  it("allows HTTP only for local development", () => {
    expect(normalizeSiteDomain("http://localhost:4303")).toEqual({
      allowedOrigin: "http://localhost:4303",
      domain: "localhost",
    });
    expect(() => normalizeSiteDomain("http://example.com")).toThrow(
      SiteServiceError,
    );
  });

  it("rejects origins containing a path or credentials", () => {
    expect(() => normalizeSiteDomain("https://example.com/path")).toThrow(
      SiteServiceError,
    );
    expect(() => normalizeSiteDomain("https://user@example.com")).toThrow(
      SiteServiceError,
    );
  });
});

describe("generateSiteCredentials", () => {
  it("generates structured, non-repeating keys", () => {
    const first = generateSiteCredentials();
    const second = generateSiteCredentials();
    expect(first.siteKey).toMatch(/^tc_pk_[A-Za-z0-9_-]{24}$/);
    expect(first.secretKey).toMatch(
      /^tc_sk_[A-Za-z0-9_-]{16}_[A-Za-z0-9_-]{43}$/,
    );
    expect(first.secretKey).not.toBe(second.secretKey);
    expect(first.siteKey).not.toBe(second.siteKey);
  });
});
