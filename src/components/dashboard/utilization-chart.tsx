"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = { used: { label: "Days used", color: "var(--chart-1)" } } satisfies ChartConfig;

export function UtilizationChart({ data }: { data: { type: string; used: number; percent: number }[] }) {
  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: -16 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="type" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="used" fill="var(--color-used)" radius={[4, 4, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ChartContainer>
  );
}
