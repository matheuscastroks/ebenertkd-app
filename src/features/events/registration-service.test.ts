import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/auth/types";

const store = vi.hoisted(() => ({ rows: {} as Record<string, Record<string, Record<string, unknown>>>, links: new Set<string>(), seq: 0 }));
const notify = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock("@/features/auth/service", () => ({ writeAuditEvent: vi.fn(async () => undefined) }));
vi.mock("@/features/notifications/notification-service", () => ({ notifyStudentFinancial: vi.fn(async () => undefined), notifyStudentEvent: notify }));
vi.mock("@/features/students/service", () => ({ getEnrollmentBundleByStudentId: vi.fn() }));
vi.mock("@/features/academy/config-service", () => ({ getPolicy: vi.fn(async () => ({})), getBeltRanks: vi.fn(async () => []) }));
vi.mock("@/features/students/access", () => {
  const forbidden = () => new Error("student_access_denied");
  const allowed = (actor: Profile, profileId: string) => actor.role === "admin" || actor.$id === profileId || store.links.has(`${actor.$id}>${profileId}`);
  return {
    resolveStudentProfile: async (actor: Profile, profileId?: string | null) => {
      const target = profileId || actor.$id;
      if (!allowed(actor, target)) throw forbidden();
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

import { cancelEvent, completeEvent } from "@/features/events/event-service";
import { approveRegistration, cancelRegistration, confirmInterest, registerForEvent, rejectRegistration, setCheckIn } from "@/features/events/registration-service";

const admin = { $id: "admin-1", account_id: "acc-admin", role: "admin", capabilities: ["admin"] } as Profile;
const adult = { $id: "adult-1", account_id: "acc-adult", role: "adult_student", capabilities: ["student"] } as Profile;
const adult2 = { $id: "adult-2", account_id: "acc-adult2", role: "adult_student", capabilities: ["student"] } as Profile;
const guardian = { $id: "guardian-1", account_id: "acc-guardian", role: "guardian", capabilities: ["guardian"] } as Profile;
const stranger = { $id: "guardian-9", account_id: "acc-stranger", role: "guardian", capabilities: ["guardian"] } as Profile;
const minor = { $id: "minor-1", account_id: "acc-minor", role: "minor_student", capabilities: ["student"] } as Profile;

const FUTURE = new Date(Date.now() + 10 * 86400_000).toISOString();

function seed(overrides: Record<string, unknown> = {}, option: Record<string, unknown> = {}) {
  store.rows = { profiles: {}, students: {}, enrollments: {}, events: {}, event_options: {}, event_registrations: {}, charges: {} };
  store.links = new Set(["guardian-1>minor-1"]);
  store.seq = 0;
  for (const profile of [admin, adult, adult2, guardian, minor]) store.rows.profiles[profile.$id] = profile as unknown as Record<string, unknown>;
  for (const [id, profileId] of [["stu-adult", "adult-1"], ["stu-adult2", "adult-2"], ["stu-minor", "minor-1"]]) {
    store.rows.students[id] = { $id: id, profile_id: profileId, full_name: id, birth_date: id === "stu-minor" ? "2014-05-01T12:00:00.000Z" : "1990-05-01T12:00:00.000Z", rank_key: "gub-8" };
    store.rows.enrollments[`enr-${id}`] = { $id: `enr-${id}`, student_id: id, status: "active" };
  }
  store.rows.events.ev = { $id: "ev", event_type: "seminar", title: "Aulão", status: "registration_open", starts_at: FUTURE, audience: "students", requires_approval: false, age_cutoff: "birth_year", max_companions: 2, companion_price_cents: 1000, ...overrides };
  store.rows.event_options.opt = { $id: "opt", event_id: "ev", label: "Participante", modality: "general", price_cents: 3000, sort_order: 0, ...option };
}

const input = (extra: Record<string, unknown> = {}) => ({ eventId: "ev", optionId: "opt", studentProfileId: "adult-1", acceptedTerms: true, ...extra });
const registrations = () => Object.values(store.rows.event_registrations);
const charges = () => Object.values(store.rows.charges);

beforeEach(() => {
  seed();
  notify.mockClear();
});

describe("inscrição em evento simples", () => {
  it("confirma, cobra event_fee e é idempotente", async () => {
    const first = await registerForEvent(adult, input());
    expect(first).toMatchObject({ status: "confirmed", price_cents: 3000, student_id: "stu-adult" });
    expect(charges()).toHaveLength(1);
    expect(charges()[0]).toMatchObject({ charge_type: "event_fee", amount_cents: 3000, enrollment_id: "enr-stu-adult" });
    const again = await registerForEvent(adult, input());
    expect(again.$id).toBe(first.$id);
    expect(registrations()).toHaveLength(1);
    expect(charges()).toHaveLength(1);
  });

  it("soma os acompanhantes ao valor e respeita o limite do evento", async () => {
    const row = await registerForEvent(adult, input({ companions: 2 }));
    expect(row.price_cents).toBe(5000);
    await expect(registerForEvent(adult2, input({ studentProfileId: "adult-2", companions: 3 }))).rejects.toThrow("event_companions_not_allowed");
  });

  it("exige o aceite dos termos de aluno e responsável, mas não do professor", async () => {
    await expect(registerForEvent(adult, input({ acceptedTerms: false }))).rejects.toThrow("event_terms_required");
    await expect(registerForEvent(admin, input({ acceptedTerms: false, studentProfileId: "adult-2" }))).resolves.toMatchObject({ status: "confirmed" });
  });

  it("bloqueia aluno com inscrições fechadas, mas o professor pode forçar", async () => {
    store.rows.events.ev.status = "registration_closed";
    await expect(registerForEvent(adult, input())).rejects.toThrow("event_registration_closed");
    await expect(registerForEvent(admin, input({ studentProfileId: "adult-2" }))).resolves.toMatchObject({ status: "confirmed" });
    store.rows.events.ev.status = "cancelled";
    await expect(registerForEvent(admin, input({ studentProfileId: "adult-1" }))).rejects.toThrow("event_terminal");
  });

  it("aplica a elegibilidade da opção, com motivo, para o aluno mas não para o professor", async () => {
    seed({}, { eligibility_json: JSON.stringify({ min_rank_key: "gub-4" }) });
    await expect(registerForEvent(adult, input())).rejects.toThrow("event_not_eligible");
    await expect(registerForEvent(admin, input())).resolves.toMatchObject({ status: "confirmed" });
  });

  it("exige matrícula ativa", async () => {
    store.rows.enrollments["enr-stu-adult"].status = "paused";
    await expect(registerForEvent(adult, input())).rejects.toThrow("active_enrollment_required");
  });

  it("lota, entra na espera sem cobrança e promove (com cobrança e aviso) quando alguém cancela", async () => {
    store.rows.events.ev.capacity = 1;
    const first = await registerForEvent(adult, input());
    const second = await registerForEvent(adult2, input({ studentProfileId: "adult-2" }));
    expect(second).toMatchObject({ status: "waitlisted", waitlist_position: 1 });
    expect(charges()).toHaveLength(1);
    await cancelRegistration(adult, { registrationId: first.$id });
    expect(store.rows.event_registrations[second.$id]).toMatchObject({ status: "confirmed", waitlist_position: null });
    expect(charges()).toHaveLength(1 + 1);
    expect(Object.values(store.rows.charges).filter((charge) => charge.status === "cancelled")).toHaveLength(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ studentId: "stu-adult2", dedupeKey: `event-registration:${second.$id}:promoted` }));
  });

  it("com aprovação, a vaga fica pendente e só o professor confirma", async () => {
    store.rows.events.ev.requires_approval = true;
    const row = await registerForEvent(adult, input());
    expect(row.status).toBe("pending_approval");
    await expect(approveRegistration(adult, row.$id)).rejects.toThrow("admin_required");
    await expect(approveRegistration(admin, row.$id)).resolves.toMatchObject({ status: "confirmed" });
  });
});

describe("convidados sem conta", () => {
  const guest = { eventId: "ev", optionId: "opt", guestName: "Maria Souza", guestContact: "(21) 98888-7777", acceptedTerms: true };

  it("só entram quando o evento permite e sem gerar cobrança", async () => {
    await expect(registerForEvent(adult, guest)).rejects.toThrow("event_guests_not_allowed");
    store.rows.events.ev.audience = "students_and_guests";
    const row = await registerForEvent(adult, guest);
    expect(row).toMatchObject({ status: "pending_approval", guest_name: "Maria Souza", guest_contact: "21988887777" });
    expect(row.student_id).toBeUndefined();
    expect(charges()).toHaveLength(0);
    await expect(registerForEvent(minor, guest)).rejects.toThrow("guardian_required");
  });

  it("o professor encerra o evento e o contato do convidado é apagado", async () => {
    store.rows.events.ev.audience = "students_and_guests";
    const row = await registerForEvent(admin, guest);
    expect(row.status).toBe("confirmed");
    await setCheckIn(admin, row.$id, true);
    await completeEvent(admin, "ev");
    expect(store.rows.event_registrations[row.$id]).toMatchObject({ status: "completed", guest_contact: null });
    expect(store.rows.events.ev.status).toBe("completed");
  });

  it("só quem inscreveu o convidado (ou o professor) consegue cancelar", async () => {
    store.rows.events.ev.audience = "students_and_guests";
    const row = await registerForEvent(adult, guest);
    await expect(cancelRegistration(adult2, { registrationId: row.$id })).rejects.toThrow("registration_forbidden");
    await expect(cancelRegistration(adult, { registrationId: row.$id })).resolves.toMatchObject({ status: "cancelled" });
  });
});

describe("menor de idade", () => {
  it("o menor só manifesta interesse; o responsável confirma, autoriza e gera a cobrança", async () => {
    const interest = await registerForEvent(minor, input({ studentProfileId: "minor-1", acceptedTerms: false }));
    expect(interest.status).toBe("interested");
    expect(charges()).toHaveLength(0);
    await expect(confirmInterest(minor, interest.$id)).rejects.toThrow("guardian_required");
    await expect(confirmInterest(stranger, interest.$id)).rejects.toThrow("registration_forbidden");
    const confirmed = await confirmInterest(guardian, interest.$id);
    expect(confirmed).toMatchObject({ status: "confirmed", guardian_account_id: "acc-guardian" });
    expect(confirmed.guardian_authorized_at).toBeTruthy();
    expect(charges()).toHaveLength(1);
  });

  it("o responsável inscreve o dependente direto, com autorização registrada", async () => {
    const row = await registerForEvent(guardian, input({ studentProfileId: "minor-1" }));
    expect(row).toMatchObject({ status: "confirmed", guardian_account_id: "acc-guardian" });
  });

  it("menor não cancela inscrição confirmada", async () => {
    const row = await registerForEvent(guardian, input({ studentProfileId: "minor-1" }));
    await expect(cancelRegistration(minor, { registrationId: row.$id })).rejects.toThrow("registration_forbidden");
  });
});

describe("isolamento entre famílias e papéis", () => {
  it("ninguém inscreve ou cancela por quem não é seu dependente", async () => {
    await expect(registerForEvent(adult2, input({ studentProfileId: "adult-1" }))).rejects.toThrow("student_access_denied");
    await expect(registerForEvent(stranger, input({ studentProfileId: "minor-1" }))).rejects.toThrow("student_access_denied");
    const row = await registerForEvent(adult, input());
    await expect(cancelRegistration(adult2, { registrationId: row.$id })).rejects.toThrow("registration_forbidden");
    await expect(cancelRegistration(stranger, { registrationId: row.$id })).rejects.toThrow("registration_forbidden");
  });

  it("aprovar, recusar, check-in e cancelar evento são só do professor", async () => {
    const row = await registerForEvent(adult, input());
    for (const actor of [adult, guardian, minor]) {
      await expect(approveRegistration(actor, row.$id)).rejects.toThrow("admin_required");
      await expect(rejectRegistration(actor, { registrationId: row.$id })).rejects.toThrow("admin_required");
      await expect(setCheckIn(actor, row.$id, true)).rejects.toThrow("admin_required");
      await expect(cancelEvent(actor, { eventId: "ev", reason: "teste" })).rejects.toThrow("admin_required");
      await expect(completeEvent(actor, "ev")).rejects.toThrow("admin_required");
    }
  });

  it("check-in só em confirmados e pode ser desfeito", async () => {
    const row = await registerForEvent(adult, input());
    await expect(setCheckIn(admin, row.$id, true)).resolves.toMatchObject({ status: "checked_in" });
    await expect(setCheckIn(admin, row.$id, false)).resolves.toMatchObject({ status: "confirmed" });
    store.rows.events.ev.capacity = 1;
    const waiting = await registerForEvent(adult2, input({ studentProfileId: "adult-2" }));
    expect(waiting.status).toBe("waitlisted");
    await expect(setCheckIn(admin, waiting.$id, true)).rejects.toThrow("registration_invalid_transition");
  });
});

describe("cancelamento e decisão financeira", () => {
  it("sem pagamento a cobrança em aberto é cancelada e a inscrição pode ser refeita sem duplicar", async () => {
    const row = await registerForEvent(adult, input());
    await cancelRegistration(adult, { registrationId: row.$id });
    expect(charges()[0]).toMatchObject({ status: "cancelled" });
    const again = await registerForEvent(adult, input());
    expect(again).toMatchObject({ $id: row.$id, status: "confirmed" });
    expect(charges()).toHaveLength(1);
    expect(charges()[0]).toMatchObject({ status: "pending" });
  });

  it("com pagamento o aluno não cancela sozinho; o professor decide crédito futuro ou manter", async () => {
    const row = await registerForEvent(adult, input());
    charges()[0].status = "paid";
    await expect(cancelRegistration(adult, { registrationId: row.$id })).rejects.toThrow("event_paid_charge_decision_required");
    await expect(cancelRegistration(admin, { registrationId: row.$id })).rejects.toThrow("event_paid_charge_decision_required");
    await expect(cancelRegistration(admin, { registrationId: row.$id, decision: "future_credit" })).resolves.toMatchObject({ status: "cancelled", financial_decision: "future_credit" });
    expect(charges()[0]).toMatchObject({ status: "paid" });
  });

  it("não deixa o aluno cancelar depois do encerramento das inscrições", async () => {
    const row = await registerForEvent(adult, input());
    store.rows.events.ev.status = "registration_closed";
    await expect(cancelRegistration(adult, { registrationId: row.$id })).rejects.toThrow("event_registration_closed");
    await expect(cancelRegistration(admin, { registrationId: row.$id })).resolves.toMatchObject({ status: "cancelled" });
  });

  it("cancelar o evento cancela as cobranças em aberto e exige decisão se houver pagas, sem alterar nada antes", async () => {
    const a = await registerForEvent(adult, input());
    await registerForEvent(adult2, input({ studentProfileId: "adult-2" }));
    Object.values(store.rows.charges).find((charge) => charge.enrollment_id === "enr-stu-adult")!.status = "paid";
    await expect(cancelEvent(admin, { eventId: "ev", reason: "Chuva forte" })).rejects.toThrow("event_paid_charge_decision_required");
    expect(store.rows.events.ev.status).toBe("registration_open");
    expect(store.rows.event_registrations[a.$id].status).toBe("confirmed");
    await cancelEvent(admin, { eventId: "ev", reason: "Chuva forte", decision: "future_credit" });
    expect(store.rows.events.ev).toMatchObject({ status: "cancelled", cancellation_reason: "Chuva forte" });
    expect(registrations().map((row) => row.status)).toEqual(["cancelled", "cancelled"]);
    expect(registrations().find((row) => row.$id === a.$id)).toMatchObject({ financial_decision: "future_credit" });
    expect(Object.values(store.rows.charges).map((charge) => charge.status).sort()).toEqual(["cancelled", "paid"]);
  });
});
