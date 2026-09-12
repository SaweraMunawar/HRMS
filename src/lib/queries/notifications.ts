// =====================================================================
//  Notifications (Requirement 3.9)
//  Leave submit / escalate / decide pe yeh rows banti hain.
// =====================================================================
import { prisma } from "@/lib/prisma";

export async function getNotifications(employeeId: number, take = 10) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { employeeId },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }], // unread pehle
      take,
      select: { id: true, message: true, link: true, isRead: true, createdAt: true },
    }),
    prisma.notification.count({ where: { employeeId, isRead: false } }),
  ]);

  return { items, unreadCount };
}
