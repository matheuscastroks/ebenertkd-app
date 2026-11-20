"use client";

import { useState } from "react";
import { registerAdultAction } from "@/app/actions/auth";
import { PasswordToggle } from "@/components/auth/login-card";
import { FormErrorMessage, ShakeOnError } from "@/components/shared/form-error";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const ACCOUNT_TYPES = [
  { value: "adult_student", label: "Para mim", hint: "Vou treinar e tenho 18 anos ou mais." },
  { value: "guardian", label: "Para meu filho ou filha", hint: "Sou responsável por um aluno menor de 18." }
] as const;

/** Cadastro de aluno adulto ou responsável. Menores recebem acesso pelo professor. */
export function RegisterCard({ errorMessage }: { errorMessage?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  // Guarda qual erro a pessoa já dispensou ao voltar a digitar; um erro novo aparece de novo.
  const [dismissedError, setDismissedError] = useState<string>();
  const invalid = Boolean(errorMessage) && dismissedError !== errorMessage;

  return (
    <div className="space-y-3.5">
      <form
        action={registerAdultAction}
        className="space-y-3"
        aria-describedby={invalid ? "register-error" : undefined}
        onInput={() => setDismissedError(errorMessage)}
      >
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Para quem é a conta?</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ACCOUNT_TYPES.map((option, index) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 rounded-xl border border-input bg-card px-3.5 py-3 text-left transition-[background-color,border-color,box-shadow] duration-(--duration-quick) ease-(--ease-smooth-out) hover:bg-muted/60 has-checked:border-primary-border has-checked:ring-1 has-checked:ring-primary-border has-focus-visible:ring-2 has-focus-visible:ring-ring motion-reduce:transition-none"
              >
                <input
                  type="radio"
                  name="account_type"
                  value={option.value}
                  defaultChecked={index === 0}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold leading-snug text-foreground">{option.label}</span>
                <span className="block text-xs leading-snug text-muted-foreground">{option.hint}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Você treina e seus filhos também? Escolha “Para mim” e adicione os filhos depois, pelo painel.
          </p>
        </fieldset>

        <ShakeOnError errorKey={errorMessage} className="space-y-3">
        <Field>
          <FieldLabel htmlFor="register-name">Nome completo</FieldLabel>
          <Input id="register-name" name="full_name" autoComplete="name" className="h-11" required />
        </Field>

        <Field>
          <FieldLabel htmlFor="register-email">E-mail</FieldLabel>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            className="h-11"
            required
          />
        </Field>

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="register-password">Senha de acesso</FieldLabel>
            <div className="relative">
              <Input
                id="register-password"
                name="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  const confirmation = event.target.form?.elements.namedItem("password_confirmation") as HTMLInputElement | null;
                  if (confirmation) confirmation.setCustomValidity(confirmation.value === event.target.value ? "" : "As senhas devem ser iguais.");
                }}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                aria-describedby="register-password-hint"
                className="h-11 pr-12"
                required
              />
              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />
            </div>
            <FieldDescription id="register-password-hint">Pelo menos 8 caracteres.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="register-confirm-password">Confirmar senha</FieldLabel>
            <Input
              id="register-confirm-password"
              name="password_confirmation"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
              className="h-11"
              onChange={(event) => event.target.setCustomValidity(event.target.value === password ? "" : "As senhas devem ser iguais.")}
            />
          </Field>
        </div>
        {invalid ? <FormErrorMessage id="register-error">{errorMessage}</FormErrorMessage> : null}
        </ShakeOnError>

        <FormSubmitButton className="h-11 w-full touch-manipulation" pendingLabel="Criando conta…">
          Criar conta
        </FormSubmitButton>
      </form>
    </div>
  );
}
