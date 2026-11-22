"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { saveBillingSettingsAction } from "@/app/actions/billing";
import { MaskedInput } from "@/components/shared/masked-input";
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
  const [pixKeyType, setPixKeyType] = useState<string>(settings?.pix_key_type ?? "random");
  const pixKeyMask =
    pixKeyType === "cpf"
      ? "cpf"
      : pixKeyType === "cnpj"
        ? "cnpj"
        : pixKeyType === "phone"
          ? "phone"
          : "none";

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
        <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-4">
          <Field className="min-w-56 flex-1">
            <FieldLabel htmlFor="pix-beneficiary-name">Beneficiário</FieldLabel>
            <Input id="pix-beneficiary-name" name="beneficiary_name" defaultValue={settings?.beneficiary_name} required />
          </Field>
          <Field className="w-full sm:w-44">
            <FieldLabel htmlFor="pix-key-type">Tipo da chave</FieldLabel>
            <Select name="pix_key_type" value={pixKeyType} onValueChange={setPixKeyType}>
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
          <Field className="w-full sm:max-w-md">
            <FieldLabel htmlFor="pix-key">Chave PIX</FieldLabel>
            <MaskedInput id="pix-key" name="pix_key" mask={pixKeyMask} defaultValue={settings?.pix_key ?? ""} required />
          </Field>
          <Field className="w-full">
            <FieldLabel htmlFor="pix-instructions">Instruções</FieldLabel>
            <Textarea id="pix-instructions" name="instructions" defaultValue={settings?.instructions ?? ""} className="min-h-24" />
            <FieldDescription>Exibido antes do envio do comprovante.</FieldDescription>
          </Field>
          <div className="flex w-full justify-end">
            <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Salvando…" : "Salvar dados PIX"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
