import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/auth/types";

vi.mock("server-only", () => ({}));

const resolveStudentProfile = vi.fn();
vi.mock("@/features/students/access", () => ({ resolveStudentProfile: (...args: unknown[]) => resolveStudentProfile(...args) }));

const listRows = vi.fn();
vi.mock("@/lib/appwrite/server", () => ({
  createAppwriteAdminClient: () => ({ tables: { listRows }, config: { databaseId: "db" } })
}));

import { getStudentExams } from "./student-exams-service";

const rowsByTable: Record<string, unknown[]> = {
  students: [{ $id: "student-1", profile_id: "minor-1" }],
  exam_participants: [{ $id: "p-1", event_id: "event-1", student_id: "student-1", status: "registered", charge_id: "charge-1" }],
  events: [{ $id: "event-1", event_type: "belt_exam", title: "Exame", starts_at: "2026-12-01T12:00:00.000Z", status: "registration_closed" }],
  charges: [{ $id: "charge-1", status: "pending", amount_cents: 8000 }]
};

function profile(role: Profile["role"], capabilities: Profile["capabilities"]): Profile {
  return { $id: `${role}-actor`, role, capabilities } as Profile;
}

describe("getStudentExams", () => {
  beforeEach(() => {
    listRows.mockReset();
    listRows.mockImplementation(async ({ tableId }: { tableId: string }) => {
      const rows = rowsByTable[tableId] ?? [];
      return { total: rows.length, rows };
    });
    resolveStudentProfile.mockReset();
    resolveStudentProfile.mockResolvedValue({ $id: "minor-1" });
  });

  it("authorizes the requested dependent through the guardian link check", async () => {
    const guardian = profile("guardian", ["guardian"]);
    await getStudentExams(guardian, "minor-1");
    expect(resolveStudentProfile).toHaveBeenCalledWith(guardian, "minor-1");
  });

  it("propagates access denial without reading exam data", async () => {
    resolveStudentProfile.mockRejectedValue(new Error("student_access_denied"));
    await expect(getStudentExams(profile("guardian", ["guardian"]), "someone-else")).rejects.toThrow("student_access_denied");
    expect(listRows).not.toHaveBeenCalled();
  });

  it("shows exam fees to guardians", async () => {
    const result = await getStudentExams(profile("guardian", ["guardian"]), "minor-1");
    expect(result.showFinancial).toBe(true);
    expect(result.upcoming[0]?.charge?.$id).toBe("charge-1");
  });

  it("never reads charges for a minor", async () => {
    const result = await getStudentExams(profile("minor_student", ["student"]));
    expect(result.showFinancial).toBe(false);
    expect(result.upcoming[0]?.charge).toBeUndefined();
    expect(listRows.mock.calls.some(([query]) => query.tableId === "charges")).toBe(false);
  });

  it("returns an empty view when the profile has no student record", async () => {
    listRows.mockImplementation(async () => ({ total: 0, rows: [] }));
    const result = await getStudentExams(profile("adult_student", ["student"]));
    expect(result).toMatchObject({ student: null, upcoming: [], past: [] });
  });
});
