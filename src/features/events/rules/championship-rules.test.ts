import { describe, expect, it } from "vitest";
import { buildCategoryPresets, eligibilitySexOf, WEIGHT_DIVISIONS_KG } from "@/features/events/rules/category-presets";
import { suggestCategory, suggestOptionByWeight, weightFits, weightMisfitReason } from "@/features/events/rules/category-suggestion";
import { deadlineReminder, deadlineReminderCopy, deadlineReminderKey, deadlineState, isCategoryChangeLocked, nextDeadline } from "@/features/events/rules/deadline-rules";
import { evaluateEventEligibility } from "@/features/events/rules/eligibility-rules";
import { buildFederationCsv, csvCell } from "@/features/events/rules/federation-export";
import { classifyForHub } from "@/features/events/rules/hub-rules";
import { canUploadRegistrationDocument, championshipReadiness } from "@/features/events/rules/readiness-rules";
import { summarizeEvents } from "@/features/events/rules/summary-rules";
import { eventDeadlineInputSchema, eventInputSchema, eventResultSchema, federationSubmissionSchema, parseWeightKgToGrams, registrationInputSchema } from "@/features/events/schemas";
import { badgeForExamApproval, badgeForSeminarAttendance, badgesForEventResult, summarizeBadges } from "@/features/students/badge-rules";
import { buildStudentConsistencyReport } from "@/features/students/achievements-rules";

const NOW = new Date("2026-11-19T15:00:00.000Z");
const day = (iso: string) => `${iso}T14:00:00.000Z`;

