"use client";

import { useId, useState } from "react";
import { saveAcademyIdentityAction } from "@/app/actions/academy-settings";
import { MaskedInput } from "@/components/shared/masked-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import type { AcademyIdentity } from "@/features/academy/defaults";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";

const text = (value: string | null | undefined) => value ?? "";

/** Identidade da academia (nomes, documento, endereço, contato, professor). Salva com confirmação e revisão. */
export function IdentityForm({ identity, revision }: { identity: AcademyIdentity; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveAcademyIdentityAction, "Identidade da academia atualizada");
  const [documentType, setDocumentType] = useState<string>(identity.document_type ?? "none");
  const documentMask =
    documentType === "cnpj" ? "cnpj" : documentType === "cpf" ? "cpf" : "cpf_cnpj";

  return (
    <form id={formId} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />

      <Card>
        <CardHeader>
          <CardTitle>Nomes</CardTitle>
          <CardDescription>Como a academia aparece no aplicativo, nos contratos e nas mensagens.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-4">
          <ConfigField id="legal_name" label="Nome legal" error={fieldErrors.legal_name} help="Razão social ou nome da associação. Aparece no contrato e na política de privacidade." className="min-w-64 flex-1">
            <Input id="legal_name" name="legal_name" defaultValue={identity.legal_name} required maxLength={160} />
          </ConfigField>
          <ConfigField id="display_name" label="Nome de exibição" error={fieldErrors.display_name} help="Nome usado em frases, como na carteirinha e nas mensagens aos alunos." className="min-w-56 flex-1">
            <Input id="display_name" name="display_name" defaultValue={identity.display_name} required maxLength={96} />
          </ConfigField>
          <ConfigField id="short_name" label="Nome curto" error={fieldErrors.short_name} help="Até 24 caracteres. Aparece no menu, nas notificações, no título do navegador e no ícone do aplicativo instalado." className="w-full sm:w-56">
            <Input id="short_name" name="short_name" defaultValue={identity.short_name} required maxLength={24} />
          </ConfigField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documento e endereço</CardTitle>
          <CardDescription>Opcionais. Entram no contrato e na política de privacidade quando preenchidos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-4">
          <ConfigField id="document_type" label="Tipo de documento" error={fieldErrors.document_type} className="w-full sm:w-44">
            <Select name="document_type" value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="document_type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informar</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
              </SelectContent>
            </Select>
          </ConfigField>
          <ConfigField id="document_number" label="Número do documento" error={fieldErrors.document_number} help="Só os números são guardados; o dígito verificador é conferido." className="w-full sm:w-56">
            <MaskedInput id="document_number" name="document_number" mask={documentMask} defaultValue={identity.document_number ?? ""} />
          </ConfigField>
          <ConfigField id="address_zip" label="CEP" error={fieldErrors.address_zip} className="w-full sm:w-40">
            <MaskedInput id="address_zip" name="address_zip" mask="cep" defaultValue={identity.address_zip ?? ""} />
          </ConfigField>
          <ConfigField id="address_line" label="Endereço" error={fieldErrors.address_line} className="min-w-64 flex-1">
            <Input id="address_line" name="address_line" defaultValue={text(identity.address_line)} maxLength={160} />
          </ConfigField>
          <ConfigField id="address_complement" label="Complemento" error={fieldErrors.address_complement} className="w-full sm:w-48">
            <Input id="address_complement" name="address_complement" defaultValue={text(identity.address_complement)} maxLength={96} />
          </ConfigField>
          <ConfigField id="address_district" label="Bairro" error={fieldErrors.address_district} className="w-full sm:w-52">
            <Input id="address_district" name="address_district" defaultValue={text(identity.address_district)} maxLength={96} />
          </ConfigField>
          <ConfigField id="address_city" label="Cidade" error={fieldErrors.address_city} className="min-w-44 flex-1">
            <Input id="address_city" name="address_city" defaultValue={text(identity.address_city)} maxLength={96} />
          </ConfigField>
          <ConfigField id="address_state" label="UF" error={fieldErrors.address_state} className="w-24">
            <MaskedInput id="address_state" name="address_state" mask="uf" defaultValue={text(identity.address_state)} />
          </ConfigField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>Usado para dúvidas de privacidade e para a política de privacidade pública.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-4">
          <ConfigField id="phone_whatsapp" label="WhatsApp" error={fieldErrors.phone_whatsapp} className="w-full sm:w-52">
            <MaskedInput id="phone_whatsapp" name="phone_whatsapp" mask="phone" type="tel" defaultValue={identity.phone_whatsapp ?? ""} />
          </ConfigField>
          <ConfigField id="contact_email" label="E-mail" error={fieldErrors.contact_email} className="min-w-60 flex-1">
            <Input id="contact_email" name="contact_email" type="email" defaultValue={text(identity.contact_email)} maxLength={320} />
          </ConfigField>
          <ConfigField id="instagram_handle" label="Instagram" error={fieldErrors.instagram_handle} className="w-full sm:w-52">
            <Input id="instagram_handle" name="instagram_handle" defaultValue={text(identity.instagram_handle)} maxLength={31} />
          </ConfigField>
          <ConfigField id="privacy_contact" label="Contato de privacidade" error={fieldErrors.privacy_contact} help="E-mail ou WhatsApp que a política de privacidade indica para pedidos dos titulares. Sem ele, a política usa o e-mail ou WhatsApp acima." className="min-w-60 flex-1">
            <Input id="privacy_contact" name="privacy_contact" defaultValue={text(identity.privacy_contact)} maxLength={320} />
          </ConfigField>
          <ConfigField id="dpo_name" label="Encarregado de dados (DPO)" error={fieldErrors.dpo_name} help="Opcional. Só aparece na política de privacidade quando preenchido." className="min-w-56 flex-1">
            <Input id="dpo_name" name="dpo_name" defaultValue={text(identity.dpo_name)} maxLength={128} />
          </ConfigField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professor</CardTitle>
          <CardDescription>Usado nas mensagens de reajuste e no contrato.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-4">
          <ConfigField id="professor_title" label="Título" error={fieldErrors.professor_title} help="Por exemplo: Mestre, Sabumnim ou Professor." className="w-full sm:w-44">
            <Input id="professor_title" name="professor_title" defaultValue={text(identity.professor_title)} maxLength={32} />
          </ConfigField>
          <ConfigField id="professor_name" label="Nome" error={fieldErrors.professor_name} className="min-w-60 flex-1">
            <Input id="professor_name" name="professor_name" defaultValue={text(identity.professor_name)} maxLength={128} />
          </ConfigField>
          <ConfigField id="professor_graduation" label="Graduação" error={fieldErrors.professor_graduation}>
            <Input id="professor_graduation" name="professor_graduation" defaultValue={text(identity.professor_graduation)} maxLength={64} />
          </ConfigField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>A cor do aplicativo instalado. O fuso horário é fixo em {identity.timezone}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-4">
          <ConfigField id="theme_color" label="Cor do aplicativo" error={fieldErrors.theme_color} help="Formato #RRGGBB. O aplicativo já instalado só atualiza nome e cor ao ser reinstalado." className="w-full sm:w-44">
            <Input id="theme_color" name="theme_color" defaultValue={identity.theme_color} maxLength={7} />
          </ConfigField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConsequenceDialog
          formId={formId}
          trigger={<Button type="button" className="min-h-11">Salvar identidade</Button>}
          title="Salvar identidade da academia?"
          effect="Contratos já emitidos não mudam. O aplicativo já instalado nos celulares pode exigir reinstalação para trocar o nome do ícone."
          summary={[
            { label: "Nome curto", value: identity.short_name, field: "short_name" },
            { label: "Nome de exibição", value: identity.display_name, field: "display_name" },
            { label: "Nome legal", value: identity.legal_name, field: "legal_name" }
          ]}
          confirmLabel="Salvar"
          action={save}
        />
      </div>
    </form>
  );
}
