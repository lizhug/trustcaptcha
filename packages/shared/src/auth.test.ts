import { describe, expect, it } from "vitest";

import { loginSchema } from "./auth";

describe("loginSchema", () => {
  it("normalizes email addresses", () => {
    expect(
      loginSchema.parse({
        email: " Admin@Example.COM ",
        password: "password123",
      }),
    ).toEqual({ email: "admin@example.com", password: "password123" });
  });

  it("rejects malformed credentials", () => {
    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "short" })
        .success,
    ).toBe(false);
  });
});
