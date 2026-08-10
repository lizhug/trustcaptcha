import { describe, expect, it } from "vitest";

import { verifyTokenSchema } from "./verify";

describe("verifyTokenSchema", () => {
  it("defaults legacy verification requests to the generic action", () => {
    const parsed = verifyTokenSchema.safeParse({
      token: `tc1.${"a".repeat(64)}.${"b".repeat(43)}`,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.action).toBe("generic");
  });

  it("rejects unversioned or oversized tokens", () => {
    expect(verifyTokenSchema.safeParse({ token: "random" }).success).toBe(
      false,
    );
    expect(
      verifyTokenSchema.safeParse({
        token: `tc1.${"a".repeat(2100)}.signature`,
      }).success,
    ).toBe(false);
  });
});
