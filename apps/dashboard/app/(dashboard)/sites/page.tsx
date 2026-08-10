import { SitesTable } from "../../../components/sites/sites-table";
import { requirePagePermission } from "../../../lib/auth/session";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const context = await requirePagePermission("sites.read");
  const query = await searchParams;
  return (
    <SitesTable
      canDelete={context.role === "ADMIN"}
      onboarding={query.onboarding === "1"}
    />
  );
}
