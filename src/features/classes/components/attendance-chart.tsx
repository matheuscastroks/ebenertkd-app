"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const studentAttendanceConfig = {
  count: { label: "Aulas" },
  present: { label: "Presenças", color: "var(--success)" },
  absent: { label: "Faltas", color: "var(--destructive)" },
  excused: { label: "Justificadas", color: "var(--warning)" },
  scheduled: { label: "Previstas", color: "var(--info)" },
} satisfies ChartConfig;

const attendanceEvolutionConfig = {
  rate: { label: "Frequência acumulada", color: "var(--primary)" },
} satisfies ChartConfig;

const classAttendanceConfig = {
  percentage: { label: "Frequência", color: "var(--primary)" },
} satisfies ChartConfig;

export type AttendanceEvolutionPoint = {
  dateLabel: string;
  lessonLabel: string;
  rate: number;
  attended: number;
  total: number;
  statusLabel: string;
};

export function AttendanceEvolutionAreaChart({
  points,
}: {
  points: AttendanceEvolutionPoint[];
}) {
  const uid = React.useId().replace(/:/g, "");
  const gradientId = `fillAttendanceRate-${uid}`;

  if (points.length < 2) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Curva acumulada aula a aula (linha pontilhada: meta de 75%).
      </p>
      <ChartContainer
        config={attendanceEvolutionConfig}
        className="aspect-auto h-48 w-full"
      >
        <AreaChart
          accessibilityLayer
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-rate)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-rate)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          <YAxis
            domain={[0, 100]}
            unit="%"
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <ReferenceLine
            y={75}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload as
                    | AttendanceEvolutionPoint
                    | undefined;
                  return point ? `${point.dateLabel} · ${point.lessonLabel}` : "";
                }}
                formatter={(_value, _name, item) => {
                  const point = item.payload as
                    | AttendanceEvolutionPoint
                    | undefined;
                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: item.color }}
                        />
                        {point
                          ? `${point.attended}/${point.total} · ${point.statusLabel}`
                          : "Frequência"}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {point?.rate ?? 0}%
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Area
            dataKey="rate"
            type="monotone"
            stroke="var(--color-rate)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export function StudentAttendanceChart({
  present,
  absent,
  excused,
  scheduled,
  rate,
  title,
  compact = false,
}: {
  present: number;
  absent: number;
  excused: number;
  scheduled?: number;
  rate?: number;
  title?: string;
  compact?: boolean;
}) {
  const totalRecords = present + absent + excused;
  const hasScheduled = Boolean(scheduled && scheduled > 0);

  if (totalRecords === 0 && !hasScheduled) {
    return null;
  }

  const computedRate =
    rate ?? (totalRecords > 0 ? Math.round((present / totalRecords) * 100) : 0);

  const legendItems = [
    ...(totalRecords > 0
      ? [
          {
            key: "present",
            status: "Presenças",
            count: present,
            color: "var(--success)",
            fill: "var(--color-present)",
          },
          {
            key: "absent",
            status: "Faltas",
            count: absent,
            color: "var(--destructive)",
            fill: "var(--color-absent)",
          },
          {
            key: "excused",
            status: "Justificadas",
            count: excused,
            color: "var(--warning)",
            fill: "var(--color-excused)",
          },
        ]
      : []),
    ...(hasScheduled
      ? [
          {
            key: "scheduled",
            status: "Previstas",
            count: scheduled ?? 0,
            color: "var(--info)",
            fill: "var(--color-scheduled)",
          },
        ]
      : []),
  ];

  const donutSlices = legendItems.filter((item) => item.count > 0);

  return (
    <div className="space-y-2">
      {title ? (
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      ) : null}
      <div
        className={
          compact
            ? "flex flex-wrap items-center gap-4"
            : "flex flex-col items-center gap-4 sm:flex-row sm:items-center"
        }
      >
        <ChartContainer
          config={studentAttendanceConfig}
          className={
            compact
              ? "aspect-square h-28 w-28 shrink-0"
              : "aspect-square h-40 w-40 shrink-0"
          }
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="key" />}
            />
            <Pie
              data={donutSlices}
              dataKey="count"
              nameKey="status"
              innerRadius={compact ? 32 : 46}
              outerRadius={compact ? 48 : 66}
              paddingAngle={donutSlices.length > 1 ? 3 : 0}
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
                          className={
                            compact
                              ? "fill-foreground text-sm font-semibold tabular-nums"
                              : "fill-foreground text-lg font-semibold tabular-nums"
                          }
                        >
                          {totalRecords > 0 ? `${computedRate}%` : `${scheduled ?? 0}`}
                        </tspan>
                        {!compact ? (
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 16}
                            className="fill-muted-foreground text-xs"
                          >
                            {totalRecords > 0 ? "presença" : "previstas"}
                          </tspan>
                        ) : null}
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <dl className="grid min-w-0 flex-1 gap-2 text-sm">
          {legendItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3"
            >
              <dt className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-xs"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span>{item.status}</span>
              </dt>
              <dd className="font-medium text-foreground tabular-nums">
                {item.count}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

type ClassAttendanceChartRow = {
  name: string;
  percentage: number;
  present: number;
  total: number;
};

function buildShortNames(rows: ClassAttendanceChartRow[]) {
  const firstCounts = new Map<string, number>();
  for (const row of rows) {
    const first = row.name.trim().split(/\s+/)[0] || row.name;
    firstCounts.set(first, (firstCounts.get(first) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  return rows.map((row) => {
    const parts = row.name.trim().split(/\s+/);
    const first = parts[0] || row.name;
    const candidate =
      (firstCounts.get(first) ?? 0) > 1 && parts[1]
        ? `${first} ${parts[1][0]?.toUpperCase() ?? ""}.`
        : first;
    const count = (seen.get(candidate) ?? 0) + 1;
    seen.set(candidate, count);
    return count > 1 ? `${candidate} (${count})` : candidate;
  });
}

export function ClassAttendanceChart({
  rows,
}: {
  rows: ClassAttendanceChartRow[];
}) {
  if (rows.length === 0) {
    return null;
  }

  const visibleRows = rows.slice(0, 12);
  const shortNames = buildShortNames(visibleRows);
  const data = visibleRows.map((row, index) => ({
    shortName: shortNames[index],
    name: row.name,
    percentage: row.percentage,
    present: row.present,
    total: row.total,
    fill: row.percentage >= 75 ? "var(--primary)" : "var(--destructive)",
  }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Percentual por aluno (linha pontilhada: meta de 75%)</span>
      </div>
      <ChartContainer
        config={classAttendanceConfig}
        className="aspect-auto h-56 w-full"
      >
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="shortName"
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            domain={[0, 100]}
            unit="%"
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <ReferenceLine
            y={75}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as
                    | { name?: string; present?: number; total?: number }
                    | undefined;
                  if (!row?.name) return "";
                  return `${row.name} (${row.present ?? 0}/${row.total ?? 0})`;
                }}
              />
            }
          />
          <Bar dataKey="percentage" unit="%" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
      {rows.length > 12 ? (
        <p className="text-xs text-muted-foreground">
          Exibindo os 12 primeiros alunos no gráfico; consulte a lista abaixo
          para ver toda a turma.
        </p>
      ) : null}
    </div>
  );
}
