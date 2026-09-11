import { DashboardPlaceholder } from "@/components/dashboard-placeholder";
import { requireRole } from "@/lib/authz";

export default async function Page() {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD");
  return <DashboardPlaceholder title="Team dashboard" user={user} />;
}
