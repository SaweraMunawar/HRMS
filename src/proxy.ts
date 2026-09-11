// =====================================================================
//  Next.js 16 proxy (pehle "middleware" kehlata tha)
//  Har PAGE request se pehle auth.config.ts ka `authorized` check chalta hai.
//
//  Note: Server actions bhi POST usi page URL pe karte hain. Un pe Auth.js
//  ka session handler chalega to woh session cookie ko dobara likhne ki
//  koshish karta hai aur action ka apna response kharab ho jata hai
//  (user logout ho jata hai). Is liye sirf GET (navigation) guard karte hain.
//  Actions ki asal security har action ke andar requireUser/requireRole se
//  hoti hai - Requirement 4 (RBAC enforced server-side).
// =====================================================================
import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default function proxy(request: NextRequest, event: unknown) {
  if (request.method !== "GET") return NextResponse.next();
  return (auth as unknown as (req: NextRequest, ev: unknown) => Response)(request, event);
}

export const config = {
  // API, Next.js ki static files aur images ko chhod ke sab pages
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
