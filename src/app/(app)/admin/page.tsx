import { DashboardPlaceholder } from "@/components/dashboard-placeholder";
import { requireRole } from "@/lib/authz";

export default async function Page() {
  const user = await requireRole("SUPER_ADMIN");
  return <DashboardPlaceholder title="Global overview" user={user} />;
}
