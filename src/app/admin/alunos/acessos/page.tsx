import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListPagination } from "@/components/shared/list-pagination";
import { OperationToast } from "@/components/shared/operation-toast";
import { SearchField } from "@/components/shared/search-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listStudentAccessProfiles } from "@/features/students/access-service";
import { PromoteMinorDialog } from "@/features/students/components/promote-minor-dialog";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentAccessPage({
  searchParams
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
      subtitle="Consulte as contas dos alunos e configure o acesso independente dos menores."
      breadcrumbs={[{ label: "Matrículas", href: ROUTES.adminEnrollments }, { label: "Acessos" }]}
    >
      {query.promoted ? (
        <OperationToast
          tone="success"
          title="Acesso atualizado"
          description="O aluno receberá um e-mail para definir sua nova senha."
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

      <form action={ROUTES.adminStudentAccess} className="flex items-end gap-3">
        <SearchField
          id="access-search"
          name="q"
          defaultValue={query.q}
          label="Buscar aluno"
          placeholder="Nome do aluno"
        />
        <Button type="submit">Buscar</Button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Tipo de acesso</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((student) => (
              <TableRow key={student.$id}>
                <TableCell className="font-medium">{student.full_name}</TableCell>
                <TableCell>
                  {student.role === "minor_student" ? "Menor · usuário e senha" : "E-mail e senha"}
                </TableCell>
                <TableCell>
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
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!result.rows.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        basePath={ROUTES.adminStudentAccess}
        params={{ q: query.q }}
        page={page}
        total={result.total}
        pageSize={20}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona o acesso de menores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Alunos menores de idade entram inicialmente com nome de usuário e senha, gerenciados pelo
            responsável legal.
          </p>
          <p>
            Ao atingir a maturidade ou necessidade de acesso próprio, use a ação{" "}
            <strong>Configurar acesso próprio</strong> na linha do aluno para cadastrar seu e-mail
            individual, encerrar as sessões anteriores e permitir que ele defina sua própria senha.
          </p>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
