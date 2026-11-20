import { Suspense } from "react";
import { ExamBundleSections } from "./exam-board";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { examEventLabels, examEventTones, formatExamDate } from "@/features/exams/labels";
import { getExamEvent } from "@/features/exams/service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

function ExamSectionsSkeleton() {
  return (
    <div aria-label="Carregando banca…" aria-busy="true" className="space-y-6">
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4">
        <div className="space-y-2 p-4 sm:px-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
        <div className="space-y-2 border-l border-border p-4 sm:px-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-12" />
        </div>
        <div className="space-y-2 border-t border-border p-4 sm:border-t-0 sm:border-l sm:px-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
        <div className="space-y-2 border-t border-l border-border p-4 sm:border-t-0 sm:px-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Skeleton className="h-5 w-40" />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-52" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 lg:col-span-4">
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Carregando banca…</span>
    </div>
  );
}

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ added?: string; graded?: string; cancelled?: string; error?: string }>;
}) {
  const [admin, { eventId }, query] = await Promise.all([
    requireProfile("admin"),
    params,
    searchParams,
  ]);
  const event = await getExamEvent(eventId);

  const notice = query.added
    ? "Aluno inscrito na banca e cobrança gerada com sucesso."
    : query.graded
      ? "Resultado registrado e graduação atualizada."
      : query.cancelled
        ? "Inscrição cancelada com sucesso."
        : undefined;

  return (
    <PortalShell
      profile={admin} back={{ label: "Exames de faixa", href: ROUTES.adminExams }}
      title={event.name}
      subtitle={`${formatExamDate(event.event_date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · ${event.location || "Local não informado"}`}
      headerActions={
        <StatusBadge tone={examEventTones[event.status]}>
          {examEventLabels[event.status]}
        </StatusBadge>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        {notice ? (
          <OperationToast
            tone="success"
            title={notice}
            clearParams={["added", "graded", "cancelled"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível concluir a operação"
            description={
              query.error === "cancel"
                ? "Cobranças já quitadas exigem optar entre conceder crédito futuro ou manter o valor arrecadado."
                : query.error === "participant"
                  ? "Verifique se o aluno possui matrícula ativa e a graduação pretendida é superior à atual."
                  : query.error === "event-cancel"
                    ? "Trate ou cancele todas as inscrições em aberto antes de cancelar o exame."
                    : "Confira os dados enviados e tente novamente."
            }
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={<ExamSectionsSkeleton />}>
          <ExamBundleSections eventId={eventId} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
