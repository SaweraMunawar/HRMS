import { CalendarClock, CalendarOff, CheckCircle2, Globe, Inbox, Users } from "lucide-react";
import { CountryChart } from "@/components/dashboard/country-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { SubsidiaryChart } from "@/components/dashboard/subsidiary-chart";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/authz";
import { formatDate, formatDateRange, pluralDays } from "@/lib/format";
import { getGlobalOverview } from "@/lib/queries/dashboard";

export default async function GlobalOverviewPage() {
  await requireRole("SUPER_ADMIN");
  const data = await getGlobalOverview();
  const { stats } = data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Global overview" description="Headcount, leave and attendance across every subsidiary." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total headcount" value={stats.headcount} hint={`${stats.subsidiaries} subsidiaries in ${stats.countries} countries`} icon={Users} />
        <StatCard title="Pending leave requests" value={stats.pendingLeave} hint="Awaiting approval, all subsidiaries" icon={Inbox} />
        <StatCard title="On leave today" value={stats.onLeaveToday} hint="Approved leave covering today" icon={CalendarOff} />
        <StatCard
          title="Attendance rate"
          value={stats.attendanceRate === null ? "—" : `${stats.attendanceRate}%`}
          hint={stats.attendanceDate ? `Last working day, ${formatDate(stats.attendanceDate)}` : "No attendance recorded yet"}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Subsidiary comparison</CardTitle>
            <CardDescription>Active headcount and pending leave requests per subsidiary</CardDescription>
          </CardHeader>
          <CardContent>
            {data.bySubsidiary.length ? <SubsidiaryChart data={data.bySubsidiary} /> : <EmptyState icon={Globe} title="No subsidiaries yet" />}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Headcount by country</CardTitle>
            <CardDescription>Active employees</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.headcount ? <CountryChart data={data.byCountry} /> : <EmptyState icon={Users} title="No employees yet" />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending leave requests</CardTitle>
          <CardDescription>Soonest first, across all subsidiaries</CardDescription>
        </CardHeader>
        <CardContent>
          {data.pendingRequests.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing pending" description="All leave requests have been decided." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Subsidiary</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Waiting on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pendingRequests.map((r) => {
                  const step = r.steps[0];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employee.firstName} {r.employee.lastName}</TableCell>
                      <TableCell className="hidden sm:table-cell">{r.employee.subsidiary.city}</TableCell>
                      <TableCell>{r.leaveType.name}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateRange(r.startDate, r.endDate)}
                        <span className="text-muted-foreground"> · {pluralDays(r.totalDays)}</span>
                      </TableCell>
                      <TableCell>
                        {step ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">L{step.level}</Badge>
                            <span className="whitespace-nowrap">{step.approver.firstName} {step.approver.lastName}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
