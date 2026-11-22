import { cache, Suspense } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { UserPlusIcon } from "@/components/ui/user-plus";
import { resetMinorPasswordAction, revokeMinorSessionsAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { InlineRowsSkeleton } from "@/components/skeletons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CreateMinorForm } from "@/features/families/components/create-minor-form";
import { dependentSummaryPath } from "@/features/families/paths";
import { listGuardianMinors } from "@/features/families/service";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

function CreateMinorDialog({ trigger, idPrefix }: { trigger: React.ReactNode; idPrefix: string }) {
  return <ResponsiveDialog trigger={trigger} title="Cadastrar dependente"
    description="Crie o usuário e a senha do aluno menor. Ele entra pelo celular ou tablet para ver aulas e faixa.">
    <CreateMinorForm idPrefix={idPrefix} />
  </ResponsiveDialog>;
}

const loadMinors = cache((guardian: Profile) => listGuardianMinors(guardian));

async function DependentsHeaderAction({ guardian }: { guardian: Profile }) {
  const minors = await loadMinors(guardian);
  if (minors.length === 0) return null;
  return (
    <CreateMinorDialog
      idPrefix="minor-modal"
      trigger={
        <Button className="min-h-11">
          <UserPlusIcon aria-hidden="true" />
          Adicionar dependente
        </Button>
      }
    />
  );
}

/**
 * Gerenciar dependentes: cadastrar e cuidar do acesso de cada filho.
 * O acompanhamento (frequência, exames, financeiro) fica no resumo de cada um.
 */
async function GuardianMinorsList({ guardian, openId }: { guardian: Profile; openId?: string }) {
  const minors = await loadMinors(guardian);
  const photoIds = await listProfilePhotoDocumentIds(minors.map((minor) => minor.$id)).catch(() => new Map<string, string>());

  if (minors.length === 0) {
    return <EmptyState illustration="empty-family" title="Nenhum dependente cadastrado"
      description="Cadastre seu filho para preencher a ficha de matrícula, assinar o contrato e acompanhar os treinos."
      action={<CreateMinorDialog idPrefix="minor-empty" trigger={<Button className="min-h-11"><UserPlusIcon aria-hidden="true" />Cadastrar dependente</Button>} />} />;
  }

  return <Card><CardContent>
    <ul className="divide-y divide-border">
      {minors.map((minor) => <li key={minor.$id} id={`dependente-${minor.$id}`} className="scroll-mt-24 py-4 first:pt-0 last:pb-0">
        <Collapsible defaultOpen={minor.$id === openId}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <StudentAvatar name={minor.full_name} photoDocumentId={photoIds.get(minor.$id)} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{minor.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">Usuário: {minor.username}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-11 flex-1 sm:flex-none">
                <Link href={dependentSummaryPath(minor.$id)} aria-label={`Ver resumo de ${minor.full_name}`}>Ver resumo</Link>
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" aria-label={`Acesso e senha de ${minor.full_name}`} className="group min-h-11 flex-1 sm:flex-none">
                  Acesso e senha
                  <ChevronDownIcon aria-hidden="true" className="size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-data-[state=open]:-scale-y-100 motion-reduce:transition-none" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent className="mt-4 space-y-4 border-t border-border pt-4">
            <form action={resetMinorPasswordAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="minor_profile_id" value={minor.$id} />
              <Field className="w-full flex-1">
                <FieldLabel htmlFor={`minor-new-password-${minor.$id}`}>Nova senha de {minor.full_name.split(" ")[0]}</FieldLabel>
                <Input id={`minor-new-password-${minor.$id}`} name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Mínimo de 8 caracteres" required className="h-11" />
              </Field>
              <FormSubmitButton variant="outline" className="h-11 w-full sm:w-auto" pendingLabel="Alterando…">Trocar senha</FormSubmitButton>
            </form>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="min-h-11 text-danger-text">Desconectar de todos os aparelhos</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar {minor.full_name} de todos os aparelhos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {minor.full_name.split(" ")[0]} precisará digitar o usuário e a senha de novo em todos os celulares e computadores.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <form action={revokeMinorSessionsAction}>
                  <input type="hidden" name="minor_profile_id" value={minor.$id} />
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                    <AlertDialogAction type="submit" variant="destructive">Desconectar</AlertDialogAction>
                  </AlertDialogFooter>
                </form>
              </AlertDialogContent>
            </AlertDialog>
          </CollapsibleContent>
        </Collapsible>
      </li>)}
    </ul>
  </CardContent></Card>;
}

export default async function DependentsPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; reset?: string; revoked?: string; acesso?: string }> }) {
  const [guardian, params] = await Promise.all([requireCapability("guardian"), searchParams]);

  return (
    <PortalShell
      profile={guardian} back={{ label: "Família", href: ROUTES.guardian }}
      title="Acessos dos dependentes"
      subtitle="Cadastre filhos e cuide do acesso de cada um ao aplicativo."
      headerActions={
        <Suspense fallback={null}>
          <DependentsHeaderAction guardian={guardian} />
        </Suspense>
      }
    >
      {params.created ? <OperationToast tone="success" title="Dependente cadastrado" description="O acesso já está ativo. Envie o usuário e a senha para o seu filho." clearParams={["created"]} /> : null}
      {params.reset ? <OperationToast tone="success" title="Senha atualizada" description="Os acessos abertos do seu filho foram encerrados. Envie a nova senha a ele." clearParams={["reset"]} /> : null}
      {params.revoked ? <OperationToast tone="success" title="Acessos encerrados" description="Seu filho precisará entrar de novo em todos os aparelhos." clearParams={["revoked"]} /> : null}
      {params.error ? <OperationToast tone="error" title="Não foi possível concluir" description="Revise os dados ou tente outro nome de usuário." clearParams={["error"]} /> : null}
      <Suspense fallback={<InlineRowsSkeleton rows={2} label="Carregando dependentes…" />}>
        <GuardianMinorsList guardian={guardian} openId={params.acesso} />
      </Suspense>
    </PortalShell>
  );
}
