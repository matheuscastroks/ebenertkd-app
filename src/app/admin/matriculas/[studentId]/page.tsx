import { PortalShell } from "@/components/dashboard/portal-shell";
import { getAcademyPolicies } from "@/features/academy/config-service";
import { getStudentAppAccessByStudentId } from "@/features/billing/access-lock-service";
import { listTrainingClasses } from "@/features/classes/service";
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

export default async function EnrollmentReviewPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ updated?: string; error?: string }> }) {
  const [admin, { studentId }, query, classes] = await Promise.all([
    requireProfile("admin"),
    params,
    searchParams,
    listTrainingClasses(true)
  ]);
  const bundle = await getEnrollmentBundleByStudentId(studentId).catch((error: unknown) => {
    if (error instanceof AppwriteException && error.code === 404 && error.type === "row_not_found") notFound();
    if (error instanceof Error && error.message === "enrollment_not_found") notFound();
    throw error;
  });
  const [reviews, latestParq, accessState] = await Promise.all([
    listEnrollmentReviews(studentId),
    getLatestParqForStudent(studentId).catch(() => null),
    getStudentAppAccessByStudentId(studentId).catch(() => null),
  ]);
  const policies = await getAcademyPolicies();
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
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminEnrollments}
      title={bundle.student.full_name}
      subtitle="Análise da matrícula: ficha, documentos e condições."
      breadcrumbs={[{ label: "Matrículas", href: ROUTES.adminEnrollments }, { label: bundle.student.full_name }]}
    >
      <div className="w-full min-w-0">
        <ReviewPanel
          bundle={toClientData(bundle)}
          reviews={toClientData(reviews) as Array<Record<string, unknown>>}
          classes={toClientData(classes)}
          parqAssessment={toClientData(parqAssessment)}
          accessState={accessState ? toClientData(accessState) : undefined}
          notice={notice}
          defaultMonthlyFeeCents={policies.billing.default_monthly_fee_cents}
          contractDurationMonths={policies.contract.default_duration_months}
        />
      </div>
    </PortalShell>
  );
}
