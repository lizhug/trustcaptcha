import { redirect } from "next/navigation";

import { auth } from "../../auth";
import {
  hasPermission,
  type DashboardRole,
  type Permission,
} from "./permissions";

export type AuthContext = {
  customerId: string;
  customerName: string;
  role: DashboardRole;
  userId: string;
  userEmail: string;
  userName: string;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();

  if (!session?.user.id || !session.activeCustomer?.id || !session.role) {
    return null;
  }

  return {
    customerId: session.activeCustomer.id,
    customerName: session.activeCustomer.name,
    role: session.role,
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    userName: session.user.name ?? session.user.email ?? "TrustCaptcha user",
  };
}

export async function requirePagePermission(
  permission?: Permission,
): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    redirect("/login");
  }

  if (permission && !hasPermission(context.role, permission)) {
    redirect("/forbidden");
  }

  return context;
}