describe("categorias geradas por modalidade, idade, sexo e peso", () => {
  it("kyorugi gera uma categoria por divisão de peso mais a categoria acima do limite", () => {
    const options = buildCategoryPresets({ modality: "kyorugi", ageClassKeys: ["adulto"], sexes: ["M"], priceCents: 6000, federationFeeCents: 12000 });
    expect(options.map((option) => option.label)).toEqual(["Kyorugi Adulto Masc. -58 kg", "Kyorugi Adulto Masc. -68 kg", "Kyorugi Adulto Masc. -80 kg", "Kyorugi Adulto Masc. +80 kg"]);
    expect(options[1].eligibility).toMatchObject({ min_age: 18, max_age: 32, sex: "M", min_weight_grams: 58000, max_weight_grams: 68000 });
    expect(options[3].eligibility.max_weight_grams).toBeUndefined();
    expect(options.every((option) => option.priceCents === 6000 && option.federationFeeCents === 12000)).toBe(true);
  });

  it("poomsae não usa peso e aplica a faixa mínima", () => {
    const [option] = buildCategoryPresets({ modality: "poomsae", ageClassKeys: ["cadete"], sexes: ["F"], minRankKey: "gub-5" });
    expect(option).toMatchObject({ label: "Poomsae Cadete Fem.", eligibility: { min_age: 12, max_age: 14, sex: "F", min_rank_key: "gub-5" } });
    expect(option.eligibility.max_weight_grams).toBeUndefined();
  });

  it("nunca passa de 30 categorias e as divisões ficam em ordem crescente", () => {
    const all = buildCategoryPresets({ modality: "kyorugi", ageClassKeys: ["infantil", "cadete", "juvenil", "adulto", "master"], sexes: ["M", "F"] });
    expect(all.length).toBe(30);
    for (const sexes of Object.values(WEIGHT_DIVISIONS_KG)) for (const limits of Object.values(sexes)) expect([...limits]).toEqual([...limits].sort((a, b) => a - b));
  });

  it("sugere a categoria pelo peso e explica a inelegibilidade", () => {
    const options = buildCategoryPresets({ modality: "kyorugi", ageClassKeys: ["adulto"], sexes: ["M", "F"] });
    const athlete = { rankKey: "gub-4", birthDate: "1996-05-01", sex: eligibilitySexOf("masculino"), weightGrams: 66000, hasActiveEnrollment: true, hasOverdueCharges: false };
    const result = suggestCategory({ options: options.map((option, index) => ({ id: String(index), label: option.label, rule: option.eligibility, sortOrder: index })), athlete, event: { startsAt: "2026-12-10T12:00:00.000Z", ageCutoff: "birth_year" } });
    expect(options[Number(result.suggestedOptionId)].label).toBe("Kyorugi Adulto Masc. -68 kg");
    expect(result.ageClass).toBe("Adulto");
    expect(result.ineligible.some((item) => item.reasons.includes("categoria feminina"))).toBe(true);
  });

  it("idade pelo ano de nascimento por padrão e pela data exata quando configurado", () => {
    const rule = { min_age: 15, max_age: 17 };
    const athlete = { birthDate: "2011-12-30", hasActiveEnrollment: true, hasOverdueCharges: false };
    // Nascido em dez/2011, evento em jan/2026: 14 anos exatos, mas 15 pelo ano de nascimento.
    expect(evaluateEventEligibility({ rule, athlete, event: { startsAt: "2026-01-10T12:00:00.000Z", ageCutoff: "birth_year" } }).eligible).toBe(true);
    expect(evaluateEventEligibility({ rule, athlete, event: { startsAt: "2026-01-10T12:00:00.000Z", ageCutoff: "event_date" } })).toMatchObject({ eligible: false, reasons: ["idade abaixo do mínimo: 15 anos"] });
  });

  it("sexo e peso entram nos motivos legíveis", () => {
    const result = evaluateEventEligibility({ rule: { sex: "F", min_weight_grams: 49000, max_weight_grams: 57000 }, athlete: { sex: "M", weightGrams: 60000, hasActiveEnrollment: true, hasOverdueCharges: false }, event: { startsAt: "2026-12-01T12:00:00.000Z", ageCutoff: "birth_year" } });
    expect(result.reasons).toEqual(["categoria feminina", "peso acima do máximo: 57 kg"]);
  });

  it("peso cabe na faixa e a sugestão ao vivo escolhe a primeira categoria elegível", () => {
    const range = { minGrams: 58000, maxGrams: 68000 };
    expect(weightFits(range, 68000)).toBe(true);
    expect(weightFits(range, 68001)).toBe(false);
    expect(weightFits(undefined, null)).toBe(true);
    expect(weightFits(range, null)).toBe(false);
    expect(weightMisfitReason(range, 70000)).toBe("peso acima do máximo: 68 kg");
    expect(weightMisfitReason(range, 50000)).toBe("peso abaixo do mínimo: 58 kg");
    expect(weightMisfitReason(range, 60000)).toBeNull();
    const options = [
      { id: "a", eligible: true, range: { maxGrams: 58000 } },
      { id: "b", eligible: false, range: { minGrams: 58000, maxGrams: 68000 } },
      { id: "c", eligible: true, range: { minGrams: 58000, maxGrams: 68000 } }
    ];
    expect(suggestOptionByWeight(options, 60000)?.id).toBe("c");
    expect(suggestOptionByWeight(options, 90000)).toBeNull();
  });
});

