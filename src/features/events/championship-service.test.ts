import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/auth/types";

const store = vi.hoisted(() => ({ rows: {} as Record<string, Record<string, Record<string, unknown>>>, links: new Set<string>(), files: new Set<string>(), seq: 0 }));
const notify = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock("@/features/auth/service", () => ({ writeAuditEvent: vi.fn(async () => undefined) }));
vi.mock("@/features/notifications/notification-service", () => ({ notifyStudentFinancial: vi.fn(async () => undefined), notifyStudentEvent: notify, notifyAdmins: vi.fn(async () => undefined) }));
vi.mock("@/features/students/service", () => ({ getEnrollmentBundleByStudentId: vi.fn() }));
vi.mock("@/features/academy/config-service", () => ({ getPolicy: vi.fn(async () => ({})), getBeltRanks: vi.fn(async () => []) }));
vi.mock("@/features/students/access", () => {
  const allowed = (actor: Profile, profileId: string) => actor.role === "admin" || actor.$id === profileId || store.links.has(`${actor.$id}>${profileId}`);
  return {
    resolveStudentProfile: async (actor: Profile, profileId?: string | null) => {
      const target = profileId || actor.$id;
      if (!allowed(actor, target)) throw new Error("student_access_denied");
      return store.rows.profiles?.[target];
    },
    canAccessStudent: async (actor: Profile, profileId: string) => allowed(actor, profileId)
  };
});
vi.mock("@/lib/appwrite/server", async () => {
  const { AppwriteException } = await import("node-appwrite");
  const table = (id: string) => (store.rows[id] ??= {});
  const matches = (row: Record<string, unknown>, queries: string[] = []) =>
    queries.every((raw) => {
      const query = JSON.parse(String(raw)) as { method: string; attribute?: string; values?: unknown[] };
      if (query.method !== "equal") return true;
      return (query.values ?? []).includes(row[query.attribute!]);
    });
  return {
    createAppwriteAdminClient: () => ({
      config: { databaseId: "db" },
      storage: {
        createFile: async ({ fileId }: { fileId: string }) => {
          store.files.add(fileId);
          return { $id: fileId };
        },
        deleteFile: async ({ fileId }: { fileId: string }) => void store.files.delete(fileId),
        getFileDownload: async () => new ArrayBuffer(8)
      },
      tables: {
        createRow: async ({ tableId, rowId, data }: { tableId: string; rowId: string; data: Record<string, unknown> }) => {
          if (table(tableId)[rowId]) throw new AppwriteException("exists", 409, "row_already_exists");
          table(tableId)[rowId] = { $id: rowId, $createdAt: `2026-01-01T00:00:${String(++store.seq).padStart(4, "0")}.000Z`, ...data };
          return table(tableId)[rowId];
        },
        getRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
          const row = table(tableId)[rowId];
          if (!row) throw new AppwriteException("missing", 404, "row_not_found");
          return row;
        },
        updateRow: async ({ tableId, rowId, data }: { tableId: string; rowId: string; data: Record<string, unknown> }) => {
          const row = table(tableId)[rowId];
          if (!row) throw new AppwriteException("missing", 404, "row_not_found");
          for (const [key, value] of Object.entries(data)) if (value !== undefined) row[key] = value;
          return row;
        },
        listRows: async ({ tableId, queries }: { tableId: string; queries?: string[] }) => {
          const rows = Object.values(table(tableId)).filter((row) => matches(row, queries));
          return { total: rows.length, rows };
        }
      }
    })
  };
});

import { confirmChampionshipRegistration, recordEventResult, setFederationSubmission, updateDeclaredWeight } from "@/features/events/championship-service";
import { downloadRegistrationDocument, reviewRegistrationDocument, uploadRegistrationDocument } from "@/features/events/registration-documents-service";
import { cancelRegistration, confirmInterest, registerForEvent } from "@/features/events/registration-service";

