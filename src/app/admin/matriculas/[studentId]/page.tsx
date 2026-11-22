import { cache, Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton, InlineValueSkeleton } from "@/components/skeletons";
import { getAcademyPolicies, getBeltRanks } from "@/features/academy/config-service";
import { getStudentAppAccessByStudentId } from "@/features/billing/access-lock-service";
import { listTrainingClasses } from "@/features/classes/service";
import { AdminDeleteStudentDialog } from "@/features/students/components/AdminDeleteStudentDialog";
import { ReviewPanel } from "@/features/students/components/review-panel";
import { listEnrollmentReviews } from "@/features/students/document-service";
import { evaluateParqStatus } from "@/features/students/parq-rules";
import { getLatestParqForStudent } from "@/features/students/parq-service";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { saoPauloToday } from "@/lib/dates";
import { ROUTES } from "@/lib/navigation/routes";
import { toClientData } from "@/lib/client-data";
import { AppwriteException } from "node-appwrite";
import { notFound } from "next/navigation";

const loadBundle = cache((studentId: string) =>
  getEnrollmentBundleByStudentId(studentId).catch((error: unknown) => {
    if (error instanceof AppwriteException && error.code === 404 && error.type === "row_not_found") notFound();
    if (error instanceof Error && error.message === "enrollment_not_found") notFound();
    throw error;
  })
);

async function StudentTitle({ studentId }: { studentId: string }) {
  const bundle = await loadBundle(studentId);
  return <>{bundle.student.full_name}</>;
}

async function EnrollmentReviewBody({
  studentId,
  query,
}: {
  studentId: string;
  query: { updated?: string; error?: string };
}) {
  const [classes, bundle, reviews, latestParq, accessState, policies, ranks] = await Promise.all([
    listTrainingClasses(true),
    loadBundle(studentId),
    listEnrollmentReviews(studentId),
    getLatestParqForStudent(studentId).catch(() => null),
    getStudentAppAccessByStudentId(studentId).catch(() => null),
    getAcademyPolicies(),
    getBeltRanks(),
  ]);

  const parqAssessment = evaluateParqStatus(latestParq, saoPauloToday(), policies.compliance);
  const notice = query.updated === "student"
    ? "Dados cadastrais do aluno atualizados com sucesso."
    : query.updated === "access_override"
      ? "Liberação temporária de acesso atualizada com sucesso."
      : query.updated
        ? "Alteração registrada com sucesso."
        : query.error === "update_student"
          ? "Não foi possível atualizar os dados do aluno. Verifique os campos informados."
          : query.error === "access_override"
            ? "Não foi possível atualizar a liberação temporária de acesso."
            : query.error
              ? "Não foi possível concluir. Verifique as pendências e os dados informados."
              : undefined;

  return (
    <div className="w-full min-w-0 space-y-8">
      <ReviewPanel
        bundle={toClientData(bundle)}
        reviews={toClientData(reviews) as Array<Record<string, unknown>>}
        classes={toClientData(classes)}
        parqAssessment={toClientData(parqAssessment)}
        accessState={accessState ? toClientData(accessState) : undefined}
        notice={notice}
        defaultMonthlyFeeCents={policies.billing.default_monthly_fee_cents}
        contractDurationMonths={policies.contract.default_duration_months}
        dueDayOptions={policies.billing.due_day_options}
        ranks={ranks}
        levelLabel={policies.belts.level_label}
      />
      {bundle.student.profile_id ? (
        <section aria-labelledby="delete-student-heading" className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <div className="min-w-0">
            <h2 id="delete-student-heading" className="text-sm font-semibold">Excluir aluno</h2>
            <p className="text-sm text-muted-foreground">Remove o perfil e todos os dados. Não dá para desfazer.</p>
          </div>
          <AdminDeleteStudentDialog profileId={bundle.student.profile_id} studentName={bundle.student.full_name} />
        </section>
      ) : null}
    </div>
  );
}

export default async function EnrollmentReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const [admin, { studentId }, query] = await Promise.all([
    requireProfile("admin"),
    params,
    searchParams,
  ]);

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Alunos", href: ROUTES.adminEnrollments }}
      title={
        <Suspense fallback={<InlineValueSkeleton className="h-7 w-48" />}>
          <StudentTitle studentId={studentId} />
        </Suspense>
      }
      subtitle="Confira a ficha e decida a matrícula."
    >
      <Suspense fallback={<InlineRowsSkeleton rows={5} label="Carregando ficha do aluno…" />}>
        <EnrollmentReviewBody studentId={studentId} query={query} />
      </Suspense>
    </PortalShell>
  );
}
