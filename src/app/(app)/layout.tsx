import { Building2, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/authz";
import { ROLE_LABELS } from "@/lib/roles";

// Login ke baad wale saare pages is layout mein (sidebar agle step mein aayega)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="size-5" />
            <span>HRMS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
            <form action={handleSignOut}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
