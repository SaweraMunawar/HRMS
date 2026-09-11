import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/authz";
import { formatDate, formatDateRange, pluralDays } from "@/lib/format";
import { getMyRequests } from "@/lib/queries/leave";

export default async function MyLeavePage() {
  const user = await requireUser();
  const requests = await getMyRequests(Number(user.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="My leave" description="Every request you have submitted and where it stands." />
        <Button asChild>
          <Link href="/leave/new">
            <Plus className="size-4" />
            Request leave
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          {requests.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave requests yet" description="Use the button above to submit your first request." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="sr-only">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.leaveType.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateRange(r.startDate, r.endDate)}
                      <span className="text-muted-foreground"> · {pluralDays(r.totalDays)}</span>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatDate(r.createdAt)}</TableCell>
                    <TableCell><LeaveStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/leave/${r.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
