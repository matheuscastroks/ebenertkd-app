import { z } from "zod";
import type { TrainingLocation } from "./types";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? (value.trim() === "" ? undefined : value.trim()) : undefined),
    z.string().max(max).optional()
  );

export const locationInputSchema = z.object({
  id: z.string().min(1).max(36).optional(),
  name: z.string().trim().min(2, "Informe o nome do local").max(96, "Use até 96 caracteres"),
  address: optionalText(200),
  complement: optionalText(200),
  notes: optionalText(500),
  is_default: z.boolean().optional()
});

export type LocationInput = z.infer<typeof locationInputSchema>;

export type LocationRow = {
  $id: string;
  name: string;
  address?: string | null;
  complement?: string | null;
  notes?: string | null;
  is_default?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  $createdAt?: string;
};

export function toTrainingLocation(row: LocationRow): TrainingLocation {
  return {
    id: row.$id,
    name: row.name,
    address: row.address ?? undefined,
    complement: row.complement ?? undefined,
    notes: row.notes ?? undefined,
    is_default: row.is_default === true,
    created_at: row.created_at ?? row.$createdAt ?? ""
  };
}

/** Padrão primeiro, depois ordem alfabética. */
export function sortLocations(list: TrainingLocation[]): TrainingLocation[] {
  return [...list].sort((a, b) => Number(b.is_default === true) - Number(a.is_default === true) || a.name.localeCompare(b.name, "pt-BR"));
}
