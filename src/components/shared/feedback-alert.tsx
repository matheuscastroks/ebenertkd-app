import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "@/components/ui/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { StatusTone } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

type FeedbackTone = Exclude<StatusTone, "neutral">;

const config = {
  info: { icon: Info, className: "border-info/20 bg-info/5 text-info-foreground" },
  success: { icon: CheckCircle2, className: "border-success/20 bg-success/5 text-success-foreground" },
  warning: { icon: TriangleAlert, className: "border-warning/25 bg-warning/5 text-warning-foreground" },
  danger: { icon: AlertCircle, className: "border-destructive/20 bg-destructive/5 text-destructive" }
} satisfies Record<FeedbackTone, { icon: React.ComponentType<any>; className: string }>;

export function FeedbackAlert({ tone, title, description }: { tone: FeedbackTone; title: string; description?: string }) {
  const { icon: Icon, className } = config[tone];
  return (
    <Alert variant={tone === "danger" ? "destructive" : "default"} className={cn("grid-cols-[auto_1fr] gap-x-3", className)}>
      {/* Ícones animados vêm embrulhados: o seletor `>svg` do Alert não os alcança, então o tamanho vai explícito. */}
      <Icon aria-hidden="true" className="row-span-2 size-4 translate-y-0.5" />
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
    </Alert>
  );
}
