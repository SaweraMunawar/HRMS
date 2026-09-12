import Link from "next/link";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { DecisionButtons } from "@/components/leave/decision-buttons";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/authz";
import { formatDate, formatDateRange } from "@/lib/format";
import { getApprovalQueue } from "@/lib/queries/leave";

export default async function ApprovalsPage() {
  // Employees ke paas approval queue nahi hoti
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD");
  const queue = await getApprovalQueue(Number(user.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Leave approvals" description="Requests waiting for your decision, soonest first." />

      {queue.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Inbox} title="Nothing waiting on you" description="New requests from your team will appear here." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {queue.map(({ id, level, leaveRequest: r }) => {
            const earlier = r.steps.filter((s) => s.level < level && s.decision !== "PENDING");
            return (
              <Card key={id} className="overflow-hidden border-l-4" style={{ borderLeftColor: level > 1 ? "var(--chart-5)" : "var(--chart-3)" }}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {r.employee.firstName} {r.employee.lastName}
                      </CardTitle>
                      <CardDescription>
                        {r.employee.designation.title}, {r.employee.department.name}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={level > 1 ? "border-rose-300/70 bg-rose-50 text-rose-800" : "border-amber-300/70 bg-amber-50 text-amber-800"}>
                      {level > 1 ? "Escalated to you" : "Waiting on you"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold tracking-tight tabular-nums">{r.totalDays}</span>
                      <span className="text-sm text-muted-foreground">working {r.totalDays === 1 ? "day" : "days"}</span>
                    </div>
                    <dl className="grid flex-1 grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Leave type</dt>
                        <dd className="font-medium">{r.leaveType.name}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Dates</dt>
                        <dd className="font-medium">{formatDateRange(r.startDate, r.endDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Submitted</dt>
                        <dd className="font-medium">{formatDate(r.createdAt)}</dd>
                      </div>
                    </dl>
                  </div>

                  <figure className="border-l-2 pl-3">
                    <blockquote className="max-w-prose text-sm">{r.reason}</blockquote>
                  </figure>

                  {earlier.length > 0 && (
                    <div className="rounded-md bg-muted px-3 py-2 text-sm">
                      {earlier.map((s) => (
                        <p key={s.level}>
                          <span className="font-medium">
                            {s.approver.firstName} {s.approver.lastName}
                          </span>{" "}
                          {s.decision.toLowerCase()} at level {s.level}
                          {s.comment ? ` — "${s.comment}"` : ""}
                        </p>
                      ))}
                    </div>
                  )}

                  <DecisionButtons requestId={r.id} employeeName={r.employee.firstName} />

                  <Button asChild variant="outline" size="sm" className="w-fit">
                    <Link href={`/leave/${r.id}`}>View full request</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
