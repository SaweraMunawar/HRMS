// Session mein role, subsidiary aur department add karne ke liye TypeScript types
import type { DefaultSession } from "next-auth";
import type { RoleCode } from "@/lib/roles";

declare module "next-auth" {
  interface User {
    role: RoleCode;
    subsidiaryId: number;
    departmentId: number;
  }

  interface Session {
    user: {
      id: string;
      role: RoleCode;
      subsidiaryId: number;
      departmentId: number;
    } & DefaultSession["user"];
  }
}

// Auth.js v5 mein JWT type "@auth/core/jwt" se aata hai
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: RoleCode;
    subsidiaryId: number;
    departmentId: number;
  }
}
