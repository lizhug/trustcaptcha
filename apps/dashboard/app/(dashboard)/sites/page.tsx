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
      apiBaseUrl={process.env.PUBLIC_API_URL ?? "http://localhost:4302"}
      canDelete={context.role === "ADMIN"}
      docsUrl={`${(process.env.PUBLIC_SITE_URL ?? "http://localhost:4303").replace(/\/$/, "")}/docs`}
      onboarding={query.onboarding === "1"}
    />
  );
}
