// =====================================================================
//  Organization chart + employee directory queries (Requirement 3.4, 8.2)
// =====================================================================
import { prisma } from "@/lib/prisma";
import type { RoleCode } from "@/lib/roles";

export type OrgNode = {
  id: number;
  name: string;
  email: string;
  title: string;
  department: string;
  subsidiary: string;
  roleCode: string;
  status: string;
  isHead: boolean;
  reports: OrgNode[];
};

type Row = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  managerId: number | null;
  designation: { title: string };
  department: { name: string; headId: number | null };
  subsidiary: { name: string; city: string };
  role: { code: string };
};

/** Flat list ko tree mein badlo. Jis ka manager list mein nahi, woh top pe aa jata hai. */
function buildTree(rows: Row[]): OrgNode[] {
  const nodes = new Map<number, OrgNode>();
  for (const r of rows) {
    nodes.set(r.id, {
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      email: r.email,
      title: r.designation.title,
      department: r.department.name,
      subsidiary: r.subsidiary.city,
      roleCode: r.role.code,
      status: r.status,
      isHead: r.department.headId === r.id,
      reports: [],
    });
  }

  const roots: OrgNode[] = [];
  for (const r of rows) {
    const node = nodes.get(r.id)!;
    const parent = r.managerId !== null ? nodes.get(r.managerId) : undefined;
    if (parent) parent.reports.push(node);
    else roots.push(node);
  }

  // Har level pe: pehle woh jin ke neeche log hain, phir naam ke hisaab se
  const sortTree = (list: OrgNode[]) => {
    list.sort((a, b) => b.reports.length - a.reports.length || a.name.localeCompare(b.name));
    list.forEach((n) => sortTree(n.reports));
  };
  sortTree(roots);
  return roots;
}

const SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
  managerId: true,
  designation: { select: { title: true } },
  department: { select: { name: true, headId: true } },
  subsidiary: { select: { name: true, city: true } },
  role: { select: { code: true } },
} as const;

/**
 * Role ke hisaab se org chart:
 * - Super Admin: poori company (global chart)
 * - HR Manager: apni subsidiary
 * - baaki sab: apni subsidiary (sirf dekh sakte hain)
 */
export async function getOrgChart(user: { id: string; role: RoleCode; subsidiaryId: number }) {
  const isGlobal = user.role === "SUPER_ADMIN";

  const rows = await prisma.employee.findMany({
    where: isGlobal ? {} : { subsidiaryId: user.subsidiaryId },
    orderBy: { firstName: "asc" },
    select: SELECT,
  });

  return { tree: buildTree(rows as Row[]), total: rows.length, isGlobal };
}

/** Employee directory - search aur filters ke saath (Requirement 8.2) */
export async function getEmployees(
  user: { role: RoleCode; subsidiaryId: number },
  filters: { q?: string; subsidiaryId?: number; departmentId?: number; status?: string },
) {
  // HR sirf apni subsidiary dekhe, Super Admin sab
  const scoped = user.role === "SUPER_ADMIN" ? filters.subsidiaryId : user.subsidiaryId;
  const q = filters.q?.trim();

  const employees = await prisma.employee.findMany({
    where: {
      ...(scoped ? { subsidiaryId: scoped } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.status ? { status: filters.status as "ACTIVE" | "ON_LEAVE" | "TERMINATED" } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
              { employeeCode: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 100,
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      joiningDate: true,
      designation: { select: { title: true } },
      department: { select: { name: true } },
      subsidiary: { select: { city: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
  });

  // Filter dropdowns ke options
  const [subsidiaries, departments] = await Promise.all([
    user.role === "SUPER_ADMIN"
      ? prisma.subsidiary.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, city: true } })
      : Promise.resolve([]),
    prisma.department.findMany({
      where: { isActive: true, ...(scoped ? { subsidiaryId: scoped } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { employees, subsidiaries, departments };
}
