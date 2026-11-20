"use client";

import { useId } from "react";
import { saveBeltsPolicyAction } from "@/app/actions/academy-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfigField } from "@/features/academy/components/config-field";
import { useConfigSave } from "@/features/academy/components/use-config-save";
import type { BeltsPolicy } from "@/features/academy/defaults";
import { ConsequenceDialog } from "@/features/billing/components/consequence-dialog";

/** Termos que o sistema usa nas telas: "Poomsae" ou "Tul"; "Gub", "Gup" ou "Geup". */
export function BeltsTermsForm({ policy, revision }: { policy: BeltsPolicy; revision: number }) {
  const formId = useId().replace(/:/g, "");
  const { revision: currentRevision, save, fieldErrors } = useConfigSave(revision, saveBeltsPolicyAction, "Termos atualizados");

  return (
    <form id={formId} onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="revision" value={currentRevision} />
      <Card>
        <CardHeader>
          <CardTitle>Termos do sistema de faixas</CardTitle>
          <CardDescription>Palavras usadas nas telas dos alunos e do professor. Os modelos de federação já ajustam estes termos.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <ConfigField id="form_label" label="Termo da forma" error={fieldErrors.form_label} help="Como a academia chama a sequência técnica exigida em cada graduação: Poomsae, Tul…">
            <Input id="form_label" name="form_label" defaultValue={policy.form_label} maxLength={24} required className="h-11" />
          </ConfigField>
          <ConfigField id="level_label" label="Termo do nível" error={fieldErrors.level_label} help="Como o nível colorido é chamado: Gub, Gup, Geup…">
            <Input id="level_label" name="level_label" defaultValue={policy.level_label} maxLength={16} required className="h-11" />
          </ConfigField>
          <ConsequenceDialog
            formId={formId}
            trigger={<Button type="button" variant="outline" className="min-h-11">Salvar termos</Button>}
            title="Salvar os termos?"
            effect="Os termos mudam nas telas de alunos, responsáveis e professor. Nenhum dado de aluno é alterado."
            summary={[]}
            confirmLabel="Salvar"
            action={save}
          />
        </CardContent>
      </Card>
    </form>
  );
}
