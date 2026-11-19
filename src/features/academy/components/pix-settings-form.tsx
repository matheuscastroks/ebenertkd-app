"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { saveBillingSettingsAction } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BillingSettings } from "@/features/billing/types";

/** Dados PIX exibidos a alunos e responsáveis na hora de pagar (antes ficavam num diálogo do financeiro). */
export function PixSettingsForm({ settings }: { settings: BillingSettings | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await saveBillingSettingsAction(data);
        if (!result.ok) throw new Error("save_failed");
        toast.success("Dados PIX atualizados");
        router.refresh();
      } catch {
        toast.error("Não foi possível salvar os dados PIX", { description: "Confira os campos e tente novamente." });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados PIX</CardTitle>
        <CardDescription>Aparecem para alunos e responsáveis na hora de pagar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="pix-beneficiary-name">Beneficiário</FieldLabel>
            <Input id="pix-beneficiary-name" name="beneficiary_name" defaultValue={settings?.beneficiary_name} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="pix-key-type">Tipo da chave</FieldLabel>
            <Select name="pix_key_type" defaultValue={settings?.pix_key_type ?? "random"}>
              <SelectTrigger id="pix-key-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="pix-key">Chave PIX</FieldLabel>
            <Input id="pix-key" name="pix_key" defaultValue={settings?.pix_key} required />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="pix-instructions">Instruções</FieldLabel>
            <Textarea id="pix-instructions" name="instructions" defaultValue={settings?.instructions ?? ""} className="min-h-24" />
            <FieldDescription>Exibido antes do envio do comprovante.</FieldDescription>
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Salvando…" : "Salvar dados PIX"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
