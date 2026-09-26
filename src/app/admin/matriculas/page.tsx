import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ListPagination } from "@/components/shared/list-pagination";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { listTrainingClasses } from "@/features/classes/service";
import { EnrollmentFilters } from "@/features/students/components/enrollment-filters";
import { EnrollmentTable } from "@/features/students/components/enrollment-table";
import { listEnrollmentsForReview } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";
import { KeyRound } from "lucide-react";

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; belt?: string; turma?: string; page?: string }>;
}) {
  const admin = await requireProfile("admin");
  const filters = await searchParams;
  const status = filters.status === "all" ? undefined : filters.status;
  const belt = filters.belt === "all" ? undefined : filters.belt;
  const trainingClass = filters.turma === "all" ? undefined : filters.turma;
  const page = /^\d+$/.test(filters.page ?? "") ? Math.max(1, Number(filters.page)) : 1;
  const [result, classes] = await Promise.all([
    listEnrollmentsForReview({ search: filters.q, status, belt, trainingClass, page }),
    listTrainingClasses(true),
  ]);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminEnrollments}
      title="Matrículas"
      subtitle="Analise cadastros, documentação, atestados médicos e condições financeiras."
      breadcrumbs={[{ label: "Matrículas" }]}
      headerActions={
        <Button asChild variant="outline" className="h-10 font-medium">
          <Link href={ROUTES.adminStudentAccess}>
            <KeyRound className="mr-2 size-4" />
            Acessos dos alunos
          </Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <EnrollmentFilters classes={toClientData(classes)} />

        {result.rows.length === 0 ? (
          <EmptyState
            title="Nenhuma matrícula encontrada"
            description="Ajuste os filtros de busca ou aguarde o envio de uma nova ficha pelos alunos."
            action={
              <Button asChild variant="outline" className="h-11 font-medium">
                <Link href={ROUTES.adminEnrollments}>Limpar todos os filtros</Link>
              </Button>
            }
          />
        ) : (
          <EnrollmentTable rows={result.rows} />
        )}

        <ListPagination
          basePath={ROUTES.adminEnrollments}
          params={{ q: filters.q, status: filters.status, belt: filters.belt, turma: filters.turma }}
          page={result.page}
          total={result.total}
          pageSize={result.pageSize}
        />
      </div>
    </PortalShell>
  );
}
