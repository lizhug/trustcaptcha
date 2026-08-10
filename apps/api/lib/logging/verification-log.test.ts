import { randomBytes } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { encryptIpAddress } from "./verification-log";

describe("IP address encryption", () => {
  afterEach(() => delete process.env.IP_ENCRYPTION_KEY);

  it("uses randomized authenticated encryption", () => {
    process.env.IP_ENCRYPTION_KEY = randomBytes(32).toString("base64url");
    const first = encryptIpAddress("203.0.113.7");
    const second = encryptIpAddress("203.0.113.7");
    expect(first?.[0]).toBe(1);
    expect(Buffer.from(first!)).not.toEqual(Buffer.from(second!));
    expect(first?.byteLength).toBeGreaterThan(29);
  });

  it("rejects invalid key sizes", () => {
    process.env.IP_ENCRYPTION_KEY = randomBytes(16).toString("base64url");
    expect(() => encryptIpAddress("127.0.0.1")).toThrow(/32-byte/);
  });
});
