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
import type { ClosingCategoryLine } from "@/features/billing/closing-rules";
import { formatBrl } from "@/lib/money";

const chartConfig = {
  expected: { label: "Previsto", color: "var(--info)" },
  paid: { label: "Realizado", color: "var(--success)" },
  open: { label: "Em aberto", color: "var(--warning)" },
} satisfies ChartConfig;

export function ClosingBreakdownChart({
  categories,
}: {
  categories: ClosingCategoryLine[];
}) {
  const nonEmpty = categories.filter((item) => item.expectedCents > 0);
  if (nonEmpty.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma cobrança lançada para esta competência.
      </p>
    );
  }

  const data = nonEmpty.map((item) => ({
    label: item.label.replace("Taxas de ", ""),
    fullLabel: item.label,
    expected: Number((item.expectedCents / 100).toFixed(2)),
    paid: Number((item.paidCents / 100).toFixed(2)),
    open: Number((item.openCents / 100).toFixed(2)),
    expectedCents: item.expectedCents,
    paidCents: item.paidCents,
    openCents: item.openCents,
  }));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Comparativo entre receita prevista, realizada e saldo em aberto por categoria.
      </p>
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
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
                labelFormatter={(_label, payload) =>
                  String(
                    (payload?.[0]?.payload as { fullLabel?: string } | undefined)
                      ?.fullLabel ?? ""
                  )
                }
                formatter={(_value, _name, item) => {
                  const key = String(item.dataKey ?? "");
                  const payload = item.payload as
                    | { expectedCents?: number; paidCents?: number; openCents?: number }
                    | undefined;
                  const cents =
                    key === "expected"
                      ? (payload?.expectedCents ?? 0)
                      : key === "paid"
                        ? (payload?.paidCents ?? 0)
                        : (payload?.openCents ?? 0);
                  const title =
                    key === "expected"
                      ? "Previsto"
                      : key === "paid"
                        ? "Realizado"
                        : "Em aberto";
                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: item.color }}
                        />
                        {title}
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
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="expected" fill="var(--color-expected)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="open" fill="var(--color-open)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
