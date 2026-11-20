import { describe, expect, it } from "vitest";
import { decideSeat, nextWaitlistPosition, planDemotions, planWaitlistPromotions, seatsOf, seatsTaken, type SeatedRegistration } from "@/features/events/rules/capacity-rules";
import { suggestCategory } from "@/features/events/rules/category-suggestion";
import { ageClassOf, eventAge, evaluateEventEligibility, type EventAthlete } from "@/features/events/rules/eligibility-rules";
import { assertEventTransition, assertRegistrationTransition, canTransitionEvent, canTransitionRegistration, effectiveRegistrationState, holdsSeat, isRegistrationOpen } from "@/features/events/rules/status-rules";
import { eventInputSchema, parseEligibilityJson, registrationInputSchema } from "@/features/events/schemas";
import { saoPauloInstant } from "@/features/events/dates";
import type { Event } from "@/features/events/types";

const reg = (id: string, status: SeatedRegistration["status"], companions = 0, extra: Partial<SeatedRegistration> = {}): SeatedRegistration => ({
  id, option_id: "opt-1", status, companions, created_at: `2026-01-0${id.length}T00:00:00.000Z`, ...extra
});

describe("status do evento e da inscrição", () => {
  it("aceita só as transições do ciclo", () => {
    expect(canTransitionEvent("draft", "registration_open")).toBe(true);
    expect(canTransitionEvent("completed", "registration_open")).toBe(false);
    expect(canTransitionEvent("cancelled", "published")).toBe(false);
    expect(() => assertEventTransition("completed", "cancelled")).toThrow("event_invalid_transition");
    expect(canTransitionRegistration("waitlisted", "confirmed")).toBe(true);
    expect(canTransitionRegistration("cancelled", "confirmed")).toBe(false);
    expect(() => assertRegistrationTransition("rejected", "confirmed")).toThrow("registration_invalid_transition");
  });

  it("abre e encerra inscrições pelas datas e respeita o status forçado", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    expect(effectiveRegistrationState({ status: "draft" }, now)).toBe("not_open");
    expect(effectiveRegistrationState({ status: "published", registration_opens_at: "2026-06-11T00:00:00Z" }, now)).toBe("not_open");
    expect(effectiveRegistrationState({ status: "published", registration_opens_at: "2026-06-01T00:00:00Z" }, now)).toBe("open");
    expect(effectiveRegistrationState({ status: "registration_open", registration_closes_at: "2026-06-09T00:00:00Z" }, now)).toBe("closed");
    expect(isRegistrationOpen({ status: "registration_open" }, now)).toBe(true);
    expect(isRegistrationOpen({ status: "registration_closed" }, now)).toBe(false);
    expect(isRegistrationOpen({ status: "cancelled" }, now)).toBe(false);
  });

  it("só confirmada, pendente, presente e concluída ocupam vaga", () => {
    expect(["pending_approval", "confirmed", "checked_in", "completed"].every((status) => holdsSeat(status as never))).toBe(true);
    expect(["interested", "waitlisted", "cancelled", "rejected", "no_show"].some((status) => holdsSeat(status as never))).toBe(false);
  });
});

