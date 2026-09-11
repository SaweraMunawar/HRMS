// =====================================================================
//  Leave queries - jo data pages ko chahiye
// =====================================================================
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/leave-rules";

/** Employee apne subsidiary ke leave types hi dekhe (global + apni subsidiary) */
export function getLeaveTypesFor(subsidiaryId: number) {
  return prisma.leaveType.findMany({
    where: { isActive: true, OR: [{ subsidiaryId: null }, { subsidiaryId }] },
    orderBy: { id: "asc" },
    select: { id: true, name: true, defaultAnnualQuota: true, requiresEscalation: true, escalationThresholdDays: true },
  });
}

export function getHolidaysFor(subsidiaryId: number) {
  return prisma.holiday.findMany({ where: { subsidiaryId }, orderBy: { date: "asc" }, select: { id: true, name: true, date: true } });
}

export function getMyBalances(employeeId: number, year = new Date().getUTCFullYear()) {
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    orderBy: { leaveTypeId: "asc" },
    select: { leaveTypeId: true, allotted: true, used: true, leaveType: { select: { name: true } } },
  });
}

export function getMyRequests(employeeId: number) {
  return prisma.leaveRequest.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      totalDays: true,
      status: true,
      reason: true,
      createdAt: true,
      leaveType: { select: { name: true } },
      steps: {
        orderBy: { level: "asc" },
        select: { level: true, decision: true, comment: true, decidedAt: true, approver: { select: { firstName: true, lastName: true } } },
      },
    },
  });
}

/** Meri approval queue: wo steps jo MERE paas pending hain aur unse pehle wale sab approved ho chuke */
export async function getApprovalQueue(approverId: number) {
  const steps = await prisma.leaveApprovalStep.findMany({
    where: { approverId, decision: "PENDING", leaveRequest: { status: "PENDING" } },
    orderBy: { leaveRequest: { startDate: "asc" } },
    select: {
      id: true,
      level: true,
      leaveRequest: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          reason: true,
          currentLevel: true,
          createdAt: true,
          leaveType: { select: { name: true } },
          employee: {
            select: { id: true, firstName: true, lastName: true, designation: { select: { title: true } }, department: { select: { name: true } } },
          },
          steps: {
            orderBy: { level: "asc" },
            select: { level: true, decision: true, comment: true, approver: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });

  // Sirf wahi jo abhi asal mein mere turn pe hain
  return steps.filter((s) => s.level === s.leaveRequest.currentLevel);
}

/** Team ka leave calendar: mere (indirect) reports jo aane wale dinon mein chhutti pe hain */
export async function getTeamLeaveCalendar(reportIds: number[]) {
  if (reportIds.length === 0) return [];
  const today = toDateOnly(new Date());
  return prisma.leaveRequest.findMany({
    where: { employeeId: { in: reportIds }, status: { in: ["APPROVED", "PENDING"] }, endDate: { gte: today } },
    orderBy: { startDate: "asc" },
    take: 10,
    select: {
      id: true,
      startDate: true,
      endDate: true,
      totalDays: true,
      status: true,
      leaveType: { select: { name: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
  });
}
