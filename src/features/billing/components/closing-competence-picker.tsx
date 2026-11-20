"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCompetence } from "@/features/billing/format-competence";
import { ROUTES } from "@/lib/navigation/routes";

export function ClosingCompetencePicker({
  competence,
  competences,
}: {
  competence: string;
  competences: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div aria-busy={pending} className="w-full sm:w-56">
      <Field>
        <FieldLabel htmlFor="closing-competence">Competência de fechamento</FieldLabel>
        <Select
          value={competence}
          onValueChange={(value) => {
            startTransition(() => {
              router.replace(`${ROUTES.adminBillingClosing}?competence=${encodeURIComponent(value)}`, {
                scroll: false,
              });
            });
          }}
        >
          <SelectTrigger id="closing-competence" className="h-11 w-full bg-card">
            <SelectValue>{formatCompetence(competence)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {competences.map((item) => (
              <SelectItem key={item} value={item}>
                {formatCompetence(item)} ({item})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
