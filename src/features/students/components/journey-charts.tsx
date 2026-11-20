"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { StudentMonthlyAttendancePoint } from "@/features/students/journey-rules";

const chartConfig = {
  present: { label: "Presenças", color: "var(--success)" },
  excused: { label: "Justificadas", color: "var(--warning)" },
  absent: { label: "Faltas", color: "var(--destructive)" },
} satisfies ChartConfig;

export function StudentMonthlyProgressChart({
  series,
}: {
  series: StudentMonthlyAttendancePoint[];
}) {
  const hasAny = series.some((item) => item.present > 0 || item.absent > 0 || item.excused > 0);
  if (!hasAny) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Suas presenças mês a mês aparecerão aqui assim que o professor registrar as chamadas.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Ritmo de treinos nos últimos {series.length} meses.
      </p>
      <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full">
        <BarChart
          accessibilityLayer
          data={series}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="present" stackId="month" fill="var(--color-present)" />
          <Bar dataKey="excused" stackId="month" fill="var(--color-excused)" />
          <Bar
            dataKey="absent"
            stackId="month"
            fill="var(--color-absent)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
