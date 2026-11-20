import type { AttendanceRecord } from "@/features/classes/types";

/** Linha curta para a chamada do professor: de onde veio o registro atual. */
export function attendanceSourceNote(record?: Pick<AttendanceRecord, "status" | "source" | "justification" | "check_in_distance_m"> | null): string | null {
  if (!record) return null;
  if (record.source === "check_in" && record.status === "present") {
    return typeof record.check_in_distance_m === "number" ? `Check-in pelo app · ${record.check_in_distance_m} m do local` : "Check-in pelo app";
  }
  if (record.source === "justification" && record.status === "excused") {
    return record.justification ? `Justificou: ${record.justification}` : "Justificou pelo app";
  }
  if (record.source === "auto" && record.status === "absent") return "Falta automática: sem check-in nem justificativa";
  return null;
}

export type CheckInResultState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; code: string; message: string; offerJustify: boolean };

/** Mensagens dos erros do check-in e da justificativa, em linguagem do aluno. */
export function checkInErrorMessage(code: string, detail?: { distanceM: number; radiusM: number }): { message: string; offerJustify: boolean } {
  switch (code) {
    case "check_in_out_of_range":
      return {
        message: detail
          ? `Você está a cerca de ${detail.distanceM} m do local do treino (limite de ${detail.radiusM} m). Chegue ao local e tente de novo, ou justifique a falta.`
          : "Você está fora do raio do local do treino. Chegue ao local e tente de novo, ou justifique a falta.",
        offerJustify: true
      };
    case "check_in_not_open":
      return { message: "O check-in abre 15 minutos antes do treino e fecha 30 minutos depois do início.", offerJustify: true };
    case "check_in_justify_closed":
      return { message: "O treino já terminou. Se precisar corrigir a presença, fale com o professor.", offerJustify: false };
    case "check_in_location_missing":
      return { message: "O local do treino ainda não tem coordenadas cadastradas. Avise o professor; por enquanto, a presença é marcada na chamada.", offerJustify: true };
    case "attendance_already_recorded":
      return { message: "A presença desta aula já está registrada. Só o professor pode alterá-la.", offerJustify: false };
    case "lesson_closed":
      return { message: "A chamada desta aula já foi concluída pelo professor.", offerJustify: false };
    case "lesson_cancelled":
      return { message: "Esta aula foi cancelada.", offerJustify: false };
    case "check_in_no_lesson":
    case "check_in_no_class":
      return { message: "Não há treino seu agora para registrar.", offerJustify: false };
    case "check_in_forbidden":
      return { message: "O check-in é feito pelo próprio aluno, no app dele.", offerJustify: false };
    case "check_in_invalid_input":
      return { message: "Escreva o motivo em poucas palavras (de 3 a 280 caracteres).", offerJustify: true };
    default:
      return { message: "Não foi possível registrar agora. Tente de novo em instantes.", offerJustify: true };
  }
}

/** Mensagens da Geolocation API do navegador (códigos 1, 2 e 3 do GeolocationPositionError). */
export function geolocationErrorMessage(code: number | "unsupported"): string {
  if (code === 1) return "O acesso à localização foi negado. Para fazer check-in, permita a localização para este site nas configurações do navegador. Se não puder, use Justificar.";
  if (code === 2) return "Não foi possível descobrir sua localização. Ative o GPS/localização do celular e tente de novo, ou justifique a falta.";
  if (code === 3) return "A localização demorou demais para responder. Tente de novo em um lugar aberto, ou justifique a falta.";
  return "Este navegador não informa a localização. Use outro navegador para fazer check-in, ou justifique a falta.";
}