const admin = { $id: "admin-1", account_id: "acc-admin", role: "admin", capabilities: ["admin"] } as Profile;
const adult = { $id: "adult-1", account_id: "acc-adult", role: "adult_student", capabilities: ["student"] } as Profile;
const adult2 = { $id: "adult-2", account_id: "acc-adult2", role: "adult_student", capabilities: ["student"] } as Profile;
const guardian = { $id: "guardian-1", account_id: "acc-guardian", role: "guardian", capabilities: ["guardian"] } as Profile;
const stranger = { $id: "guardian-9", account_id: "acc-stranger", role: "guardian", capabilities: ["guardian"] } as Profile;
const minor = { $id: "minor-1", account_id: "acc-minor", role: "minor_student", capabilities: ["student"] } as Profile;

const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString();
const PAST = new Date(Date.now() - 2 * 86400_000).toISOString();

function seed({ deadlines = [] as Record<string, unknown>[] } = {}) {
  store.rows = { profiles: {}, students: {}, enrollments: {}, events: {}, event_options: {}, event_registrations: {}, event_deadlines: {}, event_registration_documents: {}, event_results: {}, charges: {}, student_badges: {} };
  store.links = new Set(["guardian-1>minor-1"]);
  store.files = new Set();
  store.seq = 0;
  for (const profile of [admin, adult, adult2, guardian, stranger, minor]) store.rows.profiles[profile.$id] = profile as unknown as Record<string, unknown>;
  const students = [
    ["stu-adult", "adult-1", "1996-05-01T12:00:00.000Z", "masculino"],
    ["stu-adult2", "adult-2", "1996-06-01T12:00:00.000Z", "feminino"],
    ["stu-minor", "minor-1", "2012-05-01T12:00:00.000Z", "masculino"]
  ] as const;
  for (const [id, profileId, birth, sex] of students) {
    store.rows.students[id] = { $id: id, profile_id: profileId, full_name: id, birth_date: birth, sex, rank_key: "gub-4" };
    store.rows.enrollments[`enr-${id}`] = { $id: `enr-${id}`, student_id: id, status: "active" };
  }
  store.rows.events.ch = { $id: "ch", event_type: "championship", title: "Estadual", status: "registration_open", starts_at: FUTURE, audience: "students", requires_approval: false, age_cutoff: "birth_year" };
  store.rows.event_options["opt-adult-m"] = { $id: "opt-adult-m", event_id: "ch", label: "Kyorugi Adulto Masc. -80 kg", modality: "kyorugi", price_cents: 6000, federation_fee_cents: 12000, max_per_registrant_group: "kyorugi", eligibility_json: JSON.stringify({ min_age: 18, max_age: 32, sex: "M", min_weight_grams: 68000, max_weight_grams: 80000 }), sort_order: 0 };
  store.rows.event_options["opt-adult-m2"] = { $id: "opt-adult-m2", event_id: "ch", label: "Kyorugi Adulto Masc. -68 kg", modality: "kyorugi", price_cents: 6000, federation_fee_cents: 12000, max_per_registrant_group: "kyorugi", eligibility_json: JSON.stringify({ min_age: 18, max_age: 32, sex: "M", max_weight_grams: 68000 }), sort_order: 1 };
  store.rows.event_options["opt-cadete-m"] = { $id: "opt-cadete-m", event_id: "ch", label: "Kyorugi Cadete Masc. -45 kg", modality: "kyorugi", price_cents: 6000, federation_fee_cents: 12000, max_per_registrant_group: "kyorugi", eligibility_json: JSON.stringify({ min_age: 12, max_age: 14, sex: "M", max_weight_grams: 45000 }), sort_order: 2 };
  store.rows.event_options["opt-poomsae-f"] = { $id: "opt-poomsae-f", event_id: "ch", label: "Poomsae Adulto Fem.", modality: "poomsae", price_cents: 0, eligibility_json: JSON.stringify({ min_age: 18, sex: "F" }), sort_order: 3 };
  deadlines.forEach((deadline, index) => (store.rows.event_deadlines[`dl-${index}`] = { $id: `dl-${index}`, event_id: "ch", ...deadline }));
}

const adultInput = (extra: Record<string, unknown> = {}) => ({ eventId: "ch", optionId: "opt-adult-m", studentProfileId: "adult-1", acceptedTerms: true, declaredWeightGrams: 75000, ...extra });
const registrations = () => Object.values(store.rows.event_registrations);
const charges = () => Object.values(store.rows.charges);
const badges = () => Object.values(store.rows.student_badges);

