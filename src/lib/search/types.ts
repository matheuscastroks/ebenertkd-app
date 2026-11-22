import type { SidebarNavIcon } from "@/lib/navigation/routes";

export type SearchItemKind = "screen" | "student" | "class" | "event" | "dependent";

export type SearchScreenItem = {
  id: string;
  title: string;
  subtitle: string;
  section: string;
  href: string;
  icon: SidebarNavIcon;
  keywords: string[];
  description?: string;
};

export type SearchResultItem = {
  id: string;
  kind: SearchItemKind;
  title: string;
  subtitle: string;
  href: string;
  icon: SidebarNavIcon;
  badge?: string;
  score?: number;
};

export type RemoteSearchResponse = {
  items: SearchResultItem[];
};
