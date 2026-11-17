import type { ReactNode } from "react";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";
import type { StatusTone } from "@/components/shared/status-badge";

// Só o estado de alerta muda a cor do número; os demais tons seguem o texto padrão.
const valueTone: Partial<Record<StatusTone, string>> = { danger: "text-destructive" };

export function MetricCard({ label, value, helper, tone = "neutral", icon }: { label: string; value: ReactNode; helper?: string; tone?: StatusTone; icon?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className={cn("mt-1.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums", valueTone[tone])}>{value}</div>
          {helper ? <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{helper}</p> : null}
        </div>
        {icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground " aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
