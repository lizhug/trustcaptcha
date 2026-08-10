import { ChallengeService } from "@trustcaptcha/captcha-core";
import { RuleBasedRiskEngine } from "@trustcaptcha/risk-engine";

import { RedisChallengeStore } from "../redis/challenge-store";
import { getRedisClient } from "../redis/client";
import { RedisRateLimiter } from "../redis/rate-limiter";

export function getChallengeServices() {
  const redis = getRedisClient();
  return {
    challengeService: new ChallengeService(
      new RedisChallengeStore(redis),
      new RuleBasedRiskEngine(),
    ),
    challengeStore: new RedisChallengeStore(redis),
    rateLimiter: new RedisRateLimiter(redis),
  };
}
