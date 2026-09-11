// =====================================================================
//  Dashboard queries - saara data seedha database se (koi hard-coded array nahi)
//  Requirement 3.8 aur 9.1: "charts reflecting real seeded data"
// =====================================================================
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/leave-rules";

const ACTIVE = { status: { not: "TERMINATED" as const } };

/** Aakhri din jis ki attendance lagi (weekend pe aaj ki attendance nahi hoti) */
async function latestAttendanceDate(where: object = {}) {
  const row = await prisma.attendance.findFirst({
    where: { date: { lte: toDateOnly(new Date()) }, ...where },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return row?.date ?? null;
}

/** present / (present + absent). Holiday aur leave wale din ginti mein nahi. */
function attendanceRate(rows: { status: string; _count: number }[]): number | null {
  const present = rows.find((r) => r.status === "PRESENT")?._count ?? 0;
  const absent = rows.find((r) => r.status === "ABSENT")?._count ?? 0;
  return present + absent === 0 ? null : Math.round((present / (present + absent)) * 100);
}

// ---------------------------------------------------------------------
//  Super Admin: Global overview
// ---------------------------------------------------------------------
export async function getGlobalOverview() {
  const today = toDateOnly(new Date());

  const [subsidiaries, headcountBySub, pendingBySub, pendingCount, onLeaveToday, lastDate] = await Promise.all([
    prisma.subsidiary.findMany({
      where: { isActive: true },
      select: { id: true, name: true, city: true, country: { select: { name: true, code: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.employee.groupBy({ by: ["subsidiaryId"], where: ACTIVE, _count: true }),
    prisma.leaveRequest.findMany({ where: { status: "PENDING" }, select: { employee: { select: { subsidiaryId: true } } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } } }),
    latestAttendanceDate(),
  ]);

  const attendanceRows = lastDate
    ? await prisma.attendance.groupBy({ by: ["status"], where: { date: lastDate }, _count: true })
    : [];

  // Subsidiary comparison chart: headcount + pending leave, har subsidiary ka
  const bySubsidiary = subsidiaries.map((s) => ({
    name: s.city,
    headcount: headcountBySub.find((h) => h.subsidiaryId === s.id)?._count ?? 0,
    pendingLeave: pendingBySub.filter((p) => p.employee.subsidiaryId === s.id).length,
  }));

  // Headcount by country (donut)
  const countryMap = new Map<string, number>();
  for (const s of subsidiaries) {
    const count = headcountBySub.find((h) => h.subsidiaryId === s.id)?._count ?? 0;
    countryMap.set(s.country.name, (countryMap.get(s.country.name) ?? 0) + count);
  }
  const byCountry = [...countryMap.entries()].map(([country, headcount]) => ({ country, headcount }));

  const pendingRequests = await prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { startDate: "asc" },
    take: 6,
    select: {
      id: true,
      startDate: true,
      endDate: true,
      totalDays: true,
      currentLevel: true,
      leaveType: { select: { name: true } },
      employee: { select: { firstName: true, lastName: true, subsidiary: { select: { city: true } } } },
      steps: {
        where: { decision: "PENDING" },
        select: { level: true, approver: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return {
    stats: {
      headcount: bySubsidiary.reduce((sum, s) => sum + s.headcount, 0),
      subsidiaries: subsidiaries.length,
      countries: countryMap.size,
      pendingLeave: pendingCount,
      onLeaveToday,
      attendanceRate: attendanceRate(attendanceRows),
      attendanceDate: lastDate,
    },
    bySubsidiary,
    byCountry,
    pendingRequests,
  };
}

// ---------------------------------------------------------------------
//  Employee: My dashboard
// ---------------------------------------------------------------------
export async function getMyDashboard(employeeId: number) {
  const today = toDateOnly(new Date());
  const year = today.getUTCFullYear();

  const me = await prisma.employee.findUniqueOrThrow({
    where: { id: employeeId },
    select: {
      firstName: true,
      subsidiaryId: true,
      designation: { select: { title: true } },
      department: { select: { name: true } },
      subsidiary: { select: { name: true } },
      manager: { select: { firstName: true, lastName: true, designation: { select: { title: true } } } },
    },
  });

  const [balances, requests, pendingCount, holidays, announcements] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { employeeId, year },
      select: { allotted: true, used: true, leaveType: { select: { name: true, requiresEscalation: true } } },
      orderBy: { leaveType: { id: "asc" } },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        status: true,
        leaveType: { select: { name: true } },
        steps: { where: { decision: "PENDING" }, select: { level: true, approver: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.leaveRequest.count({ where: { employeeId, status: "PENDING" } }),
    prisma.holiday.findMany({
      where: { subsidiaryId: me.subsidiaryId, date: { gte: today } },
      orderBy: { date: "asc" },
      take: 4,
      select: { id: true, name: true, date: true },
    }),
    prisma.announcement.findMany({
      where: { OR: [{ scope: "GLOBAL" }, { scope: "SUBSIDIARY", subsidiaryId: me.subsidiaryId }] },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, body: true, createdAt: true, scope: true },
    }),
  ]);

  // Chart mein aam leaves; maternity/paternity/unpaid "special" hain
  const chartBalances = balances
    .filter((b) => !b.leaveType.requiresEscalation)
    .map((b) => ({
      type: b.leaveType.name.replace(" Leave", ""),
      used: b.used,
      remaining: Math.max(b.allotted - b.used, 0),
    }));

  const annual = balances.find((b) => b.leaveType.name === "Annual Leave");

  return {
    me,
    stats: {
      annualRemaining: annual ? annual.allotted - annual.used : 0,
      annualAllotted: annual?.allotted ?? 0,
      daysTaken: balances.reduce((sum, b) => sum + b.used, 0),
      pending: pendingCount,
    },
    chartBalances,
    requests,
    holidays,
    announcements,
  };
}

// ---------------------------------------------------------------------
//  Team Lead / Department Head: Team dashboard
// ---------------------------------------------------------------------
export async function getTeamDashboard(managerId: number, reportIds: number[]) {
  const today = toDateOnly(new Date());

  if (reportIds.length === 0) {
    return { stats: { teamSize: 0, pendingApprovals: 0, onLeaveToday: 0, presentToday: 0 }, byStatus: [], attendanceDate: null };
  }

  const lastDate = await latestAttendanceDate({ employeeId: { in: reportIds } });

  const [teamSize, pendingApprovals, onLeaveToday, attendanceRows] = await Promise.all([
    prisma.employee.count({ where: { id: { in: reportIds }, ...ACTIVE } }),
    prisma.leaveApprovalStep.count({ where: { approverId: managerId, decision: "PENDING", leaveRequest: { status: "PENDING" } } }),
    prisma.leaveRequest.count({
      where: { employeeId: { in: reportIds }, status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
    }),
    lastDate
      ? prisma.attendance.groupBy({ by: ["status"], where: { employeeId: { in: reportIds }, date: lastDate }, _count: true })
      : Promise.resolve([]),
  ]);

  // Chart: team ki leave requests status ke hisaab se
  const grouped = await prisma.leaveRequest.groupBy({
    by: ["status"],
    where: { employeeId: { in: reportIds } },
    _count: true,
  });
  const byStatus = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]
    .map((status) => ({ status: status.charAt(0) + status.slice(1).toLowerCase(), count: grouped.find((g) => g.status === status)?._count ?? 0 }))
    .filter((s) => s.count > 0);

  return {
    stats: {
      teamSize,
      pendingApprovals,
      onLeaveToday,
      presentToday: attendanceRows.find((r) => r.status === "PRESENT")?._count ?? 0,
    },
    byStatus,
    attendanceDate: lastDate,
  };
}
