import { requestRecoveryAction } from "@/app/actions/auth";
import { AuthShell, AuthTextLink } from "@/components/auth/auth-shell";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function RecoveryPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Recuperar senha"
      description="Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha."
      footer={<AuthTextLink href="/" standalone>Voltar para entrar</AuthTextLink>}
    >
      {params.sent === "1" ? (
        <OperationToast
          tone="success"
          title="Instruções solicitadas"
          description="Se o e-mail estiver cadastrado, você receberá as instruções em instantes. Verifique também a pasta de spam."
          clearParams={["sent"]}
        />
      ) : null}

      <Card className="p-4 sm:p-5">
        <form action={requestRecoveryAction} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="recovery-email">E-mail</FieldLabel>
            <Input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              className="h-11"
              required
            />
          </Field>

          <FormSubmitButton className="h-11 w-full touch-manipulation" pendingLabel="Enviando…">
            Enviar link
          </FormSubmitButton>
        </form>
      </Card>

      <p className="text-sm text-muted-foreground">
        Aluno menor de idade? Peça uma nova senha ao professor.
      </p>
    </AuthShell>
  );
}
