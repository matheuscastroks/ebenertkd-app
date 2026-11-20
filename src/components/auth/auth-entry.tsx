"use client";

import { useState } from "react";
import { LoginCard } from "@/components/auth/login-card";
import { RegisterCard } from "@/components/auth/register-card";
import { OperationToast } from "@/components/shared/operation-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// A regra global `* { border-color }` vence `border-transparent`; por isso a aba inativa zera a cor explicitamente.
const triggerClass = "min-h-11 data-[state=active]:bg-card data-[state=inactive]:border-transparent! group-data-[pill-ready=true]/tabs-list:data-[state=active]:bg-transparent!";

type Notice = { title: string; description: string; clearParams: string[] };

export function AuthEntry({ minorError, adultError, registrationError, registered, notice }: {
  minorError?: string; adultError?: string; registrationError?: string; registered?: boolean; notice?: Notice;
}) {
  // Após criar a conta, a próxima tarefa é entrar: a aba Entrar abre direto.
  const [tab, setTab] = useState(registrationError && !registered ? "register" : "login");
  const [minor, setMinor] = useState(Boolean(minorError));

  return (
    <div className="space-y-4">
      {registered ? (
        <OperationToast
          tone="success"
          title="Conta criada"
          description="Entre com o e-mail e a senha que você cadastrou."
          clearParams={["registered", "context"]}
        />
      ) : null}
      {notice ? <OperationToast tone="success" {...notice} /> : null}
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-2" aria-label="Opções de acesso">
          <TabsTrigger value="login" className={triggerClass}>Entrar</TabsTrigger>
          <TabsTrigger value="register" className={triggerClass}>Criar conta</TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="space-y-3">
          <div key={minor ? "minor" : "adult"} className="t-panel-enter">
            <LoginCard type={minor ? "minor" : "adult"} errorMessage={minor ? minorError : adultError} />
          </div>
          <div className="border-t border-border pt-2.5">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full border-0 text-muted-foreground hover:text-foreground"
              onClick={() => setMinor(!minor)}
            >
              {minor ? "Entrar com e-mail" : "Sou aluno menor de idade"}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="register">
          <RegisterCard errorMessage={registrationError} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
