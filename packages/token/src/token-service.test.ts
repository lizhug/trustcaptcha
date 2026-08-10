import { describe, expect, it } from "vitest";

import { parseTokenKeyRing, TokenService, TokenServiceError } from "./index";

const key = Buffer.alloc(32, 7);
const ring = parseTokenKeyRing(`k1:${key.toString("base64url")}`, "k1");

function service(now = 1_700_000_000) {
  return new TokenService(
    ring,
    () => now,
    () => "A".repeat(22),
  );
}

describe("TokenService", () => {
  it("issues and verifies a signed token", () => {
    const issued = service().issue({
      action: "login",
      challengeId: "C".repeat(32),
      score: 95,
      siteId: "00000000-0000-4000-8000-000000000001",
      ttlSeconds: 300,
    });
    expect(issued.token).toMatch(/^tc1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
    expect(service().verify(issued.token)).toEqual(issued.payload);
  });

  it("rejects payload and signature tampering", () => {
    const issued = service().issue({
      action: "login",
      challengeId: "C".repeat(32),
      score: 95,
      siteId: "00000000-0000-4000-8000-000000000001",
      ttlSeconds: 300,
    });
    const [version, payload, signature] = issued.token.split(".");
    expect(() =>
      service().verify(`${version}.${payload}A.${signature}`),
    ).toThrow(TokenServiceError);
    expect(() =>
      service().verify(`${version}.${payload}.${signature}A`),
    ).toThrow(TokenServiceError);
  });

  it("rejects expired and future-issued tokens", () => {
    const expired = service().issue({
      action: "login",
      challengeId: "C".repeat(32),
      score: 95,
      siteId: "00000000-0000-4000-8000-000000000001",
      ttlSeconds: 10,
    }).token;
    expect(() => service(1_700_000_020).verify(expired, 0)).toThrowError(
      expect.objectContaining({ code: "TOKEN_EXPIRED" }),
    );
    expect(() => service(1_699_999_990).verify(expired, 0)).toThrowError(
      expect.objectContaining({ code: "TOKEN_FUTURE_IAT" }),
    );
  });

  it("supports verification with a retired key while issuing with the active key", () => {
    const retired = Buffer.alloc(32, 3);
    const oldRing = parseTokenKeyRing(
      `old:${retired.toString("base64url")}`,
      "old",
    );
    const oldToken = new TokenService(
      oldRing,
      () => 1_700_000_000,
      () => "B".repeat(22),
    ).issue({
      action: "login",
      challengeId: "C".repeat(32),
      score: 70,
      siteId: "00000000-0000-4000-8000-000000000001",
      ttlSeconds: 300,
    }).token;
    const rotatedRing = parseTokenKeyRing(
      `old:${retired.toString("base64url")},new:${key.toString("base64url")}`,
      "new",
    );
    expect(
      new TokenService(rotatedRing, () => 1_700_000_001).verify(oldToken),
    ).toMatchObject({ kid: "old" });
  });
});