describe("vagas e lista de espera", () => {
  it("conta o participante e os acompanhantes", () => {
    expect(seatsOf({ companions: 2 })).toBe(3);
    expect(seatsTaken([reg("a", "confirmed", 2), reg("b", "waitlisted"), reg("c", "cancelled")])).toBe(3);
  });

  it("confirma se cabe, exige aprovação se configurado e manda para a espera quando lota", () => {
    expect(decideSeat({ eventCapacity: 10, eventTaken: 8, optionTaken: 0, seatsWanted: 2, requiresApproval: false })).toBe("confirmed");
    expect(decideSeat({ eventCapacity: 10, eventTaken: 8, optionTaken: 0, seatsWanted: 2, requiresApproval: true })).toBe("pending_approval");
    expect(decideSeat({ eventCapacity: 10, eventTaken: 9, optionTaken: 0, seatsWanted: 2, requiresApproval: false })).toBe("waitlisted");
    expect(decideSeat({ eventCapacity: null, eventTaken: 500, optionCapacity: 5, optionTaken: 5, seatsWanted: 1, requiresApproval: false })).toBe("waitlisted");
    expect(decideSeat({ eventTaken: 999, optionTaken: 999, seatsWanted: 1, requiresApproval: false })).toBe("confirmed");
  });

  it("promove a espera na ordem e pula quem não cabe", () => {
    const list = [
      reg("a", "confirmed"),
      reg("bb", "waitlisted", 2, { waitlist_position: 1 }),
      reg("ccc", "waitlisted", 0, { waitlist_position: 2 }),
      reg("dddd", "waitlisted", 0, { waitlist_position: 3 })
    ];
    expect(planWaitlistPromotions(list, { eventCapacity: 4 })).toEqual(["bb"]);
    expect(planWaitlistPromotions(list, { eventCapacity: 3 })).toEqual(["ccc", "dddd"]);
    expect(planWaitlistPromotions(list, { eventCapacity: 2 })).toEqual(["ccc"]);
    expect(planWaitlistPromotions(list, { eventCapacity: 1 })).toEqual([]);
    expect(planWaitlistPromotions(list, { eventCapacity: 10, optionCapacities: { "opt-1": 2 } })).toEqual(["ccc"]);
    expect(nextWaitlistPosition(list)).toBe(4);
  });
});

describe("reconciliação de vagas", () => {
  it("rebaixa quem passou do limite, começando por quem chegou por último", () => {
    const list = [reg("a", "confirmed", 0, { created_at: "2026-01-01T10:00:00Z" }), reg("b", "confirmed", 0, { created_at: "2026-01-01T10:00:01Z" }), reg("c", "pending_approval", 0, { created_at: "2026-01-01T10:00:02Z" })];
    expect(planDemotions(list, { eventCapacity: 2 })).toEqual(["c"]);
    expect(planDemotions(list, { eventCapacity: 5 })).toEqual([]);
    expect(planDemotions(list, { eventCapacity: 10, optionCapacities: { "opt-1": 1 } })).toEqual(["b", "c"]);
  });

  it("nunca rebaixa quem já fez check-in", () => {
    const list = [reg("a", "confirmed", 0, { created_at: "2026-01-01T10:00:00Z" }), reg("b", "checked_in", 0, { created_at: "2026-01-01T10:00:01Z" })];
    expect(planDemotions(list, { eventCapacity: 1 })).toEqual(["a"]);
  });
});

