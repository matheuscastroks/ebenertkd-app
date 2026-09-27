"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingModal } from "./onboarding-modal";
import type { OnboardingRole } from "../types";

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
  const forceOpen = searchParams?.get("onboarding") === "true";
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!hasCompletedOnboarding || forceOpen) {
      // Pequeno timeout para permitir que a página carregue suavemente antes do modal
      const timer = window.setTimeout(() => setIsOpen(true), 350);
      return () => window.clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, forceOpen]);

  return (
    <OnboardingModal
      role={role}
      userName={userName}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
