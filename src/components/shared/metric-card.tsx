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
    <Card className="relative">
      <div className={cn("absolute inset-y-0 left-0 w-1", accents[tone])} aria-hidden="true" />
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
          {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
