"use client";

import { useState } from "react";
import { LoginCard } from "@/components/auth/login-card";
import { RegisterCard } from "@/components/auth/register-card";
import { Button } from "@/components/ui/button";

export function AuthEntry({ minorError, adultError, registrationError, registered }: {
  minorError?: string;
  adultError?: string;
  registrationError?: string;
  registered?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"adult" | "minor" | "register">(registered || registrationError ? "register" : "adult");

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 rounded-lg border bg-background p-1">
        <Button type="button" variant={activeTab === "adult" ? "default" : "ghost"} onClick={() => setActiveTab("adult")}>Adulto</Button>
        <Button type="button" variant={activeTab === "minor" ? "default" : "ghost"} onClick={() => setActiveTab("minor")}>Menor</Button>
        <Button type="button" variant={activeTab === "register" ? "default" : "ghost"} onClick={() => setActiveTab("register")}>Cadastrar</Button>
      </div>
      {activeTab === "adult" ? <LoginCard type="adult" errorMessage={adultError} /> : null}
      {activeTab === "minor" ? <LoginCard type="minor" errorMessage={minorError} /> : null}
      {activeTab === "register" ? <RegisterCard errorMessage={registrationError} success={registered} /> : null}
    </div>
  );
}
