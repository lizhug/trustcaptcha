import type {
  RiskContext,
  RiskEngine,
  RiskReason,
} from "@trustcaptcha/risk-engine";

export type ChallengeStatus =
  | "CONSUMED"
  | "CREATED"
  | "PASSED"
  | "REJECTED"
  | "TOKEN_ISSUED";

export type ChallengeMode = "checkbox" | "invisible";

export type ProofOfWorkChallenge = {
  algorithm: "SHA-256";
  difficulty: number;
  salt: string;
};

export type ChallengeRecord = {
  action: string;
  createdAt: number;
  expireAt: number;
  id: string;
  ipHash: string;
  mode: ChallengeMode;
  proofOfWork?: ProofOfWorkChallenge;
  riskThreshold?: number;
  reasons?: RiskReason[];
  requestNonceHash: string;
  score?: number;
  siteId: string;
  status: ChallengeStatus;
  userAgentHash: string;
  visual?: {
    assetId: string;
    rotationQuarterTurns: number;
  };
};

export type CreateChallengeInput = Omit<
  ChallengeRecord,
  "createdAt" | "expireAt" | "status"
> & {
  now: number;
  ttlSeconds: number;
};

export type FinalizeChallengeInput = {
  challengeId: string;
  expectedIpHash: string;
  expectedNonceHash: string;
  expectedUserAgentHash: string;
  now: number;
  reasons: RiskReason[];
  score: number;
  status: "PASSED" | "REJECTED";
};

export type FinalizeChallengeResult =
  | "BINDING_MISMATCH"
  | "EXPIRED"
  | "MISSING"
  | "OK"
  | "TERMINAL";

export interface ChallengeStore {
  create(record: ChallengeRecord, ttlSeconds: number): Promise<boolean>;
  finalize(input: FinalizeChallengeInput): Promise<FinalizeChallengeResult>;
  get(challengeId: string): Promise<ChallengeRecord | null>;
}

export class ChallengeServiceError extends Error {
  constructor(
    readonly code:
      | "CHALLENGE_BINDING_MISMATCH"
      | "CHALLENGE_EXPIRED"
      | "CHALLENGE_EXISTS"
      | "CHALLENGE_NOT_FOUND"
      | "CHALLENGE_TERMINAL",
  ) {
    super(code);
  }
}

export class ChallengeService {
  constructor(
    private readonly store: ChallengeStore,
    private readonly riskEngine: RiskEngine,
  ) {}

  async create(input: CreateChallengeInput): Promise<ChallengeRecord> {
    const record: ChallengeRecord = {
      action: input.action,
      createdAt: input.now,
      expireAt: input.now + input.ttlSeconds * 1_000,
      id: input.id,
      ipHash: input.ipHash,
      mode: input.mode,
      proofOfWork: input.proofOfWork,
      riskThreshold: input.riskThreshold,
      requestNonceHash: input.requestNonceHash,
      siteId: input.siteId,
      status: "CREATED",
      userAgentHash: input.userAgentHash,
      visual: input.visual,
    };

    const created = await this.store.create(record, input.ttlSeconds);
    if (!created) throw new ChallengeServiceError("CHALLENGE_EXISTS");
    return record;
  }

  async complete(input: {
    challengeId: string;
    expectedIpHash: string;
    expectedNonceHash: string;
    expectedUserAgentHash: string;
    now: number;
    riskContext: Omit<
      RiskContext,
      | "proofOfWorkRequired"
      | "sessionConsistent"
      | "verificationDurationMs"
      | "verificationMode"
    >;
    threshold: number;
  }): Promise<{
    passed: boolean;
    reasons: RiskReason[];
    record: ChallengeRecord;
    score: number;
  }> {
    const record = await this.store.get(input.challengeId);
    if (!record) throw new ChallengeServiceError("CHALLENGE_NOT_FOUND");
    if (record.expireAt <= input.now) {
      throw new ChallengeServiceError("CHALLENGE_EXPIRED");
    }
    if (record.status !== "CREATED") {
      throw new ChallengeServiceError("CHALLENGE_TERMINAL");
    }

    const sessionConsistent =
      fixedHashEqual(record.requestNonceHash, input.expectedNonceHash) &&
      fixedHashEqual(record.ipHash, input.expectedIpHash) &&
      fixedHashEqual(record.userAgentHash, input.expectedUserAgentHash);
    const risk = await this.riskEngine.evaluate({
      ...input.riskContext,
      proofOfWorkRequired: Boolean(record.proofOfWork),
      sessionConsistent,
      verificationDurationMs: Math.max(0, input.now - record.createdAt),
      verificationMode: record.mode,
    });
    const passed = sessionConsistent && risk.score >= input.threshold;
    const result = await this.store.finalize({
      challengeId: input.challengeId,
      expectedIpHash: input.expectedIpHash,
      expectedNonceHash: input.expectedNonceHash,
      expectedUserAgentHash: input.expectedUserAgentHash,
      now: input.now,
      reasons: risk.reasons,
      score: risk.score,
      status: passed ? "PASSED" : "REJECTED",
    });

    if (result !== "OK") {
      const errors: Record<
        Exclude<FinalizeChallengeResult, "OK">,
        ChallengeServiceError["code"]
      > = {
        BINDING_MISMATCH: "CHALLENGE_BINDING_MISMATCH",
        EXPIRED: "CHALLENGE_EXPIRED",
        MISSING: "CHALLENGE_NOT_FOUND",
        TERMINAL: "CHALLENGE_TERMINAL",
      };
      throw new ChallengeServiceError(errors[result]);
    }

    return {
      passed,
      reasons: risk.reasons,
      record: {
        ...record,
        reasons: risk.reasons,
        score: risk.score,
        status: passed ? "PASSED" : "REJECTED",
      },
      score: risk.score,
    };
  }
}

function fixedHashEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
