import type Redis from "ioredis";

const MARK_ISSUED_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'MISSING' end
local challenge = cjson.decode(raw)
if challenge.status ~= 'PASSED' then return 'TERMINAL' end
if tonumber(ARGV[1]) <= tonumber(ARGV[2]) then return 'EXPIRED' end

challenge.status = 'TOKEN_ISSUED'
challenge.jtiHash = ARGV[3]
challenge.tokenExpireAt = tonumber(ARGV[1])
redis.call('SET', KEYS[1], cjson.encode(challenge))
redis.call('PEXPIREAT', KEYS[1], tonumber(ARGV[1]) * 1000)
return 'OK'
`;

const CONSUME_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'MISSING' end
local challenge = cjson.decode(raw)
if challenge.status == 'CONSUMED' then return 'REPLAYED' end
if challenge.status ~= 'TOKEN_ISSUED' then return 'TERMINAL' end
if challenge.siteId ~= ARGV[1] or challenge.jtiHash ~= ARGV[2] then
  return 'BINDING_MISMATCH'
end
if tonumber(ARGV[3]) <= tonumber(ARGV[4]) then return 'EXPIRED' end
if redis.call('EXISTS', KEYS[2]) == 1 then return 'REPLAYED' end

local ttl = math.max(1000, (tonumber(ARGV[3]) - tonumber(ARGV[4])) * 1000)
redis.call('SET', KEYS[2], '1', 'PX', ttl, 'NX')
challenge.status = 'CONSUMED'
challenge.consumedAt = tonumber(ARGV[4])
redis.call('SET', KEYS[1], cjson.encode(challenge), 'KEEPTTL')
return 'OK'
`;

export type MarkIssuedResult = "EXPIRED" | "MISSING" | "OK" | "TERMINAL";
export type ConsumeTokenResult =
  | "BINDING_MISMATCH"
  | "EXPIRED"
  | "MISSING"
  | "OK"
  | "REPLAYED"
  | "TERMINAL";

export class RedisTokenConsumptionStore {
  constructor(private readonly redis: Redis) {}

  async markIssued(input: {
    challengeId: string;
    expiresAtSeconds: number;
    jtiHash: string;
    nowSeconds: number;
  }): Promise<MarkIssuedResult> {
    return (await this.redis.eval(
      MARK_ISSUED_SCRIPT,
      1,
      `challenge:${input.challengeId}`,
      String(input.expiresAtSeconds),
      String(input.nowSeconds),
      input.jtiHash,
    )) as MarkIssuedResult;
  }

  async consume(input: {
    challengeId: string;
    expiresAtSeconds: number;
    jtiHash: string;
    nowSeconds: number;
    siteId: string;
  }): Promise<ConsumeTokenResult> {
    return (await this.redis.eval(
      CONSUME_SCRIPT,
      2,
      `challenge:${input.challengeId}`,
      `challenge-used:${input.jtiHash}`,
      input.siteId,
      input.jtiHash,
      String(input.expiresAtSeconds),
      String(input.nowSeconds),
    )) as ConsumeTokenResult;
  }
}
