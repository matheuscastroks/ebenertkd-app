"use client";

import { useState } from "react";
import { BELT_OPTIONS, GUB_BELT_OPTIONS, GUB_OPTIONS, beltForGub, gubForBelt, type BeltOption, type GubOption } from "@/features/students/options";

export function GraduationFields({ defaultBelt, defaultGub }: { defaultBelt?: string | null; defaultGub?: number | null }) {
  const validGub = GUB_OPTIONS.includes(defaultGub as GubOption) ? defaultGub as GubOption : undefined;
  const validBelt = BELT_OPTIONS.includes(defaultBelt as BeltOption) ? defaultBelt as BeltOption : undefined;
  const initialGub = validGub ?? (validBelt ? gubForBelt(validBelt) : undefined);
  const initialBelt = initialGub ? beltForGub(initialGub) : validBelt;
  const [gub, setGub] = useState<GubOption | "">(initialGub ?? "");
  const [belt, setBelt] = useState<BeltOption | "">(initialBelt ?? "");

  return <>
    <label className="grid gap-2">
      <span className="text-sm font-medium">Faixa atual *</span>
      <select name="current_belt" value={belt} onChange={(event) => {
        const nextBelt = event.target.value as BeltOption | "";
        setBelt(nextBelt);
        setGub(nextBelt ? (gubForBelt(nextBelt) ?? "") : "");
      }} required className="h-8 rounded-lg border bg-background px-2.5 text-sm">
        <option value="">Selecione a faixa</option>
        {GUB_BELT_OPTIONS.map(({ belt: option, gub: optionGub }) => <option key={option} value={option}>{option} · {optionGub}º GUB</option>)}
      </select>
    </label>
    <label className="grid gap-2">
      <span className="text-sm font-medium">GUB *</span>
      <select name="gub" value={gub} onChange={(event) => {
        const nextGub = event.target.value ? Number(event.target.value) as GubOption : "";
        setGub(nextGub);
        setBelt(nextGub ? (beltForGub(nextGub) ?? "") : "");
      }} required className="h-8 rounded-lg border bg-background px-2.5 text-sm">
        <option value="">Selecione o GUB</option>
        {GUB_BELT_OPTIONS.map(({ belt: optionBelt, gub: option }) => <option key={option} value={option}>{option}º GUB · {optionBelt}</option>)}
      </select>
      <span className="text-xs text-muted-foreground">Faixa e GUB são sincronizados automaticamente.</span>
    </label>
  </>;
}
