import { DashboardOverview } from "../../components/dashboard/dashboard-overview";
import { requirePagePermission } from "../../lib/auth/session";
import { getDashboardMetrics } from "../../lib/dashboard/metrics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requirePagePermission("dashboard.read");
  const metrics = await getDashboardMetrics(context.customerId);

  return <DashboardOverview metrics={metrics} />;
}
