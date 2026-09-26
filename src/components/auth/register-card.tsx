"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, User, UserPlus } from "lucide-react";
import { registerAdultAction } from "@/app/actions/auth";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RegisterCard({ errorMessage, success }: { errorMessage?: string; success?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border bg-muted/40 p-2.5 shrink-0 text-foreground">
            <UserPlus className="size-5" />
          </div>
          <div className="space-y-0.5">
            <h2 className="font-semibold text-base sm:text-lg">Criar nova conta</h2>
            <p className="text-xs text-muted-foreground">
              Cadastre-se como aluno adulto ou responsável familiar.
            </p>
          </div>
        </div>

        {success ? (
          <OperationToast
            tone="success"
            title="Conta criada com sucesso"
            description="Você já pode entrar com seu e-mail e senha cadastrados."
            clearParams={["registered", "context"]}
          />
        ) : null}

        {errorMessage ? (
          <OperationToast
            tone="error"
            title="Não foi possível criar a conta"
            description={errorMessage}
            clearParams={["error", "context", "message"]}
          />
        ) : null}

        {!success ? (
          <form action={registerAdultAction} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="register-name">Nome completo</FieldLabel>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="register-name"
                  name="full_name"
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  className="h-11 pl-9 text-sm"
                  required
                />
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="register-email">E-mail</FieldLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu.email@exemplo.com"
                  className="h-11 pl-9 text-sm"
                  required
                />
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="register-account-type">Perfil de cadastro</FieldLabel>
              <Select name="account_type" defaultValue="adult_student">
                <SelectTrigger id="register-account-type" className="h-11 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adult_student">Aluno maior de idade</SelectItem>
                  <SelectItem value="guardian">Responsável financeiro / familiar</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="register-password">Senha de acesso</FieldLabel>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Crie uma senha segura"
                  className="h-11 pl-9 pr-10 text-sm"
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
              <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
            </Field>

            <FormSubmitButton className="h-11 w-full text-sm font-semibold touch-manipulation" pendingLabel="Criando conta…">
              Criar conta
            </FormSubmitButton>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
