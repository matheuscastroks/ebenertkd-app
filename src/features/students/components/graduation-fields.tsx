"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { RankSelect } from "@/features/students/components/rank-select";

/** Único campo de graduação do cadastro: a faixa (nome e cor) sai da configuração da academia. */
export function GraduationFields({ defaultRankKey }: { defaultRankKey?: string | null }) {
  const [rankKey, setRankKey] = useState(defaultRankKey ?? "");

  return (
    <Field>
      <FieldLabel htmlFor="rank-key">Graduação *</FieldLabel>
      <RankSelect id="rank-key" name="rank_key" value={rankKey} onValueChange={setRankKey} keep={defaultRankKey} required />
      <FieldDescription>A faixa é definida pela graduação, com o nome e a cor que a academia configurou.</FieldDescription>
    </Field>
  );
}
