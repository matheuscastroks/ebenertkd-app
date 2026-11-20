import { z } from "zod";
import { DEFAULT_CHECK_IN_RADIUS_M, MAX_CHECK_IN_RADIUS_M, MIN_CHECK_IN_RADIUS_M } from "@/features/classes/check-in-rules";
import type { TrainingLocation } from "./types";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? (value.trim() === "" ? undefined : value.trim()) : undefined),
    z.string().max(max).optional()
  );

/** Número opcional vindo de formulário: vazio vira undefined; aceita vírgula decimal. */
const optionalNumber = (min: number, max: number, message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value === "number") return value;
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return Number(value.trim().replace(",", "."));
    },
    z.number({ error: message }).min(min, message).max(max, message).optional()
  );

export const locationInputSchema = z.object({
  id: z.string().min(1).max(36).optional(),
  name: z.string().trim().min(2, "Informe o nome do local").max(96, "Use até 96 caracteres"),
  address: optionalText(200),
  complement: optionalText(200),
  notes: optionalText(500),
  is_default: z.boolean().optional(),
  latitude: optionalNumber(-90, 90, "Latitude entre -90 e 90"),
  longitude: optionalNumber(-180, 180, "Longitude entre -180 e 180"),
  check_in_radius_m: optionalNumber(MIN_CHECK_IN_RADIUS_M, MAX_CHECK_IN_RADIUS_M, `Raio entre ${MIN_CHECK_IN_RADIUS_M} e ${MAX_CHECK_IN_RADIUS_M} m`)
}).refine((input) => (input.latitude === undefined) === (input.longitude === undefined), {
  message: "Informe latitude e longitude juntas",
  path: ["latitude"]
});

export type LocationInput = z.infer<typeof locationInputSchema>;

export type LocationRow = {
  $id: string;
  name: string;
  address?: string | null;
  complement?: string | null;
  notes?: string | null;
  is_default?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  check_in_radius_m?: number | null;
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
    latitude: typeof row.latitude === "number" ? row.latitude : undefined,
    longitude: typeof row.longitude === "number" ? row.longitude : undefined,
    check_in_radius_m: typeof row.latitude === "number" ? Math.round(row.check_in_radius_m ?? DEFAULT_CHECK_IN_RADIUS_M) : undefined,
    created_at: row.created_at ?? row.$createdAt ?? ""
  };
}

/** Padrão primeiro, depois ordem alfabética. */
export function sortLocations(list: TrainingLocation[]): TrainingLocation[] {
  return [...list].sort((a, b) => Number(b.is_default === true) - Number(a.is_default === true) || a.name.localeCompare(b.name, "pt-BR"));
}
