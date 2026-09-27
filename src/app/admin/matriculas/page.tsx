import { Suspense } from "react";
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
import { TableRowsSkeleton } from "@/components/skeletons";

type SearchParamsType = Promise<{
  q?: string;
  status?: string;
  belt?: string;
  turma?: string;
  page?: string;
}>;

async function EnrollmentListContent({ searchParams }: { searchParams: SearchParamsType }) {
  const filters = await searchParams;
  const status = filters.status === "all" ? undefined : filters.status;
  const belt = filters.belt === "all" ? undefined : filters.belt;
  const trainingClass = filters.turma === "all" ? undefined : filters.turma;
  const page = /^\d+$/.test(filters.page ?? "") ? Math.max(1, Number(filters.page)) : 1;

  const result = await listEnrollmentsForReview({
    search: filters.q,
    status,
    belt,
    trainingClass,
    page,
  });

  if (result.rows.length === 0) {
    return (
      <EmptyState
        title="Nenhuma matrícula encontrada"
        description="Ajuste os filtros de busca ou aguarde o envio de uma nova ficha pelos alunos."
        action={
          <Button asChild variant="outline" className="h-11 font-medium">
            <Link href={ROUTES.adminEnrollments}>Limpar todos os filtros</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <EnrollmentTable rows={toClientData(result.rows)} />
      <ListPagination
        basePath={ROUTES.adminEnrollments}
        params={{ q: filters.q, status: filters.status, belt: filters.belt, turma: filters.turma }}
        page={result.page}
        total={result.total}
        pageSize={result.pageSize}
      />
    </>
  );
}

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: SearchParamsType;
}) {
  const [admin, classes] = await Promise.all([
    requireProfile("admin"),
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

        <Suspense fallback={<TableRowsSkeleton columns={6} rows={5} />}>
          <EnrollmentListContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
