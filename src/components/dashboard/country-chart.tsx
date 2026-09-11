"use client";

import { Cell, Label, Pie, PieChart } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function CountryChart({ data }: { data: { country: string; headcount: number }[] }) {
  // Config bhi data se banti hai, taake nayi country khud chart mein aa jaye
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.country, { label: d.country, color: COLORS[i % COLORS.length] }]),
  );
  const total = data.reduce((sum, d) => sum + d.headcount, 0);

  return (
    <ChartContainer config={config} className="mx-auto h-[260px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="country" hideLabel />} />
        <Pie data={data} dataKey="headcount" nameKey="country" innerRadius={60} strokeWidth={4}>
          {data.map((d, i) => (
            <Cell key={d.country} fill={COLORS[i % COLORS.length]} />
          ))}
          <Label
            content={({ viewBox }) =>
              viewBox && "cx" in viewBox ? (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">{total}</tspan>
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">Employees</tspan>
                </text>
              ) : null
            }
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="country" />} />
      </PieChart>
    </ChartContainer>
  );
}
