"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { BillingTrendPoint } from "@/features/billing/chart-data";

const config = {
  received: { label: "Recebido", color: "var(--color-chart-1)" },
  pending: { label: "Pendente", color: "var(--color-chart-2)" },
  overdue: { label: "Inadimplente", color: "var(--color-chart-3)" }
} satisfies ChartConfig;

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value / 100);

export function BillingTrendChart({ data }: { data: BillingTrendPoint[] }) {
  const totals = data.reduce((result, item) => ({ received: result.received + item.received, pending: result.pending + item.pending, overdue: result.overdue + item.overdue }), { received: 0, pending: 0, overdue: 0 });
  return <Card><CardHeader><CardTitle>Tendência financeira</CardTitle><CardDescription>Recebimentos e valores em aberto nas últimas seis competências.</CardDescription></CardHeader><CardContent><ChartContainer config={config} className="h-[280px] min-h-[240px] w-full aspect-auto"><BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} tickFormatter={(value) => money(Number(value))} width={72} /><ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <><span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span><span className="ml-auto font-mono font-medium">{money(Number(value))}</span></>} />} /><ChartLegend content={<ChartLegendContent />} /><Bar dataKey="received" fill="var(--color-received)" radius={4} /><Bar dataKey="pending" fill="var(--color-pending)" radius={4} /><Bar dataKey="overdue" fill="var(--color-overdue)" radius={4} /></BarChart></ChartContainer><p className="mt-3 text-sm text-muted-foreground">No período: {money(totals.received)} recebidos, {money(totals.pending)} pendentes e {money(totals.overdue)} inadimplentes.</p></CardContent></Card>;
}
