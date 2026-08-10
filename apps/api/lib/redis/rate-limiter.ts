import type Redis from "ioredis";

const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export class RedisRateLimiter {
  constructor(private readonly redis: Redis) {}

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const [count, ttl] = (await this.redis.eval(
      RATE_LIMIT_SCRIPT,
      1,
      `ratelimit:${key}`,
      String(windowSeconds * 1_000),
    )) as [number, number];

    return {
      allowed: count <= limit,
      count,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1_000)),
    };
  }
}
