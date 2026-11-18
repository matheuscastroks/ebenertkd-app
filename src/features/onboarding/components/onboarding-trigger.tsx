"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OnboardingModal } from "./onboarding-modal";
import type { OnboardingRole } from "../types";

/**
 * Abre a apresentação só para quem ainda não concluiu ou pulou, ou quando
 * Configurações pede para rever (`?onboarding=true`). Ao fechar, remove o parâmetro
 * para que recarregar a página não abra a apresentação de novo.
 */
export function OnboardingTrigger({
  role,
  userName,
  hasCompletedOnboarding,
}: {
  role: OnboardingRole;
  userName: string;
  hasCompletedOnboarding: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const forceOpen = searchParams?.get("onboarding") === "true";
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!hasCompletedOnboarding || forceOpen) {
      const timer = window.setTimeout(() => setIsOpen(true), 350);
      return () => window.clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, forceOpen]);

  const close = () => {
    setIsOpen(false);
    if (forceOpen && pathname) router.replace(pathname, { scroll: false });
  };

  return <OnboardingModal role={role} userName={userName} isOpen={isOpen} onClose={close} />;
}
