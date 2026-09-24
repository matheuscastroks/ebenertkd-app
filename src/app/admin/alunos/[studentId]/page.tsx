import { ReviewPanel } from "@/features/students/components/review-panel";
import { listEnrollmentReviews } from "@/features/students/document-service";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { PortalShell } from "@/components/dashboard/portal-shell";

export default async function StudentReviewPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ updated?: string; error?: string }> }) {
  const admin = await requireProfile("admin");
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
  const [bundle, reviews] = await Promise.all([getEnrollmentBundleByStudentId(studentId), listEnrollmentReviews(studentId)]);
  const notice = query.updated ? "Alteração registrada com sucesso." : query.error ? "Não foi possível concluir. Verifique as pendências e os dados informados." : undefined;
  return <PortalShell profile={admin} activePath="/admin/alunos" title="Análise da matrícula" subtitle="Revise a ficha, os documentos e as condições do aluno."><div className="mx-auto w-full max-w-6xl"><ReviewPanel bundle={bundle} reviews={reviews as Array<Record<string, unknown>>} notice={notice} /></div></PortalShell>;
}
