"use client";

import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { buildRevenueCurve, effectiveRevenuePerStudentCents, type PlanningInput } from "@/features/billing/planning-rules";
import { formatBrl } from "@/lib/money";

const chartConfig = {
  revenue: { label: "Receita no caixa", color: "var(--success)" },
  fixed: { label: "Custos fixos", color: "var(--warning)" },
  need: { label: "Custos + pró-labore + reserva", color: "var(--destructive)" }
} satisfies ChartConfig;

export function PlanningChart({ students, feeCents, input }: { students: number; feeCents: number; input: PlanningInput }) {
  const limit = Math.max(10, Math.ceil(students * 1.6));
  const points = buildRevenueCurve(feeCents, input, limit).map((point) => ({
    students: point.students,
    revenue: Number((point.revenueCents / 100).toFixed(2)),
    fixed: Number((point.fixedCostsCents / 100).toFixed(2)),
    need: Number((point.needCents / 100).toFixed(2))
  }));
  const currentRevenue = Math.max(0, Number(((Math.max(0, students) * effectiveRevenuePerStudentCents(feeCents, input)) / 100).toFixed(2)));

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda do gráfico">
        {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: chartConfig[key].color, opacity: key === "revenue" ? 1 : 0.85 }}
            />
            {chartConfig[key].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          Você hoje: {students} aluno{students === 1 ? "" : "s"}
        </li>
      </ul>
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
        <LineChart accessibilityLayer data={points} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="students" type="number" domain={[0, limit]} tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_label, payload) => `${String((payload?.[0]?.payload as { students?: number } | undefined)?.students ?? "")} alunos`}
                formatter={(value, name) => (
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label ?? name}</span>
                    <span className="font-medium tabular-nums">{formatBrl(Math.round(Number(value) * 100))}</span>
                  </span>
                )}
              />
            }
          />
          <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
          <Line dataKey="fixed" type="linear" stroke="var(--color-fixed)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
          <Line dataKey="need" type="linear" stroke="var(--color-need)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
          <ReferenceDot x={students} y={currentRevenue} r={5} fill="var(--primary)" stroke="var(--background)" strokeWidth={2} ifOverflow="extendDomain" />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
