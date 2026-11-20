"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROUTES } from "@/lib/navigation/routes";

export function AnnualYearPicker({
  year,
  years,
}: {
  year: number;
  years: number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div aria-busy={pending} className="w-full sm:w-44">
      <Field>
        <FieldLabel htmlFor="annual-year-select">Ano de referência</FieldLabel>
        <Select
          value={String(year)}
          onValueChange={(value) => {
            startTransition(() => {
              router.replace(`${ROUTES.adminAnnualReport}?year=${encodeURIComponent(value)}`, {
                scroll: false,
              });
            });
          }}
        >
          <SelectTrigger id="annual-year-select" className="h-11 w-full bg-card">
            <SelectValue>{year}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((item) => (
              <SelectItem key={item} value={String(item)}>
                Exercício {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
