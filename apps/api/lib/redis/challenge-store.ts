import type {
  ChallengeRecord,
  ChallengeStore,
  FinalizeChallengeInput,
  FinalizeChallengeResult,
} from "@trustcaptcha/captcha-core";
import type Redis from "ioredis";

const FINALIZE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'MISSING' end

local challenge = cjson.decode(raw)
if challenge.status ~= 'CREATED' then return 'TERMINAL' end
if tonumber(challenge.expireAt) <= tonumber(ARGV[1]) then
  redis.call('DEL', KEYS[1])
  return 'EXPIRED'
end
if challenge.requestNonceHash ~= ARGV[2]
  or challenge.ipHash ~= ARGV[3]
  or challenge.userAgentHash ~= ARGV[4] then
  return 'BINDING_MISMATCH'
end

challenge.status = ARGV[5]
challenge.score = tonumber(ARGV[6])
challenge.reasons = cjson.decode(ARGV[7])
redis.call('SET', KEYS[1], cjson.encode(challenge), 'KEEPTTL')
return 'OK'
`;

export class RedisChallengeStore implements ChallengeStore {
  constructor(private readonly redis: Redis) {}

  async create(record: ChallengeRecord, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      challengeKey(record.id),
      JSON.stringify(record),
      "EX",
      ttlSeconds,
      "NX",
    );
    return result === "OK";
  }

  async get(challengeId: string): Promise<ChallengeRecord | null> {
    const value = await this.redis.get(challengeKey(challengeId));
    if (!value) return null;
    return parseChallengeRecord(value);
  }

  async finalize(
    input: FinalizeChallengeInput,
  ): Promise<FinalizeChallengeResult> {
    const result = await this.redis.eval(
      FINALIZE_SCRIPT,
      1,
      challengeKey(input.challengeId),
      String(input.now),
      input.expectedNonceHash,
      input.expectedIpHash,
      input.expectedUserAgentHash,
      input.status,
      String(input.score),
      JSON.stringify(input.reasons),
    );
    return result as FinalizeChallengeResult;
  }
}

export function parseChallengeRecord(value: string): ChallengeRecord {
  const record = JSON.parse(value) as ChallengeRecord;
  return {
    ...record,
    action: record.action ?? "generic",
    mode: record.mode ?? "checkbox",
    reasons: Array.isArray(record.reasons) ? record.reasons : [],
  };
}

function challengeKey(challengeId: string): string {
  return `challenge:${challengeId}`;
}
