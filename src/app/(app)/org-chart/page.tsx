import { Network } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { OrgTree } from "@/components/org/org-tree";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/authz";
import { getOrgChart } from "@/lib/queries/org";

export default async function OrgChartPage() {
  const user = await requireUser(); // org chart sab dekh sakte hain (Requirement 2.3)
  const { tree, total, isGlobal } = await getOrgChart(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organization chart"
        description={
          isGlobal
            ? `Reporting structure across all subsidiaries · ${total} people`
            : `Reporting structure for your subsidiary · ${total} people`
        }
      />

      <Card>
        <CardContent>
          {tree.length === 0 ? (
            <EmptyState icon={Network} title="No employees to show" />
          ) : (
            <OrgTree tree={tree} currentUserId={Number(user.id)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
