"use client";

import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

export function ResponsiveDialog({ trigger, title, description, children }: { trigger: ReactNode; title: string; description: string; children: ReactNode }) {
  const mobile = useIsMobile();
  if (mobile) return <Drawer><DrawerTrigger asChild>{trigger}</DrawerTrigger><DrawerContent><DrawerHeader><DrawerTitle>{title}</DrawerTitle><DrawerDescription>{description}</DrawerDescription></DrawerHeader><div className="overflow-y-auto px-4 pb-6">{children}</div></DrawerContent></Drawer>;
  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>;
}
