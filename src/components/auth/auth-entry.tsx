"use client";

import { useState } from "react";
import { LoginCard } from "@/components/auth/login-card";
import { RegisterCard } from "@/components/auth/register-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function AuthEntry({ minorError, adultError, registrationError, registered }: {
  minorError?: string; adultError?: string; registrationError?: string; registered?: boolean;
}) {
  const [tab, setTab] = useState(registered || registrationError ? "register" : "login");
  const [minor, setMinor] = useState(Boolean(minorError));
  return <Tabs value={tab} onValueChange={setTab}>
    <TabsList className="grid h-auto w-full grid-cols-2" aria-label="Opções de acesso">
      <TabsTrigger value="login" className="min-h-11">Entrar</TabsTrigger>
      <TabsTrigger value="register" className="min-h-11">Criar conta</TabsTrigger>
    </TabsList>
    <TabsContent value="login" className="space-y-3">
      <LoginCard type={minor ? "minor" : "adult"} errorMessage={minor ? minorError : adultError} />
      <Button type="button" variant="link" className="min-h-11 text-sm" onClick={() => setMinor(!minor)}>
        {minor ? "Entrar com e-mail" : "Sou aluno menor de idade"}
      </Button>
    </TabsContent>
    <TabsContent value="register"><RegisterCard errorMessage={registrationError} success={registered} /></TabsContent>
  </Tabs>;
}
