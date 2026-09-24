import Link from "next/link";
import { Bell, CreditCard, LayoutDashboard, ShieldCheck, UserRound } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export type AppSidebarNavItem = {
  label: string;
  href: string;
  active?: boolean;
};

export function AppSidebar({
  badge,
  navItems,
  asideTitle,
  asideCopy
}: {
  badge: string;
  navItems: AppSidebarNavItem[];
  asideTitle: string;
  asideCopy: string;
}) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Ebenert KD</p>
            <p className="text-xs text-muted-foreground">{badge}</p>
          </div>
          <Badge variant="outline" className="rounded-md">
            PWA
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, index) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={item.active}>
                    <Link href={item.href}>
                      {index === 0 && <LayoutDashboard className="h-4 w-4" />}
                      {index === 1 && <UserRound className="h-4 w-4" />}
                      {index === 2 && <CreditCard className="h-4 w-4" />}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{asideTitle}</p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{asideCopy}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Estrutura pronta para permissões e notificações.
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

