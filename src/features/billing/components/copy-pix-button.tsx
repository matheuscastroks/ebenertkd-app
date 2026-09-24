"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyPixButton({ value }: { value: string }) {
  return <Button type="button" size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(value); toast.success("Chave PIX copiada"); } catch { toast.error("Não foi possível copiar a chave PIX"); } }}>Copiar chave</Button>;
}
