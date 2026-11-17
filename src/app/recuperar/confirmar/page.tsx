import Link from "next/link";
import { confirmRecoveryAction } from "@/app/actions/auth";
import { AuthShell, AuthTextLink } from "@/components/auth/auth-shell";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function ConfirmRecoveryPage({
  searchParams
}: {
  searchParams: Promise<{ userId?: string; secret?: string; error?: string }>;
}) {
  const params = await searchParams;
  const isInvalid = params.error || !params.userId || !params.secret;
  const backLink = <AuthTextLink href="/" standalone>Voltar para entrar</AuthTextLink>;

  if (isInvalid) {
    return (
      <AuthShell
        title="Link expirado"
        description="Por segurança, o link de redefinição vale por pouco tempo e só pode ser usado uma vez. Peça um novo para continuar."
        footer={backLink}
      >
        <Button asChild className="h-11 w-full">
          <Link href="/recuperar">Pedir novo link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Criar nova senha" description="Depois de salvar, entre com a nova senha." footer={backLink}>
      <Card className="p-4 sm:p-5">
        <form action={confirmRecoveryAction} className="space-y-4">
          <input type="hidden" name="userId" value={params.userId} />
          <input type="hidden" name="secret" value={params.secret} />

          <Field>
            <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              aria-describedby="new-password-hint"
              className="h-11"
              required
            />
            <FieldDescription id="new-password-hint">Pelo menos 8 caracteres.</FieldDescription>
          </Field>

          <FormSubmitButton className="h-11 w-full touch-manipulation" pendingLabel="Salvando…">
            Salvar nova senha
          </FormSubmitButton>
        </form>
      </Card>
    </AuthShell>
  );
}
