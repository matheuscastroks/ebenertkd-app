"use client";

import { useFormStatus } from "react-dom";
import { prepareLogout } from "@/features/auth/logout-cleanup";
import { logoutAction } from "@/app/actions/auth";
import { LogoutIcon } from "@/components/ui/logout";
import { Button } from "@/components/ui/button";

async function logoutWithCleanup() { await logoutAction(await prepareLogout()); }

export function LogoutButton({
  compact = false,
  variant = "default",
}: {
  compact?: boolean;
  variant?: "default" | "menu-item";
}) {
  return <form action={logoutWithCleanup} className={variant === "menu-item" ? "w-full" : undefined}><LogoutSubmit compact={compact} variant={variant} /></form>;
}

function LogoutSubmit({ compact, variant }: { compact: boolean; variant: "default" | "menu-item" }) {
  const { pending } = useFormStatus();
  if (variant === "menu-item") {
    return (
      <>
        <button
          disabled={pending}
          type="submit"
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-destructive outline-hidden select-none hover:bg-destructive/10 dark:hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:pointer-events-none disabled:opacity-50"
        >
          <LogoutIcon className="size-4" aria-hidden="true" />
          <span>Sair da conta</span>
        </button>
      </>
    );
  }

  return (
    <>
      <Button disabled={pending} type="submit" variant={compact ? "ghost" : "outline"} size={compact ? "icon-sm" : "default"} aria-label={compact ? "Sair" : undefined}>
        {compact ? <LogoutIcon aria-hidden="true" /> : "Sair"}
      </Button>
    </>
  );
}
