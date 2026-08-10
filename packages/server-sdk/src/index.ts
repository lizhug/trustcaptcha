export type TrustCaptchaVerifyInput = {
  action: string;
  token: string;
};

export type TrustCaptchaVerifyResult = {
  action?: string;
  errorCodes?: string[];
  expire?: number;
  requestId: string;
  score?: number;
  success: boolean;
};

export type TrustCaptchaServerOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  secretKey: string;
  timeoutMs?: number;
};

export class TrustCaptchaServerError extends Error {
  constructor(
    readonly code:
      | "INVALID_CONFIGURATION"
      | "INVALID_RESPONSE"
      | "NETWORK_ERROR",
    readonly cause?: unknown,
  ) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "TrustCaptchaServerError";
  }
}

export class TrustCaptchaServer {
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof globalThis.fetch;
  private readonly secretKey: string;
  private readonly timeoutMs: number;

  constructor(options: TrustCaptchaServerOptions) {
    if (
      !/^tc_(?:sk|ak)_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/.test(options.secretKey)
    ) {
      throw new TrustCaptchaServerError("INVALID_CONFIGURATION");
    }
    this.baseUrl = (
      options.baseUrl ?? "https://api.trustcaptcha.xuandev.com"
    ).replace(/\/+$/, "");
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.secretKey = options.secretKey;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    if (
      !this.fetchImplementation ||
      this.timeoutMs < 100 ||
      this.timeoutMs > 30_000
    ) {
      throw new TrustCaptchaServerError("INVALID_CONFIGURATION");
    }
  }

  async verify(
    input: TrustCaptchaVerifyInput,
  ): Promise<TrustCaptchaVerifyResult> {
    if (
      !/^[A-Za-z0-9/_-]{1,32}$/.test(input.action) ||
      input.token.length > 2_048
    ) {
      throw new TrustCaptchaServerError("INVALID_CONFIGURATION");
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(
        `${this.baseUrl}/api/v1/verify`,
        {
          body: JSON.stringify(input),
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );
    } catch (error) {
      throw new TrustCaptchaServerError("NETWORK_ERROR", error);
    }

    const payload = (await response
      .json()
      .catch(() => null)) as TrustCaptchaVerifyResult | null;
    if (
      !payload ||
      typeof payload.success !== "boolean" ||
      typeof payload.requestId !== "string"
    ) {
      throw new TrustCaptchaServerError("INVALID_RESPONSE");
    }
    return payload;
  }
}

export function createTrustCaptchaServer(options: TrustCaptchaServerOptions) {
  return new TrustCaptchaServer(options);
}
