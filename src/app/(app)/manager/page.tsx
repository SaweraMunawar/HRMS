import Link from "next/link";
import { CalendarOff, CheckCircle2, Inbox, Users } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LeaveStatusChart } from "@/components/dashboard/leave-status-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/authz";
import { formatDate, formatDateRange, pluralDays } from "@/lib/format";
import { getTeamDashboard } from "@/lib/queries/dashboard";
import { getAllReportIds } from "@/lib/queries/hierarchy";
import { getTeamLeaveCalendar } from "@/lib/queries/leave";

export default async function TeamDashboardPage() {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD");
  const managerId = Number(user.id);

  const reportIds = await getAllReportIds(managerId);
  const [data, calendar] = await Promise.all([getTeamDashboard(managerId, reportIds), getTeamLeaveCalendar(reportIds)]);
  const { stats } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Team dashboard" description="Everyone who reports to you, directly or indirectly." />
        <Button asChild>
          <Link href="/leave/approvals">
            <Inbox className="size-4" />
            Approvals{stats.pendingApprovals > 0 ? ` (${stats.pendingApprovals})` : ""}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Team size" value={stats.teamSize} hint="Direct and indirect reports" icon={Users} />
        <StatCard title="Waiting on you" value={stats.pendingApprovals} hint="Leave requests to decide" icon={Inbox} />
        <StatCard title="On leave today" value={stats.onLeaveToday} hint="Approved leave covering today" icon={CalendarOff} />
        <StatCard
          title="Present"
          value={stats.presentToday}
          hint={data.attendanceDate ? `Last working day, ${formatDate(data.attendanceDate)}` : "No attendance recorded"}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team leave requests</CardTitle>
            <CardDescription>All time, by status</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byStatus.length ? <LeaveStatusChart data={data.byStatus} /> : <EmptyState icon={Inbox} title="No leave requests from your team yet" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming team leave</CardTitle>
            <CardDescription>Helps you plan cover</CardDescription>
          </CardHeader>
          <CardContent>
            {calendar.length === 0 ? (
              <EmptyState icon={CalendarOff} title="Nobody is scheduled to be away" />
            ) : (
              <ul className="flex flex-col divide-y">
                {calendar.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {r.employee.firstName} {r.employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.leaveType.name} · {formatDateRange(r.startDate, r.endDate)} · {pluralDays(r.totalDays)}
                      </p>
                    </div>
                    <LeaveStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
