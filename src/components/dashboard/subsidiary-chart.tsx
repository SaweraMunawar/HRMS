"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  headcount: { label: "Headcount", color: "var(--chart-1)" },
  pendingLeave: { label: "Pending leave", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function SubsidiaryChart({ data }: { data: { name: string; headcount: number; pendingLeave: number }[] }) {
  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: -16 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="headcount" fill="var(--color-headcount)" radius={[4, 4, 0, 0]} maxBarSize={48} />
        <Bar dataKey="pendingLeave" fill="var(--color-pendingLeave)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  );
}