describe("prazos e lembretes", () => {
  const deadline = (offsetDays: number, extra: Record<string, unknown> = {}) => ({ $id: "dl", kind: "weigh_in" as const, label: "Pesagem", due_at: new Date(NOW.getTime() + offsetDays * 86400_000).toISOString(), notify_days_before: 3, ...extra });

  it("avisa ao entrar na janela, no dia e nunca depois do prazo", () => {
    expect(deadlineReminder(deadline(5), NOW)).toBeNull();
    expect(deadlineReminder(deadline(3), NOW)).toEqual({ stage: "upcoming", daysLeft: 3 });
    expect(deadlineReminder(deadline(0), NOW)).toEqual({ stage: "today", daysLeft: 0 });
    expect(deadlineReminder(deadline(-1), NOW)).toBeNull();
    expect(deadlineReminder(deadline(2, { notify_days_before: 0 }), NOW)).toBeNull();
  });

  it("gera chave e texto idempotentes por prazo e etapa", () => {
    expect(deadlineReminderKey("dl", "upcoming")).toBe("event-deadline:dl:upcoming");
    expect(deadlineReminderCopy({ label: "Pesagem" }, "Estadual", { stage: "upcoming", daysLeft: 1 })).toEqual({ title: "Prazo em 1 dia: Pesagem", body: "Estadual: o prazo de pesagem termina em 1 dia." });
    expect(deadlineReminderCopy({ label: "Pesagem" }, "Estadual", { stage: "today", daysLeft: 0 }).title).toBe("Prazo hoje: Pesagem");
  });

  it("classifica prazos e acha o próximo", () => {
    expect(deadlineState(deadline(-2), NOW)).toBe("passed");
    expect(deadlineState(deadline(0), NOW)).toBe("today");
    expect(nextDeadline([deadline(-3, { $id: "x" }), deadline(4, { $id: "y" }), deadline(9, { $id: "z" })], NOW)?.$id).toBe("y");
  });

  it("peso e categoria travam no prazo de troca de categoria, ou no fim das inscrições sem esse prazo", () => {
    const common = { eventStartsAt: new Date(NOW.getTime() + 20 * 86400_000).toISOString() };
    expect(isCategoryChangeLocked({ ...common, deadlines: [deadline(2, { kind: "category_change" })] }, NOW)).toBe(false);
    expect(isCategoryChangeLocked({ ...common, deadlines: [deadline(-1, { kind: "category_change" })] }, NOW)).toBe(true);
    expect(isCategoryChangeLocked({ ...common, deadlines: [] }, NOW)).toBe(false);
    expect(isCategoryChangeLocked({ ...common, deadlines: [], registrationClosesAt: new Date(NOW.getTime() - 1000).toISOString() }, NOW)).toBe(true);
  });
});

describe("pendências para confirmar e enviar à federação", () => {
  it("menor precisa da autorização do responsável e do termo; documentos pendentes ou recusados bloqueiam", () => {
    expect(championshipReadiness({ isMinor: true, termsAcceptedAt: null, guardianAuthorizedAt: null, documents: [] }).missing).toEqual(["termo de responsabilidade não aceito", "autorização do responsável pendente"]);
    expect(championshipReadiness({ isMinor: false, termsAcceptedAt: "x", documents: [] })).toEqual({ ready: true, missing: [] });
    const blocked = championshipReadiness({ isMinor: false, termsAcceptedAt: "x", documents: [{ status: "pending", kind: "medical" }, { status: "rejected", kind: "other" }] });
    expect(blocked.ready).toBe(false);
    expect(blocked.missing).toEqual(["documento aguardando revisão", "documento recusado: precisa de novo envio"]);
  });

  it("só aluno adulto, responsável e professor anexam documentos; o menor nunca", () => {
    expect(canUploadRegistrationDocument({ actorRole: "admin", isOwnerOrGuardian: false })).toBe(true);
    expect(canUploadRegistrationDocument({ actorRole: "guardian", isOwnerOrGuardian: true })).toBe(true);
    expect(canUploadRegistrationDocument({ actorRole: "adult_student", isOwnerOrGuardian: true })).toBe(true);
    expect(canUploadRegistrationDocument({ actorRole: "minor_student", isOwnerOrGuardian: true })).toBe(false);
    expect(canUploadRegistrationDocument({ actorRole: "guardian", isOwnerOrGuardian: false })).toBe(false);
  });

  it("a central classifica cada inscrição nas filas certas", () => {
    const base = { student_id: "s", terms_accepted_at: "x", guardian_authorized_at: "y", external_submitted_at: null } as const;
    expect(classifyForHub({ registration: { ...base, status: "interested" }, eventType: "championship", isMinor: false, documents: [], hasOpenCharge: false })).toEqual(["interest"]);
    expect(classifyForHub({ registration: { ...base, status: "interested", guardian_authorized_at: null }, eventType: "championship", isMinor: true, documents: [], hasOpenCharge: false })).toEqual(["interest", "authorization"]);
    expect(classifyForHub({ registration: { ...base, status: "confirmed" }, eventType: "championship", isMinor: false, documents: [], hasOpenCharge: true })).toEqual(["payment", "submit"]);
    expect(classifyForHub({ registration: { ...base, status: "confirmed", external_submitted_at: "z" }, eventType: "championship", isMinor: false, documents: [], hasOpenCharge: false })).toEqual([]);
    expect(classifyForHub({ registration: { ...base, status: "confirmed" }, eventType: "championship", isMinor: false, documents: [{ status: "pending", kind: "medical" }], hasOpenCharge: false })).toEqual(["documents"]);
    expect(classifyForHub({ registration: { ...base, status: "pending_approval" }, eventType: "seminar", isMinor: false, documents: [], hasOpenCharge: true })).toEqual(["approval", "payment"]);
    expect(classifyForHub({ registration: { ...base, status: "waitlisted" }, eventType: "seminar", isMinor: false, documents: [], hasOpenCharge: false })).toEqual(["waitlist"]);
    expect(classifyForHub({ registration: { ...base, status: "cancelled" }, eventType: "seminar", isMinor: false, documents: [], hasOpenCharge: false })).toEqual([]);
  });
});

