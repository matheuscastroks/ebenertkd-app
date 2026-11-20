import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> & { $id: string };

const store = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, Row>>,
  audit: [] as Array<{ event: string; metadata?: Record<string, unknown> }>,
  locations: [] as Array<Record<string, unknown>>
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock("@/lib/cache/invalidate", () => ({ invalidateTags: vi.fn() }));
vi.mock("@/features/auth/service", () => ({
  writeAuditEvent: vi.fn(async (event: string, _actor: string, _type: string, _id: string, metadata?: Record<string, unknown>) => {
    store.audit.push({ event, metadata });
  })
}));
vi.mock("@/features/classes/service", () => ({ getTrainingClass: async (id: string) => store.tables.training_classes?.[id] }));
vi.mock("@/features/locations/locations-service", () => ({ listLocations: async () => store.locations }));
vi.mock("@/lib/appwrite/server", async () => {
  const { AppwriteException } = await import("node-appwrite");
  const table = (id: string) => (store.tables[id] ??= {});
  const matches = (row: Row, queries: string[]) =>
    queries.map((raw) => JSON.parse(raw) as { method: string; attribute?: string; values?: unknown[] })
      .filter((query) => query.method === "equal")
      .every((query) => query.values!.includes(row[query.attribute!]));
  return {
    createAppwriteAdminClient: () => ({
      config: { databaseId: "db" },
      tables: {
        listRows: async ({ tableId, queries }: { tableId: string; queries: string[] }) => ({ rows: Object.values(table(tableId)).filter((row) => matches(row, queries)) }),
        getRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
          const row = table(tableId)[rowId];
          if (!row) throw new AppwriteException("not found", 404, "row_not_found");
          return { ...row };
        },
        createRow: async ({ tableId, rowId, data, permissions }: { tableId: string; rowId: string; data: Record<string, unknown>; permissions: string[] }) => {
          expect(permissions).toEqual([]);
          if (table(tableId)[rowId]) throw new AppwriteException("conflict", 409, "row_already_exists");
          table(tableId)[rowId] = { $id: rowId, ...data };
          return { ...table(tableId)[rowId] };
        }
      }
    })
  };
});

import type { Profile } from "@/features/auth/types";
import { CheckInError, checkInStudent, getStudentCheckInState, justifyAbsence } from "@/features/classes/check-in-service";

const dojang = { latitude: -23.55052, longitude: -46.633308 };
const inside = { latitude: dojang.latitude + 0.0005, longitude: dojang.longitude }; // ~56 m
const outside = { latitude: dojang.latitude + 0.003, longitude: dojang.longitude }; // ~330 m
const slot = { date: "2026-11-20", startTime: "19:00" };
const at = (time: string) => new Date(`2026-11-20T${time}:00-03:00`);

const student = { $id: "prof-aluno", account_id: "acc-aluno", role: "adult_student", capabilities: ["student"] } as unknown as Profile;
const minor = { $id: "prof-menor", account_id: "acc-menor", role: "minor_student", capabilities: ["student"] } as unknown as Profile;
const guardian = { $id: "prof-resp", account_id: "acc-resp", role: "guardian", capabilities: ["guardian"] } as unknown as Profile;
const admin = { $id: "prof-admin", account_id: "acc-admin", role: "admin", capabilities: ["student", "guardian"] } as unknown as Profile;

function seedStudent(profile: Profile, suffix: string) {
  store.tables.students[`stu-${suffix}`] = { $id: `stu-${suffix}`, profile_id: profile.$id, status: "active", training_class_id: "class-1" };
  store.tables.class_enrollments[`link-${suffix}`] = { $id: `link-${suffix}`, training_class_id: "class-1", student_id: `stu-${suffix}`, enrollment_id: `enr-${suffix}`, status: "active", started_at: "2026-01-01T00:00:00.000Z" };
}

