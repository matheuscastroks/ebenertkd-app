import Link from "next/link";
import { createMinorAction, resetMinorPasswordAction, revokeMinorSessionsAction } from "@/app/actions/family";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { listGuardianMinors } from "@/features/families/service";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import { listProfilePhotoDocumentIds } from "@/features/students/service";
import { requireCapability } from "@/lib/auth/session";
import {
  guardianAttendancePath,
  guardianBillingPath,
  guardianContractsPath,
  guardianEnrollmentPath,
  ROUTES
} from "@/lib/navigation/routes";

export default async function DependentsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const guardian = await requireCapability("guardian");
  const [minors, params] = await Promise.all([listGuardianMinors(guardian), searchParams]);
  const photoIds = await listProfilePhotoDocumentIds(minors.map((minor) => minor.$id));

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardianDependents}
      title="Gerenciar dependentes"
      subtitle="Crie o acesso do menor e administre as contas vinculadas à sua família."
      breadcrumbs={[{ label: "Dependentes" }]}
    >
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar dependente</CardTitle>
          </CardHeader>
          <CardContent>
            {params.created === "1" ? (
              <OperationToast
                tone="success"
                title="Acesso do menor criado"
                description="O aluno já pode entrar no aplicativo com seu usuário e senha."
                clearParams={["created"]}
              />
            ) : null}
            {params.error ? (
              <OperationToast
                tone="error"
                title="Não foi possível concluir"
                description="Revise os dados e tente outro nome de usuário."
                clearParams={["error"]}
              />
            ) : null}
            <form action={createMinorAction} className="space-y-4">
              <Field>
                <FieldLabel htmlFor="minor-name">Nome completo</FieldLabel>
                <Input id="minor-name" name="full_name" autoComplete="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="minor-username">Nome de usuário</FieldLabel>
                <Input
                  id="minor-username"
                  name="username"
                  placeholder="ex.: maria.silva"
                  autoComplete="username"
                  minLength={3}
                  required
                />
                <FieldDescription>
                  Será usado pelo aluno para entrar sem precisar de e-mail.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="minor-password">Senha inicial</FieldLabel>
                <Input
                  id="minor-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
              <FormSubmitButton pendingLabel="Criando acesso…">
                Criar acesso
              </FormSubmitButton>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-base font-semibold">Dependentes cadastrados ({minors.length})</h2>
          {minors.length === 0 ? (
            <EmptyState
              title="Nenhum dependente cadastrado"
              description="Cadastre seu primeiro dependente no formulário ao lado para liberar a matrícula e acompanhamento dos treinos."
            />
          ) : (
            minors.map((minor) => (
              <Card key={minor.$id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <StudentAvatar
                      name={minor.full_name}
                      photoDocumentId={photoIds.get(minor.$id)}
                    />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{minor.full_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Usuário: <strong className="text-foreground">{minor.username}</strong>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={guardianEnrollmentPath(minor.$id)}>Ficha de matrícula</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={guardianAttendancePath(minor.$id)}>Frequência</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={guardianContractsPath(minor.$id)}>Contratos</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={guardianBillingPath(minor.$id)}>Financeiro</Link>
                    </Button>
                  </div>
                  <form action={resetMinorPasswordAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input type="hidden" name="minor_profile_id" value={minor.$id} />
                    <Field className="flex-1">
                      <FieldLabel htmlFor={`minor-new-password-${minor.$id}`}>Nova senha</FieldLabel>
                      <Input
                        id={`minor-new-password-${minor.$id}`}
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                    </Field>
                    <FormSubmitButton variant="outline" pendingLabel="Alterando…">
                      Trocar senha
                    </FormSubmitButton>
                  </form>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        Desconectar em todos os aparelhos
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desconectar {minor.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O aluno precisará informar novamente o usuário e a senha em todos os aparelhos conectados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <form action={revokeMinorSessionsAction}>
                        <input type="hidden" name="minor_profile_id" value={minor.$id} />
                        <AlertDialogFooter>
                          <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                          <AlertDialogAction type="submit" variant="destructive">
                            Desconectar sessões
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </form>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </PortalShell>
  );
}