// jsdom não implementa File.arrayBuffer: um arquivo mínimo com o mesmo contrato basta para o serviço.
const fakeFile = (bytes: Uint8Array, name: string, type: string) => ({ name, type, size: bytes.length, arrayBuffer: async () => bytes.buffer }) as unknown as File;
const pdf = (name = "autorizacao.pdf") => fakeFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x31]), name, "application/pdf");

beforeEach(() => {
  seed();
  notify.mockClear();
});

describe("interesse em campeonato", () => {
  it("registra interesse sem reservar vaga nem cobrar, guardando peso e valores congelados", async () => {
    const row = await registerForEvent(adult, adultInput());
    expect(row).toMatchObject({ status: "interested", student_id: "stu-adult", declared_weight_grams: 75000, price_cents: 6000, federation_price_cents: 12000 });
    expect(charges()).toHaveLength(0);
    expect((await registerForEvent(adult, adultInput())).$id).toBe(row.$id);
    expect(registrations()).toHaveLength(1);
  });

  it("recusa peso fora da categoria, peso ausente, sexo errado e convidado", async () => {
    await expect(registerForEvent(adult, adultInput({ declaredWeightGrams: 60000 }))).rejects.toThrow("event_not_eligible");
    await expect(registerForEvent(adult, adultInput({ declaredWeightGrams: undefined }))).rejects.toThrow("event_not_eligible");
    await expect(registerForEvent(adult2, adultInput({ studentProfileId: "adult-2" }))).rejects.toThrow("event_not_eligible");
    await expect(registerForEvent(adult, { eventId: "ch", optionId: "opt-adult-m", guestName: "Visitante", guestContact: "21999998888", acceptedTerms: true })).rejects.toThrow("event_guests_not_allowed");
  });

  it("permite uma categoria por modalidade; o professor pode forçar", async () => {
    await registerForEvent(adult, adultInput());
    await expect(registerForEvent(adult, adultInput({ optionId: "opt-adult-m2", declaredWeightGrams: 66000 }))).rejects.toThrow("event_category_limit");
    await expect(registerForEvent(admin, adultInput({ optionId: "opt-adult-m2", declaredWeightGrams: 66000, acceptedTerms: false }))).resolves.toMatchObject({ status: "interested" });
  });

  it("responsável registra o dependente já autorizando; o menor sozinho só manifesta interesse", async () => {
    const byGuardian = await registerForEvent(guardian, { eventId: "ch", optionId: "opt-cadete-m", studentProfileId: "minor-1", acceptedTerms: true, declaredWeightGrams: 43000 });
    expect(byGuardian).toMatchObject({ status: "interested", guardian_account_id: "acc-guardian" });
    expect(byGuardian.guardian_authorized_at).toBeTruthy();
    seed();
    const bySelf = await registerForEvent(minor, { eventId: "ch", optionId: "opt-cadete-m", studentProfileId: "minor-1", acceptedTerms: false, declaredWeightGrams: 43000 });
    expect(bySelf).toMatchObject({ status: "interested" });
    expect(bySelf.guardian_authorized_at).toBeUndefined();
  });

  it("outro responsável ou aluno não inscreve nem autoriza alheios", async () => {
    await expect(registerForEvent(stranger, { eventId: "ch", optionId: "opt-cadete-m", studentProfileId: "minor-1", acceptedTerms: true, declaredWeightGrams: 43000 })).rejects.toThrow("student_access_denied");
    await expect(registerForEvent(adult2, adultInput())).rejects.toThrow("student_access_denied");
  });

  it("responsável autoriza o interesse do menor sem confirmar a vaga; o menor não autoriza", async () => {
    const row = await registerForEvent(minor, { eventId: "ch", optionId: "opt-cadete-m", studentProfileId: "minor-1", acceptedTerms: false, declaredWeightGrams: 43000 });
    await expect(confirmInterest(minor, row.$id)).rejects.toThrow("guardian_required");
    await expect(confirmInterest(stranger, row.$id)).rejects.toThrow("registration_forbidden");
    const authorized = await confirmInterest(guardian, row.$id);
    expect(authorized.status).toBe("interested");
    expect(authorized.guardian_authorized_at).toBeTruthy();
    expect(charges()).toHaveLength(0);
  });
});

