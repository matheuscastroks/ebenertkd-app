/**
 * Regras puras do check-in de presença feito pelo próprio aluno.
 *
 * Janela de check-in: de 15 minutos antes até 30 minutos depois do início da aula.
 * Justificativa: no dia da aula, até o horário de término.
 * Sem check-in válido nem justificativa, a rotina diária (00:15 em Brasília) grava falta
 * para quem ficou sem registro nas aulas abertas dos dias anteriores e conclui a aula.
 *
 * Horários de aula estão em America/Sao_Paulo, sem horário de verão desde 2019 (UTC−3 fixo).
 */

export const CHECK_IN_OPENS_BEFORE_MIN = 15;
export const CHECK_IN_CLOSES_AFTER_MIN = 30;
export const DEFAULT_CHECK_IN_RADIUS_M = 150;
export const MIN_CHECK_IN_RADIUS_M = 25;
export const MAX_CHECK_IN_RADIUS_M = 2000;
export const JUSTIFICATION_MAX_LENGTH = 280;

const SAO_PAULO_OFFSET = "-03:00";
const MINUTE_MS = 60_000;
const EARTH_RADIUS_M = 6_371_008.8;

export type Coordinates = { latitude: number; longitude: number };

export function isValidCoordinates(value: Partial<Coordinates> | null | undefined): value is Coordinates {
  if (!value) return false;
  const { latitude, longitude } = value;
  return typeof latitude === "number" && typeof longitude === "number"
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/** Distância em metros entre dois pontos pela fórmula de Haversine. */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Arredonda a distância para dezenas de metros: o que guardamos e mostramos, nunca a posição. */
export function roundDistance(meters: number): number {
  return Math.round(meters / 10) * 10;
}

export function effectiveRadius(radius?: number | null): number {
  if (typeof radius !== "number" || !Number.isFinite(radius)) return DEFAULT_CHECK_IN_RADIUS_M;
  return Math.min(MAX_CHECK_IN_RADIUS_M, Math.max(MIN_CHECK_IN_RADIUS_M, Math.round(radius)));
}

export type CheckInPlace = Coordinates & { radiusM?: number | null };

export type CheckInEvaluation = { inside: boolean; distanceM: number; radiusM: number };

/** Confere se a posição informada está dentro do raio do local. Só roda no servidor. */
export function evaluateCheckIn(position: Coordinates, place: CheckInPlace): CheckInEvaluation {
  if (!isValidCoordinates(position)) throw new Error("check_in_invalid_position");
  const radiusM = effectiveRadius(place.radiusM);
  const distance = haversineMeters(position, place);
  return { inside: distance <= radiusM, distanceM: roundDistance(distance), radiusM };
}

/** Instante de um horário de aula (YYYY-MM-DD + HH:MM) no fuso de Brasília. */
export function lessonInstant(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("invalid_lesson_time");
  const instant = new Date(`${date}T${time}:00${SAO_PAULO_OFFSET}`);
  if (Number.isNaN(instant.getTime())) throw new Error("invalid_lesson_time");
  return instant;
}

export type LessonSlot = { date: string; startTime: string; endTime: string };

export function checkInWindow(slot: LessonSlot) {
  const start = lessonInstant(slot.date, slot.startTime);
  const end = lessonInstant(slot.date, slot.endTime);
  // Uma aula curta não pode continuar aceitando registros depois do seu término.
  const endsAt = end.getTime() > start.getTime() ? end : new Date(start.getTime() + CHECK_IN_CLOSES_AFTER_MIN * MINUTE_MS);
  return {
    opensAt: new Date(start.getTime() - CHECK_IN_OPENS_BEFORE_MIN * MINUTE_MS),
    closesAt: new Date(Math.min(start.getTime() + CHECK_IN_CLOSES_AFTER_MIN * MINUTE_MS, endsAt.getTime())),
    // Aula que termina depois da meia-noite não existe na academia; ainda assim o fim nunca vem antes do início.
    endsAt
  };
}

/**
 * Fase da aula para o aluno:
 * - `upcoming`: ainda não abriu o check-in (pode justificar);
 * - `open`: check-in liberado (pode justificar);
 * - `late`: check-in encerrado, aula em andamento (só justificar);
 * - `ended`: aula terminou (nada a fazer pelo aluno).
 */
export type CheckInPhase = "upcoming" | "open" | "late" | "ended";

export function checkInPhase(slot: LessonSlot, now: Date): CheckInPhase {
  const { opensAt, closesAt, endsAt } = checkInWindow(slot);
  const time = now.getTime();
  if (time >= endsAt.getTime()) return "ended";
  if (time > closesAt.getTime()) return "late";
  if (time >= opensAt.getTime()) return "open";
  return "upcoming";
}

export const canCheckIn = (phase: CheckInPhase) => phase === "open";
export const canJustify = (phase: CheckInPhase) => phase !== "ended";

/** Normaliza o texto da justificativa (espaços colapsados). Devolve null quando curto demais. */
export function normalizeJustification(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < 3 || text.length > JUSTIFICATION_MAX_LENGTH) return null;
  return text;
}

type LocationLike = { name: string; is_default?: boolean; latitude?: number | null; longitude?: number | null; check_in_radius_m?: number | null };

/**
 * Local de check-in da turma. A turma guarda só o nome do local; procuramos o local ativo
 * com o mesmo nome e, se não houver, o local padrão. Sem coordenadas, devolve null.
 */
export function resolveCheckInPlace(classLocation: string | null | undefined, locations: LocationLike[]): CheckInPlace | null {
  const key = (value: string) => value.trim().toLocaleLowerCase("pt-BR");
  const named = classLocation ? locations.find((location) => key(location.name) === key(classLocation)) : undefined;
  const chosen = named ?? locations.find((location) => location.is_default === true);
  if (!chosen) return null;
  const coordinates = { latitude: chosen.latitude ?? undefined, longitude: chosen.longitude ?? undefined };
  if (!isValidCoordinates(coordinates)) return null;
  return { ...coordinates, radiusM: chosen.check_in_radius_m ?? null };
}
