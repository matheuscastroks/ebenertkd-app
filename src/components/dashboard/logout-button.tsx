import { logoutAction } from "@/app/actions/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant={compact ? "ghost" : "outline"} size={compact ? "icon-sm" : "default"} aria-label={compact ? "Sair" : undefined}>
        {compact ? <LogOut aria-hidden="true" /> : "Sair"}
      </Button>
    </form>
  );
}
