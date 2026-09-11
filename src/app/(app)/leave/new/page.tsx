import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/authz";
import { toDateOnly } from "@/lib/leave-rules";
import { prisma } from "@/lib/prisma";
import { getHolidaysFor, getLeaveTypesFor, getMyBalances } from "@/lib/queries/leave";

export default async function NewLeavePage() {
  const user = await requireUser();
  const employeeId = Number(user.id);

  const [leaveTypes, balances, holidays, me] = await Promise.all([
    getLeaveTypesFor(user.subsidiaryId),
    getMyBalances(employeeId),
    getHolidaysFor(user.subsidiaryId),
    prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: { manager: { select: { firstName: true, lastName: true, designation: { select: { title: true } } } } },
    }),
  ]);

  const today = toDateOnly(new Date()).toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href="/leave">
            <ArrowLeft className="size-4" />
            Back to my leave
          </Link>
        </Button>
        <PageHeader
          title="Request leave"
          description={
            me.manager
              ? `Goes to ${me.manager.firstName} ${me.manager.lastName} (${me.manager.designation.title}) first.`
              : "You have no reporting manager set. Please contact HR."
          }
        />
      </div>

      <Card className="max-w-2xl">
        <CardContent>
          <LeaveRequestForm
            leaveTypes={leaveTypes}
            balances={balances.map((b) => ({ leaveTypeId: b.leaveTypeId, allotted: b.allotted, used: b.used }))}
            holidays={holidays.map((h) => h.date.toISOString().slice(0, 10))}
            today={today}
          />
        </CardContent>
      </Card>
    </div>
  );
}
