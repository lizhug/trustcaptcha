import { describe, expect, it } from "vitest";

import { hasPermission, permissions } from "./permissions";

describe("dashboard RBAC", () => {
  it("grants every permission to admins", () => {
    for (const permission of permissions) {
      expect(hasPermission("ADMIN", permission)).toBe(true);
    }
  });

  it("prevents developers from deleting sites or managing members", () => {
    expect(hasPermission("DEVELOPER", "sites.delete")).toBe(false);
    expect(hasPermission("DEVELOPER", "members.manage")).toBe(false);
  });

  it("allows developers to manage integration-scoped resources", () => {
    expect(hasPermission("DEVELOPER", "sites.write")).toBe(true);
    expect(hasPermission("DEVELOPER", "apiKeys.rotate")).toBe(true);
    expect(hasPermission("DEVELOPER", "logs.read")).toBe(true);
  });
});
