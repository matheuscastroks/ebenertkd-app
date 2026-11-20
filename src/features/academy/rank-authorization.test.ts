import { beforeEach, describe, expect, it, vi } from "vitest";

const reads = vi.hoisted(() => ({ listAll: vi.fn(), dataset: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/appwrite/all-rows", () => ({ listAllRows: reads.listAll }));
vi.mock("@/features/academy/config-service", () => ({
  getBeltRanks: vi.fn(async () => []),
  getPolicy: vi.fn(async () => ({}))
}));
vi.mock("@/features/exams/eligibility-service", () => ({
  loadEligibilityDataset: reads.dataset,
  buildEligibilityAssessments: vi.fn(() => ({ assessments: [] }))
}));

import type { Profile } from "@/features/auth/types";
import { previewEligibilityImpact } from "@/features/academy/impact-service";
import { getStudentsPerRank } from "@/features/academy/rank-usage-service";

const roles = ["adult_student", "guardian", "minor_student"] as const;

beforeEach(() => {
  reads.listAll.mockReset();
  reads.dataset.mockReset();
});

describe("leituras administrativas de graduações", () => {
  it.each(roles)("%s recebe admin_required e nenhum dado é lido", async (role) => {
    const actor = { $id: "x", account_id: "acc", role } as unknown as Profile;
    await expect(previewEligibilityImpact(actor, { rankPatches: [] })).rejects.toThrow("admin_required");
    await expect(getStudentsPerRank(actor)).rejects.toThrow("admin_required");
    expect(reads.listAll).not.toHaveBeenCalled();
    expect(reads.dataset).not.toHaveBeenCalled();
  });

  it("o administrador consulta quantos alunos há por graduação", async () => {
    reads.listAll.mockResolvedValue([{ $id: "a", rank_key: "gub-5" }, { $id: "b", rank_key: "gub-5" }, { $id: "c", rank_key: null }]);
    const admin = { $id: "p", account_id: "acc", role: "admin" } as unknown as Profile;
    expect(await getStudentsPerRank(admin)).toEqual({ "gub-5": 2 });
  });
});
