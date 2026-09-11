"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: number; name: string };
const ALL = "all"; // Radix Select empty value allow nahi karta

export function EmployeeFilters({ subsidiaries, departments }: { subsidiaries: Option[]; departments: Option[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    startTransition(() => router.push(`/employees?${next.toString()}`));
  };

  const hasFilters = [...params.keys()].length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply("q", q)}
          onBlur={() => apply("q", q)}
          placeholder="Search name, email or code"
          className="pl-9"
          aria-label="Search employees"
        />
      </div>

      {subsidiaries.length > 0 && (
        <Select value={params.get("subsidiaryId") ?? ALL} onValueChange={(v) => apply("subsidiaryId", v)}>
          <SelectTrigger className="w-44" aria-label="Filter by subsidiary">
            <SelectValue placeholder="All subsidiaries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subsidiaries</SelectItem>
            {subsidiaries.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={params.get("departmentId") ?? ALL} onValueChange={(v) => apply("departmentId", v)}>
        <SelectTrigger className="w-40" aria-label="Filter by department">
          <SelectValue placeholder="All departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get("status") ?? ALL} onValueChange={(v) => apply("status", v)}>
        <SelectTrigger className="w-36" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="ON_LEAVE">On leave</SelectItem>
          <SelectItem value="TERMINATED">Terminated</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => startTransition(() => router.push("/employees"))}>
          <X className="size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
