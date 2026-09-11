"use server";

// =====================================================================
//  Leave server actions (Requirement 3.5)
//  Har action khud dobara check karta hai ke banda ye kaam kar sakta hai ya nahi.
//  UI mein button chhupana kaafi nahi - asli security yahan hai.
// =====================================================================
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { countLeaveDays, needsEscalation, toDateOnly } from "@/lib/leave-rules";
import { decisionSchema, leaveRequestSchema, type DecisionInput, type LeaveRequestInput } from "@/lib/validations/leave";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------
//  Employee: nayi leave request
// ---------------------------------------------------------------------
export async function submitLeaveRequest(raw: LeaveRequestInput): Promise<ActionResult> {
  const user = await requireUser();
  const employeeId = Number(user.id);

  const parsed = leaveRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { leaveTypeId, startDate, endDate, reason } = parsed.data;

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: employeeId },
    select: { id: true, firstName: true, lastName: true, subsidiaryId: true, departmentId: true, managerId: true, status: true },
  });
  if (employee.status === "TERMINATED") return { ok: false, error: "Your account is not active." };
  if (!employee.managerId) return { ok: false, error: "You have no reporting manager, so leave cannot be routed. Please contact HR." };

  // Leave type meri subsidiary ka hona chahiye (kisi aur subsidiary ka id bhejne se rok)
  const leaveType = await prisma.leaveType.findFirst({
    where: { id: leaveTypeId, isActive: true, OR: [{ subsidiaryId: null }, { subsidiaryId: employee.subsidiaryId }] },
  });
  if (!leaveType) return { ok: false, error: "That leave type is not available to you." };

  if (startDate < toDateOnly(new Date())) return { ok: false, error: "Start date cannot be in the past." };

  // Din ginno: weekends aur meri subsidiary ki holidays nikaal ke (Requirement 3.6)
  const holidays = await prisma.holiday.findMany({
    where: { subsidiaryId: employee.subsidiaryId, date: { gte: startDate, lte: endDate } },
    select: { date: true },
  });
  const totalDays = countLeaveDays(startDate, endDate, holidays.map((h) => h.date));
  if (totalDays < 1) return { ok: false, error: "Those dates are all weekends or public holidays." };

  // Overlap check: inhi dinon ki koi aur request pehle se na ho
  const overlapping = await prisma.leaveRequest.findFirst({
    where: { employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: endDate }, endDate: { gte: startDate } },
    select: { id: true },
  });
  if (overlapping) return { ok: false, error: "You already have a leave request covering these dates." };

  // Balance check
  const year = startDate.getUTCFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    select: { allotted: true, used: true },
  });
  const remaining = balance ? balance.allotted - balance.used : 0;
  if (totalDays > remaining) {
    return { ok: false, error: `Not enough balance. You have ${remaining} day(s) of ${leaveType.name} left.` };
  }

  // ---- Approval chain banao (Requirement 3.5) ----
  // Level 1 = direct manager. Level 2 = department head, agar escalation banti ho.
  const department = await prisma.department.findUnique({ where: { id: employee.departmentId }, select: { headId: true } });
  const approverIds = [employee.managerId];
  if (needsEscalation(totalDays, leaveType) && department?.headId && department.headId !== employee.managerId) {
    approverIds.push(department.headId);
  }

  const who = `${employee.firstName} ${employee.lastName}`;
  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason,
        status: "PENDING",
        currentLevel: 1,
        steps: { create: approverIds.map((approverId, i) => ({ approverId, level: i + 1 })) },
      },
      select: { id: true },
    });

    // Pehle approver ko notification (Requirement 3.9)
    await tx.notification.create({
      data: {
        employeeId: approverIds[0],
        message: `${who} requested ${totalDays} day(s) of ${leaveType.name}.`,
        link: `/leave/${created.id}`,
      },
    });
    return created;
  });

  revalidatePath("/leave");
  revalidatePath("/employee");
  redirect(`/leave/${request.id}?submitted=1`);
}

