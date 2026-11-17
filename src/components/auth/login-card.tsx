"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginAdultAction, loginMinorAction } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [showPassword, setShowPassword] = useState(false);
  const isMinor = type === "minor";
  const action = isMinor ? loginMinorAction : loginAdultAction;

  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="space-y-0.5">
            <h2 className="font-semibold text-base sm:text-lg">
              {isMinor ? "Acesso do aluno menor" : "Acesso de adultos"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isMinor
                ? "Entre com seu usuário e senha fornecidos pelo professor."
                : "Professores, alunos maiores e responsáveis."}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <Alert variant="destructive" role="alert" id={`login-error-${type}`}>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <form action={action} className="space-y-4">
          {isMinor ? (
            <Field>
              <FieldLabel htmlFor="login-username">Nome de usuário</FieldLabel>
              <div className="relative">

                <Input
                  id="login-username"
                  name="username"
                  autoComplete="username"
                  placeholder="ex.: joao.silva"
                  className="h-11 text-sm"
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={errorMessage ? `login-error-${type}` : undefined}
                  required
                />
              </div>
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
              <div className="relative">

                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  className="h-11 text-sm"
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={errorMessage ? `login-error-${type}` : undefined}
                  required
                />
              </div>
            </Field>
          )}

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor={`login-password-${type}`}>Senha</FieldLabel>
              {!isMinor ? (
                <Link
                  href="/recuperar"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
                className="h-11 pr-12 text-sm"
                placeholder="Sua senha"
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? `login-error-${type}` : undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </Field>

          <FormSubmitButton className="h-11 w-full text-sm font-semibold touch-manipulation" pendingLabel="Entrando…">
            Entrar
          </FormSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
