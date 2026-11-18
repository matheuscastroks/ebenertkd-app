"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RenewalBucketSummary } from "@/features/contracts/renewal-service";
import type { RenewalBucket } from "@/features/contracts/rules";
import { formatBrl } from "@/lib/money";

const chartConfig = {
  count: { label: "Contratos" },
  expired: { label: "Vencidos", color: "var(--destructive)" },
  due_7d: { label: "Até 7 dias", color: "var(--warning)" },
  due_30d: { label: "8 a 30 dias", color: "var(--primary)" },
  due_60d: { label: "31 a 60 dias", color: "var(--info)" },
  due_90d: { label: "61 a 90 dias", color: "var(--chart-2)" },
  healthy: { label: "Acima de 90d", color: "var(--success)" },
} satisfies ChartConfig;

const BUCKET_COLORS: Record<RenewalBucket, string> = {
  expired: "var(--destructive)",
  due_7d: "var(--warning)",
  due_30d: "var(--primary)",
  due_60d: "var(--info)",
  due_90d: "var(--chart-2)",
  healthy: "var(--success)",
};

export function RenewalPipelineChart({
  buckets,
}: {
  buckets: RenewalBucketSummary[];
}) {
  if (buckets.every((item) => item.count === 0)) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum contrato assinado para compor a esteira de renovação.
      </p>
    );
  }

  const data = buckets.map((item) => ({
    ...item,
    fill: BUCKET_COLORS[item.bucket],
  }));

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">
          Horizonte de vencimento dos contratos assinados
        </h2>
        <p className="text-xs text-muted-foreground">
          Quantidade de contratos e mensalidade recorrente por janela de vencimento.
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
            dataKey="label"
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
                hideLabel
                nameKey="bucket"
                formatter={(_value, _name, item) => {
                  const payload = item.payload as RenewalBucketSummary & { fill?: string };
                  return (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: payload.fill ?? item.color }}
                        />
                        {payload.label}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {payload.count} ({formatBrl(payload.monthlyRevenueCents)}/mês)
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
