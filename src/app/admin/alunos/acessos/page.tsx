import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListPagination } from "@/components/shared/list-pagination";
import { OperationToast } from "@/components/shared/operation-toast";
import { SearchField } from "@/components/shared/search-field";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listStudentAccessProfiles } from "@/features/students/access-service";
import { PromoteMinorDialog } from "@/features/students/components/promote-minor-dialog";
import { requireProfile } from "@/lib/auth/session";
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

        <ResponsiveDataView
          desktop={
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Aluno</TableHead>
                    <TableHead>Tipo de acesso</TableHead>
                    <TableHead>Login / E-mail</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((student) => (
                    <TableRow key={student.$id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-semibold text-sm text-foreground">
                        {student.full_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {student.role === "minor_student" ? "Menor · usuário e senha" : "E-mail e senha"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {student.role === "minor_student"
                          ? student.username || "Não definido"
                          : student.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.status === "active" ? "secondary" : "outline"}>
                          {student.status === "active"
                            ? "Ativo"
                            : student.status === "disabled"
                              ? "Desativado"
                              : "Convidado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {student.role === "minor_student" && student.status === "active" ? (
                          <PromoteMinorDialog
                            minorProfileId={student.$id}
                            studentName={student.full_name}
                            currentQuery={{ q: query.q, page: query.page }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!result.rows.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        Nenhum aluno encontrado com os termos de busca.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          }
          mobile={
            <div className="space-y-3">
              {result.rows.length ? (
                result.rows.map((student) => (
                  <Card key={student.$id} className="border-border/80 shadow-xs">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground text-sm">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.role === "minor_student" ? "Acesso menor" : "Acesso próprio"} ·{" "}
                            <span className="font-mono text-foreground">
                              {student.role === "minor_student"
                                ? student.username || "Sem usuário"
                                : student.email}
                            </span>
                          </p>
                        </div>
                        <Badge variant={student.status === "active" ? "secondary" : "outline"}>
                          {student.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      {student.role === "minor_student" && student.status === "active" && (
                        <div className="pt-2 border-t border-border/40">
                          <PromoteMinorDialog
                            minorProfileId={student.$id}
                            studentName={student.full_name}
                            currentQuery={{ q: query.q, page: query.page }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-border/80">
                  <CardContent className="p-8 text-center text-xs text-muted-foreground">
                    Nenhum aluno encontrado.
                  </CardContent>
                </Card>
              )}
            </div>
          }
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
