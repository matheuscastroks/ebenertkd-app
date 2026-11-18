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
import type { EligibilitySummary } from "@/features/exams/eligibility-rules";

const chartConfig = {
  eligible: { label: "Aptos / Inscritos", color: "var(--success)" },
  almostReady: { label: "Quase prontos / Bloqueio", color: "var(--warning)" },
  inProgress: { label: "Em carência", color: "var(--info)" },
} satisfies ChartConfig;

export function EligibilityChart({ summary }: { summary: EligibilitySummary }) {
  if (summary.byBelt.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sem alunos ativos em faixas coloridas para exibir a distribuição.
      </p>
    );
  }

  const data = summary.byBelt.map((item) => ({
    ...item,
    shortBelt: item.belt.replace("Ponta ", "P. "),
  }));

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">
          Prontidão para exame por faixa atual
        </h2>
        <p className="text-xs text-muted-foreground">
          Comparativo entre tempo de faixa, presenças acumuladas e situação financeira.
        </p>
      </div>

      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="shortBelt"
            tickLine={false}
            axisLine={false}
            interval={0}
            tickMargin={8}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as
                    | { belt?: string; gub?: number }
                    | undefined;
                  return row ? `Faixa ${row.belt} (${row.gub}º GUB)` : "";
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="eligible" stackId="belt" fill="var(--color-eligible)" />
          <Bar dataKey="almostReady" stackId="belt" fill="var(--color-almostReady)" />
          <Bar
            dataKey="inProgress"
            stackId="belt"
            fill="var(--color-inProgress)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