describe("exportação para a federação", () => {
  it("neutraliza fórmulas e escapa aspas e delimitadores", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+55 21")).toBe("'+55 21");
    expect(csvCell("João; Silva")).toBe('"João; Silva"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(12)).toBe("12");
  });

  it("monta o CSV com cabeçalho, BOM e campos formatados", () => {
    const csv = buildFederationCsv([{ name: "Ana Souza", birthDate: "2012-03-04T12:00:00.000Z", sex: "feminino", beltName: "Faixa Azul", ageClass: "Cadete", category: "Kyorugi Cadete Fem. -41 kg", modality: "Kyorugi", declaredWeightGrams: 40500, authorized: true, submitted: false }]);
    const [header, line] = csv.replace("﻿", "").trim().split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(header).toBe("Nome;Data de nascimento;Sexo;Faixa;Classe de idade;Categoria;Modalidade;Peso declarado;Autorização do responsável;Enviado à federação");
    expect(line).toBe("Ana Souza;04/03/2012;Feminino;Faixa Azul;Cadete;Kyorugi Cadete Fem. -41 kg;Kyorugi;40,5 kg;Sim;Não");
  });
});

describe("conquistas (badges)", () => {
  it("resultado gera participação e medalha com chaves idempotentes por origem", () => {
    const gold = badgesForEventResult({ studentId: "s", resultId: "r1", eventId: "e", eventTitle: "Estadual", medal: "gold" });
    expect(gold.map((badge) => badge.kind)).toEqual(["participation", "medal_gold"]);
    expect(gold.map((badge) => badge.sourceKey)).toEqual(["event_result:r1:participation", "event_result:r1:medal_gold"]);
    expect(badgesForEventResult({ studentId: "s", resultId: "r2", eventId: "e", eventTitle: "Estadual", medal: "none" }).map((badge) => badge.kind)).toEqual(["participation"]);
    expect(badgesForEventResult({ studentId: "s", resultId: "r1", eventId: "e", eventTitle: "Estadual", medal: "gold" })[1].sourceKey).toBe(gold[1].sourceKey);
  });

  it("presença em seminário e aprovação em exame têm origem própria", () => {
    expect(badgeForSeminarAttendance({ studentId: "s", registrationId: "reg", eventId: "e", eventTitle: "Aulão" })).toMatchObject({ kind: "seminar_attendance", source: "event_attendance", sourceKey: "event_attendance:reg:seminar_attendance" });
    expect(badgeForExamApproval({ studentId: "s", participantId: "p", eventId: "e", beltName: "Azul" })).toMatchObject({ kind: "exam_approved", source: "exam_result", sourceKey: "exam_result:p:exam_approved" });
  });

  it("alimenta as metas de eventos e medalhas da política de conquistas", () => {
    const earned = [{ kind: "participation" as const }, { kind: "medal_gold" as const }, { kind: "seminar_attendance" as const }];
    expect(summarizeBadges(earned)).toMatchObject({ events: 2, medals: 1, gold: 1 });
    const report = buildStudentConsistencyReport({ entries: [], beltHistory: [], earnedBadges: earned, referenceDate: "2026-11-18" });
    expect(report.badges.find((badge) => badge.id === "first-event")).toMatchObject({ unlocked: true });
    expect(report.badges.find((badge) => badge.id === "first-medal")).toMatchObject({ unlocked: true });
    expect(buildStudentConsistencyReport({ entries: [], beltHistory: [], referenceDate: "2026-11-18" }).badges.find((badge) => badge.id === "first-medal")?.unlocked).toBe(false);
  });
});

