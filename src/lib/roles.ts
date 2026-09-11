// =====================================================================
//  Roles aur route access - poori app ka ek hi source of truth.
//  (Role codes wahi hain jo seed mein Role table mein daale hain.)
// =====================================================================

export const ROLE_CODES = ["SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD", "EMPLOYEE"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export function isRoleCode(value: string): value is RoleCode {
  return (ROLE_CODES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<RoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_MANAGER: "HR Manager",
  DEPT_HEAD: "Department Head",
  TEAM_LEAD: "Team Lead",
  EMPLOYEE: "Employee",
};

/** Login ke baad har role ka apna dashboard */
export const ROLE_HOME: Record<RoleCode, string> = {
  SUPER_ADMIN: "/admin",
  HR_MANAGER: "/hr",
  DEPT_HEAD: "/manager",
  TEAM_LEAD: "/manager",
  EMPLOYEE: "/employee",
};

/** Kaunsa URL area kaunse roles khol sakte hain (Requirement 5.2 route grouping) */
const AREA_ACCESS: { prefix: string; roles: readonly RoleCode[] }[] = [
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/hr", roles: ["SUPER_ADMIN", "HR_MANAGER"] },
  { prefix: "/manager", roles: ["SUPER_ADMIN", "HR_MANAGER", "DEPT_HEAD", "TEAM_LEAD"] },
  { prefix: "/employee", roles: ROLE_CODES }, // apna leave / profile sab ke paas
];

export function canAccessPath(role: RoleCode, pathname: string): boolean {
  const area = AREA_ACCESS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  return area ? area.roles.includes(role) : true; // baaki shared pages (e.g. /org-chart) sab ke liye
}
