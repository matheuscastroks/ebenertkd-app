import { z } from "zod";
import { isRankKey } from "@/features/academy/ranks";
import { EVENT_TYPES } from "@/features/events/types";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

/** Regras de elegibilidade de uma opção (`event_options.eligibility_json`). Tudo opcional. */
export const eligibilityRuleSchema = z
  .object({
    min_rank_key: z.string().refine(isRankKey, "Graduação inválida").optional(),
    max_rank_key: z.string().refine(isRankKey, "Graduação inválida").optional(),
    min_age: z.number().int().min(0).max(120).optional(),
    max_age: z.number().int().min(0).max(120).optional(),
    sex: z.enum(["M", "F"]).optional(),
    min_weight_grams: z.number().int().min(0).optional(),
    max_weight_grams: z.number().int().min(0).optional(),
    require_active_enrollment: z.boolean().optional(),
    require_no_overdue: z.boolean().optional()
  })
  .strict();
export type EligibilityRule = z.infer<typeof eligibilityRuleSchema>;

/** Lê o JSON salvo na opção; JSON inválido vale como "sem regras" (nunca quebra a tela). */
export function parseEligibilityJson(value: string | null | undefined): EligibilityRule {
  if (!value) return {};
  try {
    const parsed = eligibilityRuleSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export const eventOptionInputSchema = z.object({
  label: z.string().trim().min(2, "Informe o nome da opção").max(128),
  priceCents: z.coerce.number().int().min(0).default(0),
  /** Taxa da federação (campeonato), cobrada separadamente dos custos da academia. */
  federationFeeCents: z.coerce.number().int().min(0).default(0),
  capacity: z.coerce.number().int().min(1).optional(),
  modality: z.enum(["kyorugi", "poomsae", "festival", "team", "general"]).default("general"),
  eligibility: eligibilityRuleSchema.optional()
});

export const eventDeadlineInputSchema = z.object({
  kind: z.enum(["affiliation", "registration", "category_change", "weigh_in", "payment", "custom"]),
  label: z.string().trim().max(128).optional(),
  dueDate: isoDay,
  notifyDaysBefore: z.coerce.number().int().min(0).max(60).default(3)
});
export type EventDeadlineInput = z.infer<typeof eventDeadlineInputSchema>;

/** Eventos simples e demais tipos criados pelo assistente (exames têm schema próprio em `features/exams`). */
export const eventInputSchema = z
  .object({
    eventType: z.enum(EVENT_TYPES).refine((value) => value !== "belt_exam", "Exames são criados em Eventos > Exames de faixa"),
    title: z.string().trim().min(3, "Informe o nome do evento").max(128),
    description: optionalText(4000),
    startsDate: isoDay,
    startsTime: hhmm,
    endsTime: hhmm.optional(),
    locationId: z.string().trim().max(36).optional(),
    locationText: optionalText(160),
    organizerType: z.enum(["academy", "external"]).default("academy"),
    organizerName: optionalText(128),
    registrationOpensDate: isoDay.optional(),
    registrationClosesDate: isoDay.optional(),
    audience: z.enum(["students", "students_and_guests", "public"]).default("students"),
    requiresApproval: z.boolean().default(false),
    capacity: z.coerce.number().int().min(1).optional(),
    maxCompanions: z.coerce.number().int().min(0).max(10).default(0),
    companionPriceCents: z.coerce.number().int().min(0).default(0),
    ageCutoff: z.enum(["birth_year", "event_date"]).default("birth_year"),
    externalUrl: optionalText(512),
    options: z.array(eventOptionInputSchema).min(1, "Cadastre ao menos uma opção de inscrição").max(30),
    /** Cronograma (campeonato): filiação, inscrição, troca de categoria, pesagem... Cada prazo gera lembretes. */
    deadlines: z.array(eventDeadlineInputSchema).max(12).default([]),
    publish: z.boolean().default(true)
  })
  .superRefine((value, ctx) => {
    if (value.registrationOpensDate && value.registrationClosesDate && value.registrationClosesDate < value.registrationOpensDate) {
      ctx.addIssue({ code: "custom", path: ["registrationClosesDate"], message: "O encerramento não pode ser antes da abertura" });
    }
    if (value.endsTime && value.endsTime < value.startsTime) {
      ctx.addIssue({ code: "custom", path: ["endsTime"], message: "O término não pode ser antes do início" });
    }
  });
export type EventInput = z.infer<typeof eventInputSchema>;

/** Aceita gramas (número) ou vazio. O formulário converte "45,5" kg em gramas antes de validar. */
const optionalWeightGrams = z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(10_000, "Informe um peso válido").max(250_000, "Informe um peso válido").optional());

/** Converte texto em kg ("45,5", "45.5 kg") para gramas; null se inválido. */
export function parseWeightKgToGrams(value: string | null | undefined): number | null {
  const normalized = (value ?? "").toLowerCase().replace("kg", "").trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,3})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 1000);
}

export const registrationInputSchema = z
  .object({
    eventId: z.string().min(1).max(36),
    optionId: z.string().min(1).max(36),
    /** Aluno inscrito (perfil do aluno). Ausente para convidado sem conta. */
    studentProfileId: z.string().min(1).max(36).optional(),
    companions: z.coerce.number().int().min(0).max(10).default(0),
    guestName: z.string().trim().min(3, "Informe o nome").max(128).optional(),
    guestContact: z.string().trim().max(24).optional(),
    acceptedTerms: z.boolean().default(false),
    /** Peso declarado do atleta (campeonato), em gramas. */
    declaredWeightGrams: optionalWeightGrams,
    notes: optionalText(500)
  })
  .superRefine((value, ctx) => {
    if (!value.studentProfileId) {
      if (!value.guestName) ctx.addIssue({ code: "custom", path: ["guestName"], message: "Informe o nome do convidado" });
      const digits = (value.guestContact ?? "").replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) ctx.addIssue({ code: "custom", path: ["guestContact"], message: "Informe um WhatsApp válido" });
    }
  });
export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export const cancelRegistrationSchema = z.object({
  registrationId: z.string().min(1).max(36),
  decision: z.enum(["future_credit", "keep_charge"]).optional()
});

export const cancelEventSchema = z.object({
  eventId: z.string().min(1).max(36),
  reason: z.string().trim().min(3, "Informe o motivo").max(255),
  decision: z.enum(["future_credit", "keep_charge"]).optional()
});

export const updateWeightSchema = z.object({
  registrationId: z.string().min(1).max(36),
  declaredWeightGrams: z.coerce.number().int().min(10_000, "Informe um peso válido").max(250_000, "Informe um peso válido")
});

export const eventResultSchema = z.object({
  registrationId: z.string().min(1).max(36),
  medal: z.enum(["gold", "silver", "bronze", "none"]),
  placement: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(1).max(999).optional()),
  notes: optionalText(500),
  /** Não compareceu (ex.: pesagem): vira `no_show`, sem resultado nem conquistas. */
  absent: z.boolean().optional()
});

export const registrationDocumentKindSchema = z.enum(["guardian_authorization", "responsibility_term", "medical", "federation_card", "other"]);

export const federationSubmissionSchema = z.object({
  registrationIds: z.array(z.string().min(1).max(36)).min(1, "Selecione ao menos um atleta").max(300),
  submitted: z.boolean().default(true)
});
