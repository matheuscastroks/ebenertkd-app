"use client";

import { useState } from "react";
import { registerAdultAction } from "@/app/actions/auth";
import { PasswordToggle } from "@/components/auth/login-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const ACCOUNT_TYPES = [
  { value: "adult_student", label: "Aluno", hint: "Maior de idade" },
  { value: "guardian", label: "Responsável", hint: "De aluno menor" }
] as const;

/** Cadastro de aluno adulto ou responsável. Menores recebem acesso pelo professor. */
export function RegisterCard({ errorMessage }: { errorMessage?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Para alunos maiores de idade e responsáveis. O acesso de alunos menores é criado pelo professor.
      </p>

      {errorMessage ? (
        <Alert role="alert" variant="destructive" id="register-error">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <form action={registerAdultAction} className="space-y-4" aria-describedby={errorMessage ? "register-error" : undefined}>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Você é</legend>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((option, index) => (
              <label
                key={option.value}
                className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 transition-colors duration-150 hover:bg-muted has-checked:outline-2 has-checked:-outline-offset-1 has-checked:outline-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none dark:bg-input/20"
              >
                <input
                  type="radio"
                  name="account_type"
                  value={option.value}
                  defaultChecked={index === 0}
                  className="size-4 shrink-0 accent-foreground outline-none"
                />
                <span className="leading-tight">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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

        <FormSubmitButton className="h-11 w-full touch-manipulation" pendingLabel="Criando conta…">
          Criar conta
        </FormSubmitButton>
      </form>
    </div>
  );
}
