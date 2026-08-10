import { describe, expect, it } from "vitest";

import {
  createSiteSchema,
  siteListQuerySchema,
  updateSiteSchema,
} from "./sites";

describe("site schemas", () => {
  it("trims create input", () => {
    expect(
      createSiteSchema.parse({ name: " Marketing ", domain: " example.com " }),
    ).toEqual({ name: "Marketing", domain: "example.com" });
  });

  it("rejects empty updates", () => {
    expect(updateSiteSchema.safeParse({}).success).toBe(false);
  });

  it("coerces safe pagination values", () => {
    expect(
      siteListQuerySchema.parse({ current: "2", pageSize: "50" }),
    ).toMatchObject({
      current: 2,
      pageSize: 50,
    });
    expect(siteListQuerySchema.safeParse({ pageSize: "5000" }).success).toBe(
      false,
    );
  });
});
