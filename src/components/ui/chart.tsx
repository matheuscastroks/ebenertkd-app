"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const CHART_THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof CHART_THEMES, string> }
  )
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart deve ser usado dentro de <ChartContainer />.");
  }
  return context;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorEntries = Object.entries(config).filter(
    ([, entry]) => Boolean(entry.theme || entry.color)
  );

  if (!colorEntries.length) {
    return null;
  }

  const rules = (Object.keys(CHART_THEMES) as Array<keyof typeof CHART_THEMES>)
    .map((themeName) => {
      const prefix = CHART_THEMES[themeName];
      const declarations = colorEntries
        .map(([key, entry]) => {
          const colorValue = entry.theme?.[themeName] ?? entry.color;
          return colorValue ? `  --color-${key}: ${colorValue};` : null;
        })
        .filter(Boolean)
        .join("\n");

      if (!declarations) return null;
      return `${prefix} [data-chart=${id}] {\n${declarations}\n}`;
    })
    .filter(Boolean)
    .join("\n");

  if (!rules) {
    return null;
  }

  return <style dangerouslySetInnerHTML={{ __html: rules }} />;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const generatedId = React.useId().replace(/:/g, "");
  const chartId = `chart-${id ?? generatedId}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 320, height: 180 }}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipFormatter = (
  value: RechartsPrimitive.TooltipValueType | undefined,
  name: string | number | undefined,
  item: RechartsPrimitive.TooltipPayloadEntry,
  index: number,
  payload: RechartsPrimitive.TooltipPayloadEntry["payload"]
) => React.ReactNode;

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: RechartsPrimitive.TooltipPayload;
  label?: React.ReactNode;
  labelFormatter?: (
    label: React.ReactNode,
    payload: RechartsPrimitive.TooltipPayload
  ) => React.ReactNode;
  labelClassName?: string;
  formatter?: TooltipFormatter;
  color?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
};

function resolveConfigEntry(
  config: ChartConfig,
  item: unknown,
  key: string
) {
  if (typeof item !== "object" || item === null) {
    return undefined;
  }
  const record = item as Record<string, unknown>;
  const nested =
    "payload" in record &&
    typeof record.payload === "object" &&
    record.payload !== null
      ? (record.payload as Record<string, unknown>)
      : undefined;

  let resolvedKey = key;
  if (key in record && typeof record[key] === "string") {
    resolvedKey = record[key];
  } else if (nested && key in nested && typeof nested[key] === "string") {
    resolvedKey = nested[key];
  }

  return resolvedKey in config ? config[resolvedKey] : config[key];
}

function formatTooltipValue(
  value: RechartsPrimitive.TooltipValueType | undefined,
  unit: React.ReactNode
) {
  if (value === undefined) return "";
  const formatted =
    typeof value === "number"
      ? value.toLocaleString("pt-BR")
      : Array.isArray(value)
        ? value.join(" – ")
        : String(value);
  return unit ? `${formatted}${typeof unit === "string" ? unit : ""}` : formatted;
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  const items = React.useMemo(
    () => (payload ?? []).filter((entry) => entry.type !== "none"),
    [payload]
  );

  const headerLabel = React.useMemo(() => {
    if (hideLabel || items.length === 0) {
      return null;
    }

    const first = items[0];
    const lookupKey = `${labelKey ?? first?.dataKey ?? first?.name ?? "value"}`;
    const entryConfig = resolveConfigEntry(config, first, lookupKey);
    const baseLabel =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : (entryConfig?.label ?? label);

    if (labelFormatter) {
      return (
        <div className={cn("font-medium text-foreground", labelClassName)}>
          {labelFormatter(baseLabel, items)}
        </div>
      );
    }

    if (!baseLabel) {
      return null;
    }

    return (
      <div className={cn("font-medium text-foreground", labelClassName)}>
        {baseLabel}
      </div>
    );
  }, [config, hideLabel, items, label, labelClassName, labelFormatter, labelKey]);

  if (!active || items.length === 0) {
    return null;
  }

  const singleRowWithLabel = items.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md",
        className
      )}
    >
      {!singleRowWithLabel ? headerLabel : null}
      <div className="grid gap-1.5">
        {items.map((item, index) => {
          const lookupKey = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
          const entryConfig = resolveConfigEntry(config, item, lookupKey);
          const rawPayload =
            typeof item.payload === "object" && item.payload !== null
              ? (item.payload as Record<string, unknown>)
              : undefined;
          const swatchColor =
            color ??
            (typeof rawPayload?.fill === "string" ? rawPayload.fill : undefined) ??
            item.color;

          const rowKey = `${String(item.dataKey ?? item.name ?? "item")}-${index}`;

          if (formatter && item.value !== undefined) {
            return (
              <div
                key={rowKey}
                className="flex w-full flex-wrap items-center gap-2 [&>svg]:size-2.5 [&>svg]:text-muted-foreground"
              >
                {formatter(item.value, item.name, item, index, item.payload)}
              </div>
            );
          }

          return (
            <div
              key={rowKey}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center"
              )}
            >
              {entryConfig?.icon ? (
                <entryConfig.icon />
              ) : !hideIndicator ? (
                <div
                  className={cn(
                    "shrink-0 rounded-xs border-(--color-border) bg-(--color-bg)",
                    {
                      "size-2.5": indicator === "dot",
                      "w-1": indicator === "line",
                      "my-0.5 w-0 border border-dashed bg-transparent":
                        indicator === "dashed",
                    }
                  )}
                  style={
                    {
                      "--color-bg": swatchColor,
                      "--color-border": swatchColor,
                    } as React.CSSProperties
                  }
                />
              ) : null}
              <div
                className={cn(
                  "flex flex-1 justify-between gap-3 leading-none",
                  singleRowWithLabel ? "items-end" : "items-center"
                )}
              >
                <div className="grid gap-1">
                  {singleRowWithLabel ? headerLabel : null}
                  <span className="text-muted-foreground">
                    {entryConfig?.label ?? item.name}
                  </span>
                </div>
                {item.value !== undefined ? (
                  <span className="font-medium text-foreground tabular-nums">
                    {formatTooltipValue(item.value, item.unit)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  payload?: ReadonlyArray<RechartsPrimitive.LegendPayload>;
  verticalAlign?: RechartsPrimitive.VerticalAlignmentType;
  hideIcon?: boolean;
  nameKey?: string;
}) {
  const { config } = useChart();

  const items = (payload ?? []).filter((entry) => entry.type !== "none");
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {items.map((item, index) => {
        const lookupKey = `${nameKey ?? item.dataKey ?? "value"}`;
        const entryConfig = resolveConfigEntry(config, item, lookupKey);
        return (
          <div
            key={`${String(item.value ?? item.dataKey ?? "legend")}-${index}`}
            className="flex items-center gap-1.5 [&>svg]:size-3 [&>svg]:text-muted-foreground"
          >
            {entryConfig?.icon && !hideIcon ? (
              <entryConfig.icon />
            ) : !hideIcon ? (
              <div
                className="size-2 shrink-0 rounded-xs"
                style={{ backgroundColor: item.color }}
              />
            ) : null}
            <span>{entryConfig?.label ?? item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
