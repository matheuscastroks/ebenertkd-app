import { cache, Suspense } from "react";
import { ExamBundleSections } from "./exam-board";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { StatusBadge } from "@/components/shared/status-badge";
import { InlineRowsSkeleton, InlineValueSkeleton } from "@/components/skeletons";
import { examEventLabels, examEventTones, formatExamDate } from "@/features/exams/labels";
import { getExamEvent } from "@/features/exams/service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

const loadExamEvent = cache((eventId: string) => getExamEvent(eventId));

async function ExamTitle({ eventId }: { eventId: string }) {
  const event = await loadExamEvent(eventId);
  return <>{event.name}</>;
}

async function ExamSubtitle({ eventId }: { eventId: string }) {
  const event = await loadExamEvent(eventId);
  return (
    <>
      {formatExamDate(event.event_date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
      {" · "}
      {event.location || "Local não informado"}
    </>
  );
}

async function ExamStatusHeaderAction({ eventId }: { eventId: string }) {
  const event = await loadExamEvent(eventId);
  return (
    <StatusBadge tone={examEventTones[event.status]}>
      {examEventLabels[event.status]}
    </StatusBadge>
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

  const notice = query.added
    ? "Aluno inscrito na banca e cobrança gerada com sucesso."
    : query.graded
      ? "Resultado registrado e graduação atualizada."
      : query.cancelled
        ? "Inscrição cancelada com sucesso."
        : undefined;

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Exames de faixa", href: ROUTES.adminExams }}
      title={
        <Suspense fallback={<InlineValueSkeleton className="h-7 w-52" />}>
          <ExamTitle eventId={eventId} />
        </Suspense>
      }
      subtitle={
        <Suspense fallback={<InlineValueSkeleton className="h-4 w-64" />}>
          <ExamSubtitle eventId={eventId} />
        </Suspense>
      }
      headerActions={
        <Suspense fallback={<InlineValueSkeleton className="h-6 w-20 rounded-full" />}>
          <ExamStatusHeaderAction eventId={eventId} />
        </Suspense>
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

        <Suspense fallback={<InlineRowsSkeleton rows={5} label="Carregando banca de exame…" />}>
          <ExamBundleSections eventId={eventId} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
