import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ListPagination } from "@/components/shared/list-pagination";
import { OperationToast } from "@/components/shared/operation-toast";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { listTrainingClasses } from "@/features/classes/service";
import { EnrollmentFilters } from "@/features/students/components/enrollment-filters";
import { EnrollmentTable } from "@/features/students/components/enrollment-table";
import { listEnrollmentsForReview } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";
import { InlineTableSkeleton } from "@/components/skeletons";

type SearchParamsType = Promise<{
  q?: string;
  status?: string;
  rank?: string;
  turma?: string;
  page?: string;
  deleted?: string;
  error?: string;
}>;

async function EnrollmentListContent({ searchParams }: { searchParams: SearchParamsType }) {
  const filters = await searchParams;
  const status = filters.status === "all" ? undefined : filters.status;
  const rank = filters.rank === "all" ? undefined : filters.rank;
  const trainingClass = filters.turma === "all" ? undefined : filters.turma;
  const page = /^\d+$/.test(filters.page ?? "") ? Math.max(1, Number(filters.page)) : 1;

  const result = await listEnrollmentsForReview({
    search: filters.q,
    status,
    rank,
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
        params={{ q: filters.q, status: filters.status, rank: filters.rank, turma: filters.turma }}
        page={result.page}
        total={result.total}
        pageSize={result.pageSize}
      />
    </>
  );
}

async function EnrollmentFiltersLoader() {
  const classes = await listTrainingClasses(true);
  return <EnrollmentFilters classes={toClientData(classes)} />;
}

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: SearchParamsType;
}) {
  const [admin, query] = await Promise.all([
    requireProfile("admin"),
    searchParams,
  ]);

  return (
    <PortalShell
      profile={admin}
      title="Alunos"
      subtitle="Fichas para analisar, documentos e condições de cada aluno."
    >
      <div className="w-full min-w-0 space-y-6">
        {query.deleted === "1" ? <OperationToast tone="success" title="Aluno excluído" clearParams={["deleted"]} /> : null}
        {query.error === "delete_student" ? (
          <OperationToast tone="error" title="Não foi possível excluir o aluno" description="Tente de novo. Se continuar, confira o Sistema." clearParams={["error"]} />
        ) : null}
        <Suspense fallback={<EnrollmentFilters classes={[]} />}>
          <EnrollmentFiltersLoader />
        </Suspense>

        <Suspense
          key={`${query.q ?? ""}|${query.status ?? ""}|${query.rank ?? ""}|${query.turma ?? ""}|${query.page ?? ""}`}
          fallback={
            <InlineTableSkeleton
              headers={["Aluno", "Graduação", "Turma", "Vencimento", "Status e pendência", "Ações"]}
              rows={5}
              label="Carregando matrículas…"
            />
          }
        >
          <EnrollmentListContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
