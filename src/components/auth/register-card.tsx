import { UserPlus } from "lucide-react";
import { registerAdultAction } from "@/app/actions/auth";
import { FeedbackAlert } from "@/components/shared/feedback-alert";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RegisterCard({ errorMessage, success }: { errorMessage?: string; success?: boolean }) {
  return (
    <Card><CardContent className="space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full border p-2"><UserPlus className="h-4 w-4" /></div>
        <div><h2 className="text-lg font-semibold">Criar conta</h2><p className="text-sm text-muted-foreground">Cadastre-se como aluno adulto ou responsável.</p></div>
      </div>
      {success ? <FeedbackAlert tone="success" title="Conta criada" description="Entre com seu e-mail e senha." /> : null}
      {errorMessage ? <FeedbackAlert tone="danger" title="Não foi possível criar a conta" description={errorMessage} /> : null}
      {!success ? (
        <form action={registerAdultAction} className="space-y-4">
          <Field><FieldLabel htmlFor="register-name">Nome completo</FieldLabel><Input id="register-name" name="full_name" autoComplete="name" required /></Field>
          <Field><FieldLabel htmlFor="register-email">E-mail</FieldLabel><Input id="register-email" name="email" type="email" autoComplete="email" required /></Field>
          <Field><FieldLabel htmlFor="register-account-type">Tipo de conta</FieldLabel><Select name="account_type" defaultValue="adult_student"><SelectTrigger id="register-account-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="adult_student">Aluno adulto</SelectItem><SelectItem value="guardian">Responsável</SelectItem></SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="register-password">Senha</FieldLabel><Input id="register-password" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
          <FormSubmitButton className="w-full" pendingLabel="Criando conta…">Criar conta</FormSubmitButton>
        </form>
      ) : null}
    </CardContent></Card>
  );
}
