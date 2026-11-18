import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type EnrollmentStep = {
  id: "pessoais" | "saude" | "treino" | "documentos";
  title: string;
  isValid: boolean;
};

export function EnrollmentStepper({
  steps,
  current,
  statusHint,
  allowFreeNavigation = false,
  onSelectStep,
}: {
  steps: EnrollmentStep[];
  current: number;
  statusHint?: string;
  allowFreeNavigation?: boolean;
  onSelectStep?: (index: number) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Passo {current + 1} de {steps.length} · {steps[current]?.title}
        </p>
        {statusHint ? (
          <p className="text-xs text-muted-foreground">{statusHint}</p>
        ) : null}
      </div>

      <Progress
        value={((current + 1) / steps.length) * 100}
        className="h-1.5"
        aria-label="Progresso da matrícula"
      />

      <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {steps.map((step, index) => {
          const isCurrent = index === current;
          const isCompleted = step.isValid && !isCurrent;
          const isClickable = Boolean(onSelectStep) && (allowFreeNavigation || index <= current || step.isValid);

          const pillContent = (
            <>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-success/15 text-success-foreground"
                      : "bg-muted text-muted-foreground"
                )}
                aria-hidden="true"
              >
                {isCompleted ? <Check className="size-3" /> : index + 1}
              </span>
              <span className="min-w-0 truncate">
                {step.title}
                {step.isValid ? <span className="sr-only"> · Completo</span> : null}
              </span>
            </>
          );

          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className="min-w-0"
            >
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onSelectStep?.(index)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors duration-(--duration-quick)",
                    isCurrent
                      ? "border-primary/40 bg-card text-foreground shadow-xs"
                      : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {pillContent}
                </button>
              ) : (
                <div
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                    isCurrent
                      ? "border-primary/40 bg-card text-foreground shadow-xs"
                      : "border-transparent text-muted-foreground"
                  )}
                >
                  {pillContent}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
