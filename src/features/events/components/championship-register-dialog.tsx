"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { registerForEventAction } from "@/app/actions/events";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { suggestOptionByWeight, weightFits, weightMisfitReason } from "@/features/events/rules/category-suggestion";
import { parseWeightKgToGrams } from "@/features/events/schemas";
import type { StudentOpenEvent } from "@/features/events/student-events-service";
import { formatBrl } from "@/lib/money";

type Who = { kind: "self" } | { kind: "guardian"; dependentName: string } | { kind: "minor" };

/**
 * Interesse em campeonato: o atleta informa o peso, a categoria é sugerida por idade, sexo, faixa e peso, e os motivos
 * de inelegibilidade aparecem na hora. Termo e autorização são aceitos aqui; quem confirma a equipe é o professor.
 */
export function ChampionshipRegisterDialog({ item, studentProfileId, returnTo, who, showFinancial, profileHref }: { item: StudentOpenEvent; studentProfileId: string; returnTo: string; who: Who; showFinancial: boolean; profileHref?: string }) {
  const { event } = item;
  const [weightText, setWeightText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const grams = parseWeightKgToGrams(weightText);

  const rows = useMemo(
    () =>
      item.options.map((entry) => {
        const misfit = weightMisfitReason(entry.weightRange, grams);
        return { entry, fits: entry.eligible && !entry.mine && weightFits(entry.weightRange, grams), reason: !entry.eligible ? entry.reasons[0] : entry.mine ? "já inscrito" : misfit };
      }),
    [item.options, grams]
  );
  const suggestion = suggestOptionByWeight(
    item.options.map((entry) => ({ id: entry.option.$id, eligible: entry.eligible && !entry.mine, range: entry.weightRange })),
    grams
  );
  const selected = picked && rows.find((row) => row.entry.option.$id === picked)?.fits ? picked : (suggestion?.id ?? "");
  const minor = who.kind === "minor";
  const sexMissing = Boolean(item.sexMissing);
  const noneFit = grams !== null && !suggestion;

  return (
    <ResponsiveDialog
      trigger={<Button className="min-h-11">{minor ? "Tenho interesse" : "Quero competir"}</Button>}
      title={minor ? "Manifestar interesse" : "Interesse no campeonato"}
      description={event.title}
    >
      <form action={registerForEventAction} className="space-y-4 pt-2">
        <input type="hidden" name="event_id" value={event.$id} />
        <input type="hidden" name="student_profile_id" value={studentProfileId} />
        <input type="hidden" name="return_to" value={returnTo} />
        <input type="hidden" name="option_id" value={selected} />

        {sexMissing ? (
          <p role="alert" className="rounded-lg border border-border bg-muted p-3 text-sm">
            Para escolher a categoria, o cadastro precisa informar o sexo do atleta.{" "}
            {profileHref ? (
              <Link href={profileHref} className="font-medium text-primary underline-offset-4 hover:underline">
                Completar o cadastro
              </Link>
            ) : (
              "Peça ao professor para completar o cadastro."
            )}
          </p>
        ) : null}

        <Field>
          <FieldLabel htmlFor={`weight-${event.$id}`}>Peso atual (kg)</FieldLabel>
          <Input id={`weight-${event.$id}`} name="weight_kg" value={weightText} onChange={(change) => setWeightText(change.target.value)} inputMode="decimal" placeholder="Ex.: 45,5" required className="h-11 tabular-nums" aria-invalid={weightText !== "" && grams === null} />
          <FieldDescription>{weightText !== "" && grams === null ? "Informe o peso em kg, como 45,5." : "Você pode corrigir o peso até o prazo de troca de categoria."}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor={`category-${event.$id}`}>Categoria</FieldLabel>
          <Select value={selected} onValueChange={setPicked} disabled={grams === null}>
            <SelectTrigger id={`category-${event.$id}`} className="w-full">
              <SelectValue placeholder={grams === null ? "Informe o peso para ver a categoria" : "Nenhuma categoria serve"} />
            </SelectTrigger>
            <SelectContent>
              {rows.map(({ entry, fits, reason }) => (
                <SelectItem key={entry.option.$id} value={entry.option.$id} disabled={!fits}>
                  {entry.option.label}
                  {showFinancial && (entry.option.price_cents > 0 || (entry.option.federation_fee_cents ?? 0) > 0) ? ` · ${formatBrl(entry.option.price_cents + (entry.option.federation_fee_cents ?? 0))}` : ""}
                  {!fits && reason ? ` · ${reason}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggestion && selected === suggestion.id ? <FieldDescription>Categoria sugerida pela idade, sexo, faixa e peso.</FieldDescription> : null}
          {noneFit ? <FieldDescription>Nenhuma categoria serve a este atleta. Veja os motivos abaixo ou fale com o professor.</FieldDescription> : null}
        </Field>

        {noneFit ? (
          <ul className="space-y-0.5 text-sm text-muted-foreground">
            {rows.slice(0, 6).map(({ entry, reason }) => (reason ? <li key={entry.option.$id}>{entry.option.label}: {reason}</li> : null))}
          </ul>
        ) : null}

        {showFinancial ? <p className="text-sm text-muted-foreground">As taxas da academia e da federação são cobradas em separado, só depois que o professor confirmar o atleta na equipe.</p> : null}

        {minor ? (
          <p className="text-sm text-muted-foreground">O responsável recebe um aviso para autorizar. O professor confirma a equipe em seguida.</p>
        ) : (
          <label className="flex items-start gap-3 text-sm leading-relaxed" htmlFor={`terms-${event.$id}`}>
            <Checkbox id={`terms-${event.$id}`} name="accepted_terms" required className="mt-0.5" />
            <span>
              {who.kind === "guardian"
                ? `Autorizo a participação de ${who.dependentName}, li o termo de responsabilidade e declaro que está apto para competir.`
                : "Li o termo de responsabilidade e declaro estar apto para competir."}
            </span>
          </label>
        )}

        <FormSubmitButton className="min-h-11 w-full" disabled={!selected || sexMissing} pendingLabel="Enviando…">
          {minor ? "Tenho interesse" : "Enviar interesse"}
        </FormSubmitButton>
      </form>
    </ResponsiveDialog>
  );
}
