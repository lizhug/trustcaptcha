import type { ReactNode } from "react";

import { DashboardShell } from "../../components/layout/dashboard-shell";
import { requirePagePermission } from "../../lib/auth/session";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const context = await requirePagePermission();

  return (
    <DashboardShell
      customerName={context.customerName}
      role={context.role}
      userName={context.userName}
    >
      {children}
    </DashboardShell>
  );
}
