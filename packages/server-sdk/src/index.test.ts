import { describe, expect, it, vi } from "vitest";

import { TrustCaptchaServer } from "./index";

describe("TrustCaptchaServer", () => {
  it("verifies a token with bearer authentication", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        action: "signup",
        expire: 120,
        requestId: "req_1",
        score: 83,
        success: true,
      }),
    );
    const client = new TrustCaptchaServer({
      baseUrl: "https://api.example.com/",
      fetch: fetchMock,
      secretKey: `tc_sk_${"a".repeat(16)}_${"b".repeat(43)}`,
    });

    await expect(
      client.verify({ action: "signup", token: "tc1.payload.signature" }),
    ).resolves.toMatchObject({ success: true, score: 83 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/verify",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer tc_sk_/),
        }),
      }),
    );
  });

  it("returns a structured rejection without throwing", async () => {
    const client = new TrustCaptchaServer({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          {
            errorCodes: ["TOKEN_REPLAYED"],
            requestId: "req_2",
            success: false,
          },
          { status: 200 },
        ),
      ),
      secretKey: `tc_sk_${"a".repeat(16)}_${"b".repeat(43)}`,
    });
    await expect(
      client.verify({ action: "signup", token: "tc1.payload.signature" }),
    ).resolves.toMatchObject({
      errorCodes: ["TOKEN_REPLAYED"],
      success: false,
    });
  });
});