const records = () => Object.values(store.tables.attendance_records ?? {});

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(CheckInError);
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  store.audit = [];
  store.locations = [{ name: "Dojang Centro", is_default: true, ...dojang, check_in_radius_m: 150 }];
  store.tables = {
    training_classes: { "class-1": { $id: "class-1", name: "Adulto", weekdays: ["Sexta"], start_time: "19:00", end_time: "20:30", location: "Dojang Centro", status: "active" } },
    students: {},
    class_enrollments: {},
    lessons: {},
    attendance_records: {}
  };
  seedStudent(student, "a");
  seedStudent(minor, "m");
});

describe("autorização do check-in", () => {
  it.each([["responsável", guardian], ["administrador", admin]])("%s não faz check-in nem justifica", async (_label, actor) => {
    await expectCode(checkInStudent(actor, { ...slot, ...inside }, at("19:00")), "check_in_forbidden");
    await expectCode(justifyAbsence(actor, { ...slot, reason: "doente" }, at("19:00")), "check_in_forbidden");
    expect(records()).toEqual([]);
  });

  it("o alvo é sempre o próprio aluno logado: o registro vai para o vínculo dele", async () => {
    await checkInStudent(minor, { ...slot, ...inside }, at("18:50"));
    expect(records()).toHaveLength(1);
    expect(records()[0]).toMatchObject({ student_id: "stu-m", class_enrollment_id: "link-m", recorded_by_account_id: "acc-menor" });
  });

  it("aluno sem turma ativa não tem aula para registrar", async () => {
    store.tables.training_classes["class-1"].status = "inactive";
    await expectCode(checkInStudent(student, { ...slot, ...inside }, at("19:00")), "check_in_no_class");
  });
});

describe("check-in por localização", () => {
  it("dentro do raio confirma a presença, cria a aula prevista e não guarda a posição", async () => {
    const result = await checkInStudent(student, { ...slot, ...inside }, at("19:05"));
    expect(result.distanceM).toBe(60);
    expect(Object.values(store.tables.lessons)).toHaveLength(1);
    expect(Object.values(store.tables.lessons)[0]).toMatchObject({ status: "open", start_time: "19:00", lesson_date: "2026-11-20T12:00:00.000Z" });
    const [record] = records();
    expect(record).toMatchObject({ status: "present", source: "check_in", check_in_distance_m: 60 });
    expect(JSON.stringify(record)).not.toContain(String(inside.latitude));
    expect(JSON.stringify(store.audit)).not.toContain(String(inside.latitude));
    expect(store.audit).toEqual([{ event: "attendance.check_in", metadata: { distance_m: 60 } }]);
  });

  it("fora do raio recusa sem gravar nada (nem a aula)", async () => {
    const promise = checkInStudent(student, { ...slot, ...outside }, at("19:05"));
    await expectCode(promise, "check_in_out_of_range");
    await expect(promise).rejects.toMatchObject({ detail: { distanceM: 330, radiusM: 150 } });
    expect(records()).toEqual([]);
    expect(store.tables.lessons).toEqual({});
  });

  it.each([["18:44"], ["19:31"]])("às %s está fora da janela", async (time) => {
    await expectCode(checkInStudent(student, { ...slot, ...inside }, at(time)), "check_in_not_open");
  });

  it("não aceita aula de outro dia nem horário inexistente", async () => {
    await expectCode(checkInStudent(student, { date: "2026-11-21", startTime: "19:00", ...inside }, at("19:00")), "check_in_no_lesson");
    await expectCode(checkInStudent(student, { ...slot, startTime: "07:00", ...inside }, at("19:00")), "check_in_no_lesson");
  });

  it("depois de registrado, o aluno não muda mais: só o professor", async () => {
    await checkInStudent(student, { ...slot, ...inside }, at("19:00"));
    await expectCode(checkInStudent(student, { ...slot, ...inside }, at("19:01")), "attendance_already_recorded");
    await expectCode(justifyAbsence(student, { ...slot, reason: "doente" }, at("19:02")), "attendance_already_recorded");
    expect(records()).toHaveLength(1);
  });

  it("falta já lançada pelo professor não pode ser trocada pelo aluno", async () => {
    store.tables.lessons.l1 = { $id: "l1", training_class_id: "class-1", lesson_date: "2026-11-20T12:00:00.000Z", start_time: "19:00", end_time: "20:30", lesson_type: "regular", status: "open" };
    const { attendanceId } = await import("@/features/classes/attendance-service");
    store.tables.attendance_records[attendanceId("l1", "link-a")] = { $id: attendanceId("l1", "link-a"), lesson_id: "l1", class_enrollment_id: "link-a", status: "absent" };
    await expectCode(checkInStudent(student, { ...slot, ...inside }, at("19:10")), "attendance_already_recorded");
  });

  it("aula concluída ou cancelada pelo professor recusa o check-in", async () => {
    store.tables.lessons.l1 = { $id: "l1", training_class_id: "class-1", lesson_date: "2026-11-20T12:00:00.000Z", start_time: "19:00", end_time: "20:30", lesson_type: "regular", status: "cancelled" };
    await expectCode(checkInStudent(student, { ...slot, ...inside }, at("19:10")), "check_in_no_lesson");
    store.tables.lessons.l1.status = "completed";
    await expectCode(checkInStudent(student, { ...slot, ...inside }, at("19:10")), "lesson_closed");
  });

  it("local sem coordenadas desativa o check-in", async () => {
    store.locations = [{ name: "Dojang Centro", is_default: true }];
    await expectCode(checkInStudent(student, { ...slot, ...inside }, at("19:00")), "check_in_location_missing");
  });

  it("rejeita entrada malformada", async () => {
    await expectCode(checkInStudent(student, { ...slot, latitude: "x", longitude: 0 }, at("19:00")), "check_in_invalid_input");
  });
});

