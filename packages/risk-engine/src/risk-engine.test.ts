import { describe, expect, it } from "vitest";

import { RuleBasedRiskEngine } from "./index";

const engine = new RuleBasedRiskEngine();

describe("RuleBasedRiskEngine", () => {
  it("returns a high score for a normal interaction", async () => {
    await expect(
      engine.evaluate({
        ...adaptiveContext,
        cookieEnabled: true,
        interaction: normalMouseInteraction,
        ipRequestCount: 2,
        sessionConsistent: true,
        userAgent: "Mozilla/5.0 Chrome/140 Safari/537.36",
        verificationDurationMs: 2_400,
      }),
    ).resolves.toEqual({ reasons: [], score: 100 });
  });

  it("penalizes automation, high rate and implausibly fast completion", async () => {
    const result = await engine.evaluate({
      ...adaptiveContext,
      cookieEnabled: false,
      interaction: normalMouseInteraction,
      ipRequestCount: 101,
      sessionConsistent: true,
      userAgent: "HeadlessChrome Puppeteer",
      verificationDurationMs: 50,
    });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([
      "RATE_CRITICAL",
      "UA_AUTOMATED",
      "COOKIE_UNAVAILABLE",
      "TOO_FAST",
    ]);
  });

  it("keeps scores inside the 0-100 range", async () => {
    const result = await engine.evaluate({
      ...adaptiveContext,
      cookieEnabled: false,
      interaction: {
        ...normalMouseInteraction,
        inputMethod: "unknown",
        trustedEvent: false,
      },
      ipRequestCount: 1_000,
      sessionConsistent: false,
      userAgent: null,
      verificationDurationMs: 1,
    });
    expect(result.score).toBe(0);
  });

  it("penalizes missing and synthetic interaction signals", async () => {
    await expect(
      engine.evaluate({
        ...adaptiveContext,
        cookieEnabled: true,
        ipRequestCount: 1,
        sessionConsistent: true,
        userAgent: "Mozilla/5.0 Chrome/140 Safari/537.36",
        verificationDurationMs: 1_200,
      }),
    ).resolves.toEqual({ reasons: ["INTERACTION_MISSING"], score: 80 });

    const synthetic = await engine.evaluate({
      ...adaptiveContext,
      cookieEnabled: true,
      interaction: {
        ...normalMouseInteraction,
        clickDurationMs: 0,
        directionChanges: 0,
        inputMethod: "mouse",
        moveEvents: 0,
        pathEfficiency: 0,
        pointerDistancePx: 0,
        pointerDurationMs: 0,
        trustedEvent: false,
      },
      ipRequestCount: 1,
      sessionConsistent: true,
      userAgent: "Mozilla/5.0 Chrome/140 Safari/537.36",
      verificationDurationMs: 120,
    });
    expect(synthetic.score).toBe(0);
    expect(synthetic.reasons).toEqual([
      "INTERACTION_UNTRUSTED",
      "POINTER_STATIC",
      "CLICK_TIMING_ANOMALY",
      "TOO_FAST",
    ]);
  });

  it("does not require pointer movement for trusted keyboard or touch input", async () => {
    for (const inputMethod of ["keyboard", "touch"] as const) {
      const result = await engine.evaluate({
        ...adaptiveContext,
        cookieEnabled: true,
        interaction: {
          ...normalMouseInteraction,
          directionChanges: 0,
          inputMethod,
          moveEvents: 0,
          pathEfficiency: 0,
          pointerDistancePx: 0,
          pointerDurationMs: 0,
        },
        ipRequestCount: 1,
        sessionConsistent: true,
        userAgent: "Mozilla/5.0 Mobile Safari/537.36",
        verificationDurationMs: 1_200,
      });
      expect(result.reasons).not.toContain("POINTER_STATIC");
      expect(result.score).toBe(100);
    }
  });

  it("allows invisible checks without pointer interaction", async () => {
    await expect(
      engine.evaluate({
        ...adaptiveContext,
        cookieEnabled: true,
        ipRequestCount: 1,
        sessionConsistent: true,
        userAgent: "Mozilla/5.0 Chrome/140 Safari/537.36",
        verificationDurationMs: 120,
        verificationMode: "invisible",
      }),
    ).resolves.toEqual({ reasons: [], score: 100 });
  });

  it("hard-fails an invalid required proof of work", async () => {
    const result = await engine.evaluate({
      ...adaptiveContext,
      cookieEnabled: true,
      interaction: normalMouseInteraction,
      ipRequestCount: 1,
      proofOfWorkRequired: true,
      proofOfWorkValid: false,
      sessionConsistent: true,
      userAgent: "Mozilla/5.0 Chrome/140 Safari/537.36",
      verificationDurationMs: 1_200,
    });
    expect(result.score).toBe(0);
    expect(result.reasons).toContain("POW_INVALID");
  });
});

const adaptiveContext = {
  proofOfWorkRequired: false,
  proofOfWorkValid: true,
  verificationMode: "checkbox" as const,
};

const normalMouseInteraction = {
  clickDurationMs: 86,
  directionChanges: 4,
  focusChanges: 0,
  inputMethod: "mouse" as const,
  moveEvents: 18,
  pathEfficiency: 74,
  pointerDistancePx: 220,
  pointerDurationMs: 780,
  trustedEvent: true,
  visibilityChanges: 0,
};
