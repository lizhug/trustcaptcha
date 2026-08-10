import Redis from "ioredis";

const globalForRedis = globalThis as typeof globalThis & {
  trustCaptchaRedis?: Redis;
};

export function getRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL is required");

  if (!globalForRedis.trustCaptchaRedis) {
    globalForRedis.trustCaptchaRedis = new Redis(redisUrl, {
      enableReadyCheck: true,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  return globalForRedis.trustCaptchaRedis;
}
