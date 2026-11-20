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
import { formatBrl } from "@/lib/money";

export type BillingMonthlySeriesPoint = {
  competence: string;
  label: string;
  receivedCents: number;
  openCents: number;
};

const areaChartConfig = {
  received: { label: "Recebido", color: "var(--success)" },
  open: { label: "Em aberto", color: "var(--warning)" },
} satisfies ChartConfig;

const barChartConfig = {
  amount: { label: "Valor" },
  received: { label: "Recebido", color: "var(--success)" },
  pending: { label: "A receber", color: "var(--warning)" },
  overdue: { label: "Em atraso", color: "var(--destructive)" },
  underReview: { label: "Em análise", color: "var(--info)" },
} satisfies ChartConfig;

export function BillingOverviewChart({
  monthlySeries = [],
  receivedCents,
  pendingCents,
  overdueCents,
  underReviewCents,
}: {
  monthlySeries?: BillingMonthlySeriesPoint[];
  receivedCents: number;
  pendingCents?: number;
  overdueCents: number;
  underReviewCents?: number;
}) {
  const uid = React.useId().replace(/:/g, "");
  const fillReceivedId = `fillReceived-${uid}`;
  const fillOpenId = `fillOpen-${uid}`;

  const activeMonthsCount = monthlySeries.filter(
    (point) => point.receivedCents > 0 || point.openCents > 0
  ).length;

  if (activeMonthsCount >= 2) {
    const areaData = monthlySeries.map((point) => ({
      competence: point.competence,
      label: point.label,
      receivedCents: point.receivedCents,
      openCents: point.openCents,
      received: Number((point.receivedCents / 100).toFixed(2)),
      open: Number((point.openCents / 100).toFixed(2)),
    }));

    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Recebido vs. em aberto por competência (últimos {monthlySeries.length} meses).
        </p>
        <ChartContainer
          config={areaChartConfig}
          className="aspect-auto h-56 w-full"
        >
          <AreaChart
            accessibilityLayer
            data={areaData}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={fillReceivedId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-received)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-received)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id={fillOpenId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-open)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-open)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
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
                      (payload?.[0]?.payload as { label?: string } | undefined)?.label ??
                        ""
                    )
                  }
                  formatter={(_value, _name, item) => {
                    const key = String(item.dataKey ?? "");
                    const entry = item.payload as
                      | { receivedCents?: number; openCents?: number }
                      | undefined;
                    const cents =
                      key === "received"
                        ? (entry?.receivedCents ?? 0)
                        : (entry?.openCents ?? 0);
                    const seriesLabel = key === "received" ? "Recebido" : "Em aberto";
                    return (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span
                            className="size-2.5 shrink-0 rounded-xs"
                            style={{ backgroundColor: item.color }}
                          />
                          {seriesLabel}
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
              dataKey="received"
              type="monotone"
              fill={`url(#${fillReceivedId})`}
              stroke="var(--color-received)"
              strokeWidth={2}
              stackId="billing"
            />
            <Area
              dataKey="open"
              type="monotone"
              fill={`url(#${fillOpenId})`}
              stroke="var(--color-open)"
              strokeWidth={2}
              stackId="billing"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </div>
    );
  }

  const buckets = [
    { key: "received", status: "Recebido", cents: receivedCents },
    ...(pendingCents !== undefined
      ? [{ key: "pending", status: "A receber", cents: pendingCents }]
      : []),
    { key: "overdue", status: "Em atraso", cents: overdueCents },
    ...(underReviewCents !== undefined
      ? [{ key: "underReview", status: "Em análise", cents: underReviewCents }]
      : []),
  ] as const;

  if (buckets.every((bucket) => bucket.cents <= 0)) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sem valores lançados neste mês para comparar.
      </p>
    );
  }

  const barData = buckets.map((bucket) => ({
    key: bucket.key,
    status: bucket.status,
    cents: bucket.cents,
    amount: Number((bucket.cents / 100).toFixed(2)),
    fill: `var(--color-${bucket.key})`,
  }));

  return (
    <ChartContainer
      config={barChartConfig}
      className="aspect-auto h-52 w-full"
    >
      <BarChart
        accessibilityLayer
        data={barData}
        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="status"
          tickLine={false}
          axisLine={false}
          interval={0}
        />
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
              hideLabel
              nameKey="key"
              formatter={(_value, _name, item) => {
                const entry = item.payload as
                  | { status?: string; cents?: number; fill?: string }
                  | undefined;
                return (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: entry?.fill ?? item.color }}
                      />
                      {entry?.status ?? item.name}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatBrl(entry?.cents ?? 0)}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
