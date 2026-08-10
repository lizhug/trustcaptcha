import { SecurityCenter } from "../../../components/security/security-center";
import { requirePagePermission } from "../../../lib/auth/session";

export default async function SecurityPage() {
  const context = await requirePagePermission("policies.read");
  return (
    <SecurityCenter
      canWrite={context.role === "ADMIN" || context.role === "DEVELOPER"}
    />
  );
}
