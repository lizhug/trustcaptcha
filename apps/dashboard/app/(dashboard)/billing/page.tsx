import { BillingCenter } from "../../../components/billing/billing-center";
import { requirePagePermission } from "../../../lib/auth/session";

export default async function BillingPage() {
  const context = await requirePagePermission("billing.read");
  return <BillingCenter canManage={context.role === "ADMIN"} />;
}
