import { createMinorAction } from "@/app/actions/family";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Cria o acesso do aluno menor (nome, usuário e senha inicial). */
export function CreateMinorForm({ idPrefix }: { idPrefix: string }) {
  return <form action={createMinorAction} className="space-y-4 pt-2">
    <Field>
      <FieldLabel htmlFor={`${idPrefix}-name`}>Nome completo do aluno</FieldLabel>
      <Input id={`${idPrefix}-name`} name="full_name" autoComplete="name" placeholder="Ex.: Lucas da Silva" required className="h-11" />
    </Field>
    <Field>
      <FieldLabel htmlFor={`${idPrefix}-username`}>Nome de usuário</FieldLabel>
      <Input id={`${idPrefix}-username`} name="username" placeholder="ex.: lucas.silva" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} required className="h-11" />
      <FieldDescription>O aluno usa este nome para entrar no aplicativo.</FieldDescription>
    </Field>
    <Field>
      <FieldLabel htmlFor={`${idPrefix}-password`}>Senha inicial</FieldLabel>
      <Input id={`${idPrefix}-password`} name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Mínimo de 8 caracteres" required className="h-11" />
      <FieldDescription>Você pode trocar esta senha quando quiser.</FieldDescription>
    </Field>
    <FormSubmitButton className="h-11 w-full" pendingLabel="Criando acesso…">Criar acesso do dependente</FormSubmitButton>
  </form>;
}
