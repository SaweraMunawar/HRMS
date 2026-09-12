"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/app/(app)/actions";
import { getNavForRole } from "@/lib/navigation";
import { ROLE_LABELS, type RoleCode } from "@/lib/roles";

type Props = { user: { name?: string | null; email?: string | null; role: RoleCode }; subsidiaryName: string };

export function AppSidebar({ user, subsidiaryName }: Props) {
  const pathname = usePathname();
  const groups = getNavForRole(user.role);
  const initials = (user.name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Nexora HRMS</span>
                  <span className="truncate text-xs text-sidebar-foreground/65">{subsidiaryName}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:hidden">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">{initials}</div>
              <div className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/65">{ROLE_LABELS[user.role]}</span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOutAction}>
              <SidebarMenuButton type="submit" tooltip="Sign out">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
