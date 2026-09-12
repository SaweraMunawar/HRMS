import { CalendarCheck, CalendarDays, Clock, Megaphone, TreePalm, UserRound } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LeaveBalanceChart } from "@/components/dashboard/leave-balance-chart";
import { StatStrip } from "@/components/dashboard/stat-card";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/authz";
import { formatDate, formatDateRange, formatShortDate, formatWeekday, pluralDays } from "@/lib/format";
import { getMyDashboard } from "@/lib/queries/dashboard";

export default async function MyDashboardPage() {
  const user = await requireUser(); // har role ka apna "My dashboard" hai
  const data = await getMyDashboard(Number(user.id));
  const { me, stats } = data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome, ${me.firstName}`}
        description={`${me.designation.title} in ${me.department.name}, ${me.subsidiary.name}`}
      />

      <StatStrip
        stats={[
          { title: "Annual leave left", value: stats.annualRemaining, hint: `of ${stats.annualAllotted} days this year`, icon: TreePalm },
          { title: "Days taken", value: stats.daysTaken, hint: "All leave types, this year", icon: CalendarCheck },
          { title: "Pending requests", value: stats.pending, hint: "Awaiting approval", icon: Clock, tone: "attention" },
          {
            title: "Reporting to",
            value: me.manager ? `${me.manager.firstName} ${me.manager.lastName}` : "—",
            hint: me.manager?.designation.title ?? "Top of the organization",
            icon: UserRound,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Leave balance</CardTitle>
            <CardDescription>Used and remaining days by leave type. Maternity, paternity and unpaid leave are available on request.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.chartBalances.length ? (
              <LeaveBalanceChart data={data.chartBalances} />
            ) : (
              <EmptyState icon={CalendarDays} title="No leave balance for this year" description="Ask HR to allot your leave." />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My recent requests</CardTitle>
            <CardDescription>Latest five</CardDescription>
          </CardHeader>
          <CardContent>
            {data.requests.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No leave requests yet" />
            ) : (
              <ul className="flex flex-col divide-y">
                {data.requests.map((r) => {
                  const step = r.steps[0];
                  return (
                    <li key={r.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.leaveType.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateRange(r.startDate, r.endDate)} ({pluralDays(r.totalDays)})
                        </p>
                        {step && (
                          <p className="text-xs text-muted-foreground">
                            Waiting on {step.approver.firstName} {step.approver.lastName} (level {step.level})
                          </p>
                        )}
                      </div>
                      <LeaveStatusBadge status={r.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming holidays</CardTitle>
            <CardDescription>{me.subsidiary.name} calendar</CardDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
            <CardDescription>Company-wide and {me.subsidiary.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements" />
            ) : (
              <ul className="flex flex-col gap-4">
                {data.announcements.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{a.title}</p>
                      <Badge variant="outline">{a.scope === "GLOBAL" ? "Company" : "Local"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
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
