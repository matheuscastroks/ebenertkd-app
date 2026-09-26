"use client";

import { useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { saveBillingSettingsAction } from "@/app/actions/billing";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BillingSettings } from "@/features/billing/types";

export function PixSettingsDialog({ settings }: { settings: BillingSettings | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const open = searchParams.get("pix") === "1";
  const onOpenChange = (next: boolean) => {
    const query = new URLSearchParams(window.location.search);
    if (next) query.set("pix", "1"); else query.delete("pix");
    router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await saveBillingSettingsAction(data);
        if (!result.ok) throw new Error("save_failed");
        toast.success("Dados PIX atualizados");
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Não foi possível salvar os dados PIX", { description: "Confira os campos e tente novamente." });
      }
    });
  };
  return <ResponsiveDialog open={open} onOpenChange={onOpenChange} trigger={<Button variant="outline"><Settings2 aria-hidden="true" />Configurar PIX</Button>} title="Dados PIX" description="Esses dados aparecem para alunos e responsáveis na hora de pagar.">
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field><FieldLabel htmlFor="modal-beneficiary-name">Beneficiário</FieldLabel><Input id="modal-beneficiary-name" name="beneficiary_name" defaultValue={settings?.beneficiary_name} required /></Field>
      <Field><FieldLabel htmlFor="modal-pix-key-type">Tipo da chave</FieldLabel><Select name="pix_key_type" defaultValue={settings?.pix_key_type ?? "random"}><SelectTrigger id="modal-pix-key-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="phone">Telefone</SelectItem><SelectItem value="random">Aleatória</SelectItem></SelectContent></Select></Field>
      <Field><FieldLabel htmlFor="modal-pix-key">Chave PIX</FieldLabel><Input id="modal-pix-key" name="pix_key" defaultValue={settings?.pix_key} required /></Field>
      <Field><FieldLabel htmlFor="modal-pix-instructions">Instruções</FieldLabel><Textarea id="modal-pix-instructions" name="instructions" defaultValue={settings?.instructions ?? ""} className="min-h-28" /><FieldDescription>Exibido antes do envio do comprovante.</FieldDescription></Field>
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar dados PIX"}</Button>
    </form>
  </ResponsiveDialog>;
}
