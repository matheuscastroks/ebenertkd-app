"use client";

import Link from "next/link";
import {
  Bell,
  CalendarCheck2,
  ChevronsUpDown,
  LogOut,
  Settings,
  Shield,
  UsersRound,
  WalletCards,
} from "lucide-react";
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

export type AccountMenuProps = {
  name: string;
  badge?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
};

export function AccountMenu({
  name,
  badge,
  email,
  avatarUrl,
  role,
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
              <Avatar className="h-8 w-8 rounded-lg">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {displaySubtitle}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {displaySubtitle}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/configuracoes" className="cursor-pointer">
                  <Settings className="size-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/avisos" className="cursor-pointer">
                  <Bell className="size-4" />
                  <span>Avisos e notificações</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            {/* Acessos contextuais relevantes para cada perfil */}
            {role === "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/financeiro" className="cursor-pointer">
                      <WalletCards className="size-4" />
                      <span>Financeiro</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/sistema" className="cursor-pointer">
                      <Shield className="size-4" />
                      <span>Sistema e auditoria</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            {role === "guardian" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/responsavel" className="cursor-pointer">
                      <WalletCards className="size-4" />
                      <span>Painel da Família</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/responsavel/dependentes" className="cursor-pointer">
                      <UsersRound className="size-4" />
                      <span>Dependentes</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            {role === "adult_student" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/aluno/financeiro" className="cursor-pointer">
                      <WalletCards className="size-4" />
                      <span>Financeiro</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/aluno/frequencia" className="cursor-pointer">
                      <CalendarCheck2 className="size-4" />
                      <span>Minha frequência</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            {role === "minor_student" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/aluno/frequencia" className="cursor-pointer">
                      <CalendarCheck2 className="size-4" />
                      <span>Minha frequência</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator />

            <LogoutButton variant="menu-item" />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
