import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListPagination } from "@/components/shared/list-pagination";
import { OperationToast } from "@/components/shared/operation-toast";
import { SearchField } from "@/components/shared/search-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listStudentAccessProfiles } from "@/features/students/access-service";
import { StudentAccessTable } from "@/features/students/components/student-access-table";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";
import { KeyRound, ShieldAlert, User, Search } from "lucide-react";

export default async function StudentAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ promoted?: string; error?: string; q?: string; page?: string }>;
}) {
  const actor = await requireProfile("admin");
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const result = await listStudentAccessProfiles(query.q, page);

  return (
    <PortalShell
      profile={actor}
      activePath={ROUTES.adminStudentAccess}
      title="Acessos dos alunos"
      subtitle="Consulte contas de acesso, transição de maioridade e permissões individuais."
      breadcrumbs={[
        { label: "Matrículas", href: ROUTES.adminEnrollments },
        { label: "Acessos dos alunos" },
      ]}
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

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <form action={ROUTES.adminStudentAccess} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="w-full flex-1">
              <SearchField
                id="access-search"
                name="q"
                defaultValue={query.q}
                label="Buscar aluno"
                placeholder="Digite o nome ou e-mail do aluno..."
              />
            </div>
            <Button type="submit" className="h-11 font-medium w-full sm:w-auto px-5">
              <Search className="mr-2 size-4" />
              Buscar
            </Button>
          </form>
        </div>

        <StudentAccessTable
          profiles={toClientData(result.rows)}
          currentQuery={{ q: query.q, page: query.page }}
        />

        <ListPagination
          basePath={ROUTES.adminStudentAccess}
          params={{ q: query.q }}
          page={page}
          total={result.total}
          pageSize={20}
        />

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Como funciona o acesso de alunos menores</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p>
              Praticantes menores de idade acessam a plataforma com um nome de usuário e senha simples, gerenciados diretamente pelo responsável legal.
            </p>
            <p>
              Ao atingir a maturidade esportiva ou idade recomendada, a coordenação da academia pode utilizar o botão <strong>Configurar acesso próprio</strong> para atribuir um e-mail individual, encerrar as credenciais infantis e habilitar login autônomo com envio de convite.
            </p>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
