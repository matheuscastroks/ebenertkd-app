import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-border bg-info-soft text-info-foreground",
  success: "border-border bg-success-soft text-success-foreground",
  warning: "border-border bg-warning-soft text-warning-foreground",
  danger: "border-border bg-danger-soft text-danger-text"
};

export function StatusBadge({ tone = "neutral", className, ...props }: ComponentProps<typeof Badge> & { tone?: StatusTone }) {
  return <Badge variant="outline" className={cn(toneClasses[tone], "font-semibold px-2.5 py-0.5", className)} {...props} />;
}
