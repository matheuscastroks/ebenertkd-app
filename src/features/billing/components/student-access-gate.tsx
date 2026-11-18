"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { StudentAppAccessStatus } from "@/features/billing/access-lock-rules";
import type { ParqStatus } from "@/features/students/parq-rules";
import { formatBusinessDateBr } from "@/lib/dates";
import { ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, ClipboardCheck, Lock, Wallet } from "lucide-react";

const ADULT_ALLOWED_LOCKED_PREFIXES = [
  ROUTES.studentBilling,
  ROUTES.studentContracts,
  ROUTES.studentParq,
];

function isAllowedWhenLocked(pathname: string): boolean {
  return ADULT_ALLOWED_LOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function StudentAccessGate({
  isMinor,
  locked,
  accessStatus,
  accessValidUntil,
  daysRemaining,
  parqStatus,
  children,
}: {
  isMinor: boolean;
  locked: boolean;
  accessStatus: StudentAppAccessStatus;
  /** Nunca preencher com datas financeiras para `minor_student`. */
  accessValidUntil?: string | null;
  daysRemaining?: number | null;
  parqStatus: ParqStatus | null;
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (locked) {
    // Isolamento total para menores: nunca mostrar valores, PIX ou cobranças.
    if (isMinor) {
      return (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center px-4 py-14 text-center">
          <div className="w-full space-y-5 rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
              <Lock className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Acesso temporariamente pausado
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Seu acesso ao aplicativo da Ebener Taekwondo está pausado no momento. Peça ao seu responsável para verificar a situação da matrícula no portal da família.
              </p>
            </div>
            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
              Assim que a matrícula for regularizada pelo responsável, todas as suas áreas voltam a abrir automaticamente.
            </p>
          </div>
        </div>
      );
    }

    // Para aluno adulto: mantém Financeiro, Contratos e PAR-Q acessíveis para regularização imediata.
    if (!isAllowedWhenLocked(pathname)) {
      return (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center px-4 py-14 text-center">
          <div className="w-full space-y-5 rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
              <Lock className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Ciclo mensal expirado · Acesso pausado
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {accessValidUntil
                  ? `Seu acesso de 30 dias referente ao último pagamento venceu em ${formatBusinessDateBr(accessValidUntil)}. `
                  : "Há uma mensalidade pendente fora da janela de 30 dias. "}
                Envie o comprovante PIX no financeiro para liberar o aplicativo imediatamente enquanto o professor confirma.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Button asChild className="min-h-11">
                <Link href={ROUTES.studentBilling}>
                  <Wallet className="size-4" aria-hidden="true" />
                  Regularizar no Financeiro (PIX)
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link href={ROUTES.studentContracts}>
                  Ver contrato
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
              Caso já tenha feito o pagamento presencialmente ou combinado outra data, avise o professor para atualizar sua liberação.
            </p>
          </div>
        </div>
      );
    }
  }

  const showLockedFinanceBanner = locked && !isMinor && pathname.startsWith(ROUTES.studentBilling);
  const showExpiringCycleBanner =
    !locked &&
    !isMinor &&
    accessStatus === "expiring_soon" &&
    accessValidUntil &&
    !pathname.startsWith(ROUTES.studentBilling);
  const showExpiredParqBanner =
    parqStatus === "expired" && !pathname.startsWith(ROUTES.studentParq);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      {showLockedFinanceBanner ? (
        <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
          <Alert>
            <AlertTitle>Acesso às demais áreas pausado até a regularização mensal</AlertTitle>
            <AlertDescription>
              Envie o comprovante da mensalidade abaixo para reabrir automaticamente todas as telas do aplicativo.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {showExpiringCycleBanner ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
          <Alert>
            <AlertTitle>
              Seu ciclo mensal de acesso vence{" "}
              {daysRemaining === 0
                ? "hoje"
                : daysRemaining === 1
                  ? "amanhã"
                  : `em ${daysRemaining} dias`}
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Acesso válido até {formatBusinessDateBr(accessValidUntil)} (30 dias após o pagamento). Envie o comprovante no financeiro para evitar a pausa do aplicativo.
              </span>
              <Button asChild size="sm" variant="outline" className="min-h-9">
                <Link href={ROUTES.studentBilling}>
                  Abrir financeiro
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {showExpiredParqBanner ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
          <Alert>
            <AlertTitle>Hora de renovar seu questionário de saúde</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {isMinor
                  ? "Seu questionário de saúde anual precisa ser renovado. Peça ao seu responsável para atualizar no portal da família."
                  : "Seu questionário de saúde anual venceu. Responda 10 perguntas rápidas para manter sua ficha em dia."}
              </span>
              {!isMinor ? (
                <Button asChild size="sm" variant="outline" className="min-h-9">
                  <Link href={ROUTES.studentParq}>
                    <ClipboardCheck className="size-3.5" aria-hidden="true" />
                    Responder agora
                  </Link>
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {children}
    </div>
  );
}
