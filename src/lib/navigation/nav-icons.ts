import type { ComponentType, RefAttributes } from "react";
import { ActivityIcon } from "@/components/ui/activity";
import { BellIcon } from "@/components/ui/bell";
import { CalendarCheck2Icon } from "@/components/ui/calendar-check-2";
import { ChartLineIcon } from "@/components/ui/chart-line";
import { ClipboardCheckIcon } from "@/components/ui/clipboard-check";
import { FilePenLineIcon } from "@/components/ui/file-pen-line";
import { FlameIcon } from "@/components/ui/flame";
import { LayersIcon } from "@/components/ui/layers";
import { LayoutPanelTopIcon } from "@/components/ui/layout-panel-top";
import { UserIcon } from "@/components/ui/user";
import { UsersRoundIcon } from "@/components/ui/users-round";
import { WalletIcon } from "@/components/ui/wallet";
import type { SidebarNavIcon } from "@/lib/navigation/routes";
import type { AnimatedIconHandle } from "@/lib/use-parent-hover-animation";

export type NavIconComponent = ComponentType<{
  className?: string;
  size?: number;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
} & RefAttributes<AnimatedIconHandle>>;

export const NAV_ICONS: Record<SidebarNavIcon, NavIconComponent> = {
  dashboard: LayoutPanelTopIcon,
  notifications: BellIcon,
  enrollment: ClipboardCheckIcon,
  students: UsersRoundIcon,
  classes: LayersIcon,
  exams: FlameIcon,
  attendance: CalendarCheck2Icon,
  family: UserIcon,
  contracts: FilePenLineIcon,
  billing: WalletIcon,
  system: ActivityIcon,
  reports: ChartLineIcon,
};