describe("confirmação na equipe", () => {
  it("só o professor confirma", async () => {
    const row = await registerForEvent(adult, adultInput());
    for (const actor of [adult, guardian, minor, stranger]) await expect(confirmChampionshipRegistration(actor, row.$id)).rejects.toThrow("admin_required");
  });

  it("cria duas cobranças (academia e federação), de forma idempotente", async () => {
    const row = await registerForEvent(adult, adultInput());
    const confirmed = await confirmChampionshipRegistration(admin, row.$id);
    expect(confirmed.status).toBe("confirmed");
    expect(charges()).toHaveLength(2);
    expect(charges().map((charge) => Number(charge.amount_cents)).sort((a, b) => a - b)).toEqual([6000, 12000]);
    expect(confirmed.charge_id).toBeTruthy();
    expect(confirmed.federation_charge_id).toBeTruthy();
    await confirmChampionshipRegistration(admin, row.$id);
    expect(charges()).toHaveLength(2);
  });

  it("exige autorização do responsável e documentos aprovados, a menos que o professor force", async () => {
    const row = await registerForEvent(minor, { eventId: "ch", optionId: "opt-cadete-m", studentProfileId: "minor-1", acceptedTerms: false, declaredWeightGrams: 43000 });
    await expect(confirmChampionshipRegistration(admin, row.$id)).rejects.toThrow("registration_not_ready");
    await confirmInterest(guardian, row.$id);
    store.rows.event_registration_documents.d1 = { $id: "d1", registration_id: row.$id, kind: "guardian_authorization", status: "pending" };
    await expect(confirmChampionshipRegistration(admin, row.$id)).rejects.toThrow("registration_not_ready");
    store.rows.event_registration_documents.d1.status = "approved";
    await expect(confirmChampionshipRegistration(admin, row.$id)).resolves.toMatchObject({ status: "confirmed" });
  });

  it("reavalia a elegibilidade de hoje (faixa) na confirmação", async () => {
    store.rows.event_options["opt-adult-m"].eligibility_json = JSON.stringify({ min_age: 18, sex: "M", min_rank_key: "gub-5" });
    const row = await registerForEvent(adult, adultInput({ declaredWeightGrams: undefined }));
    store.rows.event_options["opt-adult-m"].eligibility_json = JSON.stringify({ min_age: 18, sex: "M", min_rank_key: "gub-3" });
    await expect(confirmChampionshipRegistration(admin, row.$id)).rejects.toThrow("event_not_eligible");
    await expect(confirmChampionshipRegistration(admin, row.$id, { force: true })).resolves.toMatchObject({ status: "confirmed" });
  });

  it("cancelar cancela as duas cobranças em aberto", async () => {
    const row = await registerForEvent(adult, adultInput());
    await confirmChampionshipRegistration(admin, row.$id);
    await cancelRegistration(admin, { registrationId: row.$id });
    expect(charges().every((charge) => charge.status === "cancelled")).toBe(true);
  });
});

describe("envio à federação", () => {
  it("só o professor marca; pendências ficam de fora; é idempotente", async () => {
    const ready = await registerForEvent(adult, adultInput());
    await confirmChampionshipRegistration(admin, ready.$id);
    await expect(setFederationSubmission(adult, { registrationIds: [ready.$id] })).rejects.toThrow("admin_required");
    await expect(setFederationSubmission(guardian, { registrationIds: [ready.$id] })).rejects.toThrow("admin_required");
    const result = await setFederationSubmission(admin, { registrationIds: [ready.$id, "inexistente"] });
    expect(result).toEqual({ done: [ready.$id], skipped: ["inexistente"] });
    const stamped = registrations()[0].external_submitted_at;
    expect(stamped).toBeTruthy();
    await setFederationSubmission(admin, { registrationIds: [ready.$id] });
    expect(registrations()[0].external_submitted_at).toBe(stamped);
    await setFederationSubmission(admin, { registrationIds: [ready.$id], submitted: false });
    expect(registrations()[0].external_submitted_at).toBeNull();
  });

  it("não envia quem ainda não foi confirmado", async () => {
    const row = await registerForEvent(adult, adultInput());
    expect(await setFederationSubmission(admin, { registrationIds: [row.$id] })).toEqual({ done: [], skipped: [row.$id] });
  });
});

