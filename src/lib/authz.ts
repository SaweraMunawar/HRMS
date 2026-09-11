// =====================================================================
//  Server-side authorization helpers
//  Proxy sirf pages bachata hai. Har server page / server action mein bhi
//  yeh check lagana hai (Requirement 4: RBAC enforced server-side).
// =====================================================================
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME, type RoleCode } from "@/lib/roles";

/** Logged-in user do, warna login pe bhejo */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Sirf yeh roles aage ja sakte hain, baaki apne dashboard pe wapas */
export async function requireRole(...roles: RoleCode[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}
