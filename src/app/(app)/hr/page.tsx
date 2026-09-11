import Link from "next/link";
import { Building2, CalendarDays, CalendarOff, CheckCircle2, Inbox, Users } from "lucide-react";
import { DepartmentChart } from "@/components/dashboard/department-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { UtilizationChart } from "@/components/dashboard/utilization-chart";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/authz";
import { formatDate, formatShortDate, formatWeekday } from "@/lib/format";
import { getSubsidiaryOverview } from "@/lib/queries/dashboard";

export default async function SubsidiaryOverviewPage() {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER");
  const data = await getSubsidiaryOverview(user.subsidiaryId);
  const { subsidiary, stats } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Subsidiary overview"
          description={`${subsidiary.name} · ${subsidiary.city}, ${subsidiary.country.name} · ${subsidiary.timezone} · ${subsidiary.currency}`}
        />
        <Button asChild variant="outline">
          <Link href="/employees">
            <Users className="size-4" />
            Employee directory
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Headcount" value={stats.headcount} hint={`Across ${stats.departments} departments`} icon={Users} />
        <StatCard title="Pending leave requests" value={stats.pendingLeave} hint="Awaiting a decision in this subsidiary" icon={Inbox} />
        <StatCard title="On leave today" value={stats.onLeaveToday} hint="Approved leave covering today" icon={CalendarOff} />
        <StatCard
          title="Attendance rate"
          value={stats.attendanceRate === null ? "—" : `${stats.attendanceRate}%`}
          hint={stats.attendanceDate ? `Last working day, ${formatDate(stats.attendanceDate)}` : "No attendance recorded yet"}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Headcount by department</CardTitle>
            <CardDescription>Active employees</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.headcount ? (
              <DepartmentChart data={data.byDepartment} />
            ) : (
              <EmptyState icon={Users} title="No employees in this subsidiary yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave utilisation</CardTitle>
            <CardDescription>Days used this year, by leave type</CardDescription>
          </CardHeader>
          <CardContent>
            {data.utilization.length ? (
              <UtilizationChart data={data.utilization} />
            ) : (
              <EmptyState icon={CalendarDays} title="No leave taken yet this year" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Headcount and department head</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byDepartment.length === 0 ? (
              <EmptyState icon={Building2} title="No departments yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Head</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byDepartment.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.head ?? <span className="text-muted-foreground">Not assigned</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.headcount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming holidays</CardTitle>
            <CardDescription>{subsidiary.city} calendar</CardDescription>
          </CardHeader>
          <CardContent>
            {data.holidays.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming holidays" />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.holidays.map((h) => (
                  <li key={h.id} className="flex items-center gap-3">
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-md border py-1">
                      <span className="text-[10px] uppercase text-muted-foreground">{formatWeekday(h.date)}</span>
                      <span className="text-sm font-semibold">{formatShortDate(h.date)}</span>
                    </div>
                    <span className="text-sm">{h.name}</span>
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
