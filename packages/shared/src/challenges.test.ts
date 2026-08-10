import { describe, expect, it } from "vitest";

import {
  completeChallengeSchema,
  createChallengeSchema,
  interactionSignalsSchema,
} from "./challenges";

describe("challenge request schemas", () => {
  it("accepts bounded base64url nonces", () => {
    const parsed = createChallengeSchema.safeParse({
      requestNonce: "abcdefghijklmnop",
      siteKey: "tc_pk_abcdefghijklmnopqrstuvwx",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({ action: "generic", mode: "managed" });
    }
  });

  it("accepts bounded actions and all verification modes", () => {
    for (const mode of ["managed", "checkbox", "invisible"] as const) {
      expect(
        createChallengeSchema.safeParse({
          action: "account/login",
          mode,
          requestNonce: "abcdefghijklmnop",
          siteKey: "tc_pk_abcdefghijklmnopqrstuvwx",
        }).success,
      ).toBe(true);
    }
  });

  it("rejects malformed keys and oversized nonces", () => {
    expect(
      createChallengeSchema.safeParse({
        requestNonce: "a".repeat(129),
        siteKey: "not-a-key",
      }).success,
    ).toBe(false);
  });

  it("requires explicit browser capability signals", () => {
    expect(
      completeChallengeSchema.safeParse({ requestNonce: "abcdefghijklmnop" })
        .success,
    ).toBe(false);
  });

  it("accepts bounded aggregate interaction signals without raw coordinates", () => {
    const parsed = interactionSignalsSchema.safeParse({
      clickDurationMs: 92,
      directionChanges: 3,
      focusChanges: 0,
      inputMethod: "mouse",
      moveEvents: 12,
      pathEfficiency: 76,
      pointerDistancePx: 184,
      pointerDurationMs: 640,
      trustedEvent: true,
      visibilityChanges: 0,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("coordinates");
    }
  });

  it("rejects impossible or unbounded interaction aggregates", () => {
    expect(
      interactionSignalsSchema.safeParse({
        clickDurationMs: 92,
        directionChanges: 8,
        focusChanges: 0,
        inputMethod: "mouse",
        moveEvents: 3,
        pathEfficiency: 76,
        pointerDistancePx: 184,
        pointerDurationMs: 640,
        trustedEvent: true,
        visibilityChanges: 0,
      }).success,
    ).toBe(false);
    expect(
      interactionSignalsSchema.safeParse({
        clickDurationMs: 92,
        directionChanges: 0,
        focusChanges: 0,
        inputMethod: "mouse",
        moveEvents: 0,
        pathEfficiency: 0,
        pointerDistancePx: 100_001,
        pointerDurationMs: 0,
        trustedEvent: true,
        visibilityChanges: 0,
      }).success,
    ).toBe(false);
  });
});
