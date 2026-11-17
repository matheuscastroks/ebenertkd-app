"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotificationInbox } from "./notification-inbox";
import type { InboxItem } from "../types";
export function NotificationDrawer({ open, onOpenChange, initialItems }: {
 open: boolean; onOpenChange: (open: boolean) => void; initialItems?: InboxItem[];
}) {
 const [items, setItems] = useState(initialItems ?? []);
 const [loading, setLoading] = useState(!initialItems);
 const [error, setError] = useState(false);
 useEffect(() => {
   if (!open) return;
   let mounted = true;
   const load = async () => {
     try {
       const response = await fetch("/api/notifications/inbox", { cache: "no-store" });
       if (!response.ok) throw new Error("unavailable");
       const data = await response.json() as { items?: InboxItem[] };
       if (!Array.isArray(data.items)) throw new Error("invalid");
       if (mounted) { setItems(data.items); setError(false); }
     } catch { if (mounted) setError(true); }
     finally { if (mounted) setLoading(false); }
   };
   void load();
   window.addEventListener("notifications:changed", load);
   return () => { mounted = false; window.removeEventListener("notifications:changed", load); };
 }, [open]);
 return <Sheet open={open} onOpenChange={onOpenChange}>
   <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
     <SheetHeader><SheetTitle>Avisos</SheetTitle><SheetDescription>Comunicados da academia</SheetDescription></SheetHeader>
     <div className="space-y-4 p-4">
       {error && <Alert role="alert"><AlertDescription>Não foi possível atualizar os avisos. Tente novamente ao abrir este painel.</AlertDescription></Alert>}
       {loading ? <p role="status">Carregando avisos…</p> : error ? null : <NotificationInbox key={JSON.stringify(items)} items={items} />}
       <Button asChild variant="outline" className="h-11"><Link href="/avisos" onClick={() => onOpenChange(false)}>Abrir central completa</Link></Button>
     </div>
   </SheetContent>
 </Sheet>;
}
