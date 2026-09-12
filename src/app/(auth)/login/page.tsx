import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in | Nexora HRMS" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;

  // Offices come from the database, so the panel always matches the seeded company
  const offices = await prisma.subsidiary.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, city: true, timezone: true, country: { select: { name: true } } },
  });

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel: same ink as the app chrome, so signing in feels continuous */}
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex xl:p-14">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <span className="text-lg font-semibold">Nexora HRMS</span>
        </div>

        <div className="flex max-w-md flex-col gap-3">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Every office, one set of people records.
          </h2>
          <p className="text-sidebar-foreground/70">
            Reporting lines, leave approvals and headcount stay consistent across subsidiaries, while each office keeps
            its own calendar and currency.
          </p>
        </div>

        {/* Real offices rather than a decorative strapline */}
        <ul className="flex flex-wrap gap-x-10 gap-y-4">
          {offices.map((o) => (
            <li key={o.id} className="flex flex-col">
              <span className="font-medium">{o.city}</span>
              <span className="text-sm text-sidebar-foreground/60">{o.country.name}</span>
              <span className="text-xs text-sidebar-foreground/45">{o.timezone}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="flex w-full max-w-sm flex-col gap-7">
          <div className="flex items-center gap-2 font-semibold lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            Nexora HRMS
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">Use the work email your HR team set up for you.</p>
          </div>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