describe("peso declarado", () => {
  it("aluno e responsável corrigem o próprio peso; menor e estranhos não", async () => {
    const row = await registerForEvent(adult, adultInput());
    await expect(updateDeclaredWeight(adult, { registrationId: row.$id, declaredWeightGrams: 78000 })).resolves.toMatchObject({ declared_weight_grams: 78000 });
    await expect(updateDeclaredWeight(adult2, { registrationId: row.$id, declaredWeightGrams: 77000 })).rejects.toThrow("registration_forbidden");
    await expect(updateDeclaredWeight(minor, { registrationId: row.$id, declaredWeightGrams: 77000 })).rejects.toThrow("registration_forbidden");
    const kid = await registerForEvent(guardian, { eventId: "ch", optionId: "opt-cadete-m", studentProfileId: "minor-1", acceptedTerms: true, declaredWeightGrams: 43000 });
    await expect(updateDeclaredWeight(guardian, { registrationId: kid.$id, declaredWeightGrams: 44000 })).resolves.toMatchObject({ declared_weight_grams: 44000 });
    await expect(updateDeclaredWeight(minor, { registrationId: kid.$id, declaredWeightGrams: 40000 })).rejects.toThrow("registration_forbidden");
  });

  it("o novo peso precisa continuar na categoria", async () => {
    const row = await registerForEvent(adult, adultInput());
    await expect(updateDeclaredWeight(adult, { registrationId: row.$id, declaredWeightGrams: 90000 })).rejects.toThrow("event_not_eligible");
    await expect(updateDeclaredWeight(adult, { registrationId: row.$id, declaredWeightGrams: 500 })).rejects.toThrow();
  });

  it("trava depois do prazo de troca de categoria; o professor ainda altera", async () => {
    seed({ deadlines: [{ kind: "category_change", label: "Troca de categoria", due_at: PAST, notify_days_before: 3 }] });
    const row = await registerForEvent(admin, adultInput({ acceptedTerms: false }));
    await expect(updateDeclaredWeight(adult, { registrationId: row.$id, declaredWeightGrams: 76000 })).rejects.toThrow("event_category_locked");
    await expect(updateDeclaredWeight(admin, { registrationId: row.$id, declaredWeightGrams: 76000 })).resolves.toMatchObject({ declared_weight_grams: 76000 });
  });

  it("depois de enviado à federação só o professor altera", async () => {
    const row = await registerForEvent(adult, adultInput());
    await confirmChampionshipRegistration(admin, row.$id);
    await setFederationSubmission(admin, { registrationIds: [row.$id] });
    await expect(updateDeclaredWeight(adult, { registrationId: row.$id, declaredWeightGrams: 76000 })).rejects.toThrow("registration_already_submitted");
  });
});

describe("resultados e conquistas", () => {
  async function confirmedRegistration() {
    const row = await registerForEvent(adult, adultInput());
    await confirmChampionshipRegistration(admin, row.$id);
    return row;
  }

  it("só o professor registra; medalha gera participação e medalha, uma única vez", async () => {
    const row = await confirmedRegistration();
    for (const actor of [adult, guardian, minor]) await expect(recordEventResult(actor, { registrationId: row.$id, medal: "gold" })).rejects.toThrow("admin_required");
    await recordEventResult(admin, { registrationId: row.$id, medal: "gold", placement: "1" });
    expect(Object.values(store.rows.event_results)).toHaveLength(1);
    expect(badges().map((badge) => badge.kind).sort()).toEqual(["medal_gold", "participation"]);
    expect(registrations()[0].status).toBe("completed");
    await recordEventResult(admin, { registrationId: row.$id, medal: "gold", placement: "1" });
    expect(Object.values(store.rows.event_results)).toHaveLength(1);
    expect(badges()).toHaveLength(2);
  });

  it("participação sem medalha gera só o badge de participação", async () => {
    const row = await confirmedRegistration();
    await recordEventResult(admin, { registrationId: row.$id, medal: "none" });
    expect(badges().map((badge) => badge.kind)).toEqual(["participation"]);
  });

  it("não registra resultado de quem ainda só tem interesse", async () => {
    const row = await registerForEvent(adult, adultInput());
    await expect(recordEventResult(admin, { registrationId: row.$id, medal: "gold" })).rejects.toThrow("registration_invalid_transition");
  });
});

