import { promoteMinorAction } from "@/app/actions/auth";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listMinorProfiles, listStudentAccessProfiles } from "@/features/students/access-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentAccessPage({ searchParams }: { searchParams: Promise<{ promoted?: string; error?: string; q?: string; page?: string }> }) {
  const actor = await requireProfile("admin");
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const [minors, result] = await Promise.all([listMinorProfiles(), listStudentAccessProfiles(query.q, page)]);
  return <PortalShell profile={actor} activePath={ROUTES.adminStudentAccess} title="Acessos dos alunos" subtitle="Consulte as contas dos alunos e configure o acesso independente dos menores." breadcrumbs={[{ label: "Matrículas", href: ROUTES.adminEnrollments }, { label: "Acessos" }]}>
    {query.promoted ? <OperationToast tone="success" title="Acesso atualizado" description="O aluno receberá um e-mail para definir a senha." clearParams={["promoted"]} /> : null}
    {query.error ? <OperationToast tone="error" title="Não foi possível atualizar o acesso" description="Confira o aluno e o e-mail informado." clearParams={["error"]} /> : null}
    <form action={ROUTES.adminStudentAccess} className="flex items-end gap-3"><SearchField id="access-search" name="q" defaultValue={query.q} label="Buscar aluno" placeholder="Nome do aluno" /><Button type="submit">Buscar</Button></form>
    <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Tipo de acesso</TableHead><TableHead>Login</TableHead><TableHead>Situação</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>
      {result.rows.map((student) => <TableRow key={student.$id}><TableCell className="font-medium">{student.full_name}</TableCell><TableCell>{student.role === "minor_student" ? "Menor · usuário e senha" : "E-mail e senha"}</TableCell><TableCell>{student.role === "minor_student" ? student.username || "Não definido" : student.email}</TableCell><TableCell><Badge variant={student.status === "active" ? "secondary" : "outline"}>{student.status === "active" ? "Ativo" : student.status === "disabled" ? "Desativado" : "Convidado"}</Badge></TableCell><TableCell>{student.role === "minor_student" && student.status === "active" ? <Button asChild variant="outline" size="sm"><Link href="#independent-access">Configurar acesso próprio</Link></Button> : "—"}</TableCell></TableRow>)}
      {!result.rows.length ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum aluno encontrado.</TableCell></TableRow> : null}
    </TableBody></Table></div>
    <ListPagination basePath={ROUTES.adminStudentAccess} params={{ q: query.q }} page={page} total={result.total} pageSize={20} />
    <Card id="independent-access"><CardHeader><CardTitle className="text-base">Acesso independente</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm text-muted-foreground">Esta ação troca o e-mail de acesso, encerra as sessões atuais e envia um link para criar outra senha. Você pode manter o acesso de consulta do responsável.</p>
      {minors.length ? <form action={promoteMinorAction} className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="minor-profile">Aluno</FieldLabel><Select name="minor_profile_id" required><SelectTrigger id="minor-profile" className="w-full"><SelectValue placeholder="Selecionar aluno" /></SelectTrigger><SelectContent>{minors.map((minor) => <SelectItem key={minor.$id} value={minor.$id}>{minor.full_name}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel htmlFor="new-email">Novo e-mail do aluno</FieldLabel><Input id="new-email" name="email" type="email" required /></Field><label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="retain_guardian_access" /> Manter acesso de consulta do responsável</label><Button type="submit" className="sm:col-span-2 sm:justify-self-start">Atualizar acesso</Button></form> : <p className="text-sm text-muted-foreground">Nenhum aluno menor de idade com conta ativa.</p>}
    </CardContent></Card>
  </PortalShell>;
}
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchField } from "@/components/shared/search-field";
import { ListPagination } from "@/components/shared/list-pagination";
