"use client";

import Link from "next/link";
import { ChevronsUpDownIcon } from "@/components/ui/chevrons-up-down";
import { SettingsIcon } from "@/components/ui/settings";
import { ShieldCheckIcon } from "@/components/ui/shield-check";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ROUTES } from "@/lib/navigation/routes";

export type AccountMenuProps = {
  name: string;
  badge?: string;
  email?: string;
  avatarUrl?: string;
  /** Mantido por compatibilidade; os atalhos por perfil vivem na navegação. */
  role?: string;
};

export function AccountMenu({
  name,
  badge,
  email,
  avatarUrl,
}: AccountMenuProps) {
  const { isMobile } = useSidebar();
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  const displaySubtitle = email || badge || "Minha conta";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-9">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid grid-cols-1 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {displaySubtitle}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-9">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                  <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid grid-cols-1 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {displaySubtitle}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Destinos de trabalho ficam na navegação; aqui só o que é da conta. */}
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={ROUTES.settings} className="cursor-pointer">
                  <SettingsIcon className="size-4" aria-hidden="true" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={ROUTES.privacy} className="cursor-pointer">
                  <ShieldCheckIcon className="size-4" aria-hidden="true" />
                  <span>Privacidade</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <LogoutButton variant="menu-item" />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
