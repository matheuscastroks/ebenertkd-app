"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { registerAdultAction } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OperationToast } from "@/components/shared/operation-toast";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RegisterCard({ errorMessage, success }: { errorMessage?: string; success?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <Card className="border-border/80 shadow-xs">
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="space-y-0.5">
            <h2 className="font-semibold text-base sm:text-lg">Criar nova conta</h2>
            <p className="text-sm text-muted-foreground">
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
          <Alert role="alert" variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
        ) : null}

        {!success ? (
          <form action={registerAdultAction} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="register-name">Nome completo</FieldLabel>
              <div className="relative">

                <Input
                  id="register-name"
                  name="full_name"
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  className="h-11 text-sm"
                  required
                />
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="register-email">E-mail</FieldLabel>
              <div className="relative">

                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu.email@exemplo.com"
                  className="h-11 text-sm"
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
                  placeholder="Crie uma senha segura"
                  className="h-11 pr-12 text-sm"
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
              <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="register-confirm-password">Confirmar senha</FieldLabel>
              <Input id="register-confirm-password" name="password_confirmation" type={showPassword ? "text" : "password"}
                autoComplete="new-password" minLength={8} required className="h-11"
                onChange={(event) => event.target.setCustomValidity(event.target.value === password ? "" : "As senhas devem ser iguais.")} />
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
