import { Activity, Award, Bell, Building2, CalendarCheck2, ClipboardList, FileSignature, LayoutDashboard, UserRound, UsersRound, WalletCards, type LucideIcon } from "lucide-react";
import type { SidebarNavIcon } from "@/lib/navigation/routes";

export const NAV_ICONS: Record<SidebarNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  notifications: Bell,
  enrollment: ClipboardList,
  students: UsersRound,
  classes: Building2,
  exams: Award,
  attendance: CalendarCheck2,
  family: UserRound,
  contracts: FileSignature,
  billing: WalletCards,
  system: Activity
};
