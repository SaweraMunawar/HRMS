"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  used: { label: "Used", color: "var(--chart-1)" },
  remaining: { label: "Remaining", color: "var(--chart-track)" },
} satisfies ChartConfig;

export function LeaveBalanceChart({ data }: { data: { type: string; used: number; remaining: number }[] }) {
  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="type" width={110} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="used" stackId="a" fill="var(--color-used)" radius={[4, 0, 0, 4]} />
        <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
