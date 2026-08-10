export const permissions = [
  "dashboard.read",
  "sites.read",
  "sites.write",
  "sites.delete",
  "logs.read",
  "logs.export",
  "apiKeys.read",
  "apiKeys.write",
  "apiKeys.rotate",
  "policies.read",
  "policies.write",
  "brandAssets.read",
  "brandAssets.write",
  "billing.read",
  "billing.manage",
  "members.manage",
] as const;

export type Permission = (typeof permissions)[number];
export type DashboardRole = "ADMIN" | "DEVELOPER";

const rolePermissions: Record<DashboardRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(permissions),
  DEVELOPER: new Set([
    "dashboard.read",
    "sites.read",
    "sites.write",
    "logs.read",
    "logs.export",
    "apiKeys.read",
    "apiKeys.write",
    "apiKeys.rotate",
    "policies.read",
    "policies.write",
    "brandAssets.read",
    "brandAssets.write",
    "billing.read",
  ]),
};

export function hasPermission(
  role: DashboardRole,
  permission: Permission,
): boolean {
  return rolePermissions[role].has(permission);
}
