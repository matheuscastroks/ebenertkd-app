import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/notifications/push-service", () => ({ deliverNotificationPush: vi.fn() }));

const rows = vi.hoisted(() => ({
  students: { s1: { $id: "s1", profile_id: "minor1" } } as Record<string, unknown>,
  profiles: {
    minor1: { $id: "minor1", role: "minor_student", status: "active" },
    g1: { $id: "g1", role: "adult_student", status: "active" },
    g2: { $id: "g2", role: "adult_student", status: "inactive" },
  } as Record<string, { $id: string; status: string }>,
  links: [{ guardian_profile_id: "g1" }, { guardian_profile_id: "g2" }],
}));
const getRow = vi.hoisted(() => vi.fn(async ({ tableId, rowId }: { tableId: string; rowId: string }) =>
  tableId === "students" ? rows.students[rowId] : rows.profiles[rowId]));
const listRows = vi.hoisted(() => vi.fn(async ({ tableId, queries }: { tableId: string; queries: unknown[] }) => {
  if (tableId === "guardian_student_links") return { rows: rows.links };
  const wanted = queries.join("");
  const onlyActive = wanted.includes('"active"');
  return { rows: Object.values(rows.profiles).filter((p) => wanted.includes(`"${p.$id}"`) && (!onlyActive || p.status === "active")) };
}));
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: () => ({ tables: { getRow, listRows }, config: { databaseId: "db" } }) }));
vi.mock("@/lib/appwrite/ids", () => ({ APPWRITE_IDS: { tables: new Proxy({}, { get: (_t, key) => String(key).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`) }) } }));

import { notificationProfilesForStudent } from "./notification-service";

describe("notificationProfilesForStudent", () => {
  beforeEach(() => { getRow.mockClear(); listRows.mockClear(); });

  it("avisos financeiros do menor vão só ao responsável ativo, nunca ao menor", async () => {
    const result = await notificationProfilesForStudent("s1", true);
    expect(result.map((p) => p.$id)).toEqual(["g1"]);
  });

  it("busca os responsáveis em lote em vez de uma consulta por vínculo", async () => {
    await notificationProfilesForStudent("s1", false);
    const profileGets = getRow.mock.calls.filter(([a]) => a.tableId !== "students").length;
    expect(profileGets).toBe(1); // só o perfil do aluno; responsáveis vêm numa listagem
  });
});
