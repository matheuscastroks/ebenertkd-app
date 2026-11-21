"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  AnnualMonthlyPoint,
  BeltFunnelPoint,
} from "@/features/operations/annual-analytics-rules";
import { formatBrl } from "@/lib/money";

const revenueConfig = {
  expected: { label: "Previsto", color: "var(--info)" },
  received: { label: "Recebido em caixa", color: "var(--success)" },
} satisfies ChartConfig;

const seasonalityConfig = {
  newEnrollments: { label: "Novas matrículas", color: "var(--success)" },
  cancelledEnrollments: { label: "Cancelamentos", color: "var(--destructive)" },
} satisfies ChartConfig;

const beltConfig = {
  activeCount: { label: "Ativos na faixa", color: "var(--primary)" },
  inactiveCount: { label: "Evasões / Inativos", color: "var(--destructive)" },
} satisfies ChartConfig;

export function AnnualRevenueAreaChart({
  series,
}: {
  series: AnnualMonthlyPoint[];
}) {
  const uid = React.useId().replace(/:/g, "");
  const expectedId = `fillExpected-${uid}`;
  const receivedId = `fillReceived-${uid}`;

  const data = series.map((point) => ({
    ...point,
    expected: Number((point.expectedCents / 100).toFixed(2)),
    received: Number((point.receivedCents / 100).toFixed(2)),
  }));

  return (
    <div className="space-y-2 rounded-xl bg-card p-4 shadow-xs sm:p-5">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">
          Receita prevista vs. realizada (12 meses)
        </h2>
        <p className="text-xs text-muted-foreground">
          Evolução mensal entre faturamento emitido na competência e entradas em caixa.
        </p>
      </div>

      <ChartContainer config={revenueConfig} className="aspect-auto h-60 w-full">
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={expectedId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-expected)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--color-expected)" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id={receivedId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-received)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-received)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={68}
            tickFormatter={(value) =>
              `R$ ${Number(value).toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}`
            }
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_label, payload) =>
                  String(
                    (payload?.[0]?.payload as { competence?: string } | undefined)
                      ?.competence ?? ""
                  )
                }
                formatter={(_value, _name, item) => {
                  const key = String(item.dataKey ?? "");
                  const payload = item.payload as AnnualMonthlyPoint | undefined;
                  const cents =
                    key === "expected"
                      ? (payload?.expectedCents ?? 0)
                      : (payload?.receivedCents ?? 0);
                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: item.color }}
                        />
                        {key === "expected" ? "Previsto" : "Recebido"}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatBrl(cents)}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Area
            dataKey="expected"
            type="monotone"
            fill={`url(#${expectedId})`}
            stroke="var(--color-expected)"
            strokeWidth={2}
          />
          <Area
            dataKey="received"
            type="monotone"
            fill={`url(#${receivedId})`}
            stroke="var(--color-received)"
            strokeWidth={2}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export function AnnualSeasonalityBarChart({
  series,
}: {
  series: AnnualMonthlyPoint[];
}) {
  return (
    <div className="space-y-2 rounded-xl bg-card p-4 shadow-xs sm:p-5">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">
          Sazonalidade: entradas vs. cancelamentos
        </h2>
        <p className="text-xs text-muted-foreground">
          Identifique meses de maior captação e períodos de evasão sazonal.
        </p>
      </div>

      <ChartContainer config={seasonalityConfig} className="aspect-auto h-56 w-full">
        <BarChart
          accessibilityLayer
          data={series}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="newEnrollments"
            fill="var(--color-newEnrollments)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="cancelledEnrollments"
            fill="var(--color-cancelledEnrollments)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function BeltPyramidChart({
  distribution,
}: {
  distribution: BeltFunnelPoint[];
}) {
  const nonEmpty = distribution.filter(
    (item) => item.activeCount > 0 || item.inactiveCount > 0
  );

  return (
    <div className="space-y-2 rounded-xl bg-card p-4 shadow-xs sm:p-5">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">
          Distribuição e retenção por faixa
        </h2>
        <p className="text-xs text-muted-foreground">
          Funil pedagógico comparando alunos ativos e histórico de evasão em cada graduação.
        </p>
      </div>

      {nonEmpty.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sem alunos com graduação registrada.
        </p>
      ) : (
        <ChartContainer config={beltConfig} className="aspect-auto h-56 w-full">
          <BarChart
            accessibilityLayer
            data={nonEmpty}
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
                    const row = payload?.[0]?.payload as BeltFunnelPoint | undefined;
                    return row
                      ? `Faixa ${row.belt} · ${row.graduationsInYear} graduação(ões) no ano`
                      : "";
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="activeCount"
              fill="var(--color-activeCount)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="inactiveCount"
              fill="var(--color-inactiveCount)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
