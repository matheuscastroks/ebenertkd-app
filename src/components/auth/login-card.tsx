import { LockKeyhole, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { loginAdultAction, loginMinorAction } from "@/app/actions/auth";
import { FeedbackAlert } from "@/components/shared/feedback-alert";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginCard({
  type,
  errorMessage
}: {
  type: "adult" | "minor";
  errorMessage?: string;
}) {
  const isMinor = type === "minor";
  const action = isMinor ? loginMinorAction : loginAdultAction;

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full border p-2">
              {isMinor ? <UserRound className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isMinor ? "Acesso do aluno menor" : "Acesso de adultos"}
              </h2>
            </div>
          </div>
        </div>

        {errorMessage ? <FeedbackAlert tone="danger" title="Não foi possível entrar" description={errorMessage} /> : null}

        <form action={action} className="space-y-4">
          {isMinor ? (
            <Field><FieldLabel htmlFor="login-username">Nome de usuário</FieldLabel><Input id="login-username" name="username" autoComplete="username" placeholder="ex.: joao.silva" required /></Field>
          ) : (
            <Field><FieldLabel htmlFor="login-email">E-mail</FieldLabel><Input id="login-email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required /></Field>
          )}

          <Field>
            <FieldLabel htmlFor={`login-password-${type}`}>Senha</FieldLabel>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id={`login-password-${type}`} name="password" type="password" autoComplete="current-password" className="pl-9" placeholder="Sua senha" required />
            </div>
          </Field>

          <FormSubmitButton className="w-full" pendingLabel="Entrando…">Entrar</FormSubmitButton>
          {!isMinor ? <Link href="/recuperar" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">Esqueci minha senha</Link> : null}
        </form>
      </CardContent>
    </Card>
  );
}
