"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BELT_OPTIONS,
  DAN_BELT_OPTIONS,
  GUB_BELT_OPTIONS,
  GUB_OPTIONS,
  beltForGub,
  gubForBelt,
  type BeltOption,
  type GubOption
} from "@/features/students/options";

export function GraduationFields({ defaultBelt, defaultGub }: { defaultBelt?: string | null; defaultGub?: number | null }) {
  const validGub = defaultGub != null && GUB_OPTIONS.includes(defaultGub as GubOption) ? (defaultGub as GubOption) : undefined;
  const validBelt = BELT_OPTIONS.includes(defaultBelt as BeltOption) ? (defaultBelt as BeltOption) : undefined;
  const rawGub = validGub ?? (validBelt ? gubForBelt(validBelt) : undefined);
  const initialGub = rawGub != null && GUB_OPTIONS.includes(rawGub as GubOption) ? (rawGub as GubOption) : undefined;
  const initialBelt = validBelt ?? (initialGub != null ? beltForGub(initialGub) : undefined);
  const [gub, setGub] = useState<GubOption | "">(initialGub != null ? initialGub : "");
  const [belt, setBelt] = useState<BeltOption | "">(initialBelt ?? "");

  return (
    <>
      <Field>
        <FieldLabel htmlFor="current-belt">Faixa atual *</FieldLabel>
        <Select
          name="current_belt"
          value={belt || ""}
          onValueChange={(value) => {
            const nextBelt = value as BeltOption;
            setBelt(nextBelt);
            const resolvedGub = gubForBelt(nextBelt);
            setGub(resolvedGub != null && GUB_OPTIONS.includes(resolvedGub as GubOption) ? (resolvedGub as GubOption) : "");
          }}
          required
        >
          <SelectTrigger id="current-belt" className="w-full h-11">
            <SelectValue placeholder="Selecione a faixa" />
          </SelectTrigger>
          <SelectContent>
            {GUB_BELT_OPTIONS.map(({ belt: option, gub: optionGub }) => (
              <SelectItem key={option} value={option}>
                {option} · {optionGub}º GUB
              </SelectItem>
            ))}
            {DAN_BELT_OPTIONS.map(({ belt: option, dan }) => (
              <SelectItem key={option} value={option}>
                {option} · {dan}º Dan
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="current-gub">GUB / Graduação *</FieldLabel>
        <Select
          name="gub"
          value={gub !== "" && gub !== undefined ? String(gub) : ""}
          onValueChange={(value) => {
            const nextGub = Number(value) as GubOption;
            setGub(nextGub);
            if (nextGub === 0) {
              if (!belt || !belt.toLowerCase().includes("preta")) {
                setBelt("Preta");
              }
            } else {
              setBelt(beltForGub(nextGub) ?? "");
            }
          }}
          required
        >
          <SelectTrigger id="current-gub" className="w-full h-11">
            <SelectValue placeholder="Selecione o GUB / Dan" />
          </SelectTrigger>
          <SelectContent>
            {GUB_BELT_OPTIONS.map(({ belt: optionBelt, gub: option }) => (
              <SelectItem key={option} value={String(option)}>
                {option}º GUB · {optionBelt}
              </SelectItem>
            ))}
            <SelectItem value="0">
              Faixa Preta · Dan
            </SelectItem>
          </SelectContent>
        </Select>
        <FieldDescription>Faixa e GUB/Dan são sincronizados automaticamente.</FieldDescription>
      </Field>
    </>
  );
}
