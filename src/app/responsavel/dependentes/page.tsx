import Link from "next/link";
import { createMinorAction, resetMinorPasswordAction, revokeMinorSessionsAction } from "@/app/actions/family";
import { PhaseOnePanel } from "@/components/dashboard/phase-one-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { listGuardianMinors } from "@/features/families/service";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { requireCapability } from "@/lib/auth/session";
import { guardianAttendancePath, guardianBillingPath, guardianContractsPath, guardianEnrollmentPath, ROUTES } from "@/lib/navigation/routes";

export default async function DependentsPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const guardian = await requireCapability("guardian");
  const [minors, params] = await Promise.all([listGuardianMinors(guardian), searchParams]);
  const photoIds = await listProfilePhotoDocumentIds(minors.map((minor) => minor.$id));
  return (
    <PhaseOnePanel profile={guardian} activePath={ROUTES.guardianDependents} title="Meus dependentes" description="Crie o acesso do menor e administre somente as contas vinculadas a você." items={[
      { title: "Dependentes", description: `${minors.length} aluno(s) vinculado(s) à sua conta.` },
      { title: "Acesso do menor", description: "O menor entra com nome de usuário e senha, sem usar e-mail." },
      { title: "Privacidade", description: "Financeiro e dados de outros dependentes não aparecem no acesso do menor." }
    ]}>
      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card><CardHeader><CardTitle className="text-base">Adicionar dependente</CardTitle></CardHeader><CardContent>
          {params.created === "1" ? <OperationToast tone="success" title="Acesso do menor criado" clearParams={["created"]} /> : null}{params.error ? <OperationToast tone="error" title="Não foi possível concluir" description="Revise os dados e tente outro nome de usuário." clearParams={["error"]} /> : null}
          <form action={createMinorAction} className="space-y-4">
            <Field><FieldLabel htmlFor="minor-name">Nome completo</FieldLabel><Input id="minor-name" name="full_name" autoComplete="name" required /></Field>
            <Field><FieldLabel htmlFor="minor-username">Nome de usuário</FieldLabel><Input id="minor-username" name="username" placeholder="ex.: maria.silva" autoComplete="username" minLength={3} required /><FieldDescription>Será usado pelo aluno para entrar sem e-mail.</FieldDescription></Field>
            <Field><FieldLabel htmlFor="minor-password">Senha inicial</FieldLabel><Input id="minor-password" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
            <FormSubmitButton pendingLabel="Criando acesso…">Criar acesso</FormSubmitButton>
          </form>
        </CardContent></Card>
        <div className="space-y-4">
          {minors.length === 0 ? <EmptyState title="Nenhum dependente cadastrado" description="Crie o acesso do primeiro aluno menor usando o formulário ao lado." /> : minors.map((minor) => (
            <Card key={minor.$id}><CardHeader><div className="flex items-center gap-3"><StudentAvatar name={minor.full_name} photoDocumentId={photoIds.get(minor.$id)} /><div><CardTitle className="text-base">{minor.full_name}</CardTitle><p className="text-xs text-muted-foreground">Aluno menor</p></div></div></CardHeader><CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Usuário: <strong className="text-foreground">{minor.username}</strong></p>
              <div className="flex flex-wrap gap-2"><Button asChild><Link href={guardianEnrollmentPath(minor.$id)}>Abrir ficha de matrícula</Link></Button><Button asChild variant="outline"><Link href={guardianAttendancePath(minor.$id)}>Frequência</Link></Button><Button asChild variant="outline"><Link href={guardianContractsPath(minor.$id)}>Contratos</Link></Button><Button asChild variant="outline"><Link href={guardianBillingPath(minor.$id)}>Financeiro</Link></Button></div>
              <form action={resetMinorPasswordAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <input type="hidden" name="minor_profile_id" value={minor.$id} />
                <Field><FieldLabel htmlFor={`minor-new-password-${minor.$id}`}>Nova senha</FieldLabel><Input id={`minor-new-password-${minor.$id}`} name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
                <FormSubmitButton variant="outline" pendingLabel="Alterando…">Trocar senha</FormSubmitButton>
              </form>
              <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost">Desconectar em todos os aparelhos</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Desconectar {minor.full_name}?</AlertDialogTitle><AlertDialogDescription>O aluno precisará informar novamente o usuário e a senha em todos os aparelhos.</AlertDialogDescription></AlertDialogHeader><form action={revokeMinorSessionsAction}><input type="hidden" name="minor_profile_id" value={minor.$id} /><AlertDialogFooter><AlertDialogCancel type="button">Cancelar</AlertDialogCancel><AlertDialogAction type="submit" variant="destructive">Desconectar sessões</AlertDialogAction></AlertDialogFooter></form></AlertDialogContent></AlertDialog>
            </CardContent></Card>
          ))}
        </div>
      </section>
    </PhaseOnePanel>
  );
}
