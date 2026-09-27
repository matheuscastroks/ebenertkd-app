import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockUsersDelete = vi.fn();
const mockTablesUpdateRow = vi.fn();
const mockTablesGetRow = vi.fn();
const mockTablesListRows = vi.fn();

vi.mock("@/lib/appwrite/server", () => ({
  createAppwriteAdminClient: () => ({
    users: {
      delete: mockUsersDelete,
    },
    tables: {
      updateRow: mockTablesUpdateRow,
      getRow: mockTablesGetRow,
      listRows: mockTablesListRows,
    },
    config: {
      databaseId: "test-db",
    },
  }),
}));

import {
  deleteSelfAccount,
  deleteStudentAccount,
} from "./account-deletion-service";
import type { Profile } from "./types";

describe("account-deletion-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const studentProfile: Profile = {
    $id: "p-student",
    account_id: "acc-student",
    full_name: "Aluno Teste",
    role: "adult_student",
    email: "aluno@teste.com",
    status: "active",
    capabilities: ["student"],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  } as unknown as Profile;

  const adminProfile: Profile = {
    $id: "p-admin",
    account_id: "acc-admin",
    full_name: "Ebener Santos",
    role: "admin",
    email: "admin@teste.com",
    status: "active",
    capabilities: ["admin", "manage_students"],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  } as unknown as Profile;

  describe("deleteSelfAccount", () => {
    it("refuses to delete an admin account", async () => {
      await expect(deleteSelfAccount(adminProfile)).rejects.toThrow(
        "cannot_delete_admin_account"
      );
      expect(mockUsersDelete).not.toHaveBeenCalled();
    });

    it("deletes user from Auth and disables profile in database", async () => {
      mockTablesListRows.mockResolvedValue({ rows: [] });
      mockUsersDelete.mockResolvedValue({});
      mockTablesUpdateRow.mockResolvedValue({});

      const result = await deleteSelfAccount(studentProfile);

      expect(result.success).toBe(true);
      expect(mockUsersDelete).toHaveBeenCalledWith("acc-student");
      expect(mockTablesUpdateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          rowId: "p-student",
          data: expect.objectContaining({
            status: "disabled",
          }),
        })
      );
    });
  });

  describe("deleteStudentAccount", () => {
    it("refuses if caller is not an admin", async () => {
      await expect(
        deleteStudentAccount(studentProfile, "p-target")
      ).rejects.toThrow("forbidden");
      expect(mockUsersDelete).not.toHaveBeenCalled();
    });

    it("refuses to delete an admin target profile", async () => {
      mockTablesGetRow.mockResolvedValue(adminProfile);

      await expect(
        deleteStudentAccount(adminProfile, "p-admin")
      ).rejects.toThrow("cannot_delete_admin_account");
      expect(mockUsersDelete).not.toHaveBeenCalled();
    });

    it("successfully deletes student account and disables profile", async () => {
      mockTablesGetRow.mockResolvedValue(studentProfile);
      mockTablesListRows.mockResolvedValue({ rows: [] });
      mockUsersDelete.mockResolvedValue({});
      mockTablesUpdateRow.mockResolvedValue({});

      const result = await deleteStudentAccount(adminProfile, "p-student");

      expect(result.success).toBe(true);
      expect(mockUsersDelete).toHaveBeenCalledWith("acc-student");
      expect(mockTablesUpdateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          rowId: "p-student",
          data: expect.objectContaining({
            status: "disabled",
          }),
        })
      );
    });
  });
});
