import { createCipheriv } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  csvCell,
  decryptIpAddress,
  maskIpAddress,
} from "./verification-log-service";

const previousIpEncryptionKey = process.env.IP_ENCRYPTION_KEY;

afterEach(() => {
  if (previousIpEncryptionKey === undefined) {
    delete process.env.IP_ENCRYPTION_KEY;
  } else {
    process.env.IP_ENCRYPTION_KEY = previousIpEncryptionKey;
  }
});

describe("CSV export", () => {
  it("quotes commas, line breaks and double quotes", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell(null)).toBe("");
  });
});

describe("IP log privacy", () => {
  it("decrypts the versioned AES-GCM value used by the verification API", () => {
    const key = Buffer.alloc(32, 7);
    const iv = Buffer.alloc(12, 3);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
      cipher.update("203.0.113.42", "utf8"),
      cipher.final(),
    ]);
    process.env.IP_ENCRYPTION_KEY = key.toString("base64url");

    expect(
      decryptIpAddress(
        Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]),
      ),
    ).toBe("203.0.113.42");
  });

  it("fails closed for missing or invalid key material", () => {
    delete process.env.IP_ENCRYPTION_KEY;
    expect(decryptIpAddress(Buffer.alloc(40))).toBeNull();
    process.env.IP_ENCRYPTION_KEY = "not-a-32-byte-key";
    expect(decryptIpAddress(Buffer.alloc(40))).toBeNull();
  });

  it("masks IPv4 and IPv6 addresses before returning management data", () => {
    expect(maskIpAddress("203.0.113.42")).toBe("203.0.113.0");
    expect(maskIpAddress("2001:db8:1234:5678:90ab:cdef:1:2")).toBe(
      "2001:db8:1234:5678::",
    );
    expect(maskIpAddress("not-an-ip")).toBeNull();
  });
});
