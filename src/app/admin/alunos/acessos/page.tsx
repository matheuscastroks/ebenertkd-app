import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListPagination } from "@/components/shared/list-pagination";
import { OperationToast } from "@/components/shared/operation-toast";
import { TableSearchBar } from "@/components/shared/table-search-bar";
import { TableRowsSkeleton } from "@/components/skeletons";
import { ChevronDown } from "@/components/ui/icons";
import { listStudentAccessProfiles } from "@/features/students/access-service";
import { StudentAccessTable } from "@/features/students/components/student-access-table";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

type SearchParamsType = Promise<{
  promoted?: string;
  error?: string;
  q?: string;
  page?: string;
}>;

async function StudentAccessListContent({ searchParams }: { searchParams: SearchParamsType }) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const result = await listStudentAccessProfiles(query.q, page);
  const photoIds = await listProfilePhotoDocumentIds(
    result.rows.map((row) => row.$id)
  ).catch(() => new Map<string, string>());

  return (
    <>
      <StudentAccessTable
        profiles={toClientData(result.rows)}
        photoIds={Object.fromEntries(photoIds)}
        currentQuery={{ q: query.q, page: query.page }}
      />

      <ListPagination
        basePath={ROUTES.adminStudentAccess}
        params={{ q: query.q }}
        page={page}
        total={result.total}
        pageSize={20}
      />
    </>
  );
}

export default async function StudentAccessPage({
  searchParams,
}: {
  searchParams: SearchParamsType;
}) {
  const [actor, query] = await Promise.all([requireProfile("admin"), searchParams]);

  return (
    <PortalShell
      profile={actor}
      title="Alunos"
      subtitle="Login de cada aluno e a passagem para o acesso próprio."
    >
      <div className="w-full min-w-0 space-y-6">
        {query.promoted ? (
          <OperationToast
            tone="success"
            title="Acesso próprio configurado com sucesso"
            description="O aluno receberá um e-mail para cadastrar sua nova senha individual."
            clearParams={["promoted"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível atualizar o acesso"
            description="Confira se o e-mail informado é válido e tente novamente."
            clearParams={["error"]}
          />
        ) : null}

        <TableSearchBar
          id="access-search"
          label="Buscar aluno"
          placeholder="Nome ou e-mail do aluno"
          ariaLabel="Buscar acessos de alunos"
        />

        <Suspense
          key={`${query.q ?? ""}|${query.page ?? ""}`}
          fallback={<TableRowsSkeleton columns={5} rows={5} />}
        >
          <StudentAccessListContent searchParams={searchParams} />
        </Suspense>

        <details className="group rounded-xl bg-card p-4 text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
            Como funciona o acesso de alunos menores
            <ChevronDown
              className="size-4 text-muted-foreground transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-open:-scale-y-100 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <div className="space-y-2 pt-2 text-muted-foreground">
            <p>
              Alunos menores entram com nome de usuário e senha simples, gerenciados pelo
              responsável legal.
            </p>
            <p>
              Quando o aluno puder ter login próprio, use{" "}
              <strong className="font-medium text-foreground">Configurar acesso próprio</strong>{" "}
              para atribuir um e-mail individual. As credenciais infantis são encerradas e o aluno
              recebe um convite por e-mail.
            </p>
          </div>
        </details>
      </div>
    </PortalShell>
  );
}