describe("documentos da inscrição", () => {
  it("aluno adulto e responsável enviam; menor, estranho e outro aluno não", async () => {
    const adultRow = await registerForEvent(adult, adultInput());
    await expect(uploadRegistrationDocument(adult, adultRow.$id, "medical", pdf())).resolves.toMatchObject({ status: "pending", kind: "medical" });
    await expect(uploadRegistrationDocument(adult2, adultRow.$id, "medical", pdf())).rejects.toThrow("registration_forbidden");
    const kid = await registerForEvent(guardian, { eventId: "ch", optionId: "opt-cadete-m", studentProfileId: "minor-1", acceptedTerms: true, declaredWeightGrams: 43000 });
    await expect(uploadRegistrationDocument(guardian, kid.$id, "guardian_authorization", pdf())).resolves.toMatchObject({ status: "pending" });
    await expect(uploadRegistrationDocument(minor, kid.$id, "guardian_authorization", pdf())).rejects.toThrow("registration_forbidden");
    await expect(uploadRegistrationDocument(stranger, kid.$id, "guardian_authorization", pdf())).rejects.toThrow("registration_forbidden");
  });

  it("rejeita arquivo inválido e substitui o documento do mesmo tipo voltando para análise", async () => {
    const row = await registerForEvent(adult, adultInput());
    await expect(uploadRegistrationDocument(adult, row.$id, "medical", fakeFile(new TextEncoder().encode("texto simples"), "x.pdf", "application/pdf"))).rejects.toThrow("invalid_signature");
    const first = await uploadRegistrationDocument(adult, row.$id, "medical", pdf());
    await reviewRegistrationDocument(admin, first.$id, "rejected", "ilegível");
    const second = await uploadRegistrationDocument(adult, row.$id, "medical", pdf("novo.pdf"));
    expect(second.$id).toBe(first.$id);
    expect(second.status).toBe("pending");
    expect(Object.values(store.rows.event_registration_documents)).toHaveLength(1);
    expect(store.files.size).toBe(1);
  });

  it("só o professor revisa; recusar exige motivo", async () => {
    const row = await registerForEvent(adult, adultInput());
    const doc = await uploadRegistrationDocument(adult, row.$id, "medical", pdf());
    for (const actor of [adult, guardian, minor]) await expect(reviewRegistrationDocument(actor, doc.$id, "approved")).rejects.toThrow("admin_required");
    await expect(reviewRegistrationDocument(admin, doc.$id, "rejected")).rejects.toThrow("rejection_reason_required");
    await expect(reviewRegistrationDocument(admin, doc.$id, "approved")).resolves.toMatchObject({ status: "approved" });
  });

  it("baixa só quem tem acesso à inscrição", async () => {
    const kid = await registerForEvent(guardian, { eventId: "ch", optionId: "opt-cadete-m", studentProfileId: "minor-1", acceptedTerms: true, declaredWeightGrams: 43000 });
    const doc = await uploadRegistrationDocument(guardian, kid.$id, "guardian_authorization", pdf());
    await expect(downloadRegistrationDocument(admin, doc.$id)).resolves.toHaveProperty("buffer");
    await expect(downloadRegistrationDocument(guardian, doc.$id)).resolves.toHaveProperty("buffer");
    await expect(downloadRegistrationDocument(stranger, doc.$id)).rejects.toThrow("registration_forbidden");
    await expect(downloadRegistrationDocument(adult2, doc.$id)).rejects.toThrow("registration_forbidden");
  });
});
