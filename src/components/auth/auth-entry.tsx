"use client";

import { useState } from "react";
import { Shield, UserPlus, UserRound } from "lucide-react";
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
      <div className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/50 p-1" role="tablist" aria-label="Opções de acesso">
        <Button
          type="button"
          variant={activeTab === "adult" ? "default" : "ghost"}
          size="sm"
          className="h-10 text-xs sm:text-sm font-semibold transition-all touch-manipulation"
          onClick={() => setActiveTab("adult")}
          role="tab"
          aria-selected={activeTab === "adult"}
        >
          <Shield className="size-3.5 mr-1.5 shrink-0 hidden min-[360px]:inline-block" aria-hidden="true" />
          Adulto
        </Button>
        <Button
          type="button"
          variant={activeTab === "minor" ? "default" : "ghost"}
          size="sm"
          className="h-10 text-xs sm:text-sm font-semibold transition-all touch-manipulation"
          onClick={() => setActiveTab("minor")}
          role="tab"
          aria-selected={activeTab === "minor"}
        >
          <UserRound className="size-3.5 mr-1.5 shrink-0 hidden min-[360px]:inline-block" aria-hidden="true" />
          Menor
        </Button>
        <Button
          type="button"
          variant={activeTab === "register" ? "default" : "ghost"}
          size="sm"
          className="h-10 text-xs sm:text-sm font-semibold transition-all touch-manipulation"
          onClick={() => setActiveTab("register")}
          role="tab"
          aria-selected={activeTab === "register"}
        >
          <UserPlus className="size-3.5 mr-1.5 shrink-0 hidden min-[360px]:inline-block" aria-hidden="true" />
          Cadastrar
        </Button>
      </div>
      {activeTab === "adult" ? <LoginCard type="adult" errorMessage={adultError} /> : null}
      {activeTab === "minor" ? <LoginCard type="minor" errorMessage={minorError} /> : null}
      {activeTab === "register" ? <RegisterCard errorMessage={registrationError} success={registered} /> : null}
    </div>
  );
}
