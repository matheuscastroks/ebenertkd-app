"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeIcon } from "@/components/ui/eye";
import { EyeOffIcon } from "@/components/ui/eye-off";
import { loginAdultAction, loginMinorAction } from "@/app/actions/auth";
import { FormErrorMessage, ShakeOnError } from "@/components/shared/form-error";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      aria-label={visible ? "Ocultar senha" : "Ver senha"}
      aria-pressed={visible}
    >
      <span className="t-icon-swap" data-state={visible ? "b" : "a"} aria-hidden="true">
        <EyeIcon className="t-icon size-4" data-icon="a" />
        <EyeOffIcon className="t-icon size-4" data-icon="b" />
      </span>
    </button>
  );
}

/** Formulário de entrada. O adulto entra com e-mail; o aluno menor, com usuário criado pelo professor. */
export function LoginCard({
  type,
  errorMessage
}: {
  type: "adult" | "minor";
  errorMessage?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isMinor = type === "minor";
  const action = isMinor ? loginMinorAction : loginAdultAction;
  const errorId = `login-error-${type}`;
  // Guarda qual erro a pessoa já dispensou ao voltar a digitar; um erro novo aparece de novo.
  const [dismissedError, setDismissedError] = useState<string>();
  const invalid = Boolean(errorMessage) && dismissedError !== errorMessage;
  const describedBy = invalid ? errorId : undefined;

  return (
    <div className="space-y-3.5">
      {isMinor ? (
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Acesso do aluno menor</h2>
          <p className="text-sm text-muted-foreground">Entre com o nome de usuário criado pelo seu responsável ou professor.</p>
        </div>
      ) : null}

      <form action={action} className="space-y-3" onInput={() => setDismissedError(errorMessage)}>
        <ShakeOnError errorKey={errorMessage} className="space-y-3">
        {isMinor ? (
          <Field>
            <FieldLabel htmlFor="login-username">Nome de usuário</FieldLabel>
            <Input
              id="login-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ex.: joao.silva"
              className="h-11"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              required
            />
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              className="h-11"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              required
            />
          </Field>
        )}

        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor={`login-password-${type}`}>Senha</FieldLabel>
            {!isMinor ? (
              <Link
                href="/recuperar"
                className="-my-3 inline-flex min-h-11 items-center rounded-lg text-sm text-muted-foreground underline-offset-4 transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) hover:text-foreground hover:underline! focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                Esqueci minha senha
              </Link>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id={`login-password-${type}`}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="h-11 pr-12"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              required
            />
            <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />
          </div>
          {invalid ? <FormErrorMessage id={errorId}>{errorMessage}</FormErrorMessage> : null}
          {isMinor ? <FieldDescription>Esqueceu a senha? Peça uma nova ao professor.</FieldDescription> : null}
        </Field>
        </ShakeOnError>

        <FormSubmitButton className="h-11 w-full touch-manipulation" pendingLabel="Entrando…">
          Entrar
        </FormSubmitButton>
      </form>
    </div>
  );
}
