import { PortalShell } from "@/components/dashboard/portal-shell";
import { listTrainingClasses } from "@/features/classes/service";
import { ReviewPanel } from "@/features/students/components/review-panel";
import { listEnrollmentReviews } from "@/features/students/document-service";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
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
  const reviews = await listEnrollmentReviews(studentId);
  const notice = query.updated === "student"
    ? "Dados cadastrais do aluno atualizados com sucesso."
    : query.updated
      ? "Alteração registrada com sucesso."
      : query.error === "update_student"
        ? "Não foi possível atualizar os dados do aluno. Verifique os campos informados."
        : query.error
          ? "Não foi possível concluir. Verifique as pendências e os dados informados."
          : undefined;
  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminEnrollments}
      title="Análise da matrícula"
      subtitle="Revise a ficha, os documentos e as condições do aluno."
      breadcrumbs={[{ label: "Matrículas", href: ROUTES.adminEnrollments }, { label: bundle.student.full_name }]}
    >
      <div className="mx-auto w-full max-w-6xl">
        <ReviewPanel bundle={bundle} reviews={reviews as Array<Record<string, unknown>>} classes={classes} notice={notice} />
      </div>
    </PortalShell>
  );
}
