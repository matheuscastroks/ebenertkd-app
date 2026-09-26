"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail, Shield, UserRound } from "lucide-react";
import { loginAdultAction, loginMinorAction } from "@/app/actions/auth";
import { OperationToast } from "@/components/shared/operation-toast";
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
          <div className="rounded-xl border bg-muted/40 p-2.5 shrink-0 text-foreground">
            {isMinor ? <UserRound className="size-5" /> : <Shield className="size-5" />}
          </div>
          <div className="space-y-0.5">
            <h2 className="font-semibold text-base sm:text-lg">
              {isMinor ? "Acesso do aluno menor" : "Acesso de adultos"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isMinor
                ? "Entre com seu usuário e senha fornecidos pelo professor."
                : "Professores, alunos maiores e responsáveis."}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <OperationToast
            tone="error"
            title="Não foi possível entrar"
            description={errorMessage}
            clearParams={["error", "context", "message"]}
          />
        ) : null}

        <form action={action} className="space-y-4">
          {isMinor ? (
            <Field>
              <FieldLabel htmlFor="login-username">Nome de usuário</FieldLabel>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="login-username"
                  name="username"
                  autoComplete="username"
                  placeholder="ex.: joao.silva"
                  className="h-11 pl-9 text-sm"
                  required
                />
              </div>
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  className="h-11 pl-9 text-sm"
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
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Esqueci minha senha
                </Link>
              ) : null}
            </div>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id={`login-password-${type}`}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-11 pl-9 pr-10 text-sm"
                placeholder="Sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
