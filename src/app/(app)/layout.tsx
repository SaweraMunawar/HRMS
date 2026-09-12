import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/authz";
import { getNotifications } from "@/lib/queries/notifications";
import { prisma } from "@/lib/prisma";

// Login ke baad wale saare pages: sidebar + upar header
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [subsidiary, notifications] = await Promise.all([
    prisma.subsidiary.findUnique({
      where: { id: user.subsidiaryId },
      select: { name: true, country: { select: { name: true } } },
    }),
    getNotifications(Number(user.id)),
  ]);

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
      <AppSidebar user={user} subsidiaryName={subsidiary?.name ?? ""} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="text-sm text-muted-foreground">
            {subsidiary ? `${subsidiary.name}, ${subsidiary.country.name}` : "Nexora HRMS"}
          </span>
          <div className="ml-auto">
            <NotificationBell items={notifications.items} unreadCount={notifications.unreadCount} />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
