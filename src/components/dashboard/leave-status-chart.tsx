"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = { count: { label: "Requests" } } satisfies ChartConfig;

// Same colour language as the status badges: amber waits, green passed, rose stopped.
const COLOR: Record<string, string> = {
  Pending: "var(--chart-3)",
  Approved: "var(--chart-4)",
  Rejected: "var(--chart-5)",
  Cancelled: "var(--muted-foreground)",
};

export function LeaveStatusChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart data={data} margin={{ left: -16 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={72}>
          {data.map((d) => (
            <Cell key={d.status} fill={COLOR[d.status] ?? "var(--chart-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
