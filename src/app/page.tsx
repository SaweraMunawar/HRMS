import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/roles";

// "/" pe aane wale ko uske role ke dashboard pe bhejo
export default async function Home() {
  const session = await auth();
  redirect(session?.user ? ROLE_HOME[session.user.role] : "/login");
}
