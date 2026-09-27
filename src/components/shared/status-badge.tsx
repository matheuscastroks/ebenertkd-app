import type { ComponentProps } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-border/40 bg-muted/60 text-muted-foreground shadow-xs",
  info: "border-info/30 bg-info/10 text-info-foreground shadow-xs dark:bg-info/15",
  success: "border-success/30 bg-success/10 text-success-foreground shadow-xs dark:bg-success/15",
  warning: "border-warning/35 bg-warning/10 text-warning-foreground shadow-xs dark:bg-warning/15",
  danger: "border-destructive/30 bg-destructive/10 text-destructive shadow-xs dark:bg-destructive/15"
};

export function StatusBadge({ tone = "neutral", className, ...props }: ComponentProps<typeof Badge> & { tone?: StatusTone }) {
  return <Badge variant="outline" className={cn(toneClasses[tone], "font-semibold px-2.5 py-0.5", className)} {...props} />;
}
