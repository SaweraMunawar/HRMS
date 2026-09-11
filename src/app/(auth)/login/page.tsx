import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in | Nexora HRMS" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: brand panel (sirf bari screen pe) */}
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="size-6" />
          HRMS
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold leading-snug">One HR platform for every subsidiary, in every country.</p>
          <p className="text-sm text-primary-foreground/70">Employees, reporting lines, leave approvals and analytics in one place.</p>
        </div>
        <p className="text-xs text-primary-foreground/60">Karachi · Lahore · Dubai</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2 font-semibold lg:hidden">
            <Building2 className="size-5" />
            HRMS
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in with your work email to continue.</p>
          </div>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
