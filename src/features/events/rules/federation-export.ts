import { formatWeightKg } from "@/features/events/rules/eligibility-rules";

export type FederationExportRow = {
  name: string;
  birthDate?: string | null;
  sex?: string | null;
  beltName?: string | null;
  ageClass?: string | null;
  category: string;
  modality: string;
  declaredWeightGrams?: number | null;
  authorized: boolean;
  submitted: boolean;
};

/** Neutraliza fórmulas de planilha (=, +, -, @) e escapa aspas e delimitadores. */
export function csvCell(value: string | number | boolean | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[";\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

const HEADER = ["Nome", "Data de nascimento", "Sexo", "Faixa", "Classe de idade", "Categoria", "Modalidade", "Peso declarado", "Autorização do responsável", "Enviado à federação"];

function birthText(value?: string | null) {
  const day = value?.slice(0, 10);
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.split("-").reverse().join("/") : "";
}

/** CSV da equipe para enviar à federação (separador `;` e BOM para abrir direto no Excel em português). */
export function buildFederationCsv(rows: readonly FederationExportRow[]) {
  const lines = [HEADER.map(csvCell).join(";")];
  for (const row of rows) {
    lines.push(
      [
        row.name,
        birthText(row.birthDate),
        row.sex === "masculino" ? "Masculino" : row.sex === "feminino" ? "Feminino" : "",
        row.beltName ?? "",
        row.ageClass ?? "",
        row.category,
        row.modality,
        row.declaredWeightGrams ? formatWeightKg(row.declaredWeightGrams) : "",
        row.authorized ? "Sim" : "Não",
        row.submitted ? "Sim" : "Não"
      ]
        .map(csvCell)
        .join(";")
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
