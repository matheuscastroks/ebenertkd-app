import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { StatusTone } from "@/components/shared/status-badge";

type FeedbackTone = Exclude<StatusTone, "neutral">;

const config = {
  info: { icon: Info, className: "border-info/20 bg-info/5 text-info-foreground" },
  success: { icon: CheckCircle2, className: "border-success/20 bg-success/5 text-success-foreground" },
  warning: { icon: TriangleAlert, className: "border-warning/25 bg-warning/5 text-warning-foreground" },
  danger: { icon: AlertCircle, className: "border-destructive/20 bg-destructive/5 text-destructive" }
} satisfies Record<FeedbackTone, { icon: typeof Info; className: string }>;

export function FeedbackAlert({ tone, title, description }: { tone: FeedbackTone; title: string; description?: string }) {
  const { icon: Icon, className } = config[tone];
  return (
    <Alert variant={tone === "danger" ? "destructive" : "default"} className={className}>
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
    </Alert>
  );
}
