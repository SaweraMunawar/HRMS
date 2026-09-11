import { Users } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EmployeeFilters } from "@/components/org/employee-filters";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/authz";
import { formatDate } from "@/lib/format";
import { getEmployees } from "@/lib/queries/org";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", ON_LEAVE: "On leave", TERMINATED: "Terminated" };

function toId(value?: string) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subsidiaryId?: string; departmentId?: string; status?: string }>;
}) {
  // Employee directory HR aur upar walon ke liye (Requirement 7)
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD");
  const sp = await searchParams;

  const { employees, subsidiaries, departments } = await getEmployees(user, {
    q: sp.q,
    subsidiaryId: toId(sp.subsidiaryId),
    departmentId: toId(sp.departmentId),
    status: sp.status,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employee directory"
        description={user.role === "SUPER_ADMIN" ? "Everyone across all subsidiaries." : "Everyone in your subsidiary."}
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <EmployeeFilters subsidiaries={subsidiaries} departments={departments} />

          {employees.length === 0 ? (
            <EmptyState icon={Users} title="No employees match these filters" description="Try clearing the search or filters." />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Showing {employees.length} {employees.length === 1 ? "employee" : "employees"}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Designation</TableHead>
                    <TableHead className="hidden sm:table-cell">Department</TableHead>
                    <TableHead className="hidden lg:table-cell">Reports to</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{e.firstName} {e.lastName}</span>
                          <span className="text-xs text-muted-foreground">{e.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{e.designation.title}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {e.department.name}
                        <span className="block text-xs text-muted-foreground">{e.subsidiary.city}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : "—"}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap lg:table-cell">{formatDate(e.joiningDate)}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === "ACTIVE" ? "secondary" : "outline"}>{STATUS_LABEL[e.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
