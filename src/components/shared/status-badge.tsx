import type { ComponentProps } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-info/20 bg-info/10 text-info-foreground",
  success: "border-success/20 bg-success/10 text-success-foreground",
  warning: "border-warning/25 bg-warning/10 text-warning-foreground",
  danger: "border-destructive/20 bg-destructive/10 text-destructive"
};

export function StatusBadge({ tone = "neutral", className, ...props }: ComponentProps<typeof Badge> & { tone?: StatusTone }) {
  return <Badge variant="outline" className={cn(toneClasses[tone], className)} {...props} />;
}
