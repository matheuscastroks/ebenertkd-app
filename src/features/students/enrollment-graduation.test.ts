import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/service", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("@/features/notifications/notification-service", () => ({ notifyAdmins: vi.fn(async () => undefined) }));
vi.mock("@/features/contracts/contract-service", () => ({ issueContractForEnrollment: vi.fn() }));
vi.mock("@/features/classes/service", () => ({ getTrainingClass: vi.fn() }));
vi.mock("@/features/academy/rank-guard", () => ({ assertSelectableRank: vi.fn(async () => undefined) }));

const bundle = vi.hoisted(() => ({
  student: { $id: "st1", rank_key: "gub-8", status: "active", full_name: "Ana" },
  enrollment: { $id: "en1", status: "active", revision: 1 },
  documents: [],
}));
vi.mock("@/features/students/service", () => ({
  getOrCreateEnrollmentBundle: vi.fn(async () => bundle),
  getEnrollmentBundleByStudentId: vi.fn(async () => bundle),
}));
const updateRow = vi.hoisted(() => vi.fn(async (args?: { data: Record<string, unknown> }) => ({ $id: "x", full_name: "Ana", revision: 2, ...(args?.data ?? {}) })));
vi.mock("@/lib/appwrite/server", () => ({
  createAppwriteAdminClient: () => ({ tables: { updateRow, listRows: vi.fn(async () => ({ rows: [] })) }, config: { databaseId: "db" } }),
}));

import { saveEnrollmentDraft } from "./enrollment-service";
import type { Profile } from "@/features/auth/types";

const input = { fullName: "Ana Silva", rankKey: "gub-9" } as never;

describe("graduação após a matrícula", () => {
  beforeEach(() => updateRow.mockClear());

  it("aluno não consegue alterar a própria faixa depois que a matrícula saiu do rascunho", async () => {
    const student = { $id: "p1", role: "adult_student", capabilities: ["student"], account_id: "a1" } as Profile;
    await saveEnrollmentDraft(student, student, input, false);
    const studentWrite = updateRow.mock.calls[0][0]!.data;
    expect(studentWrite.rank_key).toBe("gub-8");
  });
});