describe("justificativa", () => {
  it("marca a falta como Justificada com o motivo, sem pôr o texto na auditoria", async () => {
    await justifyAbsence(student, { ...slot, reason: "  consulta   médica " }, at("17:00"));
    expect(records()[0]).toMatchObject({ status: "excused", source: "justification", justification: "consulta médica" });
    expect(store.audit).toEqual([{ event: "attendance.justified", metadata: {} }]);
  });

  it("vale até o fim da aula e exige texto", async () => {
    await expectCode(justifyAbsence(student, { ...slot, reason: "doente" }, at("20:30")), "check_in_justify_closed");
    await expectCode(justifyAbsence(student, { ...slot, reason: "a" }, at("19:00")), "check_in_invalid_input");
  });
});

describe("estado do card", () => {
  it("não oferece check-in de uma chamada já concluída pelo professor", async () => {
    store.tables.lessons.l1 = { $id: "l1", training_class_id: "class-1", lesson_date: "2026-11-20T12:00:00.000Z", start_time: "19:00", end_time: "20:30", lesson_type: "regular", status: "completed" };
    expect(await getStudentCheckInState(student, at("19:10"))).toBeNull();
  });

  it("mostra a aula de hoje com fase e registro; some quando a aula acaba", async () => {
    const before = await getStudentCheckInState(student, at("18:00"));
    expect(before).toMatchObject({ phase: "upcoming", placeConfigured: true, record: null, slot: { date: "2026-11-20", startTime: "19:00", endTime: "20:30" } });
    await checkInStudent(student, { ...slot, ...inside }, at("18:50"));
    expect(await getStudentCheckInState(student, at("19:00"))).toMatchObject({ phase: "open", record: { status: "present", source: "check_in" } });
    expect(await getStudentCheckInState(student, at("20:31"))).toBeNull();
  });

  it("responsável não recebe card", async () => {
    expect(await getStudentCheckInState(guardian, at("19:00"))).toBeNull();
  });
});