// ---------------------------------------------------------------------
//  Manager / Dept Head: approve ya reject
// ---------------------------------------------------------------------
export async function decideLeaveRequest(raw: DecisionInput): Promise<ActionResult> {
  const user = await requireUser();
  const approverId = Number(user.id);

  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid decision." };
  const { requestId, decision, comment } = parsed.data;

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      currentLevel: true,
      totalDays: true,
      employeeId: true,
      leaveTypeId: true,
      startDate: true,
      leaveType: { select: { name: true } },
      steps: { orderBy: { level: "asc" }, select: { id: true, level: true, approverId: true, decision: true } },
    },
  });
  if (!request) return { ok: false, error: "Leave request not found." };
  if (request.status !== "PENDING") return { ok: false, error: "This request has already been decided." };

  // Sirf usi step ka maalik faisla kar sakta hai, aur sirf apni baari pe
  const myStep = request.steps.find((s) => s.level === request.currentLevel);
  if (!myStep || myStep.approverId !== approverId || myStep.decision !== "PENDING") {
    return { ok: false, error: "This request is not waiting for your approval." };
  }

  const isLastLevel = request.currentLevel >= request.steps.length;
  const approver = await prisma.employee.findUniqueOrThrow({
    where: { id: approverId },
    select: { firstName: true, lastName: true },
  });
  const approverName = `${approver.firstName} ${approver.lastName}`;

  await prisma.$transaction(async (tx) => {
    // 1) Step ka faisla likho (audit trail: kisne, kab, kya kaha)
    await tx.leaveApprovalStep.update({
      where: { id: myStep.id },
      data: { decision, comment: comment || null, decidedAt: new Date() },
    });

    if (decision === "REJECTED") {
      await tx.leaveRequest.update({ where: { id: request.id }, data: { status: "REJECTED" } });
      await tx.notification.create({
        data: {
          employeeId: request.employeeId,
          message: `Your ${request.leaveType.name} request was rejected by ${approverName}.`,
          link: `/leave/${request.id}`,
        },
      });
      return;
    }

    if (isLastLevel) {
      // 2a) Aakhri level approve -> request approved + balance kam karo
      await tx.leaveRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } });
      await tx.leaveBalance.updateMany({
        where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: request.startDate.getUTCFullYear() },
        data: { used: { increment: request.totalDays } },
      });
      await tx.notification.create({
        data: {
          employeeId: request.employeeId,
          message: `Your ${request.leaveType.name} request was approved by ${approverName}.`,
          link: `/leave/${request.id}`,
        },
      });
      return;
    }

    // 2b) Aur level baaki hain -> agle approver ke paas bhejo (escalation)
    const nextStep = request.steps.find((s) => s.level === request.currentLevel + 1)!;
    await tx.leaveRequest.update({ where: { id: request.id }, data: { currentLevel: nextStep.level } });
    await tx.notification.createMany({
      data: [
        {
          employeeId: nextStep.approverId,
          message: `Escalated: a ${request.totalDays} day ${request.leaveType.name} request needs your approval.`,
          link: `/leave/${request.id}`,
        },
        {
          employeeId: request.employeeId,
          message: `${approverName} approved your ${request.leaveType.name}. It now needs department head approval.`,
          link: `/leave/${request.id}`,
        },
      ],
    });
  });

  revalidatePath("/leave/approvals");
  revalidatePath(`/leave/${requestId}`);
  revalidatePath("/manager");
  return { ok: true };
}

// ---------------------------------------------------------------------
//  Employee: apni pending request wapas lena
// ---------------------------------------------------------------------
export async function cancelLeaveRequest(requestId: number): Promise<ActionResult> {
  const user = await requireUser();
  const request = await prisma.leaveRequest.findUnique({ where: { id: requestId }, select: { employeeId: true, status: true } });

  if (!request || request.employeeId !== Number(user.id)) return { ok: false, error: "Leave request not found." };
  if (request.status !== "PENDING") return { ok: false, error: "Only pending requests can be cancelled." };

  await prisma.leaveRequest.update({ where: { id: requestId }, data: { status: "CANCELLED" } });
  revalidatePath("/leave");
  revalidatePath(`/leave/${requestId}`);
  return { ok: true };
}
