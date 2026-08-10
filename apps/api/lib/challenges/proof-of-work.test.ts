import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ChallengeRecord } from "@trustcaptcha/captcha-core";

import { hasLeadingZeroBits, verifyProofOfWork } from "./proof-of-work";

describe("proof of work", () => {
  it("checks leading zero bits precisely", () => {
    expect(hasLeadingZeroBits(Uint8Array.from([0, 15]), 12)).toBe(true);
    expect(hasLeadingZeroBits(Uint8Array.from([0, 16]), 12)).toBe(false);
  });

  it("accepts a matching nonce and rejects an altered one", () => {
    const record = createRecord();
    let nonce = 0;
    while (nonce < 100_000) {
      const candidate = nonce.toString(36);
      const digest = createHash("sha256")
        .update(`${record.id}.${record.proofOfWork!.salt}.${candidate}`)
        .digest();
      if (hasLeadingZeroBits(digest, record.proofOfWork!.difficulty)) break;
      nonce += 1;
    }
    expect(verifyProofOfWork(record, nonce.toString(36))).toBe(true);
    expect(verifyProofOfWork(record, "not-valid-hex")).toBe(false);
  });
});

function createRecord(): ChallengeRecord {
  return {
    action: "login",
    createdAt: 1,
    expireAt: 10_000,
    id: "a".repeat(32),
    ipHash: "b".repeat(64),
    mode: "checkbox",
    proofOfWork: { algorithm: "SHA-256", difficulty: 8, salt: "salt" },
    requestNonceHash: "c".repeat(64),
    siteId: "site-id",
    status: "CREATED",
    userAgentHash: "d".repeat(64),
  };
}
