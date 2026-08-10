import { describe, expect, it } from "vitest";

import { generateApiKeyCredentials } from "./api-key-service";

describe("API key credentials", () => {
  it("creates parseable high-entropy credentials without returning the secret separately", () => {
    const first = generateApiKeyCredentials();
    const second = generateApiKeyCredentials();
    expect(first.plaintext).toMatch(
      /^tc_ak_[A-Za-z0-9_-]{16}_[A-Za-z0-9_-]{43}$/,
    );
    expect(first.prefix).toBe(`tc_ak_${first.keyId}`);
    expect(first.plaintext.endsWith(first.lastFour)).toBe(true);
    expect(second.plaintext).not.toBe(first.plaintext);
  });
});
