// =====================================================================
//  Auth.js - email/password login (database check yahan hota hai)
// =====================================================================
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { isRoleCode } from "@/lib/roles";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const employee = await prisma.employee.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: { role: true },
        });

        // Terminated employee login nahi kar sakta (Requirement 3.3 offboarding)
        if (!employee || employee.status === "TERMINATED") return null;

        const passwordOk = await bcrypt.compare(parsed.data.password, employee.passwordHash);
        if (!passwordOk || !isRoleCode(employee.role.code)) return null;

        return {
          id: String(employee.id),
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          role: employee.role.code,
          subsidiaryId: employee.subsidiaryId,
          departmentId: employee.departmentId,
        };
      },
    }),
  ],
});
