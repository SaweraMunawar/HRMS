// =====================================================================
//  Auth config (bina database ke) - proxy.ts isay har request pe use karta hai
// =====================================================================
import type { NextAuthConfig } from "next-auth";
import { canAccessPath, ROLE_HOME } from "@/lib/roles";

const PUBLIC_PATHS = ["/login"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 ghante
  trustHost: true, // local `npm start` pe bhi chale
  providers: [], // asal provider auth.ts mein hai
  callbacks: {
    // Route protection: har page request pe chalta hai
    authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user;
      const path = nextUrl.pathname;
      const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

      if (isPublic) {
        // Logged-in user ko login page dobara na dikhao
        return user ? Response.redirect(new URL(ROLE_HOME[user.role], nextUrl)) : true;
      }
      if (!user) return false; // -> /login?callbackUrl=...

      // Galat area khola (e.g. Employee ne /admin) -> apne dashboard pe wapas
      if (!canAccessPath(user.role, path)) {
        return Response.redirect(new URL(ROLE_HOME[user.role], nextUrl));
      }
      return true;
    },

    // Login ke waqt user ki info token mein save
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.subsidiaryId = user.subsidiaryId;
        token.departmentId = user.departmentId;
      }
      return token;
    },

    // Token se session mein (jo pages aur actions mein milta hai)
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.subsidiaryId = token.subsidiaryId;
      session.user.departmentId = token.departmentId;
      return session;
    },
  },
} satisfies NextAuthConfig;
