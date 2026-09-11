import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { ApprovalTimeline } from "@/components/leave/approval-timeline";
import { CancelButton } from "@/components/leave/cancel-button";
import { DecisionButtons } from "@/components/leave/decision-buttons";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/authz";
import { formatDate, formatDateRange, pluralDays } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAllReportIds } from "@/lib/queries/hierarchy";

export default async function LeaveDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser();
  const viewerId = Number(user.id);
  const { id } = await params;
  const { submitted } = await searchParams;

  const requestId = Number(id);
  if (!Number.isInteger(requestId)) notFound();

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      totalDays: true,
      reason: true,
      status: true,
      currentLevel: true,
      createdAt: true,
      leaveType: { select: { name: true } },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          subsidiaryId: true,
          designation: { select: { title: true } },
          department: { select: { name: true } },
        },
      },
      steps: {
        orderBy: { level: "asc" },
        select: { level: true, decision: true, comment: true, decidedAt: true, approverId: true, approver: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!request) notFound();

  // ---- Kaun dekh sakta hai? (server-side check, sirf UI chhupana kaafi nahi) ----
  const isOwner = request.employee.id === viewerId;
  const isApprover = request.steps.some((s) => s.approverId === viewerId);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isOwnSubsidiaryHr = user.role === "HR_MANAGER" && request.employee.subsidiaryId === user.subsidiaryId;
  const isInMyChain =
    !isOwner && !isApprover && (user.role === "DEPT_HEAD" || user.role === "TEAM_LEAD")
      ? (await getAllReportIds(viewerId)).includes(request.employee.id)
      : false;

  if (!isOwner && !isApprover && !isSuperAdmin && !isOwnSubsidiaryHr && !isInMyChain) notFound();

  // Faisla sirf wahi kar sakta hai jiska step abhi chal raha hai
  const myStep = request.steps.find((s) => s.level === request.currentLevel);
  const canDecide = request.status === "PENDING" && myStep?.approverId === viewerId && myStep.decision === "PENDING";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href={isOwner ? "/leave" : "/leave/approvals"}>
            <ArrowLeft className="size-4" />
            {isOwner ? "Back to my leave" : "Back to approvals"}
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title={`${request.leaveType.name} · ${formatDateRange(request.startDate, request.endDate)}`}
            description={
              isOwner
                ? `Submitted on ${formatDate(request.createdAt)}`
                : `${request.employee.firstName} ${request.employee.lastName} · ${request.employee.designation.title} · ${request.employee.department.name}`
            }
          />
          <LeaveStatusBadge status={request.status} />
        </div>
      </div>

      {submitted === "1" && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" />
          Request submitted. Your manager has been notified.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Request details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Leave type</dt>
                <dd className="font-medium">{request.leaveType.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Working days</dt>
                <dd className="font-medium">{pluralDays(request.totalDays)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">From</dt>
                <dd className="font-medium">{formatDate(request.startDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">To</dt>
                <dd className="font-medium">{formatDate(request.endDate)}</dd>
              </div>
            </dl>
            <div>
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="text-sm">{request.reason}</p>
            </div>

            {canDecide && (
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium">Your decision</p>
                <DecisionButtons requestId={request.id} employeeName={request.employee.firstName} />
              </div>
            )}
            {isOwner && request.status === "PENDING" && (
              <div className="border-t pt-4">
                <CancelButton requestId={request.id} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Approval history</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalTimeline steps={request.steps} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
