import { VerificationLogsTable } from "../../../components/logs/verification-logs-table";
import { requirePagePermission } from "../../../lib/auth/session";

export default async function LogsPage() {
  await requirePagePermission("logs.read");
  return <VerificationLogsTable />;
}
