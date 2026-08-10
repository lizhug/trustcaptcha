import { describe, expect, it } from "vitest";

import { parseChallengeRecord } from "./challenge-store";

const baseRecord = {
  createdAt: 1,
  expireAt: 2,
  id: "challenge",
  ipHash: "ip",
  requestNonceHash: "nonce",
  siteId: "site",
  status: "PASSED",
  userAgentHash: "ua",
};

describe("Redis challenge decoding", () => {
  it("normalizes the empty Lua cjson object back to an array", () => {
    const parsed = parseChallengeRecord(
      JSON.stringify({ ...baseRecord, reasons: {} }),
    );
    expect(parsed.reasons).toEqual([]);
  });

  it("preserves populated reason arrays", () => {
    const parsed = parseChallengeRecord(
      JSON.stringify({ ...baseRecord, reasons: ["TOO_FAST"] }),
    );
    expect(parsed.reasons).toEqual(["TOO_FAST"]);
  });
});
