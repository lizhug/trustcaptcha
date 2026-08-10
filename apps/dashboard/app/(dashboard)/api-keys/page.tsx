import { ApiKeysTable } from "../../../components/api-keys/api-keys-table";
import { requirePagePermission } from "../../../lib/auth/session";

export default async function ApiKeysPage() {
  await requirePagePermission("apiKeys.read");
  return <ApiKeysTable />;
}
