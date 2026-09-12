"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

/** Ek notification read mark karo - sirf apni (server-side ownership check) */
export async function markNotificationRead(notificationId: number) {
  const user = await requireUser();

  // updateMany + employeeId filter: kisi aur ki notification chhoo hi nahi sakte
  await prisma.notification.updateMany({
    where: { id: notificationId, employeeId: Number(user.id) },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
}

/** Saari unread ko read mark karo */
export async function markAllNotificationsRead() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { employeeId: Number(user.id), isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
}