describe("resumo de eventos do período", () => {
  it("conta eventos realizados, presenças e medalhas, ignorando rascunho, cancelado e exame", () => {
    const events = [
      { $id: "a", event_type: "championship" as const, status: "completed" as const, starts_at: day("2026-11-10") },
      { $id: "b", event_type: "seminar" as const, status: "registration_open" as const, starts_at: day("2026-11-20") },
      { $id: "c", event_type: "seminar" as const, status: "cancelled" as const, starts_at: day("2026-11-21") },
      { $id: "d", event_type: "belt_exam" as const, status: "completed" as const, starts_at: day("2026-11-22") },
      { $id: "e", event_type: "social" as const, status: "completed" as const, starts_at: day("2026-10-02") }
    ];
    const summary = summarizeEvents({ events, presentRegistrations: [{ event_id: "a" }, { event_id: "a" }, { event_id: "e" }], results: [{ event_id: "a", medal: "gold" }, { event_id: "a", medal: "bronze" }, { event_id: "a", medal: "none" }, { event_id: "e", medal: "silver" }], prefix: "2026-11" });
    expect(summary).toEqual({ events: 2, championships: 1, participants: 2, gold: 1, silver: 0, bronze: 1 });
    expect(summarizeEvents({ events, presentRegistrations: [], results: [], prefix: "2026" }).events).toBe(3);
  });
});

describe("validação de entrada do campeonato", () => {
  const base = { eventType: "championship" as const, title: "Estadual", startsDate: "2026-12-14", startsTime: "09:00", organizerType: "external" as const, options: [{ label: "Kyorugi", priceCents: 6000, federationFeeCents: 12000, modality: "kyorugi" as const }] };

  it("aceita cronograma e taxa da federação por categoria", () => {
    const parsed = eventInputSchema.parse({ ...base, deadlines: [{ kind: "weigh_in", dueDate: "2026-12-13" }] });
    expect(parsed.deadlines[0]).toMatchObject({ kind: "weigh_in", notifyDaysBefore: 3 });
    expect(parsed.options[0].federationFeeCents).toBe(12000);
    expect(eventInputSchema.parse(base).deadlines).toEqual([]);
    expect(() => eventDeadlineInputSchema.parse({ kind: "weigh_in", dueDate: "13/12/2026" })).toThrow();
    expect(() => eventDeadlineInputSchema.parse({ kind: "weigh_in", dueDate: "2026-12-13", notifyDaysBefore: 99 })).toThrow();
  });

  it("converte peso em kg para gramas e valida limites", () => {
    expect(parseWeightKgToGrams("45,5")).toBe(45500);
    expect(parseWeightKgToGrams("45.5 kg")).toBe(45500);
    expect(parseWeightKgToGrams("abc")).toBeNull();
    expect(parseWeightKgToGrams("")).toBeNull();
    expect(registrationInputSchema.parse({ eventId: "e", optionId: "o", studentProfileId: "p", declaredWeightGrams: "" }).declaredWeightGrams).toBeUndefined();
    expect(() => registrationInputSchema.parse({ eventId: "e", optionId: "o", studentProfileId: "p", declaredWeightGrams: 500 })).toThrow("Informe um peso válido");
  });

  it("valida resultado e lote de envio", () => {
    expect(eventResultSchema.parse({ registrationId: "r", medal: "silver", placement: "2" })).toMatchObject({ medal: "silver", placement: 2 });
    expect(() => eventResultSchema.parse({ registrationId: "r", medal: "platina" })).toThrow();
    expect(() => federationSubmissionSchema.parse({ registrationIds: [] })).toThrow("Selecione ao menos um atleta");
  });
});
