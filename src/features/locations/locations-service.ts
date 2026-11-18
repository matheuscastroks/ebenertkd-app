import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { TrainingLocation } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const LOCATIONS_FILE = path.join(DATA_DIR, "locations.json");

export const DEFAULT_LOCATIONS: TrainingLocation[] = [
  {
    id: "loc-default-1",
    name: "Dojang Principal",
    address: "Sede Ebener Taekwondo — Tatame Central",
    complement: "Salão Principal com tatame olímpico e arquibancada",
    is_default: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "loc-default-2",
    name: "Tatame 2 (Anexo)",
    address: "Sede Ebener Taekwondo — Espaço Kids & Formação",
    complement: "Sala de aquecimento e treinos infantis",
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "loc-default-3",
    name: "Ginásio Poliesportivo Municipal",
    address: "Área de Eventos e Competições",
    complement: "Bancas de exame de faixa e campeonatos",
    is_default: false,
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(LOCATIONS_FILE);
  } catch {
    await fs.writeFile(LOCATIONS_FILE, JSON.stringify(DEFAULT_LOCATIONS, null, 2), "utf-8");
  }
}

export async function listLocations(): Promise<TrainingLocation[]> {
  try {
    await ensureFileExists();
    const content = await fs.readFile(LOCATIONS_FILE, "utf-8");
    const parsed = JSON.parse(content) as TrainingLocation[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_LOCATIONS;
  } catch {
    return DEFAULT_LOCATIONS;
  }
}

export async function saveLocation(
  data: Omit<TrainingLocation, "id" | "created_at"> & { id?: string }
): Promise<TrainingLocation> {
  const current = await listLocations();
  const now = new Date().toISOString();

  if (data.id) {
    const index = current.findIndex((item) => item.id === data.id);
    if (index !== -1) {
      const updated: TrainingLocation = {
        ...current[index],
        ...data,
        id: data.id,
      };
      current[index] = updated;
      await fs.writeFile(LOCATIONS_FILE, JSON.stringify(current, null, 2), "utf-8");
      return updated;
    }
  }

  const newLocation: TrainingLocation = {
    ...data,
    id: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: now,
  };
  current.push(newLocation);
  await fs.writeFile(LOCATIONS_FILE, JSON.stringify(current, null, 2), "utf-8");
  return newLocation;
}

export async function deleteLocation(id: string): Promise<boolean> {
  const current = await listLocations();
  const filtered = current.filter((item) => item.id !== id);
  if (filtered.length !== current.length) {
    await fs.writeFile(LOCATIONS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  }
  return false;
}
