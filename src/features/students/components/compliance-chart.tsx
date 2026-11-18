"use client";

import { Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  ComplianceSummary,
  MedicalComplianceStatus,
} from "@/features/students/compliance-rules";

const chartConfig = {
  count: { label: "Alunos" },
  valid: { label: "Em dia", color: "var(--success)" },
  expiring_soon: { label: "Vence em 30d", color: "var(--warning)" },
  expired: { label: "Vencido", color: "var(--destructive)" },
  pending_review: { label: "Em análise", color: "var(--info)" },
  missing: { label: "Pendente / Recusado", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

const STATUS_COLORS: Record<MedicalComplianceStatus, string> = {
  valid: "var(--success)",
  expiring_soon: "var(--warning)",
  expired: "var(--destructive)",
  pending_review: "var(--info)",
  missing: "var(--muted-foreground)",
};

export function ComplianceChart({ summary }: { summary: ComplianceSummary }) {
  if (summary.totalActive === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sem alunos ativos para verificar a regularidade anual de atestados.
      </p>
    );
  }

  const slices = summary.breakdown
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      fill: `var(--color-${item.key})`,
    }));

  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">
          Conformidade anual de atestados médicos (validade de 12 meses)
        </h2>
        <p className="text-xs text-muted-foreground">
          Proporção de alunos com aptidão médica válida, a vencer nos próximos 30 dias ou vencida.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <ChartContainer
          config={chartConfig}
          className="aspect-square h-44 w-44 shrink-0"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="key" />}
            />
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={slices.length > 1 ? 3 : 0}
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
                          {summary.complianceRatePct}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 18}
                          className="fill-muted-foreground text-xs"
                        >
                          regulares
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

        <dl className="grid w-full min-w-0 flex-1 gap-2.5 text-sm sm:max-w-md">
          {summary.breakdown.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-xs"
                  style={{ backgroundColor: STATUS_COLORS[item.key] }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </dt>
              <dd className="font-medium text-foreground tabular-nums">{item.count}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
