import { parseTokenKeyRing, TokenService } from "@trustcaptcha/token";

import { getRedisClient } from "../redis/client";
import { RedisTokenConsumptionStore } from "../redis/token-consumption-store";

export function getTokenServices() {
  const serializedKeys = process.env.TOKEN_SIGNING_KEYS;
  const activeKeyId = process.env.ACTIVE_TOKEN_SIGNING_KEY_ID;
  if (!serializedKeys || !activeKeyId) {
    throw new Error("Token signing key ring is not configured");
  }

  return {
    consumptionStore: new RedisTokenConsumptionStore(getRedisClient()),
    tokenService: new TokenService(
      parseTokenKeyRing(serializedKeys, activeKeyId),
    ),
  };
}
