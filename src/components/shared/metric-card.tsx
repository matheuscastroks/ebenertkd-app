import type { ReactNode } from "react";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";
import type { StatusTone } from "@/components/shared/status-badge";

const accents: Record<StatusTone, string> = {
  neutral: "bg-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive"
};

export function MetricCard({ label, value, helper, tone = "neutral", icon }: { label: string; value: ReactNode; helper?: string; tone?: StatusTone; icon?: ReactNode }) {
  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:translate-y-[-1px]">
      <div className={cn("absolute inset-y-0 left-0 w-1", accents[tone])} aria-hidden="true" />
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
          {helper ? <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{helper}</p> : null}
        </div>
        {icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground depth-recessed" aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
