// =====================================================================
//  Reporting hierarchy - manager chain aur reports (Requirement 3.4)
// =====================================================================
import { prisma } from "@/lib/prisma";

type Node = { id: number; managerId: number | null };

/** Employee ke upar ki poori chain: [direct manager, uska manager, ...] */
export async function getManagerChain(employeeId: number, maxDepth = 10): Promise<number[]> {
  const chain: number[] = [];
  let current = await prisma.employee.findUnique({ where: { id: employeeId }, select: { managerId: true } });

  while (current?.managerId && chain.length < maxDepth) {
    const managerId: number = current.managerId;
    if (chain.includes(managerId)) break; // loop se bachao
    chain.push(managerId);
    current = await prisma.employee.findUnique({ where: { id: managerId }, select: { managerId: true } });
  }
  return chain;
}

/** Employee ke neeche sab log (direct + indirect) */
export async function getAllReportIds(employeeId: number): Promise<number[]> {
  const all = await prisma.employee.findMany({ select: { id: true, managerId: true } });
  const byManager = new Map<number, Node[]>();
  for (const e of all) {
    if (e.managerId === null) continue;
    const list = byManager.get(e.managerId) ?? [];
    list.push(e);
    byManager.set(e.managerId, list);
  }

  const result: number[] = [];
  const queue = [employeeId];
  const seen = new Set<number>([employeeId]);
  while (queue.length) {
    for (const child of byManager.get(queue.shift()!) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      result.push(child.id);
      queue.push(child.id);
    }
  }
  return result;
}
