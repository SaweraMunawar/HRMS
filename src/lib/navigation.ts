// =====================================================================
//  Sidebar menu - har role ko sirf wohi links dikhte hain jo woh khol sakta hai.
//  Access ka faisla roles.ts ka canAccessPath karta hai (proxy bhi wahi use karta hai),
//  is liye menu aur security hamesha ek jaise rehte hain.
// =====================================================================
import { Building2, Globe, User, Users, type LucideIcon } from "lucide-react";
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
  // Agle steps mein: Leave, Organization (org chart, employees) waghera
];

export function getNavForRole(role: RoleCode): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessPath(role, item.href)),
  })).filter((group) => group.items.length > 0);
}
