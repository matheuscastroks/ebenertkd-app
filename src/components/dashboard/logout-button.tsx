import { logoutAction } from "@/app/actions/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({
  compact = false,
  variant = "default",
}: {
  compact?: boolean;
  variant?: "default" | "menu-item";
}) {
  if (variant === "menu-item") {
    return (
      <form action={logoutAction} className="w-full">
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-hidden select-none hover:bg-destructive/10 dark:hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-destructive/30"
        >
          <LogOut className="size-4" />
          <span>Sair da conta</span>
        </button>
      </form>
    );
  }

  return (
    <form action={logoutAction}>
      <Button type="submit" variant={compact ? "ghost" : "outline"} size={compact ? "icon-sm" : "default"} aria-label={compact ? "Sair" : undefined}>
        {compact ? <LogOut aria-hidden="true" /> : "Sair"}
      </Button>
    </form>
  );
}
