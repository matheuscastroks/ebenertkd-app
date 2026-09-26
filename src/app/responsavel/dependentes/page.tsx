import { Suspense } from "react";
import Link from "next/link";
import {
  createMinorAction,
  resetMinorPasswordAction,
  revokeMinorSessionsAction,
} from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { ListItemsSkeleton } from "@/components/skeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { listGuardianMinors } from "@/features/families/service";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import {
  guardianAttendancePath,
  guardianBillingPath,
  guardianContractsPath,
  guardianEnrollmentPath,
  ROUTES,
} from "@/lib/navigation/routes";
import {
  CalendarCheck2,
  ChevronDown,
  CreditCard,
  FileCheck2,
  FileText,
  KeyRound,
  LogOut,
  UserPlus,
} from "lucide-react";

async function GuardianMinorsList({ guardian }: { guardian: Profile }) {
  const minors = await listGuardianMinors(guardian);
  const photoIds = await listProfilePhotoDocumentIds(minors.map((minor) => minor.$id));

  if (minors.length === 0) {
    return (
      <EmptyState
        title="Nenhum dependente cadastrado ainda"
        description="Cadastre seu primeiro dependente para preencher a ficha de matrícula, assinar o contrato e acompanhar os treinos no tatame."
        action={
          <ResponsiveDialog
            trigger={
              <Button className="h-11 font-medium">
                <UserPlus className="mr-2 size-4" />
                Cadastrar primeiro dependente
              </Button>
            }
            title="Cadastrar novo dependente"
            description="Crie o usuário e senha do aluno menor para iniciar a matrícula."
          >
            <form action={createMinorAction} className="space-y-4 pt-2">
              <Field>
                <FieldLabel htmlFor="minor-name-empty" className="text-xs sm:text-sm font-semibold">
                  Nome completo do aluno
                </FieldLabel>
                <Input
                  id="minor-name-empty"
                  name="full_name"
                  autoComplete="name"
                  placeholder="Ex.: Lucas da Silva"
                  required
                  className="h-11"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="minor-username-empty" className="text-xs sm:text-sm font-semibold">
                  Nome de usuário (login)
                </FieldLabel>
                <Input
                  id="minor-username-empty"
                  name="username"
                  placeholder="ex.: lucas.silva"
                  autoComplete="username"
                  minLength={3}
                  required
                  className="h-11 font-mono"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="minor-password-empty" className="text-xs sm:text-sm font-semibold">
                  Senha inicial
                </FieldLabel>
                <Input
                  id="minor-password-empty"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="h-11"
                />
              </Field>
              <div className="pt-2">
                <FormSubmitButton className="h-11 w-full font-medium" pendingLabel="Criando acesso…">
                  Criar dependente
                </FormSubmitButton>
              </div>
            </form>
          </ResponsiveDialog>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {minors.map((minor) => (
        <Card
          key={minor.$id}
          className="border-border/80 shadow-sm transition-all hover:border-border"
        >
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <StudentAvatar
                  name={minor.full_name}
                  photoDocumentId={photoIds.get(minor.$id)}
                />
                <div className="min-w-0">
                  <CardTitle className="text-base font-bold truncate">
                    {minor.full_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Login no aplicativo:{" "}
                    <strong className="text-foreground font-mono">{minor.username}</strong>
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Atalhos Operacionais do Dependente */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <Button asChild variant="outline" className="h-11 font-medium text-xs sm:text-sm">
                <Link href={guardianEnrollmentPath(minor.$id)}>
                  <FileText className="mr-1.5 size-4 text-primary shrink-0" />
                  Ficha de matrícula
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-11 font-medium text-xs sm:text-sm">
                <Link href={guardianAttendancePath(minor.$id)}>
                  <CalendarCheck2 className="mr-1.5 size-4 text-primary shrink-0" />
                  Frequência
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-11 font-medium text-xs sm:text-sm">
                <Link href={guardianContractsPath(minor.$id)}>
                  <FileCheck2 className="mr-1.5 size-4 text-primary shrink-0" />
                  Contratos
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-11 font-medium text-xs sm:text-sm">
                <Link href={guardianBillingPath(minor.$id)}>
                  <CreditCard className="mr-1.5 size-4 text-primary shrink-0" />
                  Financeiro / PIX
                </Link>
              </Button>
            </div>

            {/* Gestão de Credenciais e Segurança */}
            <Collapsible>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">
                      Segurança e credenciais de acesso
                    </span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                      Alterar senha
                      <ChevronDown className="ml-1 size-3.5" />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="pt-3 border-t border-border/40 mt-3 space-y-3">
                  <form
                    action={resetMinorPasswordAction}
                    className="flex flex-col sm:flex-row gap-2.5 items-end"
                  >
                    <input type="hidden" name="minor_profile_id" value={minor.$id} />
                    <Field className="flex-1 w-full">
                      <FieldLabel
                        htmlFor={`minor-new-password-${minor.$id}`}
                        className="text-xs font-semibold"
                      >
                        Nova senha para o aluno
                      </FieldLabel>
                      <Input
                        id={`minor-new-password-${minor.$id}`}
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        placeholder="Digite a nova senha (mínimo 8 dígitos)"
                        required
                        className="h-10 text-xs sm:text-sm"
                      />
                    </Field>
                    <FormSubmitButton
                      variant="outline"
                      className="h-10 font-medium w-full sm:w-auto"
                      pendingLabel="Alterando…"
                    >
                      Atualizar senha
                    </FormSubmitButton>
                  </form>

                  <div className="flex justify-end pt-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <LogOut className="mr-1.5 size-3.5" />
                          Desconectar em todos os aparelhos
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Desconectar sessões de {minor.full_name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            O aluno precisará informar o usuário e a senha novamente para entrar em todos os celulares e computadores conectados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <form action={revokeMinorSessionsAction}>
                          <input type="hidden" name="minor_profile_id" value={minor.$id} />
                          <AlertDialogFooter>
                            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                            <AlertDialogAction type="submit" variant="destructive">
                              Confirmar desconexão
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </form>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function DependentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const [guardian, params] = await Promise.all([
    requireCapability("guardian"),
    searchParams,
  ]);

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardianDependents}
      title="Meus dependentes"
      subtitle="Acompanhe o desenvolvimento marcial, contratos, frequência e finanças dos seus filhos."
      breadcrumbs={[{ label: "Dependentes" }]}
      headerActions={
        <ResponsiveDialog
          trigger={
            <Button className="h-10 font-medium">
              <UserPlus className="mr-2 size-4" />
              Adicionar dependente
            </Button>
          }
          title="Cadastrar novo dependente"
          description="Crie o usuário e senha do aluno menor. Ele poderá acessar o aplicativo pelo celular ou tablet para ver suas aulas e faixas."
        >
          <form action={createMinorAction} className="space-y-4 pt-2">
            <Field>
              <FieldLabel htmlFor="minor-name-modal" className="text-xs sm:text-sm font-semibold">
                Nome completo do aluno
              </FieldLabel>
              <Input
                id="minor-name-modal"
                name="full_name"
                autoComplete="name"
                placeholder="Ex.: Lucas da Silva Ebener"
                required
                className="h-11"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="minor-username-modal" className="text-xs sm:text-sm font-semibold">
                Nome de usuário (login)
              </FieldLabel>
              <Input
                id="minor-username-modal"
                name="username"
                placeholder="ex.: lucas.ebener"
                autoComplete="username"
                minLength={3}
                required
                className="h-11 font-mono"
              />
              <FieldDescription className="text-xs">
                Utilizado pelo aluno para fazer login no celular ou computador.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="minor-password-modal" className="text-xs sm:text-sm font-semibold">
                Senha inicial
              </FieldLabel>
              <Input
                id="minor-password-modal"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                required
                className="h-11"
              />
              <FieldDescription className="text-xs">
                Você poderá redefinir esta senha a qualquer momento nesta tela.
              </FieldDescription>
            </Field>

            <div className="pt-2">
              <FormSubmitButton className="h-11 w-full font-medium" pendingLabel="Criando acesso…">
                Criar acesso do dependente
              </FormSubmitButton>
            </div>
          </form>
        </ResponsiveDialog>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        {params.created ? (
          <OperationToast
            tone="success"
            title="Dependente cadastrado com sucesso"
            description="O perfil foi criado e as credenciais de acesso já estão ativas."
            clearParams={["created"]}
          />
        ) : null}
        {params.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível concluir o cadastro"
            description="Revise os dados informados ou tente um nome de usuário diferente."
            clearParams={["error"]}
          />
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Dependentes cadastrados
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Selecione as ações de cada praticante para gerenciar matrículas, frequência e pagamentos.
            </p>
          </div>

          <Suspense fallback={<ListItemsSkeleton count={2} />}>
            <GuardianMinorsList guardian={guardian} />
          </Suspense>
        </section>
      </div>
    </PortalShell>
  );
}