describe("elegibilidade e sugestão de categoria", () => {
  const athlete: EventAthlete = { rankKey: "gub-8", birthDate: "2012-12-30", sex: "M", weightGrams: 44000, hasActiveEnrollment: true, hasOverdueCharges: false };
  const event = { startsAt: "2026-03-10T15:00:00.000Z", ageCutoff: "birth_year" as const };

  it("conta a idade pelo ano de nascimento ou pela data do evento", () => {
    expect(eventAge("2012-12-30", event.startsAt, "birth_year")).toBe(14);
    expect(eventAge("2012-12-30", event.startsAt, "event_date")).toBe(13);
    expect(eventAge(null, event.startsAt, "birth_year")).toBeNull();
    expect(ageClassOf(14)?.label).toBe("Cadete");
    expect(ageClassOf(null)).toBeNull();
  });

  it("devolve motivos legíveis", () => {
    const result = evaluateEventEligibility({
      rule: { min_rank_key: "gub-6", min_age: 15, max_weight_grams: 40000, require_no_overdue: true },
      athlete: { ...athlete, hasOverdueCharges: true },
      event,
      rankLabel: () => "6º gub"
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(["há cobrança em atraso", "graduação abaixo do mínimo: exige 6º gub", "idade abaixo do mínimo: 15 anos", "peso acima do máximo: 40 kg"]));
    expect(evaluateEventEligibility({ rule: {}, athlete, event }).eligible).toBe(true);
  });

  it("pede os dados que faltam em vez de aprovar no escuro", () => {
    const result = evaluateEventEligibility({ rule: { sex: "F", min_weight_grams: 1 }, athlete: { ...athlete, sex: null, weightGrams: null }, event });
    expect(result.reasons).toEqual(["sexo não informado", "peso não informado"]);
  });

  it("sugere a primeira categoria elegível", () => {
    const suggestion = suggestCategory({
      athlete,
      event,
      options: [
        { id: "inf", label: "Infantil", rule: { max_age: 11 } },
        { id: "cad", label: "Cadete -45", rule: { min_age: 12, max_age: 14, max_weight_grams: 45000 }, sortOrder: 1 },
        { id: "cad2", label: "Cadete -49", rule: { min_age: 12, max_age: 14, max_weight_grams: 49000 }, sortOrder: 2 }
      ]
    });
    expect(suggestion.suggestedOptionId).toBe("cad");
    expect(suggestion.eligibleOptionIds).toEqual(["cad", "cad2"]);
    expect(suggestion.ineligible).toEqual([{ optionId: "inf", reasons: ["idade acima do máximo: 11 anos"] }]);
    expect(suggestion.ageClass).toBe("Cadete");
    expect(suggestCategory({ athlete, event, options: [{ id: "x", label: "x", rule: { min_age: 30 } }] }).suggestedOptionId).toBeNull();
  });
});

describe("schemas", () => {
  it("ignora JSON de elegibilidade inválido", () => {
    expect(parseEligibilityJson("{ruim")).toEqual({});
    expect(parseEligibilityJson(JSON.stringify({ min_age: 12 }))).toEqual({ min_age: 12 });
    expect(parseEligibilityJson(JSON.stringify({ desconhecido: 1 }))).toEqual({});
  });

  it("valida o evento: exame não passa pelo assistente e o prazo não pode inverter", () => {
    const base = { eventType: "seminar", title: "Aulão de chutes", startsDate: "2026-12-05", startsTime: "09:00", options: [{ label: "Participante", priceCents: 0 }] };
    expect(eventInputSchema.safeParse(base).success).toBe(true);
    expect(eventInputSchema.safeParse({ ...base, eventType: "belt_exam" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, registrationOpensDate: "2026-11-10", registrationClosesDate: "2026-11-01" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, options: [] }).success).toBe(false);
  });

  it("exige nome e WhatsApp de convidado sem conta", () => {
    expect(registrationInputSchema.safeParse({ eventId: "e", optionId: "o" }).success).toBe(false);
    expect(registrationInputSchema.safeParse({ eventId: "e", optionId: "o", guestName: "Maria Souza", guestContact: "(11) 98888-7777" }).success).toBe(true);
    expect(registrationInputSchema.safeParse({ eventId: "e", optionId: "o", studentProfileId: "p" }).success).toBe(true);
  });

  it("converte data e hora de Brasília em instante UTC", () => {
    expect(saoPauloInstant("2026-12-05", "09:00")).toBe("2026-12-05T12:00:00.000Z");
  });
});

describe("agenda", () => {
  it("separa próximos de passados e cancelados", async () => {
    const { splitAgenda } = await import("@/features/events/agenda");
    const item = (id: string, startsAt: string, status = "registration_open") => ({ event: { $id: id, starts_at: startsAt, status } as unknown as Event });
    const now = new Date("2026-06-10T12:00:00Z");
    const result = splitAgenda([item("late", "2026-07-01T12:00:00Z"), item("soon", "2026-06-11T12:00:00Z"), item("old", "2026-05-01T12:00:00Z"), item("cancelled", "2026-06-20T12:00:00Z", "cancelled"), item("today", "2026-06-10T03:00:00Z")], now);
    expect(result.upcoming.map((entry) => entry.event.$id)).toEqual(["today", "soon", "late"]);
    expect(result.past.map((entry) => entry.event.$id)).toEqual(["old", "cancelled"]);
  });
});
