import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  type BinaryLike,
} from "node:crypto";

const TOKEN_VERSION = "tc1";
const MAX_TOKEN_LENGTH = 2_048;

export type TrustCaptchaTokenPayload = {
  action: string;
  challengeId: string;
  exp: number;
  iat: number;
  jti: string;
  kid: string;
  score: number;
  siteId: string;
};

export class TokenServiceError extends Error {
  constructor(
    readonly code:
      | "TOKEN_EXPIRED"
      | "TOKEN_FUTURE_IAT"
      | "TOKEN_INVALID"
      | "TOKEN_KEY_UNKNOWN",
  ) {
    super(code);
  }
}

export type TokenKeyRing = {
  activeKeyId: string;
  keys: ReadonlyMap<string, Uint8Array>;
};

export class TokenService {
  constructor(
    private readonly keyRing: TokenKeyRing,
    private readonly nowSeconds: () => number = () =>
      Math.floor(Date.now() / 1_000),
    private readonly randomId: () => string = () =>
      randomBytes(16).toString("base64url"),
  ) {
    const activeKey = keyRing.keys.get(keyRing.activeKeyId);
    if (!activeKey || activeKey.byteLength < 32) {
      throw new Error(
        "The active token signing key must contain at least 32 bytes",
      );
    }
  }

  issue(input: {
    action: string;
    challengeId: string;
    score: number;
    siteId: string;
    ttlSeconds: number;
  }): { payload: TrustCaptchaTokenPayload; token: string } {
    const now = this.nowSeconds();
    const payload: TrustCaptchaTokenPayload = {
      action: input.action,
      challengeId: input.challengeId,
      exp: now + input.ttlSeconds,
      iat: now,
      jti: this.randomId(),
      kid: this.keyRing.activeKeyId,
      score: input.score,
      siteId: input.siteId,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );
    const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
    const signature = sign(
      signingInput,
      this.keyRing.keys.get(this.keyRing.activeKeyId)!,
    );
    return { payload, token: `${signingInput}.${signature}` };
  }

  verify(token: string, clockSkewSeconds = 5): TrustCaptchaTokenPayload {
    if (token.length > MAX_TOKEN_LENGTH) {
      throw new TokenServiceError("TOKEN_INVALID");
    }

    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
      throw new TokenServiceError("TOKEN_INVALID");
    }

    const [, encodedPayload, encodedSignature] = parts;
    if (!encodedPayload || !encodedSignature) {
      throw new TokenServiceError("TOKEN_INVALID");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      );
    } catch {
      throw new TokenServiceError("TOKEN_INVALID");
    }

    if (!isTokenPayload(payload)) {
      throw new TokenServiceError("TOKEN_INVALID");
    }

    const key = this.keyRing.keys.get(payload.kid);
    if (!key) throw new TokenServiceError("TOKEN_KEY_UNKNOWN");

    const expected = Buffer.from(
      sign(`${TOKEN_VERSION}.${encodedPayload}`, key),
    );
    const supplied = Buffer.from(encodedSignature);
    if (
      expected.byteLength !== supplied.byteLength ||
      !timingSafeEqual(expected, supplied)
    ) {
      throw new TokenServiceError("TOKEN_INVALID");
    }

    const now = this.nowSeconds();
    if (payload.iat > now + clockSkewSeconds) {
      throw new TokenServiceError("TOKEN_FUTURE_IAT");
    }
    if (payload.exp <= now - clockSkewSeconds) {
      throw new TokenServiceError("TOKEN_EXPIRED");
    }

    return { ...payload, action: payload.action ?? "generic" };
  }
}

export function parseTokenKeyRing(
  serialized: string,
  activeKeyId: string,
): TokenKeyRing {
  const keys = new Map<string, Uint8Array>();

  for (const entry of serialized.split(",")) {
    const separator = entry.indexOf(":");
    if (separator <= 0) continue;
    const keyId = entry.slice(0, separator).trim();
    const encodedKey = entry.slice(separator + 1).trim();
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(keyId)) continue;

    try {
      const key = Buffer.from(encodedKey, "base64url");
      if (key.byteLength >= 32) keys.set(keyId, key);
    } catch {
      // Invalid entries are ignored; active key validation below remains strict.
    }
  }

  if (!keys.has(activeKeyId)) {
    throw new Error(
      "ACTIVE_TOKEN_SIGNING_KEY_ID is missing from TOKEN_SIGNING_KEYS",
    );
  }

  return { activeKeyId, keys };
}

export function tokenIdentifierHash(jti: string): string {
  return createHmac("sha256", "trustcaptcha-token-id-v1")
    .update(jti)
    .digest("hex");
}

function sign(value: BinaryLike, key: Uint8Array): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

type ParsedTokenPayload = Omit<TrustCaptchaTokenPayload, "action"> & {
  action?: string;
};

function isTokenPayload(value: unknown): value is ParsedTokenPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    (payload.action === undefined ||
      (typeof payload.action === "string" &&
        /^[A-Za-z0-9/_-]{1,32}$/.test(payload.action))) &&
    typeof payload.challengeId === "string" &&
    /^[A-Za-z0-9_-]{32}$/.test(payload.challengeId) &&
    typeof payload.siteId === "string" &&
    payload.siteId.length >= 16 &&
    typeof payload.iat === "number" &&
    Number.isSafeInteger(payload.iat) &&
    typeof payload.exp === "number" &&
    Number.isSafeInteger(payload.exp) &&
    payload.exp > payload.iat &&
    typeof payload.jti === "string" &&
    /^[A-Za-z0-9_-]{22}$/.test(payload.jti) &&
    typeof payload.kid === "string" &&
    /^[A-Za-z0-9_-]{1,32}$/.test(payload.kid) &&
    typeof payload.score === "number" &&
    Number.isInteger(payload.score) &&
    payload.score >= 0 &&
    payload.score <= 100
  );
}
