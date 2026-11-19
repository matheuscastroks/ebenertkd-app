"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RetentionCohortSummary } from "@/features/classes/retention-rules";

const riskPieConfig = {
  count: { label: "Alunos" },
  healthy: { label: "Frequência regular", color: "var(--success)" },
  warning: { label: "Em atenção", color: "var(--warning)" },
  critical: { label: "Risco crítico", color: "var(--destructive)" },
} satisfies ChartConfig;

const classRiskConfig = {
  healthy: { label: "Regular", color: "var(--success)" },
  warning: { label: "Atenção", color: "var(--warning)" },
  critical: { label: "Crítico", color: "var(--destructive)" },
} satisfies ChartConfig;

export function RetentionCharts({ summary, windowDays = 30 }: { summary: RetentionCohortSummary; windowDays?: number }) {
  if (summary.totalActive === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sem alunos ativos suficientes para exibir o painel de retenção.
      </p>
    );
  }

  const pieSlices = summary.riskBreakdown
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      fill: `var(--color-${item.key})`,
    }));

  const classData = summary.byClass.slice(0, 8).map((item) => ({
    ...item,
    shortClass:
      item.className.length > 16 ? `${item.className.slice(0, 15)}…` : item.className,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Saúde de presença da academia
          </h2>
          <p className="text-xs text-muted-foreground">
            Classificação pelos últimos {windowDays} dias e faltas seguidas.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <ChartContainer
            config={riskPieConfig}
            className="aspect-square h-44 w-44 shrink-0"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="key" />}
              />
              <Pie
                data={pieSlices}
                dataKey="count"
                nameKey="label"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={pieSlices.length > 1 ? 3 : 0}
                cornerRadius={4}
                stroke="none"
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-xl font-semibold tabular-nums"
                          >
                            {summary.retentionRatePct}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 18}
                            className="fill-muted-foreground text-xs"
                          >
                            retidos
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <dl className="grid min-w-0 flex-1 gap-2.5 text-sm">
            {summary.riskBreakdown.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3"
              >
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="size-2.5 shrink-0 rounded-xs"
                    style={{
                      backgroundColor:
                        item.key === "healthy"
                          ? "var(--success)"
                          : item.key === "warning"
                            ? "var(--warning)"
                            : "var(--destructive)",
                    }}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {item.count}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Risco de evasão por turma
          </h2>
          <p className="text-xs text-muted-foreground">
            Turmas ordenadas pelo volume de alunos em atenção ou risco crítico.
          </p>
        </div>

        <ChartContainer config={classRiskConfig} className="aspect-auto h-52 w-full">
          <BarChart
            accessibilityLayer
            data={classData}
            margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="shortClass"
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
                  labelFormatter={(_label, payload) =>
                    String(
                      (payload?.[0]?.payload as { className?: string } | undefined)
                        ?.className ?? ""
                    )
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="healthy"
              stackId="retention"
              fill="var(--color-healthy)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="warning"
              stackId="retention"
              fill="var(--color-warning)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="critical"
              stackId="retention"
              fill="var(--color-critical)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
