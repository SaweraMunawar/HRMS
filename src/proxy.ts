// =====================================================================
//  Next.js 16 proxy (pehle "middleware" kehlata tha)
//  Har page request se pehle auth.config.ts ka `authorized` check chalta hai.
// =====================================================================
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // API, Next.js ki static files aur images ko chhod ke sab pages
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
