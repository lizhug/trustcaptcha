import { describe, expect, it } from "vitest";

import type { RiskEngine } from "@trustcaptcha/risk-engine";
import {
  ChallengeService,
  ChallengeServiceError,
  type ChallengeRecord,
  type ChallengeStore,
  type FinalizeChallengeInput,
} from "./index";

class MemoryStore implements ChallengeStore {
  readonly records = new Map<string, ChallengeRecord>();

  async create(record: ChallengeRecord) {
    if (this.records.has(record.id)) return false;
    this.records.set(record.id, record);
    return true;
  }

  async get(id: string) {
    return this.records.get(id) ?? null;
  }

  async finalize(input: FinalizeChallengeInput) {
    const record = this.records.get(input.challengeId);
    if (!record) return "MISSING" as const;
    if (record.status !== "CREATED") return "TERMINAL" as const;
    if (record.expireAt <= input.now) return "EXPIRED" as const;
    if (
      record.ipHash !== input.expectedIpHash ||
      record.requestNonceHash !== input.expectedNonceHash ||
      record.userAgentHash !== input.expectedUserAgentHash
    ) {
      return "BINDING_MISMATCH" as const;
    }
    this.records.set(record.id, {
      ...record,
      reasons: input.reasons,
      score: input.score,
      status: input.status,
    });
    return "OK" as const;
  }
}

const allowRisk: RiskEngine = {
  evaluate: async () => ({ reasons: [], score: 95 }),
};

describe("ChallengeService", () => {
  it("creates a TTL-bound challenge", async () => {
    const store = new MemoryStore();
    const service = new ChallengeService(store, allowRisk);
    const record = await service.create({
      action: "login",
      id: "challenge-1",
      ipHash: "a".repeat(64),
      mode: "checkbox",
      now: 1_000,
      requestNonceHash: "b".repeat(64),
      siteId: "site-1",
      ttlSeconds: 300,
      userAgentHash: "c".repeat(64),
    });
    expect(record.expireAt).toBe(301_000);
    expect(record.status).toBe("CREATED");
  });

  it("passes a consistently bound interaction once", async () => {
    const store = new MemoryStore();
    const service = new ChallengeService(store, allowRisk);
    await service.create({
      action: "login",
      id: "challenge-1",
      ipHash: "a".repeat(64),
      mode: "checkbox",
      now: 1_000,
      requestNonceHash: "b".repeat(64),
      siteId: "site-1",
      ttlSeconds: 300,
      userAgentHash: "c".repeat(64),
    });
    const result = await service.complete({
      challengeId: "challenge-1",
      expectedIpHash: "a".repeat(64),
      expectedNonceHash: "b".repeat(64),
      expectedUserAgentHash: "c".repeat(64),
      now: 3_000,
      riskContext: {
        cookieEnabled: true,
        ipRequestCount: 1,
        proofOfWorkValid: true,
        userAgent: "Mozilla",
      },
      threshold: 60,
    });
    expect(result.passed).toBe(true);
    await expect(
      service.complete({
        challengeId: "challenge-1",
        expectedIpHash: "a".repeat(64),
        expectedNonceHash: "b".repeat(64),
        expectedUserAgentHash: "c".repeat(64),
        now: 3_100,
        riskContext: {
          cookieEnabled: true,
          ipRequestCount: 1,
          proofOfWorkValid: true,
          userAgent: "Mozilla",
        },
        threshold: 60,
      }),
    ).rejects.toMatchObject({ code: "CHALLENGE_TERMINAL" });
  });

  it("rejects a mismatched binding", async () => {
    const store = new MemoryStore();
    const service = new ChallengeService(store, allowRisk);
    await service.create({
      action: "login",
      id: "challenge-1",
      ipHash: "a".repeat(64),
      mode: "checkbox",
      now: 1_000,
      requestNonceHash: "b".repeat(64),
      siteId: "site-1",
      ttlSeconds: 300,
      userAgentHash: "c".repeat(64),
    });
    await expect(
      service.complete({
        challengeId: "challenge-1",
        expectedIpHash: "x".repeat(64),
        expectedNonceHash: "b".repeat(64),
        expectedUserAgentHash: "c".repeat(64),
        now: 3_000,
        riskContext: {
          cookieEnabled: true,
          ipRequestCount: 1,
          proofOfWorkValid: true,
          userAgent: "Mozilla",
        },
        threshold: 60,
      }),
    ).rejects.toBeInstanceOf(ChallengeServiceError);
  });
});
