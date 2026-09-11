// =====================================================================
//  Sidebar menu - har role ko sirf wohi links dikhte hain jo woh khol sakta hai.
//  Access ka faisla roles.ts ka canAccessPath karta hai (proxy bhi wahi use karta hai),
//  is liye menu aur security hamesha ek jaise rehte hain.
// =====================================================================
import { Building2, CalendarDays, Globe, Inbox, Network, User, Users, type LucideIcon } from "lucide-react";
import { canAccessPath, type RoleCode } from "@/lib/roles";

export type NavItem = { title: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboards",
    items: [
      { title: "Global overview", href: "/admin", icon: Globe },
      { title: "Subsidiary overview", href: "/hr", icon: Building2 },
      { title: "Team dashboard", href: "/manager", icon: Users },
      { title: "My dashboard", href: "/employee", icon: User },
    ],
  },
  {
    label: "Leave",
    items: [
      { title: "My leave", href: "/leave", icon: CalendarDays },
      { title: "Approvals", href: "/leave/approvals", icon: Inbox },
    ],
  },
  {
    label: "Organization",
    items: [
      { title: "Org chart", href: "/org-chart", icon: Network },
      { title: "Employees", href: "/employees", icon: Users },
    ],
  },
];

export function getNavForRole(role: RoleCode): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessPath(role, item.href)),
  })).filter((group) => group.items.length > 0);
}
